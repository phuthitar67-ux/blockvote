"use client";

import Link from "next/link";
import {
  Bell,
  PlusCircle,
  Coins,
  TrendingUp,
  Vote,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import AmbientBackground from "@/app/components/AmbientBackground";
import { useWallet } from "@/lib/WalletContext";
import { useGovernance } from "@/lib/GovernanceContext";
import { getYesPercent, groupByCategory, monthlyActivityFrom } from "@/lib/web3/format";
import { statusLabels, categoryColors } from "@/lib/uiConstants";

function shortenAddress(addr) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

const tooltipStyle = {
  background: "#101625",
  border: "1px solid rgba(255,255,255,.1)",
  borderRadius: 12,
  color: "#f8fafc",
  fontSize: 12,
};

export default function DashboardPage() {
  const { address } = useWallet();
  const { proposals, tokenBalance, votingPowerPct, myVotingHistory } = useGovernance();
  const displayAddress = address ?? "0x0000000000000000000000000000000000000000";
  const openProposals = proposals.filter((p) => p.status === "active");
  const recentProposals = proposals.slice(0, 5);
  const categoryBreakdown = groupByCategory(proposals);
  const monthlyVotingActivity = monthlyActivityFrom(myVotingHistory);

  const stats = [
    {
      icon: Coins,
      label: "Governance Token",
      value: `${tokenBalance.toLocaleString()} GOV`,
      color: "text-violet-400",
      bg: "bg-violet-500/10",
    },
    {
      icon: TrendingUp,
      label: "Voting Power",
      value: `${votingPowerPct.toFixed(1)}%`,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      icon: Vote,
      label: "Proposal ที่กำลังเปิด",
      value: String(openProposals.length),
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      icon: CheckCircle2,
      label: "จำนวนครั้งที่โหวต",
      value: String(myVotingHistory.length),
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
  ];

  return (
      <section className="relative overflow-hidden bg-[#060816] px-5 py-10 md:px-8 lg:px-14 lg:py-14">
        <AmbientBackground />

        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="fade-up flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="text-[11px] font-medium tracking-[0.15em] uppercase text-blue-400">
                Overview
              </span>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">
                Dashboard
              </h1>
              <p className="mt-2 text-xs text-slate-400">
                ยินดีต้อนรับกลับ,{" "}
                <span className="font-mono text-slate-300">
                  {shortenAddress(displayAddress)}
                </span>{" "}
                — อัปเดตล่าสุด 27 กรกฎาคม 2026
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                aria-label="การแจ้งเตือน"
                className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition-colors hover:border-blue-500/40 hover:text-white"
              >
                <Bell size={16} />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-blue-500" />
              </button>

              <Link href="/create-proposal" className="primary-btn text-xs">
                <PlusCircle size={16} />
                สร้าง Proposal
              </Link>
            </div>
          </div>

          {/* Row 1: Stat cards */}
          <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  style={{ animationDelay: `${index * 80}ms` }}
                  className="fade-up flex h-full flex-col items-center justify-center rounded-md border border-white/10 bg-[#111725] px-6 py-8 text-center transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/30"
                >
                  <div
                    className={`mb-5 flex h-10 w-10 items-center justify-center rounded-2xl ${stat.bg} ${stat.color}`}
                  >
                    <Icon size={19} />
                  </div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="mt-2 text-sm text-slate-400">{stat.label}</p>
                </div>
              );
            })}
          </div>

          {/* Row 2: Charts */}
          <div className="mt-8 grid gap-5 xl:grid-cols-2">
            <div
              className="fade-up rounded-md border border-white/10 bg-[#111725] p-6"
              style={{ animationDelay: "120ms" }}
            >
              <h2 className="text-base font-semibold text-white">
                กราฟสรุปการโหวตย้อนหลัง
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                จำนวนครั้งที่โหวตในแต่ละเดือน
              </p>

              <div className="mt-5 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyVotingActivity}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,.06)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      cursor={{ stroke: "rgba(255,255,255,.15)" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="votes"
                      name="โหวต"
                      stroke="#5b6cff"
                      strokeWidth={3}
                      dot={{ fill: "#5b6cff", r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div
              className="fade-up rounded-md border border-white/10 bg-[#111725] p-6"
              style={{ animationDelay: "180ms" }}
            >
              <h2 className="text-base font-semibold text-white">
                Proposal แยกตามหมวดหมู่
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                สัดส่วนข้อเสนอทั้งหมดตามประเภท
              </p>

              <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row">
                <div className="h-48 w-48 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryBreakdown}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={52}
                        outerRadius={78}
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

                <div className="grid flex-1 grid-cols-2 gap-2.5 sm:grid-cols-1">
                  {categoryBreakdown.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2 text-xs">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: categoryColors[entry.name] ?? "#94a3b8" }}
                      />
                      <span className="text-slate-300">{entry.name}</span>
                      <span className="ml-auto font-semibold text-white">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Recent Proposals */}
          <div
            className="fade-up mt-8 mb-4 overflow-hidden rounded-md border border-white/10 bg-[#111725]"
            style={{ animationDelay: "240ms" }}
          >
            <div className="relative flex items-center justify-center p-6 pb-4">
              <h2 className="text-2xl font-bold text-white">Recent Proposals</h2>
              <Link
                href="/proposals"
                className="absolute right-6 top-1/2 flex -translate-y-1/2 items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
              >
                ดูทั้งหมด
                <ArrowRight size={12} />
              </Link>
            </div>

            {/* Table — md and up */}
            <div className="hidden md:block">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-y border-white/10 text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-2.5 font-medium">ID</th>
                    <th className="px-4 py-2.5 font-medium">ชื่อข้อเสนอ</th>
                    <th className="px-4 py-2.5 font-medium">สถานะ</th>
                    <th className="px-4 py-2.5 font-medium">คะแนนโหวต</th>
                    <th className="px-4 py-2.5 font-medium">วันสิ้นสุด</th>
                    <th className="px-6 py-2.5 text-right font-medium">รายละเอียด</th>
                  </tr>
                </thead>
                <tbody>
                  {recentProposals.map((item) => {
                    const status = statusLabels[item.status];
                    const percent = getYesPercent(item);
                    return (
                      <tr
                        key={item.id}
                        className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.02]"
                      >
                        <td className="px-6 py-3 font-mono text-blue-400">#{item.id}</td>
                        <td className="max-w-[260px] truncate px-4 py-3 font-medium text-white">
                          {item.title}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${status.bg} ${status.color}`}
                          >
                            {status.text}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{percent}% Yes</td>
                        <td className="px-4 py-3 text-slate-400">{item.votingDeadline}</td>
                        <td className="px-6 py-3 text-right">
                          <Link
                            href={`/proposal/${item.id}`}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-white hover:text-blue-400"
                          >
                            ดูรายละเอียด
                            <ArrowRight size={11} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Card list — mobile */}
            <div className="space-y-3 p-4 md:hidden">
              {recentProposals.map((item) => {
                const status = statusLabels[item.status];
                const percent = getYesPercent(item);
                return (
                  <div
                    key={item.id}
                    className="rounded-md border border-white/10 bg-white/[0.02] p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-blue-400">#{item.id}</span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${status.bg} ${status.color}`}
                      >
                        {status.text}
                      </span>
                    </div>

                    <p className="mt-2.5 text-xs font-semibold text-white">{item.title}</p>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{percent}% Yes</span>
                      <span>สิ้นสุด {item.votingDeadline}</span>
                    </div>

                    <Link
                      href={`/proposal/${item.id}`}
                      className="mt-3 flex items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/5 py-2 text-[11px] font-medium text-white transition-colors hover:border-blue-500/40 hover:bg-blue-500/10"
                    >
                      ดูรายละเอียด
                      <ArrowRight size={11} />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
  );
}
