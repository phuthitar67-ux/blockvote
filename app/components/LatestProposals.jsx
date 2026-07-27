"use client";

import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  CheckCircle2,
} from "lucide-react";
import { useGovernance } from "@/lib/GovernanceContext";
import { getVoteTotal, getYesPercent } from "@/lib/web3/format";

export default function LatestProposals() {
  const { proposals: allProposals, loadingProposals } = useGovernance();
  const proposals = allProposals
    .filter((p) => p.status === "active")
    .slice(0, 3)
    .map((p) => ({
      id: `#${p.id}`,
      title: p.title,
      description: p.description,
      progress: getYesPercent(p),
      votes: `${getVoteTotal(p).toLocaleString()} Votes`,
      remain: p.remain,
      status: "กำลังเปิดโหวต",
      color: "bg-emerald-500",
    }));

  if (!loadingProposals && proposals.length === 0) return null;

  return (
    <section className="bg-[#060816] pt-16 pb-24">
      <div className="container max-w-7xl">
        {/* Header */}
        <div className="fade-up mb-16 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-white">
            ข้อเสนอที่กำลังเปิดโหวต
          </h2>

          <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-slate-400">
            ติดตามข้อเสนอที่กำลังอยู่ระหว่างการลงคะแนน
            พร้อมตรวจสอบสถานะและความคืบหน้าได้แบบเรียลไทม์
          </p>
        </div>

        {/* Cards */}
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {proposals.map((item, index) => (
            <div
              key={item.id}
              style={{ animationDelay: `${index * 80}ms` }}
              className="fade-up flex h-full flex-col rounded-[32px] border border-white/10 bg-[#111725] px-8 py-8 transition-all duration-300 hover:-translate-y-2 hover:border-blue-500/40 hover:shadow-[0_0_40px_rgba(59,130,246,.15)]"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-blue-500/10 px-3 py-1 text-[11px] font-semibold text-blue-400">
                  {item.id}
                </span>

                <span className="flex items-center gap-2 text-[11px] font-medium text-emerald-400">
                  <CheckCircle2 size={14} />
                  {item.status}
                </span>
              </div>

              {/* Content */}
              <div className="mt-6 flex-1">
                <h3 className="line-clamp-2 overflow-hidden break-words text-[22px] font-bold leading-tight tracking-tight text-white">
                  {item.title}
                </h3>

                <p className="mt-4 line-clamp-2 overflow-hidden text-sm leading-7 text-slate-400">
                  {item.description}
                </p>
              </div>

              {/* Progress */}
              <div className="mt-7">
                <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                  <span>ความคืบหน้า</span>
                  <span>{item.progress}%</span>
                </div>

                <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`${item.color} h-full rounded-full transition-all duration-500`}
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="mt-auto border-t border-white/5 pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {item.votes}
                    </p>

                    <div className="mt-2 flex items-center gap-2 text-xs font-medium text-amber-400">
                      <Clock3 size={14} />
                      <span>{item.remain}</span>
                    </div>
                  </div>

                  <Link
                    href={`/proposal/${item.id.replace("#", "")}`}
                    className="group flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-medium text-white transition-all duration-300 hover:border-blue-500/40 hover:bg-blue-500/10"
                  >
                    ดูรายละเอียด

                    <ArrowRight
                      size={14}
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}