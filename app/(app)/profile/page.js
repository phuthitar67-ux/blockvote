"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Wallet,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Clock3,
  Bell,
  Mail,
  Save,
  FileText,
} from "lucide-react";
import AmbientBackground from "@/app/components/AmbientBackground";
import { useWallet } from "@/lib/WalletContext";
import { useGovernance } from "@/lib/GovernanceContext";
import { getYesPercent } from "@/lib/web3/format";
import { describeTxError } from "@/lib/web3/errors";
import { statusLabels } from "@/lib/uiConstants";

const TABS = [
  { key: "history", label: "ประวัติการโหวต" },
  { key: "proposals", label: "ข้อเสนอของฉัน" },
  { key: "settings", label: "ตั้งค่า" },
];

const voteStyle = {
  YES: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", text: "เห็นด้วย" },
  NO: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10", text: "ไม่เห็นด้วย" },
  ABSTAIN: { icon: MinusCircle, color: "text-slate-400", bg: "bg-slate-500/10", text: "งดออกเสียง" },
};

const statusStyle = {
  Confirmed: "text-emerald-400 bg-emerald-500/10",
  Pending: "text-amber-400 bg-amber-500/10",
};

const statusText = {
  Confirmed: "ยืนยันแล้ว",
  Pending: "รอดำเนินการ",
};

function shortenAddress(addr) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function shortenHash(hash) {
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

export default function ProfilePage() {
  const { address } = useWallet();
  const {
    proposals,
    tokenBalance,
    votingPowerPct,
    myVotingHistory,
    myCreatedProposals,
    claimTokens,
    hasClaimed,
    faucetAmount,
  } = useGovernance();
  const [tab, setTab] = useState("history");
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState(null);

  const faucetAmountText = faucetAmount !== null ? faucetAmount.toLocaleString() : "--";
  const displayAddress = address ?? "ยังไม่ได้เชื่อมต่อกระเป๋า";
  const myProposals = myCreatedProposals;
  const participationPct =
    proposals.length > 0 ? Math.round((myVotingHistory.length / proposals.length) * 100) : 0;

  async function handleClaim() {
    setClaimError(null);
    setIsClaiming(true);
    try {
      await claimTokens();
    } catch (err) {
      setClaimError(describeTxError(err));
    } finally {
      setIsClaiming(false);
    }
  }

  return (
      <section className="relative overflow-hidden bg-[#060816] py-16">
        <AmbientBackground />

        <div className="container max-w-6xl">
          {/* Identity header */}
          <div className="fade-up rounded-[32px] border border-white/10 bg-[#111725] p-8">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 shadow-lg shadow-blue-500/20">
                  <Wallet size={28} className="text-white" />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-bold text-white">สมาชิกระบบ</h1>
                    <span className="pill bg-emerald-500/10 text-emerald-400">
                      สมาชิกที่ใช้งานอยู่
                    </span>
                  </div>
                  <p className="mt-1 truncate font-mono text-sm text-blue-400">
                    {displayAddress}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    โหวตแล้ว {myVotingHistory.length} ครั้ง · สร้างข้อเสนอ {myProposals.length} รายการ
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-auto">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">
                    ยอดคงเหลือ GOV
                  </p>
                  <p className="mt-1 text-lg font-bold text-white">
                    {tokenBalance.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">
                    สิทธิ์ในการลงคะแนน
                  </p>
                  <p className="mt-1 text-lg font-bold text-blue-400">
                    {votingPowerPct.toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">
                    ข้อเสนอที่สร้าง
                  </p>
                  <p className="mt-1 text-lg font-bold text-emerald-400">
                    {myProposals.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">
                    การมีส่วนร่วม
                  </p>
                  <p className="mt-1 text-lg font-bold text-amber-400">
                    {participationPct}%
                  </p>
                </div>
              </div>
            </div>

            {address && !hasClaimed && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-6">
                <p className="text-xs text-slate-400">
                  รับโทเคน GOV เริ่มต้น {faucetAmountText} GOV เพื่อเริ่มโหวตหรือสร้างข้อเสนอ (รับได้ครั้งเดียวต่อกระเป๋า)
                </p>
                <button
                  type="button"
                  onClick={handleClaim}
                  disabled={isClaiming}
                  className="primary-btn text-xs disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isClaiming ? "กำลังรับโทเคน..." : `รับ ${faucetAmountText} GOV`}
                </button>
              </div>
            )}
            {claimError && (
              <p className="mt-3 text-xs text-red-400">{claimError}</p>
            )}
          </div>

          {/* Tabs */}
          <div
            className="fade-up mt-8 flex items-center gap-2 border-b border-white/10"
            style={{ animationDelay: "80ms" }}
          >
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative px-4 py-3 text-sm font-medium transition-colors ${
                  tab === t.key ? "text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                {t.label}
                {tab === t.key && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-blue-500 to-violet-500" />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="mt-8">
            {tab === "history" && myVotingHistory.length === 0 && (
              <div className="fade-up empty-state rounded-[28px] border border-white/10 bg-[#111725]">
                <span className="empty-state-icon">
                  <Clock3 size={18} />
                </span>
                <p className="empty-state-title">
                  {address ? "คุณยังไม่เคยลงคะแนนเสียง" : "เชื่อมต่อกระเป๋าเพื่อดูประวัติการโหวต"}
                </p>
                <p className="empty-state-desc">ประวัติการโหวตทุกครั้งของคุณจะแสดงที่นี่</p>
              </div>
            )}

            {tab === "history" && myVotingHistory.length > 0 && (
              <>
                {/* Table — md and up */}
                <div className="fade-up hidden overflow-x-auto rounded-[28px] border border-white/10 bg-[#111725] md:block">
                  <table className="data-table w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="px-6 py-4">ข้อเสนอ</th>
                        <th className="px-6 py-4">การโหวต</th>
                        <th className="px-6 py-4">วันที่</th>
                        <th className="px-6 py-4">Transaction Hash</th>
                        <th className="px-6 py-4">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myVotingHistory.map((item) => {
                        const vote = voteStyle[item.vote];
                        const VoteIcon = vote.icon;
                        return (
                          <tr
                            key={item.id}
                            className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.03]"
                          >
                            <td className="px-6 py-5 font-medium text-white">
                              #{item.proposalId} {item.proposalTitle}
                            </td>
                            <td className="px-6 py-5">
                              <span className={`pill ${vote.bg} ${vote.color}`}>
                                <VoteIcon size={13} />
                                {vote.text}
                              </span>
                            </td>
                            <td className="px-6 py-5 text-slate-400">{item.date}</td>
                            <td className="px-6 py-5 font-mono text-slate-400">
                              {shortenHash(item.txHash)}
                            </td>
                            <td className="px-6 py-5">
                              <span className={`pill ${statusStyle[item.status]}`}>
                                {statusText[item.status] ?? item.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Card list — mobile */}
                <div className="fade-up space-y-4 md:hidden">
                  {myVotingHistory.map((item) => {
                    const vote = voteStyle[item.vote];
                    const VoteIcon = vote.icon;
                    return (
                      <div
                        key={item.id}
                        className="rounded-3xl border border-white/10 bg-[#111725] p-6"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold text-white">
                            #{item.proposalId} {item.proposalTitle}
                          </p>
                          <span className={`pill shrink-0 ${vote.bg} ${vote.color}`}>
                            <VoteIcon size={13} />
                            {vote.text}
                          </span>
                        </div>

                        <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                          <Clock3 size={13} />
                          {item.date}
                        </div>

                        <div className="mt-2 font-mono text-xs text-slate-500">
                          {shortenHash(item.txHash)}
                        </div>

                        <span className={`pill mt-4 ${statusStyle[item.status]}`}>
                          {statusText[item.status] ?? item.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {tab === "proposals" && (
              <div className="fade-up space-y-4">
                {myProposals.length === 0 ? (
                  <div className="empty-state rounded-[28px] border border-white/10 bg-[#111725]">
                    <span className="empty-state-icon">
                      <FileText size={18} />
                    </span>
                    <p className="empty-state-title">คุณยังไม่เคยสร้างข้อเสนอ</p>
                    <p className="empty-state-desc">ข้อเสนอที่คุณสร้างจะแสดงที่นี่พร้อมผลโหวตล่าสุด</p>
                  </div>
                ) : (
                  myProposals.map((item) => {
                    const status = statusLabels[item.status];
                    const percent = getYesPercent(item);
                    return (
                      <Link
                        key={item.id}
                        href={`/proposal/${item.id}`}
                        className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#111725] p-6 transition-all duration-300 hover:border-blue-500/40 hover:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
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
                        </div>

                        <div className="flex items-center gap-3 sm:w-52">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="w-10 shrink-0 text-right text-xs text-slate-400">
                            {percent}%
                          </span>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            )}

            {tab === "settings" && (
              <div className="fade-up rounded-[28px] border border-white/10 bg-[#111725] p-8">
                <div className="space-y-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Bell size={18} className="text-blue-400" />
                      <div>
                        <p className="text-sm font-medium text-white">แจ้งเตือนข้อเสนอใหม่</p>
                        <p className="text-xs text-slate-400">
                          รับการแจ้งเตือนเมื่อมีข้อเสนอใหม่เปิดโหวต
                        </p>
                      </div>
                    </div>
                    <ToggleSwitch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between gap-4 border-t border-white/5 pt-6">
                    <div className="flex items-center gap-3">
                      <Mail size={18} className="text-violet-400" />
                      <div>
                        <p className="text-sm font-medium text-white">อีเมลสรุปรายสัปดาห์</p>
                        <p className="text-xs text-slate-400">
                          สรุปกิจกรรมระบบทุกสัปดาห์ทางอีเมล
                        </p>
                      </div>
                    </div>
                    <ToggleSwitch />
                  </div>

                  <div className="border-t border-white/5 pt-6">
                    <label className="mb-2 block text-xs font-medium text-slate-400">
                      ชื่อที่แสดง
                    </label>
                    <input
                      defaultValue="สมาชิกระบบ"
                      className="w-full max-w-sm rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-blue-500/50"
                    />
                  </div>

                  <button type="button" className="primary-btn">
                    <Save size={16} />
                    บันทึกการตั้งค่า
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
  );
}

function ToggleSwitch({ defaultChecked = false }) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <button
      type="button"
      onClick={() => setChecked((prev) => !prev)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? "bg-blue-500" : "bg-white/10"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
