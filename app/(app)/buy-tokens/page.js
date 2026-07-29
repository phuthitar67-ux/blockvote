"use client";

import { useMemo, useState } from "react";
import {
  Coins,
  TrendingUp,
  Tag,
  Loader2,
  ShoppingCart,
  Settings,
  Wallet,
  ArrowDownToLine,
} from "lucide-react";
import AmbientBackground from "@/app/components/AmbientBackground";
import { useWallet } from "@/lib/WalletContext";
import { useGovernance } from "@/lib/GovernanceContext";
import { useToast } from "@/lib/ToastContext";
import { describeTxError } from "@/lib/web3/errors";

function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="fade-up flex h-full flex-col items-center justify-center rounded-[28px] border border-white/10 bg-[#111725] px-6 py-8 text-center">
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-2xl ${bg} ${color}`}>
        <Icon size={18} />
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="mt-2 text-xs text-slate-400">{label}</p>
    </div>
  );
}

export default function BuyTokensPage() {
  const { address, connect } = useWallet();
  const {
    tokenBalance,
    votingPowerPct,
    tokenPrice,
    tokenPriceEth,
    ethTreasuryBalance,
    isOwner,
    buyTokens,
    setTokenPrice,
    withdrawETH,
  } = useGovernance();
  const { showToast } = useToast();

  const [ethAmount, setEthAmount] = useState("");
  const [isBuying, setIsBuying] = useState(false);
  const [buyError, setBuyError] = useState(null);

  const [newPrice, setNewPrice] = useState("");
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Mirrors the exact integer-division formula GovToken.buyTokens() uses
  // on-chain (tokenAmount = msg.value * 1e18 / tokenPrice) — this preview is
  // display-only, the contract always computes the real, final amount.
  const estimatedGov = useMemo(() => {
    const eth = Number(ethAmount);
    if (!eth || eth <= 0 || tokenPriceEth === null || tokenPriceEth <= 0) return 0;
    return eth / tokenPriceEth;
  }, [ethAmount, tokenPriceEth]);

  const tokenPriceText = tokenPriceEth !== null ? `${tokenPriceEth} ETH / GOV` : "--";

  async function handleBuy(e) {
    e.preventDefault();
    const eth = Number(ethAmount);
    if (!address || !eth || eth <= 0 || isBuying) return;
    setBuyError(null);
    setIsBuying(true);
    try {
      const txHash = await buyTokens(ethAmount);
      showToast(`ซื้อ GOV สำเร็จ (tx: ${txHash.slice(0, 10)}...)`, "success");
      setEthAmount("");
    } catch (err) {
      const message = describeTxError(err);
      setBuyError(message);
      showToast(message, "error");
    } finally {
      setIsBuying(false);
    }
  }

  async function handleSetPrice(e) {
    e.preventDefault();
    if (!newPrice || Number(newPrice) <= 0 || isUpdatingPrice) return;
    setIsUpdatingPrice(true);
    try {
      // newPrice is entered in ETH per GOV; convert to wei (the unit the
      // contract's tokenPrice state variable is stored in) using the same
      // 1e18 scale as parseEther, without needing a second ethers import.
      const priceWei = BigInt(Math.round(Number(newPrice) * 1e18));
      await setTokenPrice(priceWei);
      showToast("อัปเดตราคา Token สำเร็จ", "success");
      setNewPrice("");
    } catch (err) {
      showToast(describeTxError(err), "error");
    } finally {
      setIsUpdatingPrice(false);
    }
  }

  async function handleWithdraw() {
    if (isWithdrawing) return;
    setIsWithdrawing(true);
    try {
      await withdrawETH();
      showToast("ถอน ETH ทั้งหมดออกจากสัญญาสำเร็จ", "success");
    } catch (err) {
      showToast(describeTxError(err), "error");
    } finally {
      setIsWithdrawing(false);
    }
  }

  return (
    <section className="relative overflow-hidden bg-[#060816] py-16">
      <AmbientBackground />

      <div className="container max-w-6xl">
        <div className="fade-up mb-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
            <ShoppingCart size={20} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Buy Tokens</h1>
            <p className="mt-1 text-sm text-slate-400">
              เพิ่ม Voting Power ด้วยการซื้อ GOV Token เพิ่มด้วย Sepolia ETH
            </p>
          </div>
        </div>

        {/* Current stats */}
        <div className="grid gap-5 sm:grid-cols-3">
          <StatCard
            icon={Coins}
            label="Current GOV Balance"
            value={`${tokenBalance.toLocaleString()} GOV`}
            color="text-violet-400"
            bg="bg-violet-500/10"
          />
          <StatCard
            icon={TrendingUp}
            label="Current Voting Power"
            value={`${votingPowerPct.toFixed(1)}%`}
            color="text-emerald-400"
            bg="bg-emerald-500/10"
          />
          <StatCard
            icon={Tag}
            label="Current Token Price"
            value={tokenPriceText}
            color="text-amber-400"
            bg="bg-amber-500/10"
          />
        </div>

        {/* Buy form */}
        <div
          className="fade-up mt-8 rounded-[32px] border border-white/10 bg-[#111725] p-8 lg:p-10"
          style={{ animationDelay: "80ms" }}
        >
          <h2 className="text-lg font-semibold text-white">ซื้อ GOV Token</h2>
          <p className="mt-2 text-sm text-slate-400">
            ราคาปัจจุบัน {tokenPriceText} — ระบบคำนวณจำนวน GOV ที่จะได้รับให้อัตโนมัติขณะพิมพ์
          </p>

          <form onSubmit={handleBuy} className="mt-6 max-w-md">
            <label className="mb-2 block text-xs font-medium text-slate-400">ETH Amount</label>
            <input
              type="number"
              min="0"
              step="any"
              value={ethAmount}
              onChange={(e) => setEthAmount(e.target.value)}
              placeholder="0.01"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-blue-500/50"
            />

            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
              <span className="text-slate-400">You will receive </span>
              <span className="font-semibold text-white">
                {estimatedGov.toLocaleString(undefined, { maximumFractionDigits: 4 })} GOV
              </span>
            </div>

            {buyError && <p className="mt-3 text-xs text-red-400">{buyError}</p>}

            <div className="mt-6">
              {address ? (
                <button
                  type="submit"
                  disabled={isBuying || !ethAmount || Number(ethAmount) <= 0}
                  className="primary-btn w-full disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isBuying ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      กำลังส่งธุรกรรม...
                    </>
                  ) : (
                    <>
                      <Coins size={18} />
                      Buy GOV Tokens
                    </>
                  )}
                </button>
              ) : (
                <button type="button" onClick={connect} className="primary-btn w-full">
                  เชื่อมต่อกระเป๋าเพื่อซื้อ Token
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Admin controls — owner only */}
        {isOwner && (
          <div
            className="fade-up mt-8 rounded-[32px] border border-amber-500/20 bg-[#111725] p-8 lg:p-10"
            style={{ animationDelay: "160ms" }}
          >
            <div className="flex items-center gap-3">
              <Settings size={18} className="text-amber-400" />
              <h2 className="text-lg font-semibold text-white">Admin Controls</h2>
            </div>
            <p className="mt-2 text-sm text-slate-400">
              คุณคือเจ้าของสัญญา (Owner) — ควบคุมราคา Token และถอน ETH ที่เก็บไว้ในสัญญาได้
            </p>

            <div className="mt-6 grid gap-8 lg:grid-cols-2">
              <form onSubmit={handleSetPrice} className="max-w-sm">
                <label className="mb-2 block text-xs font-medium text-slate-400">
                  New Token Price (ETH per 1 GOV)
                </label>
                <div className="flex gap-3">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder={tokenPriceEth?.toString() ?? "0.00001"}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-blue-500/50"
                  />
                  <button
                    type="submit"
                    disabled={isUpdatingPrice || !newPrice || Number(newPrice) <= 0}
                    className="secondary-btn shrink-0 px-5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isUpdatingPrice ? <Loader2 size={16} className="animate-spin" /> : "Update"}
                  </button>
                </div>
              </form>

              <div className="max-w-sm">
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <span className="flex items-center gap-2 text-sm text-slate-300">
                    <Wallet size={15} className="text-emerald-400" />
                    Treasury ETH Balance
                  </span>
                  <span className="font-mono text-sm font-semibold text-white">
                    {ethTreasuryBalance.toLocaleString(undefined, { maximumFractionDigits: 6 })} ETH
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleWithdraw}
                  disabled={isWithdrawing || ethTreasuryBalance <= 0}
                  className="secondary-btn mt-3 w-full gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isWithdrawing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <ArrowDownToLine size={16} />
                  )}
                  Withdraw All ETH
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
