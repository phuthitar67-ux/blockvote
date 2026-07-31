"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  PieChart,
} from "lucide-react";
import { useGovernance } from "@/lib/GovernanceContext";
import { getYesPercent } from "@/lib/web3/format";

export default function LatestResults() {
  const { proposals: allProposals, loadingProposals } = useGovernance();
  const results = allProposals
    .filter((p) => p.status !== "active")
    .slice(0, 3)
    .map((p) => ({
      title: p.title,
      yes: p.votesYes,
      no: p.votesNo,
      abstain: p.votesAbstain,
      percent: getYesPercent(p),
      color: p.status === "passed" ? "bg-emerald-500" : "bg-red-500",
    }));

  if (!loadingProposals && results.length === 0) return null;

  return (
    <section className="bg-[#060816] pt-24 pb-32">

      <div className="container mx-auto max-w-7xl px-6">

        {/* Header */}

        <div className="fade-up mb-16 text-center">

          <h2 className="text-xl font-semibold tracking-tight text-white">
            ผลการลงคะแนนล่าสุด
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-xs leading-6 text-slate-400">
            ตรวจสอบผลการลงคะแนนของแต่ละ Proposal
            พร้อมสถิติการโหวตแบบเรียลไทม์
          </p>

        </div>

        {/* Cards */}

        <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-3">

          {results.map((item, index) => (

            <div
              key={item.title}
              style={{ animationDelay: `${index * 80}ms` }}
              className="fade-up flex h-full flex-col rounded-[32px] border border-white/10 bg-[#111725] p-7 transition-all duration-300 hover:-translate-y-2 hover:border-blue-500/40 hover:shadow-[0_20px_50px_rgba(59,130,246,.15)]"
            >

              {/* Header */}

              <div className="flex items-start justify-between gap-3">

                <div className="flex min-w-0 items-start gap-4">

                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5">

                    <PieChart
                      size={20}
                      className="text-blue-400"
                    />

                  </div>

                  <div className="min-w-0">

                    <h3 className="line-clamp-2 overflow-hidden break-words text-base font-semibold leading-tight text-white">
                      {item.title}
                    </h3>

                    <div className="mt-2 flex items-center gap-2 text-[11px] text-emerald-400">

                      <CheckCircle2 size={13} />

                      <span>สิ้นสุดแล้ว</span>

                    </div>

                  </div>

                </div>

                <span className="shrink-0 text-lg font-bold text-white">
                  {item.percent}%
                </span>

              </div>

              {/* Content */}

              <div className="flex-1">

                {/* Progress */}

                <div className="mt-7">

                  <div className="h-2 overflow-hidden rounded-full bg-white/10">

                    <div
                      className={`${item.color} h-full rounded-full`}
                      style={{ width: `${item.percent}%` }}
                    />

                  </div>

                </div>

                {/* Statistics */}

                <div className="mt-8 grid grid-cols-3 gap-4">

                  <div className="rounded-2xl border border-white/5 bg-white/[0.04] py-4 text-center transition-all duration-300 hover:bg-white/[0.06]">

                    <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                      เห็นด้วย
                    </p>

                    <p className="mt-2 text-base font-bold text-emerald-400">
                      {item.yes.toLocaleString()}
                    </p>

                  </div>

                  <div className="rounded-2xl border border-white/5 bg-white/[0.04] py-4 text-center transition-all duration-300 hover:bg-white/[0.06]">

                    <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                      ไม่เห็นด้วย
                    </p>

                    <p className="mt-2 text-base font-bold text-red-400">
                      {item.no.toLocaleString()}
                    </p>

                  </div>

                  <div className="rounded-2xl border border-white/5 bg-white/[0.04] py-4 text-center transition-all duration-300 hover:bg-white/[0.06]">

                    <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                      งดออกเสียง
                    </p>

                    <p className="mt-2 text-base font-bold text-amber-400">
                      {item.abstain.toLocaleString()}
                    </p>

                  </div>

                </div>

              </div>

              {/* Footer */}

              <div className="mt-auto pt-8">

                <Link
                  href="/results"
                  className="group flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] py-3 text-[11px] font-medium text-white transition-all duration-300 hover:border-blue-500/40 hover:bg-blue-500/10"
                >

                  ดูผลทั้งหมด

                  <ArrowRight
                    size={14}
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />

                </Link>

              </div>

            </div>

          ))}

        </div>

      </div>

    </section>
  );
}