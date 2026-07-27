"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  MinusCircle,
  User,
  Calendar,
  Clock3,
  Hash,
  Network,
  Loader2,
} from "lucide-react";
import AmbientBackground from "@/app/components/AmbientBackground";
import { useWallet } from "@/lib/WalletContext";
import { useGovernance } from "@/lib/GovernanceContext";
import { statusLabels } from "@/lib/uiConstants";

function shortenAddress(addr) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function shortenHash(hash) {
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}

const voteButtonColors = {
  emerald: {
    base: "border-white/10 bg-white/5 text-slate-300 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-400",
    active: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  },
  red: {
    base: "border-white/10 bg-white/5 text-slate-300 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400",
    active: "border-red-500/50 bg-red-500/10 text-red-400",
  },
  slate: {
    base: "border-white/10 bg-white/5 text-slate-300 hover:border-slate-400/40 hover:bg-white/10 hover:text-white",
    active: "border-slate-400/50 bg-white/10 text-white",
  },
};

function MetaItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-blue-400">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="mt-1 truncate text-sm font-medium text-white">{value}</p>
      </div>
    </div>
  );
}

function VoteButton({ label, icon: Icon, active, disabled, onClick, color }) {
  const styles = voteButtonColors[color];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 rounded-2xl border px-6 py-4 text-sm font-semibold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60 ${
        active ? styles.active : styles.base
      }`}
    >
      <Icon size={18} />
      {label}
    </button>
  );
}

function ResultBar({ label, count, percent, color, textColor }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className={`font-medium ${textColor}`}>{label}</span>
        <span className="text-slate-400">
          {count.toLocaleString()} Votes ({percent}%)
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export default function ProposalDetailPage({ params }) {
  const { id } = use(params);
  const { address, chainName } = useWallet();
  const { proposals, loadingProposals, myVotes, castVote, getCreationTxHash, VOTE_TYPE } =
    useGovernance();

  const proposal = proposals.find((p) => p.id === Number(id));
  const [txHash, setTxHash] = useState(null);
  const [isVoting, setIsVoting] = useState(false);
  const [voteError, setVoteError] = useState(null);

  useEffect(() => {
    if (!proposal) return;
    getCreationTxHash(proposal.id).then(setTxHash).catch(() => setTxHash(null));
  }, [proposal, getCreationTxHash]);

  if (loadingProposals) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center bg-[#060816] px-6 text-center text-slate-400">
        กำลังโหลดข้อมูลจาก Blockchain...
      </section>
    );
  }

  if (!proposal) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center bg-[#060816] px-6 text-center">
        <div>
          <h1 className="text-2xl font-bold text-white">ไม่พบข้อเสนอนี้</h1>
          <p className="mt-3 text-sm text-slate-400">
            ข้อเสนอหมายเลข #{id} ไม่มีอยู่ในระบบ
          </p>
          <Link href="/proposals" className="secondary-btn mt-8 inline-flex">
            กลับไปหน้าข้อเสนอทั้งหมด
          </Link>
        </div>
      </section>
    );
  }

  const votes = { yes: proposal.votesYes, no: proposal.votesNo, abstain: proposal.votesAbstain };
  const total = votes.yes + votes.no + votes.abstain;
  const pct = (n) => (total === 0 ? 0 : Math.round((n / total) * 100));
  const status = statusLabels[proposal.status];

  const myVoteCode = myVotes[proposal.id] ?? VOTE_TYPE.None;
  const myVoteLabel = { [VOTE_TYPE.Yes]: "yes", [VOTE_TYPE.No]: "no", [VOTE_TYPE.Abstain]: "abstain" }[
    myVoteCode
  ];
  const hasVoted = myVoteCode !== VOTE_TYPE.None;
  const canVote = proposal.status === "active" && !!address;

  async function handleVote(choice) {
    if (hasVoted || isVoting || !canVote) return;
    setVoteError(null);
    setIsVoting(true);
    try {
      await castVote(proposal.id, VOTE_TYPE[choice]);
    } catch (err) {
      setVoteError(err?.shortMessage || err?.message || "ไม่สามารถส่งคะแนนโหวตได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsVoting(false);
    }
  }

  return (
        <section className="relative overflow-hidden bg-[#060816] py-16">
          <AmbientBackground />

          <div className="container max-w-5xl">
            <Link
              href="/proposals"
              className="fade-up mb-8 inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
            >
              <ArrowLeft size={16} />
              กลับไปหน้าข้อเสนอทั้งหมด
            </Link>

            {/* Header card */}
            <div className="fade-up rounded-[32px] border border-white/10 bg-[#111725] p-8 lg:p-10">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
                  #{proposal.id}
                </span>
                <span
                  className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${status.bg} ${status.color}`}
                >
                  <CheckCircle2 size={14} />
                  {status.text}
                </span>
              </div>

              <h1 className="mt-6 text-2xl font-bold leading-snug text-white lg:text-3xl">
                {proposal.title}
              </h1>

              <p className="mt-5 max-w-3xl text-sm leading-8 text-slate-400 lg:text-base">
                {proposal.description}
              </p>

              {/* Meta grid */}
              <div className="mt-8 grid gap-5 border-t border-white/5 pt-8 sm:grid-cols-2 lg:grid-cols-4">
                <MetaItem icon={User} label="ผู้สร้าง" value={shortenAddress(proposal.creator)} />
                <MetaItem icon={Calendar} label="วันที่สร้าง" value={proposal.createdAt} />
                <MetaItem icon={Clock3} label="Voting Deadline" value={proposal.votingDeadline} />
                <MetaItem icon={Network} label="Network" value={chainName ?? "Sepolia"} />
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <Hash size={14} className="text-slate-500" />
                <span>Transaction Hash:</span>
                <span className="font-mono text-slate-300">
                  {txHash ? shortenHash(txHash) : "กำลังโหลด..."}
                </span>
              </div>
            </div>

            {/* Vote panel */}
            <div
              className="fade-up mt-8 rounded-[32px] border border-white/10 bg-[#111725] p-8 lg:p-10"
              style={{ animationDelay: "100ms" }}
            >
              <h2 className="text-lg font-semibold text-white">ร่วมลงคะแนน</h2>
              <p className="mt-2 text-sm text-slate-400">
                {address
                  ? "การโหวตของคุณจะถูกบันทึกลง Smart Contract จริงบนเครือข่าย"
                  : "กรุณาเชื่อมต่อกระเป๋าเพื่อลงคะแนนบน Smart Contract จริง"}
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <VoteButton
                  label="YES"
                  icon={CheckCircle2}
                  active={myVoteLabel === "yes"}
                  disabled={hasVoted || isVoting || !canVote}
                  onClick={() => handleVote("Yes")}
                  color="emerald"
                />
                <VoteButton
                  label="NO"
                  icon={XCircle}
                  active={myVoteLabel === "no"}
                  disabled={hasVoted || isVoting || !canVote}
                  onClick={() => handleVote("No")}
                  color="red"
                />
                <VoteButton
                  label="ABSTAIN"
                  icon={MinusCircle}
                  active={myVoteLabel === "abstain"}
                  disabled={hasVoted || isVoting || !canVote}
                  onClick={() => handleVote("Abstain")}
                  color="slate"
                />
              </div>

              {isVoting && (
                <div className="mt-5 flex items-center gap-2 text-sm text-blue-400">
                  <Loader2 size={16} className="animate-spin" />
                  กำลังส่งธุรกรรมไปยัง Smart Contract...
                </div>
              )}

              {voteError && (
                <div className="mt-5 flex items-center gap-2 text-sm text-red-400">
                  <XCircle size={16} />
                  {voteError}
                </div>
              )}

              {hasVoted && !isVoting && (
                <div className="mt-5 flex items-center gap-2 text-sm text-emerald-400">
                  <CheckCircle2 size={16} />
                  บันทึกคะแนนของคุณเรียบร้อยแล้ว ({myVoteLabel?.toUpperCase()})
                </div>
              )}

              {!canVote && proposal.status !== "active" && (
                <p className="mt-5 text-sm text-slate-400">การโหวตปิดแล้ว</p>
              )}
            </div>

            {/* Results */}
            <div
              className="fade-up mt-8 rounded-[32px] border border-white/10 bg-[#111725] p-8 lg:p-10"
              style={{ animationDelay: "180ms" }}
            >
              <h2 className="text-lg font-semibold text-white">
                ผลการลงคะแนนปัจจุบัน
              </h2>

              <div className="mt-6 space-y-6">
                <ResultBar
                  label="YES"
                  count={votes.yes}
                  percent={pct(votes.yes)}
                  color="bg-emerald-500"
                  textColor="text-emerald-400"
                />
                <ResultBar
                  label="NO"
                  count={votes.no}
                  percent={pct(votes.no)}
                  color="bg-red-500"
                  textColor="text-red-400"
                />
                <ResultBar
                  label="ABSTAIN"
                  count={votes.abstain}
                  percent={pct(votes.abstain)}
                  color="bg-slate-400"
                  textColor="text-slate-300"
                />
              </div>

              <p className="mt-6 text-sm text-slate-400">
                รวมทั้งหมด {total.toLocaleString()} Votes
              </p>
            </div>
          </div>
        </section>
  );
}
