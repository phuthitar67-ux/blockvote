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
  Pencil,
  StopCircle,
  Ban,
} from "lucide-react";
import AmbientBackground from "@/app/components/AmbientBackground";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { useWallet } from "@/lib/WalletContext";
import { useGovernance } from "@/lib/GovernanceContext";
import { useToast } from "@/lib/ToastContext";
import { describeTxError } from "@/lib/web3/errors";
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
      className={`flex items-center justify-center gap-2 rounded-2xl border px-6 py-4 text-sm font-semibold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${
        active ? styles.active : styles.base
      }`}
    >
      <Icon size={18} />
      {label}
    </button>
  );
}

function ResultBar({ label, count, percent, color, textColor }) {
  const displayPercent = Number.isInteger(percent) ? percent : percent.toFixed(1);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className={`font-medium ${textColor}`}>{label}</span>
        <span className="text-slate-400">
          {count.toLocaleString()} โหวต ({displayPercent}%)
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

function EditProposalModal({ open, initialTitle, initialDescription, loading, onSave, onCancel }) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [prevOpen, setPrevOpen] = useState(open);
  const [prevInitialTitle, setPrevInitialTitle] = useState(initialTitle);
  const [prevInitialDescription, setPrevInitialDescription] = useState(initialDescription);

  if (prevOpen !== open || prevInitialTitle !== initialTitle || prevInitialDescription !== initialDescription) {
    setPrevOpen(open);
    setPrevInitialTitle(initialTitle);
    setPrevInitialDescription(initialDescription);
    if (open) {
      setTitle(initialTitle);
      setDescription(initialDescription);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="fade-up w-full max-w-lg rounded-[28px] border border-white/10 bg-[#111725] p-8">
        <h3 className="text-lg font-semibold text-white">แก้ไขข้อเสนอ</h3>

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-xs text-slate-400">ชื่อข้อเสนอ</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-blue-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">รายละเอียด</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-blue-500/50"
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="secondary-btn h-11 px-6 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={() => onSave(title.trim(), description.trim())}
            disabled={loading || !title.trim()}
            className="primary-btn inline-flex h-11 items-center gap-2 px-6 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProposalDetailPage({ params }) {
  const { id } = use(params);
  const { address, chainName } = useWallet();
  const {
    proposals,
    loadingProposals,
    myVotes,
    castVote,
    getCreationTxHash,
    endProposal,
    updateProposal,
    cancelProposal,
    VOTE_TYPE,
  } = useGovernance();
  const { showToast } = useToast();

  const proposal = proposals.find((p) => p.id === Number(id));
  const [txHash, setTxHash] = useState(null);
  const [isVoting, setIsVoting] = useState(false);
  const [voteError, setVoteError] = useState(null);

  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!proposal) return;
    getCreationTxHash(proposal.id).then(setTxHash).catch(() => setTxHash(null));
  }, [proposal, getCreationTxHash]);

  if (loadingProposals) {
    return (
      <section className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-[#060816] px-6 text-center text-slate-400">
        <Loader2 size={22} className="animate-spin text-blue-400" />
        กำลังโหลดข้อมูลจาก Blockchain...
      </section>
    );
  }

  if (!proposal) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center bg-[#060816] px-6 text-center">
        <div className="flex flex-col items-center">
          <span className="empty-state-icon">
            <XCircle size={20} />
          </span>
          <h1 className="mt-1 text-2xl font-bold text-white">ไม่พบข้อเสนอนี้</h1>
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
  const pct = (n) => (total === 0 ? 0 : Number(((n / total) * 100).toFixed(1)));
  const status = statusLabels[proposal.status];

  const myVoteCode = myVotes[proposal.id] ?? VOTE_TYPE.None;
  const myVoteLabel = { [VOTE_TYPE.Yes]: "yes", [VOTE_TYPE.No]: "no", [VOTE_TYPE.Abstain]: "abstain" }[
    myVoteCode
  ];
  const myVoteLabelText = { yes: "เห็นด้วย", no: "ไม่เห็นด้วย", abstain: "งดออกเสียง" }[myVoteLabel];
  const hasVoted = myVoteCode !== VOTE_TYPE.None;
  const canVote = proposal.status === "active" && !!address;

  const isCreator = !!address && proposal.creator.toLowerCase() === address.toLowerCase();
  const hasVotes = total > 0;
  const canManage = isCreator && proposal.status === "active";

  async function handleVote(choice) {
    if (hasVoted || isVoting || !canVote) return;
    setVoteError(null);
    setIsVoting(true);
    try {
      await castVote(proposal.id, VOTE_TYPE[choice]);
    } catch (err) {
      setVoteError(describeTxError(err));
    } finally {
      setIsVoting(false);
    }
  }

  async function handleEndProposal() {
    setIsEnding(true);
    try {
      await endProposal(proposal.id);
      setShowEndConfirm(false);
      showToast("ปิดโหวตข้อเสนอนี้เรียบร้อยแล้ว", "success");
    } catch (err) {
      showToast(describeTxError(err), "error");
    } finally {
      setIsEnding(false);
    }
  }

  async function handleCancelProposal() {
    setIsCancelling(true);
    try {
      await cancelProposal(proposal.id);
      setShowCancelConfirm(false);
      showToast("ยกเลิกข้อเสนอนี้เรียบร้อยแล้ว", "success");
    } catch (err) {
      showToast(describeTxError(err), "error");
    } finally {
      setIsCancelling(false);
    }
  }

  async function handleUpdateProposal(title, description) {
    setIsUpdating(true);
    try {
      await updateProposal(proposal.id, title, description);
      setShowEditModal(false);
      showToast("แก้ไขข้อเสนอเรียบร้อยแล้ว", "success");
    } catch (err) {
      showToast(describeTxError(err), "error");
    } finally {
      setIsUpdating(false);
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
                <span className="pill bg-blue-500/10 text-blue-400">
                  #{proposal.id}
                </span>
                <span
                  className={`pill ${status.bg} ${status.color}`}
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
                <MetaItem icon={Clock3} label="วันสิ้นสุดโหวต" value={proposal.votingDeadline} />
                <MetaItem icon={Network} label="เครือข่าย" value={chainName ?? "Sepolia"} />
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <Hash size={14} className="text-slate-500" />
                <span>Transaction Hash:</span>
                <span className="font-mono text-slate-300">
                  {txHash ? shortenHash(txHash) : "กำลังโหลด..."}
                </span>
              </div>
            </div>

            {/* Creator controls — only the proposal's own creator sees these */}
            {isCreator && (
              <div
                className="fade-up mt-8 flex flex-wrap items-center gap-3 rounded-[32px] border border-white/10 bg-[#111725] p-6"
                style={{ animationDelay: "60ms" }}
              >
                <span className="mr-1 text-xs font-medium text-slate-400">จัดการข้อเสนอ:</span>
                <button
                  type="button"
                  onClick={() => setShowEndConfirm(true)}
                  disabled={!canManage}
                  className="secondary-btn h-10 gap-2 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <StopCircle size={14} />
                  ปิดโหวต
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(true)}
                  disabled={!canManage || hasVotes}
                  title={hasVotes ? "แก้ไขไม่ได้เนื่องจากมีผู้โหวตแล้ว" : undefined}
                  className="secondary-btn h-10 gap-2 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Pencil size={14} />
                  แก้ไข
                </button>
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(true)}
                  disabled={!canManage || hasVotes}
                  title={hasVotes ? "ยกเลิกไม่ได้เนื่องจากมีผู้โหวตแล้ว" : undefined}
                  className="inline-flex h-10 items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/5 px-4 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Ban size={14} />
                  ยกเลิกข้อเสนอ
                </button>
              </div>
            )}

            {/* Vote panel */}
            <div
              className="fade-up mt-8 rounded-[32px] border border-white/10 bg-[#111725] p-8 lg:p-10"
              style={{ animationDelay: "100ms" }}
            >
              <h2 className="text-lg font-semibold text-white">ร่วมลงคะแนน</h2>
              <p className="mt-2 text-sm text-slate-400">
                {address
                  ? "การโหวตของคุณจะถูกบันทึกลงสัญญาอัจฉริยะจริงบนเครือข่าย"
                  : "กรุณาเชื่อมต่อกระเป๋าเพื่อลงคะแนนบนสัญญาอัจฉริยะจริง"}
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <VoteButton
                  label="เห็นด้วย"
                  icon={CheckCircle2}
                  active={myVoteLabel === "yes"}
                  disabled={hasVoted || isVoting || !canVote}
                  onClick={() => handleVote("Yes")}
                  color="emerald"
                />
                <VoteButton
                  label="ไม่เห็นด้วย"
                  icon={XCircle}
                  active={myVoteLabel === "no"}
                  disabled={hasVoted || isVoting || !canVote}
                  onClick={() => handleVote("No")}
                  color="red"
                />
                <VoteButton
                  label="งดออกเสียง"
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
                  กำลังส่งธุรกรรมไปยังสัญญาอัจฉริยะ...
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
                  บันทึกคะแนนของคุณเรียบร้อยแล้ว ({myVoteLabelText})
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
                  label="เห็นด้วย"
                  count={votes.yes}
                  percent={pct(votes.yes)}
                  color="bg-emerald-500"
                  textColor="text-emerald-400"
                />
                <ResultBar
                  label="ไม่เห็นด้วย"
                  count={votes.no}
                  percent={pct(votes.no)}
                  color="bg-red-500"
                  textColor="text-red-400"
                />
                <ResultBar
                  label="งดออกเสียง"
                  count={votes.abstain}
                  percent={pct(votes.abstain)}
                  color="bg-slate-400"
                  textColor="text-slate-300"
                />
              </div>

              <p className="mt-6 text-sm text-slate-400">
                รวมทั้งหมด {total.toLocaleString()} โหวต
              </p>
            </div>
          </div>

          <ConfirmDialog
            open={showEndConfirm}
            title="ปิดโหวตข้อเสนอนี้?"
            message="เมื่อปิดโหวตแล้ว จะไม่สามารถลงคะแนนเพิ่มได้อีก แต่ยังดูผลโหวตปัจจุบันได้ตามปกติ การทำรายการนี้ไม่สามารถย้อนกลับได้"
            confirmLabel="ยืนยันปิดโหวต"
            loading={isEnding}
            onConfirm={handleEndProposal}
            onCancel={() => setShowEndConfirm(false)}
          />

          <ConfirmDialog
            open={showCancelConfirm}
            title="ยกเลิกข้อเสนอนี้?"
            message="ข้อเสนอที่ถูกยกเลิกจะไม่สามารถลงคะแนนได้อีก แต่ยังดูรายละเอียดได้ การทำรายการนี้ไม่สามารถย้อนกลับได้"
            confirmLabel="ยืนยันยกเลิก"
            danger
            loading={isCancelling}
            onConfirm={handleCancelProposal}
            onCancel={() => setShowCancelConfirm(false)}
          />

          <EditProposalModal
            open={showEditModal}
            initialTitle={proposal.title}
            initialDescription={proposal.description}
            loading={isUpdating}
            onSave={handleUpdateProposal}
            onCancel={() => setShowEditModal(false)}
          />
        </section>
  );
}
