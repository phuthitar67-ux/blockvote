"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Bell,
  PlusCircle,
  Coins,
  TrendingUp,
  Vote,
  FileText,
  Clock3,
  StopCircle,
  Ban,
  Users,
  ArrowRight,
  Pencil,
  CheckCircle2,
  Tag,
  Wallet,
} from "lucide-react";
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
import AmbientBackground from "@/app/components/AmbientBackground";
import { useWallet } from "@/lib/WalletContext";
import { useGovernance } from "@/lib/GovernanceContext";
import { getYesPercent, getVoteTotal, formatCompact } from "@/lib/web3/format";
import { statusLabels } from "@/lib/uiConstants";

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

// Reuse this app's existing status badge colors (statusLabels) so the chart
// segments always match the badges shown everywhere else — never introduce
// a second, inconsistent color mapping for the same three states.
const STATUS_CHART_COLORS = {
  Active: "#34d399",
  Ended: "#fbbf24",
  Cancelled: "#94a3b8",
};

const ACTIVITY_META = {
  created: { label: "สร้างข้อเสนอ", icon: PlusCircle, color: "text-blue-400" },
  vote: { label: "โหวต", icon: Vote, color: "text-emerald-400" },
  edit: { label: "แก้ไขข้อเสนอ", icon: Pencil, color: "text-violet-400" },
  end: { label: "ปิดโหวต", icon: StopCircle, color: "text-amber-400" },
  cancel: { label: "ยกเลิกข้อเสนอ", icon: Ban, color: "text-red-400" },
};

export default function DashboardPage() {
  const { address } = useWallet();
  const {
    proposals,
    tokenBalance,
    votingPowerPct,
    myVotingHistory,
    myCreatedProposals,
    recentActivity,
    platformStats,
    totalSupply,
    tokenPriceEth,
    ethTreasuryBalance,
  } = useGovernance();

  const displayAddress = address ?? "0x0000000000000000000000000000000000000000";
  const lastUpdated = proposals.length > 0 ? proposals[0].createdAt : null;

  const endedProposals = useMemo(() => proposals.filter((p) => p.status === "ended"), [proposals]);
  const cancelledProposals = useMemo(
    () => proposals.filter((p) => p.status === "cancelled"),
    [proposals]
  );
  const activeProposals = useMemo(
    () => proposals.filter((p) => p.status === "active").slice(0, 5),
    [proposals]
  );

  const totalVotesCast = useMemo(
    () => proposals.reduce((sum, p) => sum + getVoteTotal(p), 0),
    [proposals]
  );

  const participationRate =
    proposals.length > 0 ? Math.round((myVotingHistory.length / proposals.length) * 100) : 0;

  const recentEndedProposals = useMemo(() => {
    const endedAt = new Map(
      recentActivity.filter((a) => a.type === "end").map((a) => [a.proposalId, a.timestamp])
    );
    return [...endedProposals]
      .sort((a, b) => (endedAt.get(b.id) ?? b.startTime) - (endedAt.get(a.id) ?? a.startTime))
      .slice(0, 5);
  }, [endedProposals, recentActivity]);

  const statusChartData = useMemo(
    () => [
      { name: "Active", value: platformStats.activeProposals },
      { name: "Ended", value: endedProposals.length },
      { name: "Cancelled", value: cancelledProposals.length },
    ],
    [platformStats, endedProposals, cancelledProposals]
  );

  const top5ByVotes = useMemo(() => {
    return [...proposals]
      .sort((a, b) => getVoteTotal(b) - getVoteTotal(a))
      .slice(0, 5)
      .map((p) => ({ name: `#${p.id}`, title: p.title, votes: getVoteTotal(p) }));
  }, [proposals]);

  const dashboardStats = useMemo(
    () => [
      { icon: FileText, label: "Total Proposals", value: platformStats.totalProposals.toLocaleString(), color: "text-blue-400", bg: "bg-blue-500/10" },
      { icon: Clock3, label: "Active Proposals", value: platformStats.activeProposals.toLocaleString(), color: "text-emerald-400", bg: "bg-emerald-500/10" },
      { icon: StopCircle, label: "Ended Proposals", value: endedProposals.length.toLocaleString(), color: "text-amber-400", bg: "bg-amber-500/10" },
      { icon: Ban, label: "Cancelled Proposals", value: cancelledProposals.length.toLocaleString(), color: "text-red-400", bg: "bg-red-500/10" },
      { icon: Vote, label: "Total Votes", value: formatCompact(totalVotesCast), color: "text-violet-400", bg: "bg-violet-500/10" },
      { icon: Users, label: "Governance Members", value: platformStats.totalVoters.toLocaleString(), color: "text-cyan-400", bg: "bg-cyan-500/10" },
    ],
    [platformStats, endedProposals, cancelledProposals, totalVotesCast]
  );

  const tokenomicsStats = useMemo(
    () => [
      {
        icon: Tag,
        label: "Current Token Price",
        value: tokenPriceEth !== null ? `${tokenPriceEth} ETH/GOV` : "--",
        color: "text-amber-400",
        bg: "bg-amber-500/10",
      },
      {
        icon: Coins,
        label: "Total GOV Supply",
        value: formatCompact(totalSupply),
        color: "text-violet-400",
        bg: "bg-violet-500/10",
      },
      {
        icon: Wallet,
        label: "ETH Stored In Contract",
        value: `${ethTreasuryBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })} ETH`,
        color: "text-emerald-400",
        bg: "bg-emerald-500/10",
      },
    ],
    [tokenPriceEth, totalSupply, ethTreasuryBalance]
  );

  const myStats = useMemo(
    () => [
      { icon: Coins, label: "My GOV Balance", value: `${tokenBalance.toLocaleString()} GOV`, color: "text-violet-400", bg: "bg-violet-500/10" },
      { icon: TrendingUp, label: "Voting Power", value: `${votingPowerPct.toFixed(1)}%`, color: "text-emerald-400", bg: "bg-emerald-500/10" },
      { icon: Vote, label: "My Votes", value: myVotingHistory.length.toLocaleString(), color: "text-blue-400", bg: "bg-blue-500/10" },
      { icon: FileText, label: "My Proposals", value: myCreatedProposals.length.toLocaleString(), color: "text-amber-400", bg: "bg-amber-500/10" },
      { icon: CheckCircle2, label: "Participation Rate", value: `${participationRate}%`, color: "text-cyan-400", bg: "bg-cyan-500/10" },
    ],
    [tokenBalance, votingPowerPct, myVotingHistory, myCreatedProposals, participationRate]
  );

  const renderStatCard = useCallback(
    (stat, index) => {
      const Icon = stat.icon;
      return (
        <div
          key={stat.label}
          style={{ animationDelay: `${index * 60}ms` }}
          className="fade-up flex h-full flex-col items-center justify-center rounded-md border border-white/10 bg-[#111725] px-5 py-7 text-center transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/30"
        >
          <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-2xl ${stat.bg} ${stat.color}`}>
            <Icon size={18} />
          </div>
          <p className="text-xl font-bold text-white">{stat.value}</p>
          <p className="mt-2 text-xs text-slate-400">{stat.label}</p>
        </div>
      );
    },
    []
  );

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
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">Dashboard</h1>
            <p className="mt-2 text-xs text-slate-400">
              ยินดีต้อนรับกลับ,{" "}
              <span className="font-mono text-slate-300">{shortenAddress(displayAddress)}</span>{" "}
              — {lastUpdated ? `อัปเดตล่าสุด ${lastUpdated}` : "อัปเดตล่าสุด"}
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

        {/* Dashboard Statistics */}
        <h2 className="fade-up mt-10 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Dashboard Statistics
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
          {dashboardStats.map(renderStatCard)}
        </div>

        {/* Tokenomics */}
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {tokenomicsStats.map(renderStatCard)}
        </div>

        {/* My Statistics */}
        <h2 className="fade-up mt-10 text-sm font-semibold uppercase tracking-wider text-slate-500">
          My Statistics
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {myStats.map(renderStatCard)}
        </div>

        {/* Charts */}
        <div className="mt-10 grid gap-5 xl:grid-cols-2">
          <div className="fade-up rounded-md border border-white/10 bg-[#111725] p-6">
            <h2 className="text-base font-semibold text-white">Proposal Status</h2>
            <p className="mt-1 text-xs text-slate-400">สัดส่วนสถานะข้อเสนอทั้งหมด</p>

            <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row">
              <div className="h-48 w-48 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={3}
                    >
                      {statusChartData.map((entry) => (
                        <Cell key={entry.name} fill={STATUS_CHART_COLORS[entry.name]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid flex-1 grid-cols-1 gap-2.5">
                {statusChartData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2 text-xs">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: STATUS_CHART_COLORS[entry.name] }}
                    />
                    <span className="text-slate-300">{entry.name}</span>
                    <span className="ml-auto font-semibold text-white">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="fade-up rounded-md border border-white/10 bg-[#111725] p-6" style={{ animationDelay: "80ms" }}>
            <h2 className="text-base font-semibold text-white">Top 5 Proposals</h2>
            <p className="mt-1 text-xs text-slate-400">เรียงตามจำนวนโหวตทั้งหมด</p>

            <div className="mt-5 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top5ByVotes} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={36} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: "rgba(255,255,255,.04)" }}
                    formatter={(value) => [value.toLocaleString(), "Votes"]}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.title ?? ""}
                  />
                  <Bar dataKey="votes" fill="#5b6cff" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Active Proposals + Recent Ended Proposals */}
        <div className="mt-10 grid gap-5 xl:grid-cols-2">
          <div className="fade-up overflow-hidden rounded-md border border-white/10 bg-[#111725]">
            <div className="flex items-center justify-between p-6 pb-4">
              <h2 className="text-base font-semibold text-white">Active Proposals</h2>
              <Link href="/proposals" className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                ดูทั้งหมด
                <ArrowRight size={12} />
              </Link>
            </div>
            {activeProposals.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-slate-400">ไม่มีข้อเสนอที่กำลังเปิดโหวตอยู่</p>
            ) : (
              <div className="divide-y divide-white/5">
                {activeProposals.map((item) => (
                  <Link
                    key={item.id}
                    href={`/proposal/${item.id}`}
                    className="flex items-center justify-between gap-3 px-6 py-4 transition-colors hover:bg-white/[0.02]"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                          #{item.id}
                        </span>
                        <span className="truncate text-sm font-medium text-white">{item.title}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{item.remain}</p>
                    </div>
                    <ArrowRight size={14} className="shrink-0 text-slate-500" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="fade-up overflow-hidden rounded-md border border-white/10 bg-[#111725]" style={{ animationDelay: "80ms" }}>
            <div className="p-6 pb-4">
              <h2 className="text-base font-semibold text-white">Recent Ended Proposals</h2>
            </div>
            {recentEndedProposals.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-slate-400">ยังไม่มีข้อเสนอที่ปิดโหวตแล้ว</p>
            ) : (
              <div className="divide-y divide-white/5">
                {recentEndedProposals.map((item) => {
                  const total = getVoteTotal(item);
                  const yesPct = getYesPercent(item);
                  const noPct = total === 0 ? 0 : Math.round((item.votesNo / total) * 100);
                  const abstainPct = total === 0 ? 0 : Math.round((item.votesAbstain / total) * 100);
                  return (
                    <Link
                      key={item.id}
                      href={`/proposal/${item.id}`}
                      className="block px-6 py-4 transition-colors hover:bg-white/[0.02]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                          #{item.id}
                        </span>
                        <span className="truncate text-sm font-medium text-white">{item.title}</span>
                      </div>
                      <div className="mt-2.5 flex items-center gap-4 text-[11px] text-slate-400">
                        <span className="text-emerald-400">YES {yesPct}%</span>
                        <span className="text-red-400">NO {noPct}%</span>
                        <span className="text-slate-400">ABSTAIN {abstainPct}%</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="fade-up mt-10 overflow-hidden rounded-md border border-white/10 bg-[#111725]">
          <div className="p-6 pb-4">
            <h2 className="text-base font-semibold text-white">Recent Activity</h2>
          </div>
          {recentActivity.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-slate-400">ยังไม่มีความเคลื่อนไหวในระบบ</p>
          ) : (
            <div className="divide-y divide-white/5">
              {recentActivity.map((activity) => {
                const meta = ACTIVITY_META[activity.type];
                const Icon = meta.icon;
                return (
                  <Link
                    key={activity.id}
                    href={`/proposal/${activity.proposalId}`}
                    className="flex items-center gap-3 px-6 py-3.5 transition-colors hover:bg-white/[0.02]"
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/5 ${meta.color}`}>
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-slate-300">
                        <span className={`font-medium ${meta.color}`}>{meta.label}</span>
                        {activity.detail ? ` (${activity.detail})` : ""} — {activity.proposalTitle}
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                        {shortenAddress(activity.actor)}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] text-slate-500">
                      {new Date(activity.timestamp * 1000).toLocaleDateString()}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
