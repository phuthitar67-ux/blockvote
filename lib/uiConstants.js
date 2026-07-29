// Display-only constants. These don't live on-chain — a proposal's
// category is just a free-text string in the contract, and status is
// derived from Governance.state(); this file only maps them to labels/colors.

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
