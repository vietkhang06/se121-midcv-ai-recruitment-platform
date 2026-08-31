import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { FirstVisitModal } from "@/components/onboarding/FirstVisitModal";
import { AuthModal } from "@/components/auth/AuthModal";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Recruitment Platform - Nền tảng Tuyển dụng AI Đa ngành",
  description: "Xây dựng nền tảng tuyển dụng thông minh hỗ trợ đối sánh JD và hồ sơ ứng viên bằng Vector Embedding 1536 chiều và LLM.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased`}>
        <AuthProvider>
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
          <FirstVisitModal />
          <AuthModal />
        </AuthProvider>
      </body>
    </html>
  );
}
