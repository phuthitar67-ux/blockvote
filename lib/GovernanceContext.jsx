"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { BrowserProvider, Contract, JsonRpcProvider, ZeroAddress, formatEther, parseEther } from "ethers";
import { useWallet } from "@/lib/WalletContext";
import {
  CHAIN_ID,
  GOV_TOKEN_ABI,
  GOV_TOKEN_ADDRESS,
  GOVERNANCE_ABI,
  GOVERNANCE_ADDRESS,
  IS_CONFIGURED,
  RPC_URL,
  VOTE_TYPE,
} from "@/lib/web3/config";
import { normalizeProposal } from "@/lib/web3/format";
import { describeTxError } from "@/lib/web3/errors";

const GovernanceContext = createContext(null);

const readProvider = new JsonRpcProvider(RPC_URL);

// Per-block-number cache — a mined block's timestamp never changes, so once
// fetched it's reused everywhere a timestamp is needed for that block
// (binary-search probes, event-timestamp lookups) regardless of which effect
// or scan asked for it. Caching the in-flight promise (not just the
// resolved value) also collapses concurrent requests for the same block
// into one. This is what actually cuts the RPC volume: the previous code
// re-fetched the same handful of blocks dozens of times across independent
// per-proposal scans.
const blockCache = new Map();
function getBlockCached(blockNumber) {
  const key = Number(blockNumber);
  if (!blockCache.has(key)) {
    blockCache.set(key, readProvider.getBlock(key));
  }
  return blockCache.get(key);
}

// getBlockNumber() ("the current tip") was previously called independently
// by every scanning effect on each page load. A few seconds of staleness is
// harmless for bounding an eth_getLogs range, so a short-lived cache
// collapses those near-simultaneous calls into a single request.
let latestBlockCache = null;
const LATEST_BLOCK_TTL_MS = 5000;
function getLatestBlockCached() {
  const now = Date.now();
  if (!latestBlockCache || now > latestBlockCache.expiresAt) {
    latestBlockCache = { promise: readProvider.getBlockNumber(), expiresAt: now + LATEST_BLOCK_TTL_MS };
  }
  return latestBlockCache.promise;
}

// Binary-searches for the highest block whose timestamp is <= targetTimestamp.
// Unlike eth_getLogs, eth_getBlockByNumber for old blocks isn't gated behind
// an "archive" tier on the providers this app has been tested against, so
// this safely narrows a log-query range without ever scanning from genesis.
async function blockNumberBefore(targetTimestamp, latestBlock) {
  let lo = 0;
  let hi = latestBlock;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const block = await getBlockCached(mid);
    if (block && Number(block.timestamp) <= targetTimestamp) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo;
}

// A proposal's startTime/endTime never changes once created, so the block
// that search resolves to is stable too — cache by timestamp so the same
// moment is never binary-searched twice. Previously this was recomputed
// independently by both the activity-feed scan and the voting-history scan
// for every proposal, on every effect re-run.
const blockBeforeCache = new Map();
function blockNumberBeforeCached(targetTimestamp, latestBlock) {
  const key = Number(targetTimestamp);
  if (!blockBeforeCache.has(key)) {
    blockBeforeCache.set(key, blockNumberBefore(targetTimestamp, latestBlock));
  }
  return blockBeforeCache.get(key);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// eth_getLogs block-range limits vary wildly by RPC provider and are never
// known up front — PublicNode rejects any range reaching more than ~1,000
// blocks into the past as an "archive" request, while Alchemy's free tier
// hard-caps every call to 10 blocks (and separately rate-limits rapid
// retries). An unbounded queryFilter() (fromBlock 0) always throws on both,
// and the caller's .catch() was silently swallowing that, making
// event-derived data (voting history, top voters) look empty even though
// the events exist on-chain. Parse the provider's own suggested range when
// it gives one (Alchemy does), otherwise shrink geometrically; back off
// without shrinking on rate-limit errors, since those aren't a range
// problem and would otherwise be misread as one.
async function queryFilterChunked(contract, filter, fromBlock, toBlock) {
  const events = [];
  let chunkSize = Math.max(1, toBlock - fromBlock + 1);
  let start = fromBlock;
  while (start <= toBlock) {
    const end = Math.min(start + chunkSize - 1, toBlock);
    try {
      events.push(...(await contract.queryFilter(filter, start, end)));
      start = end + 1;
      await sleep(100);
    } catch (err) {
      const message = err.error?.message || err.shortMessage || err.message || "";
      if (err.error?.code === 429 || /compute units per second|rate limit/i.test(message)) {
        console.warn("[BlockVote] queryFilterChunked: rate limited, backing off:", message);
        await sleep(1000);
        continue;
      }
      const suggestedRange = message.match(/\[0x([0-9a-f]+),\s*0x([0-9a-f]+)\]/i);
      if (suggestedRange) {
        chunkSize = parseInt(suggestedRange[2], 16) - parseInt(suggestedRange[1], 16) + 1;
      } else if (chunkSize === 1) {
        console.error("[BlockVote] queryFilterChunked: RPC rejects even single-block ranges, giving up:", err);
        throw err;
      } else {
        chunkSize = Math.max(1, Math.floor(chunkSize / 10));
      }
      console.warn(
        `[BlockVote] queryFilterChunked: range ${start}-${end} rejected by RPC, retrying with window of ${chunkSize} blocks`,
        message
      );
    }
  }
  return events;
}

export function GovernanceProvider({ children }) {
  const { address } = useWallet();

  const [proposals, setProposals] = useState([]);
  const [loadingProposals, setLoadingProposals] = useState(true);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [totalSupply, setTotalSupply] = useState(0);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [myVotes, setMyVotes] = useState({});
  const [totalVoters, setTotalVoters] = useState(0);
  const [topVoters, setTopVoters] = useState([]);
  const [myVotingHistory, setMyVotingHistory] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [tokenActivity, setTokenActivity] = useState([]);
  const [allVoteEvents, setAllVoteEvents] = useState([]);
  const [proposalThreshold, setProposalThreshold] = useState(null);
  const [faucetAmount, setFaucetAmount] = useState(null);
  const [tokenPrice, setTokenPriceValue] = useState(null);
  const [ethTreasuryBalance, setEthTreasuryBalance] = useState(0);
  const [ownerAddress, setOwnerAddress] = useState(null);

  const readGovToken = useMemo(
    () => new Contract(GOV_TOKEN_ADDRESS, GOV_TOKEN_ABI, readProvider),
    []
  );
  const readGovernance = useMemo(
    () => new Contract(GOVERNANCE_ADDRESS, GOVERNANCE_ABI, readProvider),
    []
  );

  const getSignerContracts = useCallback(async () => {
    if (!IS_CONFIGURED) {
      throw new Error("ยังไม่ได้ตั้งค่า Smart Contract address กรุณา deploy และตั้งค่า .env.local ก่อนใช้งาน");
    }
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("ไม่พบ MetaMask กรุณาติดตั้งส่วนขยายก่อน");
    }
    const provider = new BrowserProvider(window.ethereum);

    // Reads always go through readProvider (fixed to NEXT_PUBLIC_RPC_URL), but
    // writes go through whatever network the wallet is currently on. Without
    // this check, a wallet on the wrong network can still send a transaction
    // (to an unrelated/nonexistent contract there) that appears to succeed in
    // MetaMask, while every subsequent read still hits the correct network
    // and never reflects it — the wrong-network case must be caught here,
    // before a signer/tx is created, not after.
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== CHAIN_ID) {
      const err = new Error(
        `กระเป๋าของคุณเชื่อมต่ออยู่กับเครือข่ายผิด (Chain ID ${network.chainId}) กรุณาสลับไปที่ Sepolia (Chain ID ${CHAIN_ID}) ก่อนทำรายการ`
      );
      err.code = "WRONG_NETWORK";
      throw err;
    }

    const signer = await provider.getSigner();
    return {
      govToken: new Contract(GOV_TOKEN_ADDRESS, GOV_TOKEN_ABI, signer),
      governance: new Contract(GOVERNANCE_ADDRESS, GOVERNANCE_ABI, signer),
    };
  }, []);

  const refreshProposals = useCallback(async () => {
    if (!IS_CONFIGURED) {
      setLoadingProposals(false);
      return;
    }
    setLoadingProposals(true);
    try {
      const count = Number(await readGovernance.proposalCount());
      const items = await Promise.all(
        Array.from({ length: count }, async (_, id) => {
          const [raw, state] = await Promise.all([
            readGovernance.getProposal(id),
            readGovernance.state(id),
          ]);
          return normalizeProposal(raw, state);
        })
      );
      setProposals(items.reverse());
    } finally {
      setLoadingProposals(false);
    }
  }, [readGovernance]);

  const refreshBalance = useCallback(async () => {
    if (!IS_CONFIGURED) return;
    const supply = await readGovToken.totalSupply();
    setTotalSupply(Number(formatEther(supply)));

    if (!address) {
      setTokenBalance(0);
      setHasClaimed(false);
      return;
    }
    const [balance, claimed] = await Promise.all([
      readGovToken.balanceOf(address),
      readGovToken.hasClaimed(address),
    ]);
    setTokenBalance(Number(formatEther(balance)));
    setHasClaimed(claimed);
  }, [address, readGovToken]);

  const refreshMyVotes = useCallback(
    async (proposalList) => {
      if (!address || proposalList.length === 0) {
        setMyVotes({});
        return;
      }
      const entries = await Promise.all(
        proposalList.map(async (p) => [p.id, Number(await readGovernance.votesCast(p.id, address))])
      );
      setMyVotes(Object.fromEntries(entries));
    },
    [address, readGovernance]
  );

  const refreshTokenomics = useCallback(async () => {
    if (!IS_CONFIGURED) return;
    const [price, treasuryWei] = await Promise.all([
      readGovToken.tokenPrice(),
      readProvider.getBalance(GOV_TOKEN_ADDRESS),
    ]);
    setTokenPriceValue(price);
    setEthTreasuryBalance(Number(formatEther(treasuryWei)));
  }, [readGovToken]);

  useEffect(() => {
    if (!IS_CONFIGURED) return;
    readGovernance
      .PROPOSAL_THRESHOLD()
      .then((v) => setProposalThreshold(Number(formatEther(v))))
      .catch(() => setProposalThreshold(null));
    readGovToken
      .FAUCET_AMOUNT()
      .then((v) => setFaucetAmount(Number(formatEther(v))))
      .catch(() => setFaucetAmount(null));
    readGovToken
      .owner()
      .then(setOwnerAddress)
      .catch(() => setOwnerAddress(null));
  }, [readGovernance, readGovToken]);

  useEffect(() => {
    refreshTokenomics().catch((err) => console.error("refreshTokenomics failed:", err));
  }, [refreshTokenomics]);

  useEffect(() => {
    refreshProposals().catch((err) => console.error("refreshProposals failed:", err));
  }, [refreshProposals]);

  useEffect(() => {
    refreshBalance().catch((err) => console.error("refreshBalance failed:", err));
  }, [refreshBalance]);

  useEffect(() => {
    if (!IS_CONFIGURED) return;
    readProvider
      .getNetwork()
      .then((n) => {
        if (Number(n.chainId) !== CHAIN_ID) {
          console.warn(
            `[BlockVote] NEXT_PUBLIC_RPC_URL points at chain ${n.chainId}, but NEXT_PUBLIC_CHAIN_ID is set to ${CHAIN_ID}. Reads and the deployed contract addresses may be for different networks — check .env.local.`
          );
        }
      })
      .catch((err) => console.error("Could not verify RPC network:", err));
  }, []);

  useEffect(() => {
    refreshMyVotes(proposals);
  }, [proposals, refreshMyVotes]);

  useEffect(() => {
    // myVotes (populated by refreshMyVotes via plain votesCast() eth_calls —
    // no eth_getLogs, no block-range restriction) is the ground truth for
    // "did this address vote, and what did it choose" on every proposal.
    // Build the list — and the count the UI depends on — from that
    // immediately and synchronously. VoteCast *event logs* are only used
    // afterwards, purely to fill in the exact date/tx hash for display.
    const voteLabel = { [VOTE_TYPE.Yes]: "YES", [VOTE_TYPE.No]: "NO", [VOTE_TYPE.Abstain]: "ABSTAIN" };
    const votedProposals = proposals.filter((p) => (myVotes[p.id] ?? VOTE_TYPE.None) !== VOTE_TYPE.None);

    if (!IS_CONFIGURED || !address || votedProposals.length === 0) {
      setMyVotingHistory([]);
      return;
    }

    const placeholderItems = votedProposals
      .map((proposal) => ({
        id: `${proposal.id}-pending`,
        proposalId: proposal.id,
        proposalTitle: proposal.title,
        vote: voteLabel[myVotes[proposal.id]] ?? "UNKNOWN",
        date: proposal.createdAt,
        txHash: "",
        status: "Confirmed",
      }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    setMyVotingHistory(placeholderItems);

    // allVoteEvents is fetched once by the activity/voters scan below (every
    // VoteCast across every proposal, in one combined range query) — reused
    // here, filtered to this wallet, instead of re-querying VoteCast per
    // proposal for just this address. Nothing to enrich with yet if that
    // scan hasn't resolved (or found nothing) — this effect re-runs once it
    // does, since allVoteEvents is a dependency.
    if (allVoteEvents.length === 0) return;

    let cancelled = false;
    (async () => {
      const myEvents = allVoteEvents.filter((e) => e.args.voter.toLowerCase() === address.toLowerCase());
      if (myEvents.length === 0) return;
      const blocks = await Promise.all(myEvents.map((e) => getBlockCached(e.blockNumber)));
      if (cancelled) return;

      setMyVotingHistory((prev) => {
        const byProposalId = new Map(prev.map((item) => [item.proposalId, item]));
        myEvents.forEach((event, i) => {
          const proposalId = Number(event.args.id);
          const proposal = votedProposals.find((p) => p.id === proposalId);
          if (!proposal) return;
          byProposalId.set(proposalId, {
            id: `${proposalId}-${event.transactionHash}`,
            proposalId,
            proposalTitle: proposal.title,
            vote: voteLabel[Number(event.args.support)] ?? "UNKNOWN",
            date: new Date(Number(blocks[i].timestamp) * 1000).toISOString().slice(0, 10),
            txHash: event.transactionHash,
            status: "Confirmed",
          });
        });
        return votedProposals
          .map((p) => byProposalId.get(p.id))
          .filter(Boolean)
          .sort((a, b) => (a.date < b.date ? 1 : -1));
      });
    })().catch((err) => {
      console.warn("[BlockVote] myVotingHistory: enrichment from allVoteEvents failed:", err);
    });

    return () => {
      cancelled = true;
    };
  }, [address, proposals, myVotes, allVoteEvents]);

  useEffect(() => {
    if (!IS_CONFIGURED || proposals.length === 0) {
      setTotalVoters(0);
      setTopVoters([]);
      setRecentActivity([]);
      setAllVoteEvents([]);
      return;
    }

    // "Created" entries need no event scan at all — startTime/creator are
    // already part of the proposal data refreshProposals() already fetched.
    // Show those immediately, then enrich with Vote/Edit/End/Cancel entries
    // (which do need event logs) in the background.
    const createdEntries = proposals.map((p) => ({
      id: `created-${p.id}`,
      type: "created",
      proposalId: p.id,
      proposalTitle: p.title,
      actor: p.creator,
      timestamp: p.startTime,
    }));
    setRecentActivity(createdEntries.sort((a, b) => b.timestamp - a.timestamp).slice(0, 50));

    let cancelled = false;
    (async () => {
      const latestBlock = await getLatestBlockCached();
      const voteLabel = { [VOTE_TYPE.Yes]: "YES", [VOTE_TYPE.No]: "NO", [VOTE_TYPE.Abstain]: "ABSTAIN" };
      const proposalById = new Map(proposals.map((p) => [p.id, p]));

      // One combined range covering every proposal, then one queryFilter
      // per event type — instead of a fresh blockNumberBefore search (an
      // O(log latestBlock) binary search over getBlock calls) plus up to 4
      // ranged queryFilter calls PER PROPOSAL. Every proposal's own
      // [startTime, endTime] window is fully contained in
      // [earliest proposal's start, latest block], so no events are missed
      // — VoteCast/etc. can only be emitted for a proposal during its own
      // active window anyway (contract-enforced), so a wider scan here
      // finds exactly the same events, just in far fewer RPC round-trips.
      const earliestStart = Math.min(...proposals.map((p) => p.startTime));
      const fromBlock = await blockNumberBeforeCached(earliestStart, latestBlock);
      const toBlock = latestBlock;

      const [voteEvents, updateEvents, endEvents, cancelEvents] = await Promise.all([
        queryFilterChunked(readGovernance, readGovernance.filters.VoteCast(), fromBlock, toBlock),
        queryFilterChunked(readGovernance, readGovernance.filters.ProposalUpdated(), fromBlock, toBlock),
        queryFilterChunked(readGovernance, readGovernance.filters.ProposalEnded(), fromBlock, toBlock),
        queryFilterChunked(readGovernance, readGovernance.filters.ProposalCancelled(), fromBlock, toBlock),
      ]);
      if (cancelled) return;

      setAllVoteEvents(voteEvents);

      const [voteBlocks, updateBlocks, endBlocks, cancelBlocks] = await Promise.all([
        Promise.all(voteEvents.map((e) => getBlockCached(e.blockNumber))),
        Promise.all(updateEvents.map((e) => getBlockCached(e.blockNumber))),
        Promise.all(endEvents.map((e) => getBlockCached(e.blockNumber))),
        Promise.all(cancelEvents.map((e) => getBlockCached(e.blockNumber))),
      ]);
      if (cancelled) return;

      const extra = [];
      voteEvents.forEach((event, i) => {
        const proposal = proposalById.get(Number(event.args.id));
        if (!proposal) return;
        extra.push({
          id: `vote-${proposal.id}-${event.transactionHash}`,
          type: "vote",
          proposalId: proposal.id,
          proposalTitle: proposal.title,
          actor: event.args.voter,
          detail: voteLabel[Number(event.args.support)] ?? "UNKNOWN",
          timestamp: Number(voteBlocks[i].timestamp),
        });
      });
      updateEvents.forEach((event, i) => {
        const proposal = proposalById.get(Number(event.args.id));
        if (!proposal) return;
        extra.push({
          id: `edit-${proposal.id}-${event.transactionHash}`,
          type: "edit",
          proposalId: proposal.id,
          proposalTitle: event.args.title,
          actor: event.args.creator,
          timestamp: Number(updateBlocks[i].timestamp),
        });
      });
      endEvents.forEach((event, i) => {
        const proposal = proposalById.get(Number(event.args.id));
        if (!proposal) return;
        extra.push({
          id: `end-${proposal.id}-${event.transactionHash}`,
          type: "end",
          proposalId: proposal.id,
          proposalTitle: proposal.title,
          actor: event.args.creator,
          timestamp: Number(endBlocks[i].timestamp),
        });
      });
      cancelEvents.forEach((event, i) => {
        const proposal = proposalById.get(Number(event.args.id));
        if (!proposal) return;
        extra.push({
          id: `cancel-${proposal.id}-${event.transactionHash}`,
          type: "cancel",
          proposalId: proposal.id,
          proposalTitle: proposal.title,
          actor: event.args.creator,
          timestamp: Number(cancelBlocks[i].timestamp),
        });
      });

      if (cancelled) return;
      setRecentActivity(
        [...createdEntries, ...extra].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50)
      );

      const byVoter = new Map();
      for (const event of voteEvents) {
        const voter = event.args.voter.toLowerCase();
        byVoter.set(voter, (byVoter.get(voter) ?? 0) + 1);
      }
      setTotalVoters(byVoter.size);

      const entries = await Promise.all(
        Array.from(byVoter.entries()).map(async ([voter, votes]) => ({
          address: voter,
          votes,
          power: Number(formatEther(await readGovToken.balanceOf(voter))),
        }))
      );
      entries.sort((a, b) => b.votes - a.votes || b.power - a.power);
      if (!cancelled) {
        setTopVoters(
          entries.slice(0, 5).map((entry, index) => ({
            rank: index + 1,
            address: entry.address,
            votes: entry.votes,
            power: entry.power,
            participation: proposals.length > 0 ? Math.round((entry.votes / proposals.length) * 100) : 0,
          }))
        );
      }
    })().catch((err) => {
      console.error("[BlockVote] activity/voters scan failed:", err);
      if (!cancelled) {
        setTotalVoters(0);
        setTopVoters([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [proposals, readGovernance, readGovToken]);

  // Buy/claim activity, scanned once from the token contract's own history
  // rather than per-proposal (there's no proposal to anchor a block range
  // to). TokensPurchased already names "buy" transactions directly; a
  // "claim" has no dedicated event, so it's derived from the ERC20 Transfer
  // that claim()'s _mint() emits (from the zero address) — excluding any
  // such Transfer that shares a transaction hash with a TokensPurchased
  // event (that mint was a buy, not a claim) and excluding the one-time
  // constructor mint (identified by its exact INITIAL_SUPPLY amount, which
  // claim()'s fixed FAUCET_AMOUNT can never equal).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!IS_CONFIGURED) {
        setTokenActivity([]);
        return;
      }
      const latestBlock = await getLatestBlockCached();
      const [purchaseEvents, mintEvents, initialSupply] = await Promise.all([
        queryFilterChunked(readGovToken, readGovToken.filters.TokensPurchased(), 0, latestBlock),
        queryFilterChunked(readGovToken, readGovToken.filters.Transfer(ZeroAddress), 0, latestBlock),
        readGovToken.INITIAL_SUPPLY(),
      ]);
      if (cancelled) return;

      const purchaseTxHashes = new Set(purchaseEvents.map((e) => e.transactionHash));
      const claimEvents = mintEvents.filter(
        (e) => !purchaseTxHashes.has(e.transactionHash) && e.args.value !== initialSupply
      );

      const [purchaseBlocks, claimBlocks] = await Promise.all([
        Promise.all(purchaseEvents.map((e) => getBlockCached(e.blockNumber))),
        Promise.all(claimEvents.map((e) => getBlockCached(e.blockNumber))),
      ]);
      if (cancelled) return;

      const entries = [];
      purchaseEvents.forEach((event, i) => {
        entries.push({
          id: `buy-${event.transactionHash}`,
          type: "buy",
          actor: event.args.buyer,
          timestamp: Number(purchaseBlocks[i].timestamp),
        });
      });
      claimEvents.forEach((event, i) => {
        entries.push({
          id: `claim-${event.transactionHash}`,
          type: "claim",
          actor: event.args.to,
          timestamp: Number(claimBlocks[i].timestamp),
        });
      });
      if (!cancelled) setTokenActivity(entries);
    })().catch((err) => {
      console.error("[BlockVote] token activity scan failed:", err);
      if (!cancelled) setTokenActivity([]);
    });

    return () => {
      cancelled = true;
    };
  }, [readGovToken]);

  // Combined, chronological (newest-first) feed of every activity type —
  // proposal-related (recentActivity) and token-related (tokenActivity).
  // Dashboard filters this by connected wallet for "my activity"; Results
  // shows it unfiltered as the public system-wide feed.
  const activityFeed = useMemo(
    () => [...recentActivity, ...tokenActivity].sort((a, b) => b.timestamp - a.timestamp),
    [recentActivity, tokenActivity]
  );

  const claimTokens = useCallback(async () => {
    const { govToken } = await getSignerContracts();
    const network = await govToken.runner.provider.getNetwork();
    console.log("[BlockVote] claimTokens() -> GovToken.claim()", {
      wallet: address,
      chainId: Number(network.chainId),
      contract: GOV_TOKEN_ADDRESS,
      args: [],
      tokenBalance,
      hasClaimed,
    });
    let receipt;
    try {
      const tx = await govToken.claim();
      console.log("[BlockVote] claimTokens() tx sent:", tx.hash);
      receipt = await tx.wait();
      console.log("[BlockVote] claimTokens() confirmed:", receipt.hash, "status:", receipt.status);
    } catch (err) {
      console.error("[BlockVote] claimTokens() reverted:", describeTxError(err), err);
      throw err;
    }
    // The transaction is already confirmed on-chain past this point — a
    // failure here is a local state-refresh issue, not a reason to report
    // the (already-successful) transaction as failed.
    try {
      await refreshBalance();
    } catch (err) {
      console.warn("[BlockVote] claimTokens() confirmed but refreshBalance() failed:", err);
    }
  }, [getSignerContracts, refreshBalance, address, tokenBalance, hasClaimed]);

  const buyTokens = useCallback(
    async (ethAmount) => {
      const { govToken } = await getSignerContracts();
      const network = await govToken.runner.provider.getNetwork();
      const value = parseEther(String(ethAmount));
      console.log("[BlockVote] buyTokens() -> GovToken.buyTokens()", {
        wallet: address,
        chainId: Number(network.chainId),
        contract: GOV_TOKEN_ADDRESS,
        ethAmount,
        valueWei: value.toString(),
        tokenPrice: tokenPrice?.toString(),
      });
      let receipt;
      try {
        const tx = await govToken.buyTokens({ value });
        console.log("[BlockVote] buyTokens() tx sent:", tx.hash);
        receipt = await tx.wait();
        console.log("[BlockVote] buyTokens() confirmed:", receipt.hash, "status:", receipt.status);
      } catch (err) {
        console.error("[BlockVote] buyTokens() reverted:", describeTxError(err), err);
        throw err;
      }
      try {
        await Promise.all([refreshBalance(), refreshTokenomics()]);
      } catch (err) {
        console.warn("[BlockVote] buyTokens() confirmed but refresh failed:", err);
      }
      return receipt.hash;
    },
    [getSignerContracts, refreshBalance, refreshTokenomics, address, tokenPrice]
  );

  const setTokenPrice = useCallback(
    async (newPriceWei) => {
      const { govToken } = await getSignerContracts();
      const network = await govToken.runner.provider.getNetwork();
      console.log("[BlockVote] setTokenPrice() -> GovToken.setTokenPrice()", {
        wallet: address,
        chainId: Number(network.chainId),
        contract: GOV_TOKEN_ADDRESS,
        newPriceWei: newPriceWei.toString(),
      });
      let receipt;
      try {
        const tx = await govToken.setTokenPrice(newPriceWei);
        console.log("[BlockVote] setTokenPrice() tx sent:", tx.hash);
        receipt = await tx.wait();
        console.log("[BlockVote] setTokenPrice() confirmed:", receipt.hash, "status:", receipt.status);
      } catch (err) {
        console.error("[BlockVote] setTokenPrice() reverted:", describeTxError(err), err);
        throw err;
      }
      try {
        await refreshTokenomics();
      } catch (err) {
        console.warn("[BlockVote] setTokenPrice() confirmed but refreshTokenomics() failed:", err);
      }
      return receipt.hash;
    },
    [getSignerContracts, refreshTokenomics, address]
  );

  const withdrawETH = useCallback(async () => {
    const { govToken } = await getSignerContracts();
    const network = await govToken.runner.provider.getNetwork();
    console.log("[BlockVote] withdrawETH() -> GovToken.withdrawETH()", {
      wallet: address,
      chainId: Number(network.chainId),
      contract: GOV_TOKEN_ADDRESS,
    });
    let receipt;
    try {
      const tx = await govToken.withdrawETH();
      console.log("[BlockVote] withdrawETH() tx sent:", tx.hash);
      receipt = await tx.wait();
      console.log("[BlockVote] withdrawETH() confirmed:", receipt.hash, "status:", receipt.status);
    } catch (err) {
      console.error("[BlockVote] withdrawETH() reverted:", describeTxError(err), err);
      throw err;
    }
    try {
      await refreshTokenomics();
    } catch (err) {
      console.warn("[BlockVote] withdrawETH() confirmed but refreshTokenomics() failed:", err);
    }
    return receipt.hash;
  }, [getSignerContracts, refreshTokenomics, address]);

  const createProposal = useCallback(
    async (title, description, category, votingPeriodSeconds) => {
      const { governance } = await getSignerContracts();
      const network = await governance.runner.provider.getNetwork();
      console.log("[BlockVote] createProposal() -> Governance.createProposal()", {
        wallet: address,
        chainId: Number(network.chainId),
        contract: GOVERNANCE_ADDRESS,
        args: [title, description, category, votingPeriodSeconds],
        tokenBalance,
        proposalThreshold,
      });
      let receipt;
      try {
        const tx = await governance.createProposal(title, description, category, votingPeriodSeconds);
        console.log("[BlockVote] createProposal() tx sent:", tx.hash);
        receipt = await tx.wait();
        console.log("[BlockVote] createProposal() confirmed:", receipt.hash, "status:", receipt.status);
      } catch (err) {
        console.error("[BlockVote] createProposal() reverted:", describeTxError(err), err);
        throw err;
      }
      try {
        await refreshProposals();
      } catch (err) {
        console.warn("[BlockVote] createProposal() confirmed but refreshProposals() failed:", err);
      }
      return receipt.hash;
    },
    [getSignerContracts, refreshProposals, address, tokenBalance, proposalThreshold]
  );

  const castVote = useCallback(
    async (id, support) => {
      const { governance } = await getSignerContracts();
      const network = await governance.runner.provider.getNetwork();
      console.log("[BlockVote] castVote() -> Governance.castVote()", {
        wallet: address,
        chainId: Number(network.chainId),
        contract: GOVERNANCE_ADDRESS,
        args: [id, support],
        tokenBalance,
        alreadyVoted: myVotes[id],
      });
      try {
        const tx = await governance.castVote(id, support);
        console.log("[BlockVote] castVote() tx sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("[BlockVote] castVote() confirmed:", receipt.hash, "status:", receipt.status);
      } catch (err) {
        console.error("[BlockVote] castVote() reverted:", describeTxError(err), err);
        throw err;
      }
      try {
        await Promise.all([refreshProposals(), refreshBalance()]);
      } catch (err) {
        console.warn("[BlockVote] castVote() confirmed but refresh failed:", err);
      }
    },
    [getSignerContracts, refreshProposals, refreshBalance, address, tokenBalance, myVotes]
  );

  const endProposal = useCallback(
    async (id) => {
      const { governance } = await getSignerContracts();
      const network = await governance.runner.provider.getNetwork();
      console.log("[BlockVote] endProposal() -> Governance.endProposal()", {
        wallet: address,
        chainId: Number(network.chainId),
        contract: GOVERNANCE_ADDRESS,
        args: [id],
      });
      let receipt;
      try {
        const tx = await governance.endProposal(id);
        console.log("[BlockVote] endProposal() tx sent:", tx.hash);
        receipt = await tx.wait();
        console.log("[BlockVote] endProposal() confirmed:", receipt.hash, "status:", receipt.status);
      } catch (err) {
        console.error("[BlockVote] endProposal() reverted:", describeTxError(err), err);
        throw err;
      }
      try {
        await refreshProposals();
      } catch (err) {
        console.warn("[BlockVote] endProposal() confirmed but refreshProposals() failed:", err);
      }
      return receipt.hash;
    },
    [getSignerContracts, refreshProposals, address]
  );

  const updateProposal = useCallback(
    async (id, title, description) => {
      const { governance } = await getSignerContracts();
      const network = await governance.runner.provider.getNetwork();
      console.log("[BlockVote] updateProposal() -> Governance.updateProposal()", {
        wallet: address,
        chainId: Number(network.chainId),
        contract: GOVERNANCE_ADDRESS,
        args: [id, title, description],
      });
      let receipt;
      try {
        const tx = await governance.updateProposal(id, title, description);
        console.log("[BlockVote] updateProposal() tx sent:", tx.hash);
        receipt = await tx.wait();
        console.log("[BlockVote] updateProposal() confirmed:", receipt.hash, "status:", receipt.status);
      } catch (err) {
        console.error("[BlockVote] updateProposal() reverted:", describeTxError(err), err);
        throw err;
      }
      try {
        await refreshProposals();
      } catch (err) {
        console.warn("[BlockVote] updateProposal() confirmed but refreshProposals() failed:", err);
      }
      return receipt.hash;
    },
    [getSignerContracts, refreshProposals, address]
  );

  const cancelProposal = useCallback(
    async (id) => {
      const { governance } = await getSignerContracts();
      const network = await governance.runner.provider.getNetwork();
      console.log("[BlockVote] cancelProposal() -> Governance.cancelProposal()", {
        wallet: address,
        chainId: Number(network.chainId),
        contract: GOVERNANCE_ADDRESS,
        args: [id],
      });
      let receipt;
      try {
        const tx = await governance.cancelProposal(id);
        console.log("[BlockVote] cancelProposal() tx sent:", tx.hash);
        receipt = await tx.wait();
        console.log("[BlockVote] cancelProposal() confirmed:", receipt.hash, "status:", receipt.status);
      } catch (err) {
        console.error("[BlockVote] cancelProposal() reverted:", describeTxError(err), err);
        throw err;
      }
      try {
        await refreshProposals();
      } catch (err) {
        console.warn("[BlockVote] cancelProposal() confirmed but refreshProposals() failed:", err);
      }
      return receipt.hash;
    },
    [getSignerContracts, refreshProposals, address]
  );

  const getCreationTxHash = useCallback(
    async (id) => {
      const proposal = proposals.find((p) => p.id === id);
      const latestBlock = await getLatestBlockCached();
      // ProposalCreated fires in the same block as startTime is recorded, so
      // this only needs a tiny window around that instant — not the whole
      // history up to latestBlock.
      const fromBlock = proposal ? await blockNumberBeforeCached(proposal.startTime, latestBlock) : 0;
      const toBlock = Math.min(fromBlock + 2, latestBlock);
      const events = await queryFilterChunked(
        readGovernance,
        readGovernance.filters.ProposalCreated(id),
        fromBlock,
        toBlock
      );
      return events[0]?.transactionHash ?? null;
    },
    [readGovernance, proposals]
  );

  const myCreatedProposals = useMemo(
    () => proposals.filter((p) => address && p.creator.toLowerCase() === address.toLowerCase()),
    [proposals, address]
  );

  const votingPowerPct = totalSupply > 0 ? (tokenBalance / totalSupply) * 100 : 0;
  const isOwner = !!address && !!ownerAddress && address.toLowerCase() === ownerAddress.toLowerCase();
  const tokenPriceEth = tokenPrice !== null ? Number(formatEther(tokenPrice)) : null;

  // Cancelled proposals were withdrawn before any vote could happen, so they
  // carry no pass/fail signal — excluded from the pass-rate denominator the
  // same way "active" (not yet decided) proposals already are.
  const finishedProposals = proposals.filter((p) => p.status !== "active" && p.status !== "cancelled");
  const passedCount = proposals.filter((p) => p.status === "passed").length;
  const passRate =
    finishedProposals.length > 0 ? Math.round((passedCount / finishedProposals.length) * 100 * 10) / 10 : 0;
  const avgParticipation =
    proposals.length > 0 && totalSupply > 0
      ? Math.round(
          (proposals.reduce((sum, p) => sum + (p.votesYes + p.votesNo + p.votesAbstain) / totalSupply, 0) /
            proposals.length) *
            100 *
            10
        ) / 10
      : 0;

  const platformStats = {
    totalProposals: proposals.length,
    activeProposals: proposals.filter((p) => p.status === "active").length,
    totalVoters,
    governanceTokens: totalSupply,
    passRate,
    avgParticipation,
  };

  const value = {
    isConfigured: IS_CONFIGURED,
    proposals,
    loadingProposals,
    refreshProposals,
    tokenBalance,
    totalSupply,
    votingPowerPct,
    platformStats,
    hasClaimed,
    claimTokens,
    createProposal,
    castVote,
    endProposal,
    updateProposal,
    cancelProposal,
    myVotes,
    myCreatedProposals,
    myVotingHistory,
    recentActivity,
    activityFeed,
    topVoters,
    getCreationTxHash,
    VOTE_TYPE,
    proposalThreshold,
    faucetAmount,
    tokenPrice,
    tokenPriceEth,
    ethTreasuryBalance,
    ownerAddress,
    isOwner,
    buyTokens,
    setTokenPrice,
    withdrawETH,
  };

  return <GovernanceContext.Provider value={value}>{children}</GovernanceContext.Provider>;
}

export function useGovernance() {
  const ctx = useContext(GovernanceContext);
  if (!ctx) throw new Error("useGovernance must be used within a GovernanceProvider");
  return ctx;
}
