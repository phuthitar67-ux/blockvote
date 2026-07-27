"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useWallet } from "@/lib/WalletContext";

function shortenAddress(addr) {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function Hero() {
    const { address, isConnecting, connect } = useWallet();

    return (
        <section className="relative overflow-hidden bg-[#060816]">

            {/* Background */}

            <div className="absolute inset-0 -z-20">

                <div
                    className="absolute inset-0 opacity-[0.04]"
                    style={{
                        backgroundImage: `
              linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)
            `,
                        backgroundSize: "60px 60px",
                    }}
                />

                <div className="absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-blue-600/10 blur-[140px]" />

                <div className="absolute right-0 top-20 h-[350px] w-[350px] rounded-full bg-violet-600/10 blur-[140px]" />

            </div>

            <div className="container">

                <div className="grid min-h-[82vh] items-center gap-10 py-20 md:grid-cols-[0.95fr_1.05fr]">

                    {/* LEFT */}

                    <div className="fade-up min-w-0 max-w-xl">

                        {/* Badge */}

                        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2">

                            <span className="h-2 w-2 rounded-full bg-blue-400" />

                            <span className="text-xs font-medium tracking-[0.15em] uppercase text-blue-300">

                                Mainnet Live • 38 Active Proposals

                            </span>

                        </div>

                        {/* Heading */}

                        <h1 className="mt-8 text-5xl font-black leading-[1.05] text-white xl:text-6xl">

                            ระบบลงคะแนน

                            <br />

                            <span className="gradient-text">

                                Blockchain

                            </span>

                            <br />

                            Governance

                        </h1>

                        {/* Description */}

                        <p className="mt-6 max-w-lg text-lg leading-8 text-slate-400">

                            ระบบลงคะแนนออนไลน์ที่ใช้เทคโนโลยี Blockchain
                            เพื่อให้ทุกคะแนนมีความโปร่งใส ปลอดภัย
                            และตรวจสอบย้อนหลังได้ทุกขั้นตอน

                        </p>

                        {/* Buttons */}

                        <div className="mt-10 flex flex-wrap gap-4">

                            <button
                                onClick={connect}
                                disabled={isConnecting || !!address}
                                className="primary-btn px-7 py-3 text-base disabled:cursor-not-allowed disabled:opacity-80"
                            >
                                {isConnecting ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        กำลังเชื่อมต่อ...
                                    </>
                                ) : address ? (
                                    `เชื่อมต่อแล้ว (${shortenAddress(address)})`
                                ) : (
                                    "เชื่อมต่อกระเป๋า"
                                )}
                            </button>

                            <Link href="/proposals" className="secondary-btn px-7 py-3 text-base">

                                ดูข้อเสนอทั้งหมด →

                            </Link>

                        </div>

                    </div>

                    {/* RIGHT */}

                    <div
                        style={{ animationDelay: "150ms" }}
                        className="fade-up relative flex min-w-0 items-center justify-center"
                    >
                        {/* Blockchain Network */}

                        <div className="relative h-[340px] w-[340px] max-w-full xl:h-[380px] xl:w-[380px]">

                            {/* Glow */}

                            <div className="absolute inset-0 rounded-full bg-blue-600/5 blur-[90px]" />

                            {/* Outer Ring */}

                            <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5 xl:h-[460px] xl:w-[460px]" />

                            {/* Main Circle */}

                            <div className="absolute left-1/2 top-1/2 flex h-[210px] w-[210px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-blue-500/40 bg-blue-500/10 backdrop-blur-xl">

                                <div className="absolute h-[140px] w-[140px] rounded-full border border-blue-400/20" />

                                <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/10">

                                    <svg
                                        width="32"
                                        height="32"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="white"
                                        strokeWidth="1.8"
                                    >
                                        <polygon points="12 2 20 7 20 17 12 22 4 17 4 7" />
                                    </svg>

                                </div>

                            </div>

                            {/* Horizontal */}

                            <div className="absolute left-10 top-1/2 h-px w-[85px] -translate-y-1/2 bg-amber-400/30" />

                            <div className="absolute right-10 top-1/2 h-px w-[85px] -translate-y-1/2 bg-blue-500/30" />

                            {/* Diagonal */}

                            <div className="absolute left-[132px] top-[64px] h-[110px] w-px rotate-[330deg] bg-blue-500/30" />

                            <div className="absolute right-[132px] top-[64px] h-[110px] w-px rotate-[30deg] bg-violet-500/30" />

                            <div className="absolute left-[132px] bottom-[64px] h-[110px] w-px rotate-[30deg] bg-green-500/30" />

                            <div className="absolute right-[132px] bottom-[64px] h-[110px] w-px rotate-[330deg] bg-violet-500/30" />

                            {/* Top */}

                            <div className="absolute left-1/2 top-3 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/10 text-sm text-blue-300">

                                ◈

                            </div>

                            {/* Top Right */}

                            <div className="absolute right-6 top-3 flex h-11 w-11 items-center justify-center rounded-full border border-violet-500/30 bg-violet-500/10 text-sm">

                                ◉

                            </div>

                            {/* Right */}

                            <div className="absolute right-0 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/10 text-lg">

                                ⚖️

                            </div>

                            {/* Bottom Right */}

                            <div className="absolute bottom-3 right-6 flex h-11 w-11 items-center justify-center rounded-full border border-violet-500/30 bg-violet-500/10 text-sm">

                                🔒

                            </div>

                            {/* Bottom */}

                            <div className="absolute bottom-3 left-1/2 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full border border-green-500/30 bg-green-500/10 text-sm">

                                ⛓

                            </div>

                            {/* Left */}

                            <div className="absolute left-0 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-lg">

                                🪙

                            </div>
                            {/* Orbit Ring */}

                            <div className="absolute left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5" />

                            <div className="absolute left-1/2 top-1/2 h-[390px] w-[390px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5" />

                            {/* Floating Dots */}

                            <div className="absolute left-[88px] top-[82px] h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_20px_#60a5fa]" />

                            <div className="absolute right-[92px] top-[122px] h-2 w-2 rounded-full bg-violet-400 shadow-[0_0_20px_#a78bfa]" />

                            <div className="absolute left-[74px] bottom-[128px] h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_20px_#34d399]" />

                            <div className="absolute right-[78px] bottom-[92px] h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_20px_#fbbf24]" />

                            {/* Bottom Glow */}

                            <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/10 blur-[90px]" />

                        </div>

                    </div>

                </div>

            </div>

            {/* Bottom Fade */}

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent via-[#060816]/40 to-[#060816]" />

        </section>
    );
}