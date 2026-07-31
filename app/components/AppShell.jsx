"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, AlertTriangle } from "lucide-react";
import Sidebar from "./Sidebar";
import { useGovernance } from "@/lib/GovernanceContext";
import { useWallet } from "@/lib/WalletContext";

export default function AppShell({ children }) {
  const pathname = usePathname();
  const { isConfigured } = useGovernance();
  const { isWrongNetwork, switchNetwork } = useWallet();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  return (
    <div className="flex min-h-screen bg-[#060816]">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <main className="min-w-0 flex-1 overflow-y-auto">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-[#060816]/90 px-4 backdrop-blur-xl lg:hidden">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-violet-600">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
              >
                <polygon points="12 2 20 7 20 17 12 22 4 17 4 7" />
              </svg>
            </div>
            <span className="text-sm font-bold text-white">BlockVote</span>
          </Link>

          <button
            onClick={() => setMobileOpen(true)}
            aria-label="เปิดเมนู"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white"
          >
            <Menu size={18} />
          </button>
        </div>

        {!isConfigured ? (
          <div className="flex items-center gap-2 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-300 sm:px-6">
            <AlertTriangle size={14} className="shrink-0" />
            ยังไม่ได้ตั้งค่าสัญญาอัจฉริยะ — deploy แล้วใส่ address ใน .env.local (ดู .env.example)
          </div>
        ) : (
          isWrongNetwork && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-300 sm:px-6">
              <span className="flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                กระเป๋าของคุณเชื่อมต่ออยู่ที่เครือข่ายผิด กรุณาสลับไปที่ Sepolia
              </span>
              <button
                type="button"
                onClick={switchNetwork}
                className="rounded-lg border border-amber-400/40 px-3 py-1 font-medium text-amber-200 transition-colors hover:bg-amber-500/20"
              >
                สลับเครือข่าย
              </button>
            </div>
          )
        )}

        {children}
      </main>
    </div>
  );
}
