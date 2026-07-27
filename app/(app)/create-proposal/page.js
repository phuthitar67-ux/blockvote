"use client";

import { useEffect, useState } from "react";
import {
  PlusCircle,
  Users,
  Settings,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import AmbientBackground from "@/app/components/AmbientBackground";
import { useWallet } from "@/lib/WalletContext";
import { useGovernance } from "@/lib/GovernanceContext";
import { getVoteTotal } from "@/lib/web3/format";
import { categories, statusLabels } from "@/lib/uiConstants";

const VOTING_PERIODS = [
  { label: "1 วัน", seconds: 24 * 60 * 60 },
  { label: "3 วัน", seconds: 3 * 24 * 60 * 60 },
  { label: "7 วัน", seconds: 7 * 24 * 60 * 60 },
  { label: "14 วัน", seconds: 14 * 24 * 60 * 60 },
  { label: "30 วัน", seconds: 30 * 24 * 60 * 60 },
];

function shortenAddress(addr) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function CreateProposalPage() {
  const { address, connect } = useWallet();
  const { tokenBalance, proposals, myCreatedProposals, createProposal, PROPOSAL_THRESHOLD } =
    useGovernance();

  const [form, setForm] = useState({
    title: "",
    category: categories[0],
    description: "",
    votingPeriodSeconds: VOTING_PERIODS[2].seconds,
  });
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 6000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const nextId = proposals.length;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: null }));
  }

  function validate() {
    const nextErrors = {};
    if (!form.title.trim()) nextErrors.title = "กรุณากรอกชื่อข้อเสนอ";
    if (!form.description.trim()) nextErrors.description = "กรุณากรอกรายละเอียด";
    return nextErrors;
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSubmitError(null);

    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    if (!address) {
      setSubmitError("กรุณาเชื่อมต่อกระเป๋าก่อนสร้างข้อเสนอ");
      return;
    }

    setIsSubmitting(true);
    try {
      const txHash = await createProposal(
        form.title.trim(),
        form.description.trim(),
        form.category,
        Number(form.votingPeriodSeconds)
      );
      setSuccessMessage(`ส่งข้อเสนอ #${nextId} เข้าสู่ Smart Contract แล้ว (tx: ${shortenAddress(txHash)})`);
      setForm({
        title: "",
        category: categories[0],
        description: "",
        votingPeriodSeconds: VOTING_PERIODS[2].seconds,
      });
      setErrors({});
    } catch (err) {
      setSubmitError(err?.shortMessage || err?.message || "ไม่สามารถส่งข้อเสนอได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancel() {
    setForm({
      title: "",
      category: categories[0],
      description: "",
      votingPeriodSeconds: VOTING_PERIODS[2].seconds,
    });
    setErrors({});
    setSubmitError(null);
  }

  const inputClass = (field) =>
    `w-full rounded-xl border bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors ${
      errors[field]
        ? "border-red-500/50 focus:border-red-500/70"
        : "border-white/10 focus:border-blue-500/50"
    }`;

  const requirements = [
    {
      label: "Min GOV balance",
      ok: tokenBalance >= PROPOSAL_THRESHOLD,
      value: `${tokenBalance.toLocaleString()} / ${PROPOSAL_THRESHOLD.toLocaleString()}`,
    },
    { label: "Wallet connected", ok: !!address, value: address ? "Yes" : "No" },
  ];

  return (
      <section className="relative overflow-hidden bg-[#060816] py-16">
        <AmbientBackground />

        <div className="container max-w-6xl">
          <div className="fade-up mb-10 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
              <Settings size={20} />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">
                Create Proposal
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                ข้อเสนอต้องมี Governance Token ขั้นต่ำ {PROPOSAL_THRESHOLD.toLocaleString()} GOV ในการยื่น
              </p>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
            {/* Form */}
            <form
              onSubmit={handleCreate}
              noValidate
              className="fade-up rounded-[32px] border border-white/10 bg-[#111725] p-8"
              style={{ animationDelay: "100ms" }}
            >
              {successMessage && (
                <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                  <CheckCircle2 size={16} />
                  {successMessage}
                </div>
              )}

              {submitError && (
                <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  <AlertCircle size={16} />
                  {submitError}
                </div>
              )}

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-400">
                  Title *
                </label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Describe your proposal in one sentence..."
                  className={inputClass("title")}
                />
                {errors.title && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
                    <AlertCircle size={13} />
                    {errors.title}
                  </p>
                )}
              </div>

              <div className="mt-6">
                <label className="mb-2 block text-xs font-medium text-slate-400">
                  Category *
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, category: cat }))}
                      className={`rounded-xl border px-4 py-2 text-xs font-medium transition-colors ${
                        form.category === cat
                          ? "border-blue-500/50 bg-blue-500/15 text-white"
                          : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <label className="mb-2 block text-xs font-medium text-slate-400">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={6}
                  placeholder="Provide a detailed description of your proposal, including rationale, implementation plan, and expected outcomes..."
                  className={`resize-none ${inputClass("description")}`}
                />
                {errors.description && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
                    <AlertCircle size={13} />
                    {errors.description}
                  </p>
                )}
              </div>

              <div className="mt-6">
                <label className="mb-2 block text-xs font-medium text-slate-400">
                  Voting Period *
                </label>
                <div className="flex flex-wrap gap-2">
                  {VOTING_PERIODS.map((period) => (
                    <button
                      key={period.seconds}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, votingPeriodSeconds: period.seconds }))
                      }
                      className={`rounded-xl border px-4 py-2 text-xs font-medium transition-colors ${
                        form.votingPeriodSeconds === period.seconds
                          ? "border-blue-500/50 bg-blue-500/15 text-white"
                          : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
                      }`}
                    >
                      {period.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <button type="button" onClick={handleCancel} className="secondary-btn">
                  Cancel
                </button>
                {address ? (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="primary-btn flex-1 disabled:cursor-not-allowed disabled:opacity-70 sm:flex-none"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        กำลังส่งธุรกรรม...
                      </>
                    ) : (
                      <>
                        <PlusCircle size={18} />
                        Submit Proposal on-chain
                      </>
                    )}
                  </button>
                ) : (
                  <button type="button" onClick={connect} className="primary-btn flex-1 sm:flex-none">
                    เชื่อมต่อกระเป๋าเพื่อสร้างข้อเสนอ
                  </button>
                )}
              </div>
            </form>

            {/* Preview + requirements */}
            <div className="space-y-6">
              <div
                className="fade-up rounded-[28px] border border-white/10 bg-[#111725] p-6"
                style={{ animationDelay: "160ms" }}
              >
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                  Preview
                </p>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue-400">
                      GIP-{nextId}
                    </span>
                    <span className="rounded-full bg-violet-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-violet-400">
                      {form.category}
                    </span>
                  </div>

                  <h3 className="mt-4 text-base font-semibold text-white">
                    {form.title || "Your proposal title will appear here..."}
                  </h3>

                  <p className="mt-2 text-xs leading-6 text-slate-400">
                    {form.description ||
                      "Your description will appear here. Write a detailed explanation of your proposal."}
                  </p>

                  <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-4 text-[11px] text-slate-500">
                    <span>
                      by{" "}
                      <span className="font-mono text-slate-300">
                        {address ? shortenAddress(address) : "ยังไม่ได้เชื่อมต่อ"}
                      </span>
                    </span>
                    <span>
                      Voting period:{" "}
                      {VOTING_PERIODS.find((p) => p.seconds === Number(form.votingPeriodSeconds))?.label}
                    </span>
                  </div>
                </div>
              </div>

              <div
                className="fade-up rounded-[28px] border border-white/10 bg-[#111725] p-6"
                style={{ animationDelay: "220ms" }}
              >
                <p className="mb-4 text-sm font-semibold text-white">Requirements</p>

                <div className="space-y-3">
                  {requirements.map((req) => (
                    <div
                      key={req.label}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-slate-400">{req.label}</span>
                      <span
                        className={`flex items-center gap-1.5 font-medium ${
                          req.ok ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {req.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                        {req.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Your proposals */}
          <div
            className="fade-up mt-8 overflow-hidden rounded-[32px] border border-white/10 bg-[#111725]"
            style={{ animationDelay: "260ms" }}
          >
            <div className="border-b border-white/10 p-8 pb-6">
              <h2 className="text-lg font-semibold text-white">ข้อเสนอของคุณ</h2>
              <p className="mt-1 text-sm text-slate-400">
                สถานะจะเปลี่ยนอัตโนมัติเมื่อครบกำหนดเวลาโหวต (กำหนดโดย Smart Contract ไม่สามารถปิดโหวตเองได้)
              </p>
            </div>

            <div className="divide-y divide-white/5">
              {myCreatedProposals.length === 0 ? (
                <p className="p-8 text-sm text-slate-400">
                  {address ? "คุณยังไม่เคยสร้างข้อเสนอ" : "เชื่อมต่อกระเป๋าเพื่อดูข้อเสนอของคุณ"}
                </p>
              ) : (
                myCreatedProposals.map((item) => {
                  const status = statusLabels[item.status];
                  return (
                    <div
                      key={item.id}
                      className="flex flex-col gap-4 p-6 transition-colors hover:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between sm:px-8"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue-400">
                            #{item.id}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${status.bg} ${status.color}`}
                          >
                            {status.text}
                          </span>
                        </div>
                        <p className="mt-2 truncate text-sm font-semibold text-white">
                          {item.title}
                        </p>
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                          <Users size={13} />
                          {getVoteTotal(item).toLocaleString()} ผู้โหวต
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>
  );
}
