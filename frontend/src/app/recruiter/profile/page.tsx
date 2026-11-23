'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import {
  AccountProfileCard,
  profileButton,
  profilePanel,
} from '@/components/account/AccountProfileCard';
import { DeactivateAccountSection } from '@/components/common/DeactivateAccountSection';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { fetchRecruiterProfile } from '@/lib/api';
import { statusLabel } from '@/lib/statusLabels';
import type { RecruiterProfile } from '@/types';

export default function RecruiterProfilePage() {
  const { user } = useAuth();
  const { locale } = useLanguage();
  const vi = locale === 'vi';

  const [profile, setProfile] = useState<RecruiterProfile>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    void fetchRecruiterProfile()
      .then(result => {
        if (active) {
          setProfile(result);
        }
      })
      .catch(() => {
        if (active) {
          setFailed(true);
        }
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  const name =
    user?.fullName ||
    profile?.fullName ||
    (vi ? 'Nhà tuyển dụng' : 'Recruiter');

  const email = profile?.email || user?.email;
  const company = profile?.company;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-7 sm:px-6 sm:py-10">
      <header className="space-y-2">
        <Link
          href="/recruiter"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)] hover:underline"
        >
          <ArrowLeft className="size-4" />
          {vi ? 'Trang tuyển dụng' : 'Recruiter dashboard'}
        </Link>

        <h1 className="text-2xl font-bold text-[var(--heading)] sm:text-3xl">
          {vi ? 'Hồ sơ nhà tuyển dụng' : 'Recruiter profile'}
        </h1>
      </header>

      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className={`${profilePanel} space-y-4`}>
          <h2 className="text-lg font-bold text-[var(--heading)]">
            {vi ? 'Doanh nghiệp' : 'Company'}
          </h2>

          {failed ? (
            <div className="space-y-3">
              <p role="alert" className="text-sm">
                {vi
                  ? 'Không thể tải thông tin doanh nghiệp.'
                  : 'Could not load company details.'}
              </p>

              <button
                type="button"
                className={profileButton}
                onClick={() => {
                  setFailed(false);
                  setAttempt(value => value + 1);
                }}
              >
                {vi ? 'Thử lại' : 'Retry'}
              </button>
            </div>
          ) : !profile ? (
            <p role="status" className="text-sm">
              {vi ? 'Đang tải…' : 'Loading…'}
            </p>
          ) : (
            <>
              <p className="break-words font-medium">
                {company?.name ||
                  (vi
                    ? 'Chưa liên kết doanh nghiệp.'
                    : 'No company linked.')}
              </p>

              {company?.verificationStatus && (
                <p className="text-sm text-[var(--text-secondary)]">
                  {statusLabel(company.verificationStatus, locale)}
                </p>
              )}
            </>
          )}

          <Link
            href="/recruiter/company"
            className={profileButton}
          >
            {vi
              ? 'Quản lý doanh nghiệp'
              : 'Manage company'}
          </Link>
        </section>

        <AccountProfileCard
          name={name}
          email={email}
        />
      </div>

      <DeactivateAccountSection />

      <Link
        href="/help"
        className="inline-flex min-h-10 items-center text-sm font-semibold text-[var(--primary)] underline sm:hidden"
      >
        {vi ? 'Trợ giúp' : 'Help'}
      </Link>
    </main>
  );
}