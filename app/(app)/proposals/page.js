import PageHeader from "@/app/components/PageHeader";
import AmbientBackground from "@/app/components/AmbientBackground";
import ProposalsExplorer from "./ProposalsExplorer";

export const metadata = {
  title: "ข้อเสนอทั้งหมด | BlockVote",
};

export default function ProposalsPage() {
  return (
    <section className="relative overflow-hidden bg-[#060816] py-20">
      <AmbientBackground />

      <div className="container max-w-7xl">
        <PageHeader
          eyebrow="Governance Proposals"
          title="ข้อเสนอทั้งหมด"
          subtitle="ติดตามและร่วมลงคะแนนในข้อเสนอทั้งหมดของระบบ Governance พร้อมตรวจสอบสถานะและความคืบหน้าได้แบบเรียลไทม์"
        />

        <ProposalsExplorer />
      </div>
    </section>
  );
}
