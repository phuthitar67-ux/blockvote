"use client";

import { useGovernance } from "@/lib/GovernanceContext";
import { formatCompact } from "@/lib/web3/format";

export default function Statistics() {
  const { platformStats } = useGovernance();

  const stats = [
    {
      icon: "◉",
      value: platformStats.totalProposals.toLocaleString(),
      label: "ข้อเสนอทั้งหมด",
      color: "text-blue-400",
    },
    {
      icon: "◎",
      value: String(platformStats.activeProposals),
      label: "ข้อเสนอที่เปิดอยู่",
      color: "text-emerald-400",
    },
    {
      icon: "◌",
      value: platformStats.totalVoters.toLocaleString(),
      label: "ผู้ลงคะแนน",
      color: "text-violet-400",
    },
    {
      icon: "◈",
      value: formatCompact(platformStats.governanceTokens),
      label: "Governance Token",
      color: "text-amber-400",
    },
  ];

  return (
  <section className="pt-32 pb-16">
      <div className="container">

     <div className="mt-16 grid gap-7 md:grid-cols-2 xl:grid-cols-4">

          {stats.map((item, index) => (
            <div
              key={item.label}
              style={{ animationDelay: `${index * 80}ms` }}
              className="fade-up group flex h-full min-h-[150px] flex-col rounded-3xl border border-white/10 bg-[#101523] p-6 transition-all duration-300 hover:-translate-y-2 hover:border-blue-500/40 hover:shadow-[0_0_40px_rgba(80,120,255,.15)]"
            >

              {/* Icon */}
              <div
  className={`flex items-center justify-center text-[34px] leading-none ${item.color}`}
>
  {item.icon}
</div>

              {/* Content */}
              <div className="flex flex-1 flex-col items-center justify-center text-center">

                <h2 className={`text-[42px] font-bold leading-none ${item.color}`}>
                  {item.value}
                </h2>

                <p className="mt-2 text-sm font-medium text-slate-400">
                  {item.label}
                </p>

              </div>

            </div>
          ))}

        </div>

      </div>

    </section>
  );
}