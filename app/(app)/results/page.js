"use client";

import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Trophy, CheckCircle2, XCircle, Clock3, StopCircle, Ban, ShieldCheck, Hash, FileText, TrendingUp, Users, Inbox } from "lucide-react";
import AmbientBackground from "@/app/components/AmbientBackground";
import PageHeader from "@/app/components/PageHeader";
import { useGovernance } from "@/lib/GovernanceContext";
import { getVoteTotal, getYesPercent, groupByCategory, monthlyOutcomesFrom } from "@/lib/web3/format";
import { categoryColors, statusLabels } from "@/lib/uiConstants";

// Display-only Thai labels for the on-chain category values (same mapping
// used on Create Proposal and Proposals Explorer). entry.name / item.category
// stay in English — this only affects what's rendered.
const CATEGORY_LABELS = {
  Protocol: "โปรโตคอล",
  DeFi: "การเงิน DeFi",
  Treasury: "คลังทุน",
  "DAO Ops": "การบริหาร",
  Grants: "ทุนสนับสนุน",
  Security: "ความปลอดภัย",
};

const tooltipStyle = {
  background: "#101625",
  border: "1px solid rgba(255,255,255,.1)",
  borderRadius: 12,
  color: "#f8fafc",
  fontSize: 12,
};

function shortenAddress(addr) {
  return addr.length > 16 ? `${addr.slice(0, 8)}...${addr.slice(-6)}` : addr;
}

const statusIcon = {
  active: Clock3,
  passed: CheckCircle2,
  rejected: XCircle,
  ended: StopCircle,
  cancelled: Ban,
};

export default function ResultsPage() {
  const { proposals, platformStats, topVoters, getCreationTxHash } = useGovernance();

  const mostVoted =
    proposals.length > 0
      ? proposals.reduce((max, p) => (getVoteTotal(p) > getVoteTotal(max) ? p : max))
      : null;
  const mostVotedTotal = mostVoted ? getVoteTotal(mostVoted) : 0;
  const mostVotedPercent = mostVoted ? getYesPercent(mostVoted) : 0;
  const mostVotedStatus = mostVoted ? statusLabels[mostVoted.status] : null;
  const MostVotedStatusIcon = mostVoted ? (statusIcon[mostVoted.status] ?? CheckCircle2) : CheckCircle2;
  const categoryBreakdown = groupByCategory(proposals);
  const monthlyOutcomes = monthlyOutcomesFrom(proposals);

  const [mostVotedTxHash, setMostVotedTxHash] = useState(null);
  useEffect(() => {
    if (!mostVoted) return;
    getCreationTxHash(mostVoted.id).then(setMostVotedTxHash).catch(() => setMostVotedTxHash(null));
  }, [mostVoted, getCreationTxHash]);

  return (
      <section className="relative overflow-hidden bg-[#060816] py-16">
        <AmbientBackground />

        <div className="container max-w-7xl">
          <PageHeader
            eyebrow="การวิเคราะห์"
            title="ผลการลงคะแนนและการวิเคราะห์"
            subtitle="สถิติระบบการลงคะแนนและตัวชี้วัดการมีส่วนร่วมของผู้ถือโทเคนทั้งหมด"
          />

          {/* Stat cards */}
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <div className="fade-up stat-tile">
              <div className="stat-tile-icon flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
                <FileText size={18} />
              </div>
              <p className="stat-tile-value">{platformStats.totalProposals.toLocaleString()}</p>
              <p className="stat-tile-label">จำนวนข้อเสนอทั้งหมด</p>
            </div>
            <div className="fade-up stat-tile" style={{ animationDelay: "80ms" }}>
              <div className="stat-tile-icon flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 size={18} />
              </div>
              <p className="stat-tile-value">{platformStats.passRate}%</p>
              <p className="stat-tile-label">อัตราการผ่าน</p>
            </div>
            <div className="fade-up stat-tile" style={{ animationDelay: "160ms" }}>
              <div className="stat-tile-icon flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-400">
                <TrendingUp size={18} />
              </div>
              <p className="stat-tile-value">{platformStats.avgParticipation}%</p>
              <p className="stat-tile-label">การมีส่วนร่วมเฉลี่ย</p>
            </div>
            <div className="fade-up stat-tile" style={{ animationDelay: "240ms" }}>
              <div className="stat-tile-icon flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
                <Users size={18} />
              </div>
              <p className="stat-tile-value">{platformStats.totalVoters.toLocaleString()}</p>
              <p className="stat-tile-label">ผู้โหวตทั้งหมด</p>
            </div>
          </div>

          {/* Charts */}
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <div className="fade-up rounded-[32px] border border-white/10 bg-[#111725] p-8">
              <h2 className="text-lg font-semibold text-white">ข้อเสนอแยกตามหมวดหมู่</h2>

              <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row">
                <div className="h-64 w-64 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryBreakdown}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={3}
                      >
                        {categoryBreakdown.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={categoryColors[entry.name] ?? "#94a3b8"}
                            stroke="none"
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value, name) => [value, CATEGORY_LABELS[name] ?? name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-1">
                  {categoryBreakdown.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2 text-sm">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: categoryColors[entry.name] ?? "#94a3b8" }}
                      />
                      <span className="text-slate-300">{CATEGORY_LABELS[entry.name] ?? entry.name}</span>
                      <span className="ml-auto font-semibold text-white">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div
              className="fade-up rounded-[32px] border border-white/10 bg-[#111725] p-8"
              style={{ animationDelay: "100ms" }}
            >
              <h2 className="text-lg font-semibold text-white">ผลข้อเสนอรายเดือน</h2>

              <div className="mt-6 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyOutcomes}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" vertical={false} />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,.04)" }} />
                    <Bar dataKey="active" stackId="a" fill="#5b6cff" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="failed" stackId="a" fill="#f87171" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="passed" stackId="a" fill="#34d399" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 flex items-center justify-center gap-6 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#5b6cff]" /> กำลังโหวต
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#f87171]" /> ไม่ผ่าน
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#34d399]" /> ผ่าน
                </span>
              </div>
            </div>
          </div>

          {/* Most voted + top voters */}
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <div
              className="fade-up rounded-[32px] border border-white/10 bg-[#111725] p-8"
              style={{ animationDelay: "160ms" }}
            >
              <div className="flex items-center gap-3">
                <Trophy size={20} className="text-amber-400" />
                <h2 className="text-lg font-semibold text-white">ข้อเสนอที่มีผู้โหวตมากที่สุด</h2>
              </div>

              {!mostVoted ? (
                <div className="empty-state">
                  <span className="empty-state-icon">
                    <Trophy size={18} />
                  </span>
                  <p className="empty-state-desc">ยังไม่มีข้อเสนอในระบบ</p>
                </div>
              ) : (
                <>
                  <div className="mt-5 flex items-center gap-2">
                    <span className="pill bg-blue-500/10 text-blue-400">
                      #{mostVoted.id}
                    </span>
                    <span className={`pill ${mostVotedStatus.bg} ${mostVotedStatus.color}`}>
                      <MostVotedStatusIcon size={13} />
                      {mostVotedStatus.text}
                    </span>
                  </div>

                  <h3 className="mt-3 text-base font-semibold text-white">{mostVoted.title}</h3>

                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                      <span>เห็นด้วย {mostVotedPercent}%</span>
                      <span>ไม่เห็นด้วย {100 - mostVotedPercent}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${mostVotedPercent}%` }}
                      />
                    </div>
                  </div>

                  <p className="mt-4 text-xs text-slate-400">
                    {mostVotedTotal.toLocaleString()} โหวตทั้งหมด
                  </p>

                  <div className="mt-5 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-slate-400">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    ตรวจสอบได้บน Blockchain
                    <span className="ml-auto flex items-center gap-1 font-mono text-slate-500">
                      <Hash size={12} />
                      {mostVotedTxHash ? `${mostVotedTxHash.slice(0, 8)}...${mostVotedTxHash.slice(-4)}` : "..."}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div
              className="fade-up overflow-hidden rounded-[32px] border border-white/10 bg-[#111725]"
              style={{ animationDelay: "220ms" }}
            >
              <div className="p-8 pb-4">
                <h2 className="text-lg font-semibold text-white">ผู้โหวตที่ใช้งานมากที่สุด</h2>
              </div>

              {topVoters.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-state-icon">
                    <Users size={18} />
                  </span>
                  <p className="empty-state-desc">ยังไม่มีผู้โหวตในระบบ</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table w-full text-left text-sm">
                    <thead>
                      <tr className="border-y border-white/10">
                        <th className="px-8 py-3">ผู้โหวต</th>
                        <th className="px-4 py-3">จำนวนโหวต</th>
                        <th className="px-4 py-3">น้ำหนักเสียง</th>
                        <th className="px-8 py-3">การมีส่วนร่วม</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topVoters.map((voter) => (
                        <tr key={voter.rank} className="border-b border-white/5 last:border-0">
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-3">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/10 text-[11px] font-semibold text-blue-400">
                                {voter.rank}
                              </span>
                              <span className="font-mono text-slate-300">
                                {shortenAddress(voter.address)}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-blue-400">{voter.votes}</td>
                          <td className="px-4 py-4 text-slate-400">
                            {voter.power.toLocaleString()} GOV
                          </td>
                          <td className="px-8 py-4">
                            <span className="font-semibold text-emerald-400">
                              {voter.participation}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* All proposal results */}
          <div className="fade-up mt-8 overflow-hidden rounded-[32px] border border-white/10 bg-[#111725]" style={{ animationDelay: "280ms" }}>
            <div className="p-8 pb-4">
              <h2 className="text-lg font-semibold text-white">ผลข้อเสนอทั้งหมด</h2>
            </div>

            {proposals.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state-icon">
                  <FileText size={18} />
                </span>
                <p className="empty-state-desc">ยังไม่มีข้อเสนอในระบบ</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table w-full text-left text-sm">
                  <thead>
                    <tr className="border-y border-white/10">
                      <th className="px-8 py-3">ชื่อข้อเสนอ</th>
                      <th className="px-4 py-3">น้ำหนักเสียงเห็นด้วย</th>
                      <th className="px-4 py-3">น้ำหนักเสียงไม่เห็นด้วย</th>
                      <th className="px-4 py-3">ผลลัพธ์</th>
                      <th className="px-4 py-3">สถานะ</th>
                      <th className="px-8 py-3">วันสิ้นสุด</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposals.map((p) => {
                      const winner = p.votesYes === p.votesNo ? "เสมอ" : p.votesYes > p.votesNo ? "เห็นด้วย" : "ไม่เห็นด้วย";
                      const status = statusLabels[p.status];
                      return (
                        <tr key={p.id} className="border-b border-white/5 last:border-0">
                          <td className="max-w-[280px] truncate px-8 py-4 font-medium text-white">
                            <span className="pill mr-2 bg-blue-500/10 text-blue-400">
                              #{p.id}
                            </span>
                            {p.title}
                          </td>
                          <td className="px-4 py-4 text-emerald-400">{p.votesYes.toLocaleString()}</td>
                          <td className="px-4 py-4 text-red-400">{p.votesNo.toLocaleString()}</td>
                          <td className="px-4 py-4 font-semibold text-white">{winner}</td>
                          <td className="px-4 py-4">
                            <span className={`pill ${status.bg} ${status.color}`}>
                              {status.text}
                            </span>
                          </td>
                          <td className="px-8 py-4 text-slate-400">{p.votingDeadline}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
  );
}
