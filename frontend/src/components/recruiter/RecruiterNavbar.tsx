"use client";

import { AccountTools } from "@/components/inbox/AccountTools";
import { BrandLogo } from "@/components/common/BrandLogo";
import { ThemeSwitch } from "@/components/common/ThemeSwitch";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  FileSearch,
  Globe,
  LayoutDashboard,
  Menu,
  Megaphone,
  PlusCircle,
  UserRound,
  X,
} from "lucide-react";

const mobileLinks = [
  ["/recruiter", "Bảng tin", LayoutDashboard],
  ["/recruiter/campaigns", "Chiến dịch", Megaphone],
  ["/recruiter/jobs", "Tin tuyển dụng", BriefcaseBusiness],
  ["/recruiter/candidates", "Quản lý CV", FileSearch],
  ["/recruiter/analytics", "Báo cáo", BarChart3],
  ["/recruiter/company", "Doanh nghiệp", Building2],
  ["/recruiter/profile", "Hồ sơ HR", UserRound],
] as const;

export function RecruiterNavbar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { locale, toggleLocale } = useLanguage();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  const suspended = user?.accountStatus === "SUSPENDED" || user?.isActive === false;

  return (
    <header className="sticky top-0 z-50 h-14 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
      <div className="mx-auto flex h-full w-full max-w-[1800px] items-center justify-between gap-3 px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <BrandLogo href="/recruiter" size="md" />
          <span className="hidden rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 sm:inline dark:bg-emerald-950/40 dark:text-emerald-300">
            Nhà tuyển dụng
          </span>
          {suspended && (
            <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-bold text-rose-700">Đã đình chỉ</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!suspended && (
            <Link href="/recruiter/jobs/new" className="hidden items-center gap-2 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 sm:inline-flex">
              <PlusCircle size={16} /> Đăng tin
            </Link>
          )}
          <button type="button" onClick={toggleLocale} className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] px-2.5 py-1.5 text-xs font-bold" aria-label="Đổi ngôn ngữ">
            <Globe size={15} /> {locale.toUpperCase()}
          </button>
          <ThemeSwitch />
          <AccountTools />
          <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-xl border border-[var(--border)] p-2 xl:hidden" aria-label="Mở menu nhà tuyển dụng" aria-expanded={open}>
            {open ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-14 border-b border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl xl:hidden">
          <nav className="mx-auto grid max-w-3xl gap-2 sm:grid-cols-2">
            {mobileLinks.map(([href, label, Icon]) => {
              const active = pathname === href || (href !== "/recruiter" && pathname.startsWith(href));
              return (
                <Link key={href} href={href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${active ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" : "hover:bg-[var(--surface-secondary)]"}`}>
                  <Icon size={18} /> {label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
