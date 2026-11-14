"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { inbox, Account } from "@/lib/inbox";
export function CandidateTier() {
  const [account, setAccount] = useState<Account | null>(null);
  useEffect(() => {
    let active = true;
    void inbox<Account>("/account")
      .then((a) => {
        if (active) setAccount(a);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  if (!account) return null;
  const label =
    account.account_plan === "PRO"
      ? "Tài khoản Pro"
      : account.email_verified
        ? "Tài khoản đã xác thực email"
        : "Tài khoản thường";
  return (
    <div className="border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-900">
          {label}
        </span>
        <Link
          href="/candidate/account?tab=plan"
          className="text-[var(--primary)] underline"
        >
          Quản lý gói tài khoản
        </Link>
      </div>
    </div>
  );
}
