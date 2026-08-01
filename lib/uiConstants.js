// Display-only constants. These don't live on-chain — a proposal's
// category is just a free-text string in the contract, and status is
// derived from Governance.state(); this file only maps them to labels/colors.

import { Plus, Pencil, Ban, CheckCircle, XCircle, Circle, Flag, Coins, Gift } from "lucide-react";

export const statusLabels = {
  active: { text: "กำลังโหวต", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  passed: { text: "ผ่านแล้ว", color: "text-blue-400", bg: "bg-blue-500/10" },
  rejected: { text: "ไม่ผ่าน", color: "text-red-400", bg: "bg-red-500/10" },
  ended: { text: "ปิดโหวตแล้ว", color: "text-amber-400", bg: "bg-amber-500/10" },
  cancelled: { text: "ยกเลิกแล้ว", color: "text-slate-400", bg: "bg-slate-500/10" },
};

export const categories = ["Protocol", "DeFi", "Treasury", "DAO Ops", "Grants", "Security"];

export const categoryColors = {
  Protocol: "#5b6cff",
  DeFi: "#34d399",
  Treasury: "#a78bfa",
  "DAO Ops": "#f472b6",
  Grants: "#fbbf24",
  Security: "#38bdf8",
};

// Icon/label for each entry in GovernanceContext's activity feed
// (recentActivity + tokenActivity). "vote" entries carry a YES/NO/ABSTAIN
// `detail`, so they're looked up as a compound key via getActivityMeta.
const ACTIVITY_META = {
  created: { label: "สร้างข้อเสนอ", icon: Plus, color: "text-blue-400" },
  edit: { label: "แก้ไขข้อเสนอ", icon: Pencil, color: "text-violet-400" },
  cancel: { label: "ยกเลิกข้อเสนอ", icon: Ban, color: "text-red-400" },
  end: { label: "ปิดโหวต", icon: Flag, color: "text-amber-400" },
  buy: { label: "ซื้อโทเคน", icon: Coins, color: "text-amber-400" },
  claim: { label: "รับโทเคน", icon: Gift, color: "text-emerald-400" },
  "vote-YES": { label: "โหวตเห็นด้วย", icon: CheckCircle, color: "text-emerald-400" },
  "vote-NO": { label: "โหวตไม่เห็นด้วย", icon: XCircle, color: "text-red-400" },
  "vote-ABSTAIN": { label: "งดออกเสียง", icon: Circle, color: "text-slate-400" },
};

export function getActivityMeta(activity) {
  if (activity.type === "vote") {
    return ACTIVITY_META[`vote-${activity.detail}`] ?? ACTIVITY_META["vote-ABSTAIN"];
  }
  return ACTIVITY_META[activity.type];
}
