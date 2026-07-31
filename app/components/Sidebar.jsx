"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Vote,
  PlusCircle,
  BarChart3,
  User,
  X,
  Loader2,
  ShoppingCart,
} from "lucide-react";
import { useWallet } from "@/lib/WalletContext";
import { useGovernance } from "@/lib/GovernanceContext";

const NAV_ITEMS = [
  { label: "แดชบอร์ด", href: "/dashboard", icon: LayoutDashboard },
  { label: "ข้อเสนอ", href: "/proposals", icon: Vote },
  { label: "สร้างข้อเสนอ", href: "/create-proposal", icon: PlusCircle },
  { label: "ซื้อโทเคน", href: "/buy-tokens", icon: ShoppingCart },
  { label: "ผลการลงคะแนน", href: "/results", icon: BarChart3 },
  { label: "โปรไฟล์", href: "/profile", icon: User },
];

function shortenAddress(addr) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function Sidebar({ mobileOpen, onClose }) {
  const pathname = usePathname();
  const { address, isConnecting, connect } = useWallet();
  const { tokenBalance } = useGovernance();

  function isActive(href) {
    if (href === "/proposals") {
      return pathname.startsWith("/proposals") || pathname.startsWith("/proposal/");
    }
    return pathname.startsWith(href);
  }

  return (
    <>
      {mobileOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-[280px] shrink-0 flex-col border-r border-white/10 bg-[#060816] transition-transform duration-300 lg:sticky lg:top-0 lg:z-auto lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 shadow-lg shadow-blue-500/20">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
              >
                <polygon points="12 2 20 7 20 17 12 22 4 17 4 7" />
              </svg>
            </div>
            <span className="text-base font-bold text-white">BlockVote</span>
          </Link>

          <button
            onClick={onClose}
            aria-label="ปิดเมนู"
            className="text-slate-400 hover:text-white lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-4 rounded-xl px-4 py-3 text-lg font-semibold transition-colors ${
                  active
                    ? "bg-blue-500/10 text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={22} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          {address ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                เชื่อมต่อแล้ว
              </div>
              <p className="mt-2 truncate font-mono text-sm text-white">
                {shortenAddress(address)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                ยอดคงเหลือ{" "}
                <span className="text-white">
                  {tokenBalance.toLocaleString()} GOV
                </span>
              </p>
            </div>
          ) : (
            <button
              onClick={connect}
              disabled={isConnecting}
              className="primary-btn w-full text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isConnecting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  กำลังเชื่อมต่อ...
                </>
              ) : (
                "เชื่อมต่อกระเป๋า"
              )}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
