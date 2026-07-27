import "./globals.css";
import { WalletProvider } from "@/lib/WalletContext";
import { GovernanceProvider } from "@/lib/GovernanceContext";

export const metadata = {
  title: "ระบบลงคะแนน Blockchain Governance",
  description:
    "ระบบลงคะแนนเสียงบน Blockchain ที่มีความปลอดภัย โปร่งใส และตรวจสอบได้",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className="bg-[#070B17] text-white antialiased">
        <WalletProvider>
          <GovernanceProvider>{children}</GovernanceProvider>
        </WalletProvider>
      </body>
    </html>
  );
}