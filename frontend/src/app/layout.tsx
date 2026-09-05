import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { FirstVisitModal } from "@/components/onboarding/FirstVisitModal";
import { AuthModal } from "@/components/auth/AuthModal";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-sans",
});

const newsreader = Newsreader({ 
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "MatchProof - AI Recruitment Platform | Verified Evidence Matching",
  description: "Objective evaluation layer for modern technical recruitment. Built to empower developers and infrastructure experts with transparent matching vectors.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${newsreader.variable}`}>
      <body className="bg-[#F8FAF9] text-slate-900 min-h-screen flex flex-col antialiased selection:bg-[#0C2B24] selection:text-white">
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
