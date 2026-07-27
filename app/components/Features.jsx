import {
  ShieldCheck,
  FileSearch,
  Zap,
  Users,
} from "lucide-react";

const features = [
  {
    icon: ShieldCheck,
    title: "ลงคะแนนอย่างปลอดภัย",
    description:
      "ทุกคะแนนถูกเข้ารหัสและบันทึกบน Blockchain ไม่สามารถแก้ไขย้อนหลังได้",
    color: "text-blue-400",
  },
  {
    icon: FileSearch,
    title: "ตรวจสอบย้อนหลัง",
    description:
      "ตรวจสอบประวัติการลงคะแนนและรายละเอียดของข้อเสนอได้ทุกเวลา",
    color: "text-violet-400",
  },
  {
    icon: Zap,
    title: "ประมวลผลรวดเร็ว",
    description:
      "แสดงผลการลงคะแนนแบบเรียลไทม์ พร้อมอัปเดตข้อมูลทันที",
    color: "text-amber-400",
  },
  {
    icon: Users,
    title: "โปร่งใสและมีส่วนร่วม",
    description:
      "เปิดโอกาสให้ทุกคนร่วมตัดสินใจด้วยระบบที่ตรวจสอบได้",
    color: "text-emerald-400",
  },
];

export default function Features() {
  return (
    <section className="bg-[#060816]">

      <div className="container max-w-6xl">

        {/* เว้นจาก Statistics */}
        <div className="h-28"></div>

        {/* Divider */}
        <div className="border-t border-white/10 mb-20"></div>

        <div className="fade-up text-center">

          <h2 className="mt-4 text-3xl font-bold text-white lg:text-4xl">
            เทคโนโลยีที่ทำให้การลงคะแนนน่าเชื่อถือ
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-400">
            ระบบลงคะแนนด้วย Blockchain ที่โปร่งใส ปลอดภัย
            และสามารถตรวจสอบย้อนหลังได้ทุกขั้นตอน
          </p>

        </div>

        {/* Cards */}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">

          {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                style={{ animationDelay: `${index * 80}ms` }}
                className="fade-up group flex h-full flex-col items-center rounded-3xl border border-white/10 bg-[#111725] p-6 text-center transition-all duration-300 hover:-translate-y-2 hover:border-blue-500/40"
              >

                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/5 ${feature.color}`}
                >
                  <Icon size={28} strokeWidth={2} />
                </div>

                <h3 className="mt-6 line-clamp-2 overflow-hidden break-words text-lg font-semibold leading-tight text-white">
                  {feature.title}
                </h3>

                <p className="mt-3 line-clamp-2 max-w-[240px] overflow-hidden text-sm leading-7 text-slate-400">
                  {feature.description}
                </p>

              </div>
            );
          })}

        </div>

        <div className="h-28"></div>

      </div>

    </section>
  );
}