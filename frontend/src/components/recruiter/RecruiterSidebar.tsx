"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  FileSearch,
  LayoutDashboard,
  Megaphone,
  MessagesSquare,
  Settings,
  Sparkles,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { productRequest } from "@/lib/productApi";

const groups = [
  {
    label: "Tuyển dụng",
    links: [
      ["/recruiter", "Bảng tin", LayoutDashboard],
      ["/recruiter/campaigns", "Chiến dịch tuyển dụng", Megaphone],
      ["/recruiter/jobs", "Tin tuyển dụng", BriefcaseBusiness],
      ["/recruiter/candidates", "Quản lý CV ứng viên", FileSearch],
      ["/recruiter/pipeline", "Quy trình tuyển dụng", UsersRound],
    ],
  },
  {
    label: "Trao đổi & báo cáo",
    links: [
      ["/recruiter/messages", "Tin nhắn", MessagesSquare],
      ["/recruiter/analytics", "Phân tích & báo cáo", BarChart3],
    ],
  },
  {
    label: "Tài khoản",
    links: [
      ["/recruiter/company", "Thông tin doanh nghiệp", Building2],
      ["/recruiter/profile", "Hồ sơ HR", UserRound],
      ["/recruiter/services", "Dịch vụ & credit", WalletCards],
      ["/recruiter/account", "Thiết lập", Settings],
    ],
  },
] as const;

type Entitlements = { recruiterPlan?: "STANDARD" | "PRO"; proUntil?: string; developmentProAccess?: boolean };

export function RecruiterSidebar() {
  const pathname = usePathname();
  const [plan, setPlan] = useState<Entitlements | null>(null);

  useEffect(() => {
    productRequest<Entitlements>("/recruiter/product/entitlements")
      .then(setPlan)
      .catch(() => setPlan(null));
  }, []);

  return (
    <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 overflow-y-auto border-r border-[var(--border)] bg-[var(--surface)] xl:flex xl:flex-col">
      <div className="flex-1 space-y-7 px-3 py-5">
        {groups.map((group) => (
          <section key={group.label}>
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-[var(--text-secondary)]">
              {group.label}
            </p>
            <nav className="space-y-1">
              {group.links.map(([href, label, Icon]) => {
                const active = pathname === href || (href !== "/recruiter" && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      active
                        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--heading)]"
                    }`}
                  >
                    <Icon size={18} className={active ? "text-emerald-600" : ""} />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </section>
        ))}
      </div>

      <div className="m-3 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-cyan-50 p-4 text-slate-800 dark:border-emerald-900 dark:from-emerald-950/50 dark:to-cyan-950/40 dark:text-slate-100">
        <div className="flex items-center gap-2 text-xs font-bold uppercase text-emerald-700 dark:text-emerald-300">
          <Sparkles size={15} />
          {plan?.developmentProAccess ? "Standard · thử nghiệm Pro" : plan?.recruiterPlan === "PRO" ? "midCV HR Pro" : "Tài khoản thường"}
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
          {plan?.developmentProAccess
            ? "Đang mở điểm và minh chứng để kiểm thử trên máy phát triển. Gói tài khoản vẫn là Standard."
            : plan?.recruiterPlan === "PRO"
            ? "Đã mở điểm thành phần, nhận xét và minh chứng AI chi tiết."
            : "Nâng cấp Pro để mở phân tích CV và evidence chi tiết."}
        </p>
        <Link href="/recruiter/services" className="mt-3 inline-flex text-xs font-bold text-emerald-700 underline dark:text-emerald-300">
          {plan?.recruiterPlan === "PRO" ? "Quản lý gói" : "Xem gói dịch vụ"}
        </Link>
      </div>
    </aside>
  );
}
