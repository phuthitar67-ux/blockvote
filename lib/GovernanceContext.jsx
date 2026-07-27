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
  GOV_TOKEN_ABI,
  GOV_TOKEN_ADDRESS,
  GOVERNANCE_ABI,
  GOVERNANCE_ADDRESS,
  IS_CONFIGURED,
  RPC_URL,
  VOTE_TYPE,
} from "@/lib/web3/config";
import { normalizeProposal } from "@/lib/web3/format";

const GovernanceContext = createContext(null);

const readProvider = new JsonRpcProvider(RPC_URL);

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
    refreshProposals();
  }, [refreshProposals]);

  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  useEffect(() => {
    refreshMyVotes(proposals);
  }, [proposals, refreshMyVotes]);

  useEffect(() => {
    if (!IS_CONFIGURED || !address || proposals.length === 0) {
      setMyVotingHistory([]);
      return;
    }
    let cancelled = false;
    readGovernance
      .queryFilter(readGovernance.filters.VoteCast(null, address))
      .then(async (events) => {
        const voteLabel = { [VOTE_TYPE.Yes]: "YES", [VOTE_TYPE.No]: "NO", [VOTE_TYPE.Abstain]: "ABSTAIN" };
        const proposalsById = Object.fromEntries(proposals.map((p) => [p.id, p]));
        const items = await Promise.all(
          events.map(async (event) => {
            const block = await event.getBlock();
            const proposalId = Number(event.args.id);
            return {
              id: `${proposalId}-${event.transactionHash}`,
              proposalId,
              proposalTitle: proposalsById[proposalId]?.title ?? `Proposal #${proposalId}`,
              vote: voteLabel[Number(event.args.support)] ?? "UNKNOWN",
              date: new Date(Number(block.timestamp) * 1000).toISOString().slice(0, 10),
              txHash: event.transactionHash,
              status: "Confirmed",
            };
          })
        );
        if (!cancelled) {
          items.sort((a, b) => (a.date < b.date ? 1 : -1));
          setMyVotingHistory(items);
        }
      })
      .catch(() => !cancelled && setMyVotingHistory([]));
    return () => {
      cancelled = true;
    };
  }, [address, proposals, readGovernance]);

  useEffect(() => {
    if (!IS_CONFIGURED) return;
    readGovernance
      .queryFilter(readGovernance.filters.VoteCast())
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
    const tx = await govToken.claim();
    await tx.wait();
    await refreshBalance();
  }, [getSignerContracts, refreshBalance]);

  const createProposal = useCallback(
    async (title, description, category, votingPeriodSeconds) => {
      const { governance } = await getSignerContracts();
      const tx = await governance.createProposal(title, description, category, votingPeriodSeconds);
      const receipt = await tx.wait();
      await refreshProposals();
      return receipt.hash;
    },
    [getSignerContracts, refreshProposals]
  );

  const castVote = useCallback(
    async (id, support) => {
      const { governance } = await getSignerContracts();
      const tx = await governance.castVote(id, support);
      await tx.wait();
      await Promise.all([refreshProposals(), refreshBalance()]);
    },
    [getSignerContracts, refreshProposals, refreshBalance]
  );

  const getCreationTxHash = useCallback(async (id) => {
    const events = await readGovernance.queryFilter(readGovernance.filters.ProposalCreated(id));
    return events[0]?.transactionHash ?? null;
  }, [readGovernance]);

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
    PROPOSAL_THRESHOLD: 1000,
  };

  return <GovernanceContext.Provider value={value}>{children}</GovernanceContext.Provider>;
}

export function useGovernance() {
  const ctx = useContext(GovernanceContext);
  if (!ctx) throw new Error("useGovernance must be used within a GovernanceProvider");
  return ctx;
}
