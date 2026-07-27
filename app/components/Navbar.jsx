"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet, LogOut, Loader2, Menu, X } from "lucide-react";
import { useWallet } from "@/lib/WalletContext";

function shortenAddress(addr) {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function Navbar() {
    const pathname = usePathname();
    const { address, balanceEth, isConnecting, error, connect, disconnect } = useWallet();
    const [menuOpen, setMenuOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        setMobileOpen(false);
        setMenuOpen(false);
    }, [pathname]);

    const menus = [
        { label: "หน้าแรก", href: "/" },
        { label: "ข้อเสนอ", href: "/proposals" },
        { label: "แดชบอร์ด", href: "/dashboard" },
        { label: "ผลโหวต", href: "/results" },
        { label: "โปรไฟล์", href: "/profile" },
    ];

    function isActive(href) {
        if (href === "/") return pathname === "/";
        return pathname.startsWith(href) || (href === "/proposals" && pathname.startsWith("/proposal/"));
    }

    return (
        <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#060816]/80 backdrop-blur-xl shadow-lg shadow-black/20">
            <div className="mx-auto flex h-[76px] w-full max-w-7xl items-center justify-between px-8">

                {/* Logo */}
                <div className="flex items-center gap-3">

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 shadow-lg shadow-blue-500/20">

                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="2"
                        >
                            <polygon points="12 2 20 7 20 17 12 22 4 17 4 7" />
                        </svg>

                    </div>

                    <div>

                        <h2 className="text-lg font-bold tracking-wide text-white">
                            BlockVote
                        </h2>

                        <p className="text-xs text-slate-400">
                            ระบบลงคะแนน Blockchain
                        </p>

                    </div>

                </div>

                {/* Menu */}
                <nav className="hidden items-center gap-10 lg:flex">

                    {menus.map((menu) => (
                        <Link
                            key={menu.href}
                            href={menu.href}
                            className={`relative pb-1 text-[15px] font-medium transition-all duration-300 ${isActive(menu.href)
                                    ? "text-white"
                                    : "text-slate-400 hover:text-white"
                                }`}
                        >
                            {menu.label}

                            {isActive(menu.href) && (
                                <span className="absolute -bottom-[27px] left-1/2 h-[2px] w-8 -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-500 to-violet-500" />
                            )}

                        </Link>
                    ))}

                </nav>

                {/* Right side */}
                <div className="flex items-center gap-3">

                {/* Wallet */}
                <div className="relative">
                    {address ? (
                        <button
                            onClick={() => setMenuOpen((prev) => !prev)}
                            className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-blue-500/40"
                        >
                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            {shortenAddress(address)}
                        </button>
                    ) : (
                        <button
                            onClick={connect}
                            disabled={isConnecting}
                            className="primary-btn text-sm disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {isConnecting ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    กำลังเชื่อมต่อ...
                                </>
                            ) : (
                                <>
                                    <Wallet size={16} />
                                    เชื่อมต่อกระเป๋า
                                </>
                            )}
                        </button>
                    )}

                    {address && menuOpen && (
                        <div className="absolute right-0 top-[calc(100%+10px)] w-64 rounded-2xl border border-white/10 bg-[#101625] p-4 shadow-xl shadow-black/40">
                            <p className="text-xs text-slate-400">Wallet Address</p>
                            <p className="mt-1 break-all font-mono text-sm text-white">
                                {address}
                            </p>

                            {balanceEth && (
                                <p className="mt-3 text-sm text-slate-300">
                                    {Number(balanceEth).toFixed(4)} ETH
                                </p>
                            )}

                            <button
                                onClick={() => {
                                    disconnect();
                                    setMenuOpen(false);
                                }}
                                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
                            >
                                <LogOut size={14} />
                                ตัดการเชื่อมต่อ
                            </button>
                        </div>
                    )}

                    {error && !address && (
                        <div className="absolute right-0 top-[calc(100%+10px)] w-64 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                            {error}
                        </div>
                    )}
                </div>

                {/* Mobile toggle */}
                <button
                    onClick={() => setMobileOpen((prev) => !prev)}
                    aria-label={mobileOpen ? "ปิดเมนู" : "เปิดเมนู"}
                    aria-expanded={mobileOpen}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white lg:hidden"
                >
                    {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                </button>

                </div>

            </div>

            {/* Mobile menu */}
            <div
                className={`overflow-hidden border-t border-white/10 bg-[#060816]/95 backdrop-blur-xl transition-all duration-300 lg:hidden ${
                    mobileOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                }`}
            >
                <nav className="flex flex-col gap-1 px-6 py-4">
                    {menus.map((menu) => (
                        <Link
                            key={menu.href}
                            href={menu.href}
                            className={`rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                                isActive(menu.href)
                                    ? "bg-blue-500/10 text-white"
                                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                            }`}
                        >
                            {menu.label}
                        </Link>
                    ))}
                </nav>
            </div>
        </header>
    );
}