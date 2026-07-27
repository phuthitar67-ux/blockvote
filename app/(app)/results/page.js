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
import { Trophy, CheckCircle2, ShieldCheck, Hash } from "lucide-react";
import AmbientBackground from "@/app/components/AmbientBackground";
import PageHeader from "@/app/components/PageHeader";
import { useGovernance } from "@/lib/GovernanceContext";
import { getVoteTotal, getYesPercent, groupByCategory, monthlyOutcomesFrom } from "@/lib/web3/format";
import { categoryColors } from "@/lib/uiConstants";

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

export default function ResultsPage() {
  const { proposals, platformStats, topVoters, getCreationTxHash } = useGovernance();

  const mostVoted =
    proposals.length > 0
      ? proposals.reduce((max, p) => (getVoteTotal(p) > getVoteTotal(max) ? p : max))
      : null;
  const mostVotedTotal = mostVoted ? getVoteTotal(mostVoted) : 0;
  const mostVotedPercent = mostVoted ? getYesPercent(mostVoted) : 0;
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
            eyebrow="Analytics"
            title="Results & Analytics"
            subtitle="สถิติ Governance และตัวชี้วัดการมีส่วนร่วมของผู้ถือโทเคนทั้งหมด"
          />

          {/* Stat cards */}
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <div className="fade-up rounded-3xl border border-white/10 bg-[#111725] p-6">
              <p className="text-xs font-medium text-slate-400">Total Proposals</p>
              <p className="mt-3 text-2xl font-bold text-white">
                {platformStats.totalProposals.toLocaleString()}
              </p>
            </div>
            <div className="fade-up rounded-3xl border border-white/10 bg-[#111725] p-6" style={{ animationDelay: "80ms" }}>
              <p className="text-xs font-medium text-slate-400">Pass Rate</p>
              <p className="mt-3 text-2xl font-bold text-emerald-400">
                {platformStats.passRate}%
              </p>
            </div>
            <div className="fade-up rounded-3xl border border-white/10 bg-[#111725] p-6" style={{ animationDelay: "160ms" }}>
              <p className="text-xs font-medium text-slate-400">Avg Participation</p>
              <p className="mt-3 text-2xl font-bold text-violet-400">
                {platformStats.avgParticipation}%
              </p>
            </div>
            <div className="fade-up rounded-3xl border border-white/10 bg-[#111725] p-6" style={{ animationDelay: "240ms" }}>
              <p className="text-xs font-medium text-slate-400">Unique Voters</p>
              <p className="mt-3 text-2xl font-bold text-amber-400">
                {platformStats.totalVoters.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Charts */}
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <div className="fade-up rounded-[32px] border border-white/10 bg-[#111725] p-8">
              <h2 className="text-lg font-semibold text-white">Proposals by Category</h2>

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
                      <Tooltip contentStyle={tooltipStyle} />
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
                      <span className="text-slate-300">{entry.name}</span>
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
              <h2 className="text-lg font-semibold text-white">Monthly Proposal Outcomes</h2>

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
                  <span className="h-2.5 w-2.5 rounded-full bg-[#5b6cff]" /> Active
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#f87171]" /> Failed
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#34d399]" /> Passed
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
                <h2 className="text-lg font-semibold text-white">Most Voted Proposal</h2>
              </div>

              {!mostVoted ? (
                <p className="mt-5 text-sm text-slate-400">ยังไม่มีข้อเสนอในระบบ</p>
              ) : (
                <>
                  <div className="mt-5 flex items-center gap-2 text-xs">
                    <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 font-semibold text-blue-400">
                      #{mostVoted.id}
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle2 size={13} />
                      {mostVoted.status === "passed" ? "Passed" : mostVoted.status}
                    </span>
                  </div>

                  <h3 className="mt-3 text-base font-semibold text-white">{mostVoted.title}</h3>

                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                      <span>YES {mostVotedPercent}%</span>
                      <span>NO {100 - mostVotedPercent}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${mostVotedPercent}%` }}
                      />
                    </div>
                  </div>

                  <p className="mt-4 text-xs text-slate-400">
                    {mostVotedTotal.toLocaleString()} total votes
                  </p>

                  <div className="mt-5 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-slate-400">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    Blockchain Verified
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
                <h2 className="text-lg font-semibold text-white">Most Active Voters</h2>
              </div>

              {topVoters.length === 0 ? (
                <p className="px-8 pb-8 text-sm text-slate-400">ยังไม่มีผู้โหวตในระบบ</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-y border-white/10 text-xs uppercase tracking-wider text-slate-500">
                        <th className="px-8 py-3 font-medium">Voter</th>
                        <th className="px-4 py-3 font-medium">Votes</th>
                        <th className="px-4 py-3 font-medium">Power</th>
                        <th className="px-8 py-3 font-medium">Participation</th>
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
        </div>
      </section>
  );
}
