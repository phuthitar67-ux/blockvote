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
  [/not proposal creator/i, "คุณไม่ใช่ผู้สร้างข้อเสนอนี้ จึงไม่มีสิทธิ์ทำรายการนี้"],
  [/proposal already has votes/i, "ไม่สามารถทำรายการนี้ได้ เนื่องจากมีผู้โหวตข้อเสนอนี้แล้ว"],
  [/proposal not active/i, "ข้อเสนอนี้ไม่ได้อยู่ในสถานะกำลังโหวตแล้ว"],
  [/zero eth sent/i, "กรุณาระบุจำนวน ETH ที่ต้องการใช้ซื้อ"],
  [/eth amount too small/i, "จำนวน ETH น้อยเกินไป ไม่สามารถแลกเป็น GOV ได้แม้แต่หน่วยเดียว"],
  [/price must be positive/i, "ราคาต้องมากกว่า 0"],
  [/no eth to withdraw/i, "ไม่มี ETH ในสัญญาให้ถอน"],
  [/eth transfer failed/i, "การโอน ETH ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"],
  [/ownable unauthorized|ownableunauthorizedaccount/i, "คุณไม่ใช่เจ้าของสัญญา จึงไม่มีสิทธิ์ทำรายการนี้"],
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

  // Custom Solidity errors (e.g. OpenZeppelin's OwnableUnauthorizedAccount)
  // decode via ethers' `err.revert.name`, not as a plain revert-reason
  // string — err.reason stays empty for these, so a regex over it alone
  // would never match. Check the decoded error name first.
  if (err.revert?.name === "OwnableUnauthorizedAccount") {
    return "คุณไม่ใช่เจ้าของสัญญา จึงไม่มีสิทธิ์ทำรายการนี้";
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
