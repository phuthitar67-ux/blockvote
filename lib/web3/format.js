import { formatEther } from "ethers";
import { PROPOSAL_STATE } from "./config";

const STATE_TO_STATUS = {
  [PROPOSAL_STATE.Active]: "active",
  [PROPOSAL_STATE.Passed]: "passed",
  [PROPOSAL_STATE.Rejected]: "rejected",
  [PROPOSAL_STATE.Ended]: "ended",
  [PROPOSAL_STATE.Cancelled]: "cancelled",
};

function toDateString(unixSeconds) {
  return new Date(Number(unixSeconds) * 1000).toISOString().slice(0, 10);
}

function remainLabel(status, endTimeSeconds) {
  if (status !== "active") return "สิ้นสุดแล้ว";
  const msLeft = Number(endTimeSeconds) * 1000 - Date.now();
  const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));
  if (daysLeft <= 1) return "ใกล้ปิดโหวต";
  return `เหลือ ${daysLeft} วัน`;
}

/** Maps a raw Governance.getProposal() struct + its state() into the shape the UI renders. */
export function normalizeProposal(raw, proposalState) {
  const status = STATE_TO_STATUS[Number(proposalState)] ?? "active";
  const votesYes = Math.round(Number(formatEther(raw.votesYes)));
  const votesNo = Math.round(Number(formatEther(raw.votesNo)));
  const votesAbstain = Math.round(Number(formatEther(raw.votesAbstain)));

  return {
    id: Number(raw.id),
    creator: raw.creator,
    title: raw.title,
    description: raw.description,
    summary: raw.description,
    category: raw.category,
    status,
    startTime: Number(raw.startTime),
    endTime: Number(raw.endTime),
    createdAt: toDateString(raw.startTime),
    votingDeadline: toDateString(raw.endTime),
    remain: remainLabel(status, raw.endTime),
    votesYes,
    votesNo,
    votesAbstain,
  };
}

export function getVoteTotal(p) {
  return p.votesYes + p.votesNo + p.votesAbstain;
}

export function getYesPercent(p) {
  const total = getVoteTotal(p);
  return total === 0 ? 0 : Math.round((p.votesYes / total) * 100);
}

export function groupByCategory(proposals) {
  const counts = new Map();
  for (const p of proposals) {
    counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  }
  return Array.from(counts, ([name, value]) => ({ name, value }));
}

const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

/** Builds a fixed 7-month trailing window (oldest → current) with a vote count per month. */
export function monthlyActivityFrom(votingHistory) {
  const now = new Date();
  const months = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, month: THAI_MONTHS[d.getMonth()], votes: 0 };
  });
  const byKey = Object.fromEntries(months.map((m) => [m.key, m]));
  for (const entry of votingHistory) {
    const d = new Date(entry.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (byKey[key]) byKey[key].votes += 1;
  }
  return months.map(({ month, votes }) => ({ month, votes }));
}

/** Builds a fixed 7-month trailing window of proposal outcomes, grouped by createdAt month. */
export function monthlyOutcomesFrom(proposals) {
  const now = new Date();
  const months = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, month: THAI_MONTHS[d.getMonth()], active: 0, failed: 0, passed: 0 };
  });
  const byKey = Object.fromEntries(months.map((m) => [m.key, m]));
  for (const p of proposals) {
    const d = new Date(p.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const bucket = byKey[key];
    if (!bucket) continue;
    if (p.status === "active") bucket.active += 1;
    else if (p.status === "passed") bucket.passed += 1;
    else bucket.failed += 1;
  }
  return months.map(({ month, active, failed, passed }) => ({ month, active, failed, passed }));
}

export function formatCompact(n) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}
