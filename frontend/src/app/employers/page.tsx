import Link from "next/link";
export default function EmployersPage() {
  return (
    <main className="min-h-[80vh] bg-gradient-to-br from-emerald-950 to-slate-900 px-5 py-20 text-white">
      <div className="mx-auto max-w-6xl">
        <span className="text-xs font-bold uppercase tracking-[.25em] text-emerald-300">
          midCV Nhà tuyển dụng
        </span>
        <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
          Tuyển đúng người.
          <br />
          Có căn cứ để quyết định.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300">
          Đăng tin, quản lý CV và kiểm tra độ phù hợp dựa trên kỹ năng, kinh
          nghiệm cùng minh chứng. midCV hỗ trợ đánh giá; đội ngũ của bạn làm chủ
          quyết định.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link
            href="/employers/register"
            className="rounded-xl bg-emerald-400 px-6 py-3 font-bold text-emerald-950"
          >
            Đăng ký doanh nghiệp
          </Link>
          <Link
            href="/employers/login"
            className="rounded-xl border border-white/30 px-6 py-3 font-semibold"
          >
            Đăng nhập nhà tuyển dụng
          </Link>
        </div>
        <div className="mt-16 grid gap-5 md:grid-cols-3">
          {[
            [
              "01",
              "Xác thực email",
              "Kích hoạt tài khoản qua thư xác minh. Chuẩn bị tin tuyển dụng ở dạng nháp.",
            ],
            [
              "02",
              "Xác minh doanh nghiệp",
              "Gửi số điện thoại, mã số thuế, địa chỉ và giấy phép. Dự kiến 2 ngày làm việc; sau khi duyệt, đăng tối đa 5 tin và xem 100 CV.",
            ],
            [
              "03",
              "Xây dựng uy tín",
              "Doanh nghiệp được quản trị viên thẩm định cấp độ 3 có thể đăng tin và xem hồ sơ không giới hạn.",
            ],
          ].map(([step, title, text]) => (
            <section
              key={step}
              className="rounded-2xl border border-white/15 bg-white/5 p-6"
            >
              <span className="text-xs font-bold text-emerald-300">{step}</span>
              <h2 className="mt-3 text-xl font-bold">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">{text}</p>
            </section>
          ))}
        </div>
        <Link
          href="/jobseekers/login"
          className="mt-10 inline-block text-sm text-slate-300 underline"
        >
          Bạn đang tìm việc? Đến cổng ứng viên →
        </Link>
      </div>
    </main>
  );
}
