"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock3,
  ChevronDown,
  StopCircle,
  Ban,
  PlusCircle,
  Inbox,
} from "lucide-react";
import { useGovernance } from "@/lib/GovernanceContext";
import { useWallet } from "@/lib/WalletContext";
import { getYesPercent, getVoteTotal } from "@/lib/web3/format";
import { statusLabels, categoryColors } from "@/lib/uiConstants";

// Display-only Thai labels for the on-chain category values. The raw
// English value in item.category is left untouched — it's what filtering
// and future writes to the contract rely on.
const CATEGORY_LABELS = {
  Protocol: "โปรโตคอล",
  DeFi: "การเงิน DeFi",
  Treasury: "คลังทุน",
  "DAO Ops": "การบริหาร",
  Grants: "ทุนสนับสนุน",
  Security: "ความปลอดภัย",
};

const statusIcon = {
  active: Clock3,
  passed: CheckCircle2,
  rejected: XCircle,
  ended: StopCircle,
  cancelled: Ban,
};

const FILTERS = [
  { key: "all", label: "ทั้งหมด" },
  { key: "active", label: "กำลังโหวต" },
  { key: "ended", label: "ปิดโหวตแล้ว" },
  { key: "cancelled", label: "ยกเลิกแล้ว" },
  { key: "mine", label: "ข้อเสนอของฉัน" },
];

const SORTS = [
  { key: "newest", label: "ใหม่ล่าสุด" },
  { key: "oldest", label: "เก่าที่สุด" },
  { key: "most-votes", label: "โหวตมากที่สุด" },
  { key: "least-votes", label: "โหวตน้อยที่สุด" },
  { key: "title-asc", label: "ชื่อ (A-Z)" },
  { key: "title-desc", label: "ชื่อ (Z-A)" },
];

function SkeletonCard() {
  return (
    <div className="flex h-full flex-col rounded-[32px] border border-white/10 bg-[#111725] px-8 py-8">
      <div className="flex items-center justify-between gap-2">
        <div className="h-5 w-14 animate-pulse rounded-full bg-white/10" />
        <div className="h-5 w-20 animate-pulse rounded-full bg-white/10" />
      </div>
      <div className="mt-6 flex-1 space-y-3">
        <div className="h-5 w-4/5 animate-pulse rounded-lg bg-white/10" />
        <div className="h-4 w-full animate-pulse rounded-lg bg-white/10" />
        <div className="h-4 w-2/3 animate-pulse rounded-lg bg-white/10" />
      </div>
      <div className="mt-7 h-2.5 w-full animate-pulse rounded-full bg-white/10" />
      <div className="mt-7 flex items-center justify-between border-t border-white/5 pt-6">
        <div className="h-4 w-20 animate-pulse rounded bg-white/10" />
        <div className="h-4 w-14 animate-pulse rounded bg-white/10" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="fade-up flex flex-col items-center justify-center rounded-[32px] border border-white/10 bg-[#111725] py-20 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-slate-400">
        <Inbox size={24} />
      </span>
      <p className="mt-5 text-base font-semibold text-white">ไม่พบข้อเสนอ</p>
      <p className="mt-1.5 max-w-xs text-sm text-slate-400">
        ลองเปลี่ยนตัวกรองหรือคำค้นหา หรือสร้างข้อเสนอใหม่ได้เลย
      </p>
      <Link href="/create-proposal" className="primary-btn mt-6 h-11 gap-2 px-6 text-sm">
        <PlusCircle size={16} />
        สร้างข้อเสนอ
      </Link>
    </div>
  );
}

export default function ProposalsExplorer() {
  const { proposals, loadingProposals } = useGovernance();
  const { address } = useWallet();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");

  const handleQueryChange = useCallback((e) => setQuery(e.target.value), []);
  const handleSortChange = useCallback((e) => setSort(e.target.value), []);
  const handleFilterClick = useCallback((key) => setFilter(key), []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();

    let list = proposals.filter((p) => {
      const matchesFilter =
        filter === "all"
          ? true
          : filter === "mine"
            ? !!address && p.creator.toLowerCase() === address.toLowerCase()
            : p.status === filter;

      const matchesQuery =
        !q ||
        String(p.id).includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.creator.toLowerCase().includes(q);

      return matchesFilter && matchesQuery;
    });

    // Sort by the raw on-chain startTime (Unix seconds), not createdAt — that
    // field is truncated to a "YYYY-MM-DD" string for display, so any two
    // proposals created on the same calendar day would otherwise tie and
    // fall back to whatever order they happened to already be in.
    list = [...list];
    if (sort === "oldest") {
      list.sort((a, b) => a.startTime - b.startTime);
    } else if (sort === "most-votes") {
      list.sort((a, b) => getVoteTotal(b) - getVoteTotal(a));
    } else if (sort === "least-votes") {
      list.sort((a, b) => getVoteTotal(a) - getVoteTotal(b));
    } else if (sort === "title-asc") {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === "title-desc") {
      list.sort((a, b) => b.title.localeCompare(a.title));
    } else {
      list.sort((a, b) => b.startTime - a.startTime);
    }

    return list;
  }, [proposals, query, filter, sort, address]);

  return (
    <>
      {/* Search + filter + sort */}
      <div className="fade-up mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 lg:max-w-md">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            value={query}
            onChange={handleQueryChange}
            placeholder="ค้นหาด้วย ID, ชื่อ, รายละเอียด หรือที่อยู่ผู้สร้าง..."
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-blue-500/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => handleFilterClick(f.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === f.key
                    ? "bg-blue-500/20 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <select
              value={sort}
              onChange={handleSortChange}
              className="appearance-none rounded-xl border border-white/10 bg-white/5 py-2.5 pl-4 pr-9 text-xs font-medium text-white outline-none transition-colors focus:border-blue-500/50"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key} className="bg-[#101625]">
                  {s.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
          </div>
        </div>
      </div>

      {loadingProposals ? (
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((item, index) => {
            const percent = getYesPercent(item);
            const totalVotes = getVoteTotal(item);
            const status = statusLabels[item.status];
            const StatusIcon = statusIcon[item.status];
            const categoryColor = categoryColors[item.category] ?? "#94a3b8";
            const winningSide =
              item.votesYes === item.votesNo ? "เสมอ" : item.votesYes > item.votesNo ? "เห็นด้วย" : "ไม่เห็นด้วย";

            return (
              <div
                key={item.id}
                style={{ animationDelay: `${index * 60}ms` }}
                className="fade-up flex h-full flex-col rounded-[32px] border border-white/10 bg-[#111725] px-8 py-8 transition-all duration-300 hover:-translate-y-2 hover:border-blue-500/40 hover:shadow-[0_0_40px_rgba(59,130,246,.15)]"
              >
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="pill bg-blue-500/10 text-blue-400">
                      #{item.id}
                    </span>
                    <span
                      className="pill"
                      style={{
                        color: categoryColor,
                        backgroundColor: `${categoryColor}1A`,
                      }}
                    >
                      {CATEGORY_LABELS[item.category] ?? item.category}
                    </span>
                  </div>

                  <span
                    className={`pill bg-white/5 ${status.color}`}
                  >
                    <StatusIcon size={14} />
                    {status.text}
                  </span>
                </div>

                {/* Content */}
                <div className="mt-6 flex-1">
                  <h3 className="line-clamp-2 overflow-hidden break-words text-[22px] font-bold leading-tight tracking-tight text-white">
                    {item.title}
                  </h3>

                  <p className="mt-4 line-clamp-2 overflow-hidden text-sm leading-7 text-slate-400">
                    {item.summary}
                  </p>
                </div>

                {/* Progress */}
                <div className="mt-7">
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                    <span>คะแนนเห็นด้วย</span>
                    <span>{percent}%</span>
                  </div>

                  <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      <span className="text-emerald-400">เห็นด้วย</span> {item.votesYes.toLocaleString()} ·{" "}
                      <span className="text-red-400">ไม่เห็นด้วย</span> {item.votesNo.toLocaleString()}
                    </span>
                    <span className="font-medium text-slate-300">
                      ผลชนะ: <span className="text-white">{winningSide}</span>
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-auto border-t border-white/5 pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {totalVotes.toLocaleString()} โหวต
                      </p>

                      <div className="mt-2 flex items-center gap-2 text-xs font-medium text-amber-400">
                        <Clock3 size={14} />
                        <span>{item.remain}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.status === "active" && (
                        <Link
                          href={`/proposal/${item.id}`}
                          className="primary-btn h-9 px-4 text-xs"
                        >
                          โหวตเลย
                        </Link>
                      )}

                      <Link
                        href={`/proposal/${item.id}`}
                        className="group flex items-center gap-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-white"
                      >
                        รายละเอียด
                        <ArrowRight
                          size={13}
                          className="transition-transform duration-300 group-hover:translate-x-1"
                        />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
