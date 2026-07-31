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
import { describeTxError } from "@/lib/web3/errors";
import { categories, statusLabels } from "@/lib/uiConstants";

const VOTING_PERIODS = [
  { label: "1 วัน", seconds: 24 * 60 * 60 },
  { label: "3 วัน", seconds: 3 * 24 * 60 * 60 },
  { label: "7 วัน", seconds: 7 * 24 * 60 * 60 },
  { label: "14 วัน", seconds: 14 * 24 * 60 * 60 },
  { label: "30 วัน", seconds: 30 * 24 * 60 * 60 },
];

// Display-only Thai labels for the on-chain category values. `categories`
// (imported above) stays in English — that array's values are submitted to
// createProposal() and stored on-chain as-is, so only how they're *rendered*
// here changes, never the value itself.
const CATEGORY_LABELS = {
  Protocol: "โปรโตคอล",
  DeFi: "การเงิน DeFi",
  Treasury: "คลังทุน",
  "DAO Ops": "การบริหาร",
  Grants: "ทุนสนับสนุน",
  Security: "ความปลอดภัย",
};

function shortenAddress(addr) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function CreateProposalPage() {
  const { address, connect } = useWallet();
  const { tokenBalance, proposals, myCreatedProposals, createProposal, proposalThreshold } =
    useGovernance();
  const proposalThresholdText = proposalThreshold !== null ? proposalThreshold.toLocaleString() : "--";

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
      setSuccessMessage(`ส่งข้อเสนอ #${nextId} เข้าสู่สัญญาอัจฉริยะแล้ว (tx: ${shortenAddress(txHash)})`);
      setForm({
        title: "",
        category: categories[0],
        description: "",
        votingPeriodSeconds: VOTING_PERIODS[2].seconds,
      });
      setErrors({});
    } catch (err) {
      setSubmitError(describeTxError(err));
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

  const meetsProposalThreshold = proposalThreshold !== null && tokenBalance >= proposalThreshold;

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
                สร้างข้อเสนอ
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                ข้อเสนอต้องมีโทเคน GOV ขั้นต่ำ {proposalThresholdText} GOV ในการยื่น
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
                  ชื่อข้อเสนอ *
                </label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="อธิบายข้อเสนอของคุณในหนึ่งประโยค..."
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
                  หมวดหมู่ *
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
                      {CATEGORY_LABELS[cat] ?? cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <label className="mb-2 block text-xs font-medium text-slate-400">
                  รายละเอียด *
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={6}
                  placeholder="อธิบายรายละเอียดของข้อเสนอ พร้อมเหตุผล แผนการดำเนินงาน และผลลัพธ์ที่คาดหวัง..."
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
                  ระยะเวลาเปิดโหวต *
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
                  ยกเลิก
                </button>
                {address ? (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="primary-btn flex-1 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        กำลังส่งธุรกรรม...
                      </>
                    ) : (
                      <>
                        <PlusCircle size={18} />
                        ส่งข้อเสนอเข้าสู่สัญญาอัจฉริยะ
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
                  ตัวอย่าง
                </p>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex items-center gap-2">
                    <span className="pill bg-blue-500/10 text-blue-400">
                      GIP-{nextId}
                    </span>
                    <span className="pill bg-violet-500/10 text-violet-400">
                      {CATEGORY_LABELS[form.category] ?? form.category}
                    </span>
                  </div>

                  <h3 className="mt-4 text-base font-semibold text-white">
                    {form.title || "ชื่อข้อเสนอของคุณจะแสดงที่นี่..."}
                  </h3>

                  <p className="mt-2 text-xs leading-6 text-slate-400">
                    {form.description ||
                      "รายละเอียดของข้อเสนอจะแสดงที่นี่ กรุณาเขียนคำอธิบายข้อเสนอของคุณให้ละเอียด"}
                  </p>

                  <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-4 text-[11px] text-slate-500">
                    <span>
                      โดย{" "}
                      <span className="font-mono text-slate-300">
                        {address ? shortenAddress(address) : "ยังไม่ได้เชื่อมต่อ"}
                      </span>
                    </span>
                    <span>
                      ระยะเวลาโหวต:{" "}
                      {VOTING_PERIODS.find((p) => p.seconds === Number(form.votingPeriodSeconds))?.label}
                    </span>
                  </div>
                </div>
              </div>

              <div
                className="fade-up rounded-[28px] border border-white/10 bg-[#111725] p-6"
                style={{ animationDelay: "220ms" }}
              >
                <div
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
                    meetsProposalThreshold
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border-red-500/30 bg-red-500/10 text-red-400"
                  }`}
                >
                  {meetsProposalThreshold ? (
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                  ) : (
                    <XCircle size={18} className="mt-0.5 shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-semibold">
                      {meetsProposalThreshold ? "ผ่านเงื่อนไขแล้ว" : "ยังไม่ผ่านเงื่อนไข"}
                    </p>
                    <p className="mt-0.5 text-xs font-normal text-slate-300">
                      {meetsProposalThreshold
                        ? "คุณมีสิทธิ์สร้างข้อเสนอ"
                        : "คุณมีจำนวน GOV Token ไม่เพียงพอสำหรับการสร้างข้อเสนอ"}
                    </p>
                  </div>
                </div>

                <div className="my-5 border-t border-white/5" />

                <p className="mb-3 text-sm font-semibold text-white">เงื่อนไขการสร้างข้อเสนอ</p>

                <ul className="space-y-2 text-xs leading-6 text-slate-400">
                  <li className="flex gap-2">
                    <span className="text-slate-600">•</span>
                    <span>ต้องถือครอง GOV Token อย่างน้อย {proposalThresholdText} GOV</span>
                  </li>
                  {meetsProposalThreshold ? (
                    <>
                      <li className="flex gap-2">
                        <span className="text-slate-600">•</span>
                        <span>ระบบจะตรวจสอบจำนวนโทเคนในกระเป๋าอัตโนมัติ</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-slate-600">•</span>
                        <span>การสร้างข้อเสนอจะไม่หัก GOV Token ออกจากกระเป๋า</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-slate-600">•</span>
                        <span>จำนวนโทเคนใช้เพื่อยืนยันสิทธิ์ในการสร้างข้อเสนอเท่านั้น</span>
                      </li>
                    </>
                  ) : (
                    <li className="flex gap-2">
                      <span className="text-slate-600">•</span>
                      <span>กรุณารับหรือซื้อ GOV Token เพิ่มก่อนสร้างข้อเสนอ</span>
                    </li>
                  )}
                </ul>
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
                สถานะจะเปลี่ยนอัตโนมัติเมื่อครบกำหนดเวลาโหวต หรือคุณสามารถปิดโหวต/แก้ไข/ยกเลิกได้เองจากหน้ารายละเอียดข้อเสนอ
              </p>
            </div>

            <div className="divide-y divide-white/5">
              {myCreatedProposals.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-state-icon">
                    <PlusCircle size={18} />
                  </span>
                  <p className="empty-state-title">
                    {address ? "คุณยังไม่เคยสร้างข้อเสนอ" : "เชื่อมต่อกระเป๋าเพื่อดูข้อเสนอของคุณ"}
                  </p>
                  <p className="empty-state-desc">
                    ข้อเสนอที่คุณสร้างจะแสดงที่นี่ พร้อมสถานะและจำนวนผู้โหวต
                  </p>
                </div>
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
                          <span className="pill bg-blue-500/10 text-blue-400">
                            #{item.id}
                          </span>
                          <span className={`pill ${status.bg} ${status.color}`}>
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
