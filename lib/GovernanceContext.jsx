"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { BrowserProvider, Contract, JsonRpcProvider, formatEther } from "ethers";
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

// Binary-searches for the highest block whose timestamp is <= targetTimestamp.
// Unlike eth_getLogs, eth_getBlockByNumber for old blocks isn't gated behind
// an "archive" tier on the providers this app has been tested against, so
// this safely narrows a log-query range without ever scanning from genesis.
async function blockNumberBefore(targetTimestamp, latestBlock) {
  let lo = 0;
  let hi = latestBlock;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const block = await readProvider.getBlock(mid);
    if (block && Number(block.timestamp) <= targetTimestamp) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo;
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
  const [proposalThreshold, setProposalThreshold] = useState(null);
  const [faucetAmount, setFaucetAmount] = useState(null);

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
  }, [readGovernance, readGovToken]);

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
    // afterwards, in the background, purely to fill in the exact date/tx
    // hash for display; on a rate-limited RPC that scan can take minutes
    // or fail outright, but it must never block or shrink the count/list
    // the user already sees (that was the actual bug: the count previously
    // depended entirely on the slow/fragile log scan finishing first).
    const voteLabel = { [VOTE_TYPE.Yes]: "YES", [VOTE_TYPE.No]: "NO", [VOTE_TYPE.Abstain]: "ABSTAIN" };
    const votedProposals = proposals.filter((p) => (myVotes[p.id] ?? VOTE_TYPE.None) !== VOTE_TYPE.None);

    if (!IS_CONFIGURED || !address || votedProposals.length === 0) {
      console.log("[BlockVote] myVotingHistory: no voted proposals for", address, "=> []", { proposals, myVotes });
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
    console.log("[BlockVote] myVotingHistory: VoteCast events found so far => 0 (built from votesCast() instead)");
    console.log("[BlockVote] myVotingHistory: value before setState =>", placeholderItems);
    setMyVotingHistory(placeholderItems);
    console.log("[BlockVote] myVotingHistory: value after setState (count is final; dates/tx hashes enrich in background) =>", placeholderItems);

    let cancelled = false;
    (async () => {
      const latestBlock = await readProvider.getBlockNumber();
      for (const proposal of votedProposals) {
        if (cancelled) return;
        try {
          const fromBlock = await blockNumberBefore(proposal.startTime, latestBlock);
          const toBlock = Math.min((await blockNumberBefore(proposal.endTime, latestBlock)) + 2, latestBlock);
          const events = await queryFilterChunked(
            readGovernance,
            readGovernance.filters.VoteCast(proposal.id, address),
            fromBlock,
            toBlock
          );
          console.log(`[BlockVote] myVotingHistory: proposal #${proposal.id} VoteCast events found =>`, events.length, events);
          if (events.length === 0 || cancelled) continue;
          const event = events[0];
          const block = await event.getBlock();
          const enriched = {
            id: `${proposal.id}-${event.transactionHash}`,
            proposalId: proposal.id,
            proposalTitle: proposal.title,
            vote: voteLabel[Number(event.args.support)] ?? "UNKNOWN",
            date: new Date(Number(block.timestamp) * 1000).toISOString().slice(0, 10),
            txHash: event.transactionHash,
            status: "Confirmed",
          };
          if (!cancelled) {
            setMyVotingHistory((prev) => {
              const next = prev.map((item) => (item.proposalId === proposal.id ? enriched : item));
              console.log("[BlockVote] myVotingHistory: value after enrichment for proposal", proposal.id, "=>", next);
              return next;
            });
          }
        } catch (err) {
          console.warn(
            `[BlockVote] myVotingHistory: background enrichment failed for proposal #${proposal.id} (count/list already shown, unaffected):`,
            err
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address, proposals, readGovernance, myVotes]);

  useEffect(() => {
    if (!IS_CONFIGURED || proposals.length === 0) {
      setTotalVoters(0);
      setTopVoters([]);
      return;
    }
    (async () => {
      const latestBlock = await readProvider.getBlockNumber();
      const events = [];
      for (const proposal of proposals) {
        const fromBlock = await blockNumberBefore(proposal.startTime, latestBlock);
        const toBlock = Math.min(await blockNumberBefore(proposal.endTime, latestBlock) + 2, latestBlock);
        events.push(
          ...(await queryFilterChunked(
            readGovernance,
            readGovernance.filters.VoteCast(proposal.id),
            fromBlock,
            toBlock
          ))
        );
      }
      return events;
    })()
      .then(async (events) => {
        const byVoter = new Map();
        for (const event of events) {
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
        setTopVoters(
          entries.slice(0, 5).map((entry, index) => ({
            rank: index + 1,
            address: entry.address,
            votes: entry.votes,
            power: entry.power,
            participation: proposals.length > 0 ? Math.round((entry.votes / proposals.length) * 100) : 0,
          }))
        );
      })
      .catch(() => {
        setTotalVoters(0);
        setTopVoters([]);
      });
  }, [proposals, readGovernance, readGovToken]);

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
    try {
      const tx = await govToken.claim();
      console.log("[BlockVote] claimTokens() tx sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("[BlockVote] claimTokens() confirmed:", receipt.hash, "status:", receipt.status);
      await refreshBalance();
    } catch (err) {
      console.error("[BlockVote] claimTokens() reverted:", describeTxError(err), err);
      throw err;
    }
  }, [getSignerContracts, refreshBalance, address, tokenBalance, hasClaimed]);

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
      try {
        const tx = await governance.createProposal(title, description, category, votingPeriodSeconds);
        console.log("[BlockVote] createProposal() tx sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("[BlockVote] createProposal() confirmed:", receipt.hash, "status:", receipt.status);
        await refreshProposals();
        return receipt.hash;
      } catch (err) {
        console.error("[BlockVote] createProposal() reverted:", describeTxError(err), err);
        throw err;
      }
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
        await Promise.all([refreshProposals(), refreshBalance()]);
      } catch (err) {
        console.error("[BlockVote] castVote() reverted:", describeTxError(err), err);
        throw err;
      }
    },
    [getSignerContracts, refreshProposals, refreshBalance, address, tokenBalance, myVotes]
  );

  const getCreationTxHash = useCallback(
    async (id) => {
      const proposal = proposals.find((p) => p.id === id);
      const latestBlock = await readProvider.getBlockNumber();
      // ProposalCreated fires in the same block as startTime is recorded, so
      // this only needs a tiny window around that instant — not the whole
      // history up to latestBlock.
      const fromBlock = proposal ? await blockNumberBefore(proposal.startTime, latestBlock) : 0;
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

  const finishedProposals = proposals.filter((p) => p.status !== "active");
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
    myVotes,
    myCreatedProposals,
    myVotingHistory,
    topVoters,
    getCreationTxHash,
    VOTE_TYPE,
    proposalThreshold,
    faucetAmount,
  };

  return <GovernanceContext.Provider value={value}>{children}</GovernanceContext.Provider>;
}

export function useGovernance() {
  const ctx = useContext(GovernanceContext);
  if (!ctx) throw new Error("useGovernance must be used within a GovernanceProvider");
  return ctx;
}
