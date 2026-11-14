"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { fetchRecruiterJobs } from "@/lib/api";
import { productRequest } from "@/lib/productApi";
import { Job } from "@/types";
type Service = {
  code: string;
  name: string;
  credit_cost: number;
  boost_days: number;
  cv_views: number;
};
type Wallet = {
  credits: number;
  packages: Service[];
  transactions: {
    id: string;
    delta: number;
    balance_after: number;
    reason: string;
    created_at: string;
  }[];
};
export default function ServicesPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [job, setJob] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef<Record<string, string>>({});
  const load = useCallback(async () => {
    try {
      const [w, j] = await Promise.all([
        productRequest<Wallet>("/recruiter/services"),
        fetchRecruiterJobs(),
      ]);
      setWallet(w);
      setJobs(j.filter((r) => r.status === "PUBLISHED"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được gói dịch vụ.");
    }
  }, []);
  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);
  const buy = async (code: string) => {
    if (!job) {
      setError("Chọn tin tuyển dụng cần đẩy.");
      return;
    }
    if (
      !window.confirm(
        "Xác nhận dùng credit để mua gói dịch vụ cho tin đã chọn?",
      )
    )
      return;
    setBusy(true);
    setError("");
    setNotice("");
    const key = code + job;
    const requestId =
      pending.current[key] || (pending.current[key] = crypto.randomUUID());
    try {
      await productRequest("/recruiter/services/purchase", {
        requestId,
        packageCode: code,
        jobId: job,
      });
      delete pending.current[key];
      setNotice(
        "Đã kích hoạt gói: tin được ưu tiên và lượt mở CV đã được cộng.",
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mua gói thất bại.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <Link href="/recruiter" className="text-sm text-emerald-700">
        ← Không gian tuyển dụng
      </Link>
      <h1 className="text-3xl font-bold">Gói dịch vụ & Credit</h1>
      <p className="max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
        Credit được cấp sau khi quản trị viên đối soát. Giá dưới đây là cấu hình
        nội bộ midCV, không phải bảng giá TopCV. Tài khoản mới bắt đầu với 0
        credit; chưa có thanh toán ngân hàng tự động.
      </p>
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900"
        >
          {notice}
        </p>
      )}
      {wallet ? (
        <>
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950">
            <div>
              <p className="text-xs">Số dư hiện tại</p>
              <p className="mt-2 text-3xl font-bold">{wallet.credits} credit</p>
            </div>
            <label className="text-sm">
              Tin cần đẩy
              <select
                value={job}
                onChange={(e) => setJob(e.target.value)}
                className="ml-3 max-w-72 rounded-xl border bg-white p-3 text-sm"
              >
                <option value="">Chọn tin đang đăng</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                  </option>
                ))}
              </select>
            </label>
          </section>
          <div className="grid gap-5 md:grid-cols-3">
            {wallet.packages.map((p) => (
              <section
                key={p.code}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm"
              >
                <h2 className="text-xl font-bold">{p.name}</h2>
                <p className="my-5 text-3xl font-bold text-emerald-700">
                  {p.credit_cost}
                  <span className="ml-2 text-sm font-normal">credit</span>
                </p>
                <p className="text-sm">Ưu tiên tin trong {p.boost_days} ngày</p>
                <p className="mt-3 text-sm">
                  +{p.cv_views} lượt mở CV khác nhau
                </p>
                <button
                  type="button"
                  disabled={busy || wallet.credits < p.credit_cost || !job}
                  onClick={() => void buy(p.code)}
                  className="mt-6 w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
                >
                  {busy ? "Đang xử lý…" : "Kích hoạt gói"}
                </button>
              </section>
            ))}
          </div>
          <section className="rounded-2xl border border-[var(--border)] p-5">
            <h2 className="mb-4 font-bold">Lịch sử credit</h2>
            {!wallet.transactions.length && (
              <p className="text-sm text-slate-500">Chưa có giao dịch.</p>
            )}
            {wallet.transactions.map((t) => (
              <div
                key={t.id}
                className="flex justify-between gap-4 border-t py-3 text-sm"
              >
                <div>
                  <p>{t.reason}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(t.created_at).toLocaleString("vi-VN")}
                  </p>
                </div>
                <strong
                  className={t.delta > 0 ? "text-emerald-700" : "text-rose-700"}
                >
                  {t.delta > 0 ? "+" : ""}
                  {t.delta} · còn {t.balance_after}
                </strong>
              </div>
            ))}
          </section>
        </>
      ) : (
        <p>Đang tải số dư và gói dịch vụ…</p>
      )}
    </main>
  );
}
