"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ArrowRight, CheckCircle2, XCircle, Clock3, ChevronDown } from "lucide-react";
import { useGovernance } from "@/lib/GovernanceContext";
import { getYesPercent } from "@/lib/web3/format";
import { statusLabels, categoryColors } from "@/lib/uiConstants";

const statusIcon = {
  active: Clock3,
  passed: CheckCircle2,
  rejected: XCircle,
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "passed", label: "Passed" },
  { key: "rejected", label: "Failed" },
];

const SORTS = [
  { key: "newest", label: "Newest" },
  { key: "most-votes", label: "Most Votes" },
  { key: "ending-soon", label: "Ending Soon" },
];

export default function ProposalsExplorer() {
  const { proposals, loadingProposals } = useGovernance();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");

  const visible = useMemo(() => {
    let list = proposals.filter((p) => {
      const matchesFilter = filter === "all" || p.status === filter;
      const matchesQuery =
        !query.trim() ||
        p.title.toLowerCase().includes(query.trim().toLowerCase()) ||
        p.id.includes(query.trim());
      return matchesFilter && matchesQuery;
    });

    if (sort === "most-votes") {
      list = [...list].sort(
        (a, b) =>
          b.votesYes + b.votesNo + b.votesAbstain - (a.votesYes + a.votesNo + a.votesAbstain)
      );
    } else if (sort === "ending-soon") {
      list = [...list].sort((a, b) => new Date(a.votingDeadline) - new Date(b.votingDeadline));
    } else {
      list = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return list;
  }, [proposals, query, filter, sort]);

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
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาข้อเสนอ..."
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-blue-500/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
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
              onChange={(e) => setSort(e.target.value)}
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
        <div className="fade-up rounded-[32px] border border-white/10 bg-[#111725] py-16 text-center text-sm text-slate-400">
          กำลังโหลดข้อเสนอจาก Blockchain...
        </div>
      ) : visible.length === 0 ? (
        <div className="fade-up rounded-[32px] border border-white/10 bg-[#111725] py-16 text-center text-sm text-slate-400">
          ไม่พบข้อเสนอที่ตรงกับเงื่อนไข
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((item, index) => {
            const percent = getYesPercent(item);
            const totalVotes = item.votesYes + item.votesNo + item.votesAbstain;
            const status = statusLabels[item.status];
            const StatusIcon = statusIcon[item.status];
            const categoryColor = categoryColors[item.category] ?? "#94a3b8";

            return (
              <div
                key={item.id}
                style={{ animationDelay: `${index * 60}ms` }}
                className="fade-up flex h-full flex-col rounded-[32px] border border-white/10 bg-[#111725] px-8 py-8 transition-all duration-300 hover:-translate-y-2 hover:border-blue-500/40 hover:shadow-[0_0_40px_rgba(59,130,246,.15)]"
              >
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-blue-500/10 px-3 py-1 text-[11px] font-semibold text-blue-400">
                      #{item.id}
                    </span>
                    <span
                      className="rounded-full px-3 py-1 text-[11px] font-semibold"
                      style={{
                        color: categoryColor,
                        backgroundColor: `${categoryColor}1A`,
                      }}
                    >
                      {item.category}
                    </span>
                  </div>

                  <span
                    className={`flex items-center gap-2 text-[11px] font-medium ${status.color}`}
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
                </div>

                {/* Footer */}
                <div className="mt-auto border-t border-white/5 pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {totalVotes.toLocaleString()} Votes
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
                          Vote Now
                        </Link>
                      )}

                      <Link
                        href={`/proposal/${item.id}`}
                        className="group flex items-center gap-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-white"
                      >
                        Details
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
