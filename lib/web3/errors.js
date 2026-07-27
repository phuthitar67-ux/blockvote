// Maps a raw ethers/MetaMask error into a specific, human-readable Thai
// message so the UI never falls back to one generic string for every
// failure mode (user rejection, wrong network, known contract reverts,
// unrecognized reverts, and truly unknown errors are all distinguished).

const KNOWN_REVERTS = [
  [/already voted/i, "คุณโหวตข้อเสนอนี้ไปแล้ว"],
  [/voting closed/i, "หมดเวลาโหวตสำหรับข้อเสนอนี้แล้ว"],
  [/no voting weight/i, "คุณไม่มี Governance Token เพียงพอสำหรับการโหวต"],
  [/below proposal threshold/i, "คุณมี Governance Token ไม่ถึงขั้นต่ำสำหรับการสร้างข้อเสนอ"],
  [/already claimed/i, "คุณได้รับ Governance Token นี้ไปแล้ว"],
  [/voting period out of range/i, "ระยะเวลาโหวตที่เลือกไม่ถูกต้อง"],
  [/empty title/i, "กรุณากรอกชื่อข้อเสนอ"],
  [/no such proposal/i, "ไม่พบข้อเสนอนี้ในระบบ"],
  [/invalid vote/i, "ตัวเลือกการโหวตไม่ถูกต้อง"],
];

export function describeTxError(err) {
  if (!err) return "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ กรุณาลองใหม่อีกครั้ง";

  const rejectionCode = err.code ?? err.info?.error?.code;
  if (rejectionCode === "ACTION_REJECTED" || rejectionCode === 4001) {
    return "คุณยกเลิกการทำรายการใน MetaMask";
  }

  if (err.code === "WRONG_NETWORK") {
    return err.message;
  }

  const reason = err.reason || err.shortMessage || err.message || "";

  for (const [pattern, message] of KNOWN_REVERTS) {
    if (pattern.test(reason)) return message;
  }

  if (err.code === "CALL_EXCEPTION" || /revert/i.test(reason)) {
    return `Smart Contract ปฏิเสธธุรกรรม${reason ? `: ${reason}` : ""}`;
  }

  return err.shortMessage || err.message || "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ กรุณาลองใหม่อีกครั้ง";
}
