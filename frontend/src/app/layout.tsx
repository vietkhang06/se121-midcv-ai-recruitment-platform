import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { FirstVisitModal } from "@/components/onboarding/FirstVisitModal";
import { AuthModal } from "@/components/auth/AuthModal";
import { SuspensionBanner } from "@/components/common/SuspensionBanner";
import { FeedbackWidget } from "@/components/common/FeedbackWidget";

export const metadata: Metadata = {
  title: "midCV® — CV chuẩn việc làm thật",
  description: "Objective evaluation layer for modern technical recruitment. Built to empower candidates and recruiters with transparent matching vectors.",
  icons: { icon: [{ url: '/icon.svg', type: 'image/svg+xml' }] },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('midcv_theme')||localStorage.getItem('matchjd_theme')||localStorage.getItem('matchproof_theme');t=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';document.documentElement.classList.toggle('dark',t==='dark');document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}catch(e){}})()`,
          }}
        />
      </head>
      <body className="bg-[var(--background)] text-[var(--foreground)] min-h-screen flex flex-col antialiased selection:bg-[var(--primary)] selection:text-white transition-colors duration-200">
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <Navbar />
              <SuspensionBanner />
              <main className="flex-1">
                {children}
              </main>
              <Footer />
              <FirstVisitModal />
              <AuthModal />
              <FeedbackWidget />
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
