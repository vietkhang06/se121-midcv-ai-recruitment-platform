'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AccountProfileCard, profileButton, profilePanel } from '@/components/account/AccountProfileCard';
import { DeactivateAccountSection } from '@/components/common/DeactivateAccountSection';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  beginOAuthLink, confirmCandidateCV, fetchCandidateCVs, fetchCandidateProfile, fetchGithubConnection, saveCandidateProfile, triggerGithubAnalysis,
} from '@/lib/api';
import { statusLabel } from '@/lib/statusLabels';
import type { CandidateProfile, CV, Industry } from '@/types';

const inputStyle = 'mt-1.5 min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--heading)] focus-visible:outline-2 focus-visible:outline-[var(--primary)]';
const industries: Record<Industry, string> = {
  Technology: 'Công nghệ', Marketing: 'Marketing', Design: 'Thiết kế',
  Finance: 'Tài chính', HR: 'Nhân sự', Sales: 'Kinh doanh', OTHER: 'Khác',
};

export default function CandidateProfilePage() {
  const { user, updateAccountIdentity } = useAuth();
  const { locale } = useLanguage();
  const vi = locale === 'vi';
  const [profile, setProfile] = useState<CandidateProfile>();
  const [draft, setDraft] = useState<CandidateProfile>();
  const [cv, setCv] = useState<CV>();
  const [confirming, setConfirming] = useState(false);
  const [cvMessage, setCvMessage] = useState<{ error?: boolean; text: string }>();
  const [github, setGithub] = useState<Awaited<ReturnType<typeof fetchGithubConnection>>>();
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ error?: boolean; text: string }>();
  const [connecting, setConnecting] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState<{ error?: boolean; text: string }>();

  useEffect(() => {
    let active = true;
    void fetchCandidateProfile().then(result => {
      if (!active) return;
      setProfile(result);
      setDraft(result);
    }).catch(() => { if (active) setFailed(true); });
    void fetchCandidateCVs().then(cvs => {
      if (active) setCv(cvs.find(item => item.isDefault) ?? cvs[0]);
    }).catch(() => {});
    void fetchGithubConnection().then(result => {
      if (active) setGithub(result);
    }).catch(() => {});
    return () => { active = false; };
  }, [attempt]);

  if (!profile || !draft) {
    return <main className="mx-auto max-w-xl px-4 py-16 text-center">
      {failed ? <div className={profilePanel}>
        <p role="alert">{vi ? 'Không thể tải thông tin cá nhân.' : 'Could not load your profile.'}</p>
        <button type="button" className={`${profileButton} mt-3`} onClick={() => {
          setFailed(false);
          setAttempt(value => value + 1);
        }}>{vi ? 'Thử lại' : 'Retry'}</button>
      </div> : <p role="status">{vi ? 'Đang tải thông tin cá nhân…' : 'Loading profile…'}</p>}
    </main>;
  }

  const selected = draft.targetIndustries?.length ? draft.targetIndustries : [draft.targetIndustry ?? draft.primaryIndustry];
  const fields = [
    { key: 'fullName', label: vi ? 'Họ và tên' : 'Full name', autoComplete: 'name', required: true, maxLength: 255 },
    { key: 'phone', label: vi ? 'Số điện thoại' : 'Phone number', type: 'tel', autoComplete: 'tel', maxLength: 30 },
    { key: 'headline', label: vi ? 'Chức danh' : 'Professional title', maxLength: 255 },
  ] as const;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || saving) return;
    const fullName = draft.fullName.trim();
    const githubUrl = (draft.githubUrl || '').trim();
    if (!fullName) {
      setMessage({ error: true, text: vi ? 'Vui lòng nhập họ và tên.' : 'Enter your full name.' });
      return;
    }
    if (githubUrl && !/^(?:(?:https?:\/\/)?(?:www\.)?github\.com\/)?[a-z\d-]+\/?$/i.test(githubUrl)) {
      setMessage({ error: true, text: vi ? 'Địa chỉ GitHub chưa đúng định dạng.' : 'Enter a valid GitHub profile address.' });
      return;
    }
    setSaving(true);
    setMessage(undefined);
    try {
      const result = await saveCandidateProfile({ ...draft, fullName, githubUrl, targetIndustries: selected });
      setProfile(result);
      setDraft(result);
      updateAccountIdentity({ fullName: result.fullName });
      setMessage({ text: vi ? 'Đã lưu thông tin cá nhân.' : 'Profile saved.' });
    } catch {
      setMessage({ error: true, text: vi ? 'Không thể lưu thông tin. Vui lòng thử lại.' : 'Could not save your profile. Try again.' });
    } finally {
      setSaving(false);
    }
  }

  async function connect(provider: 'github' | 'google' | 'linkedin') {
    setConnecting(true);
    setConnectionMessage(undefined);
    try {
      window.location.assign(await beginOAuthLink(provider));
    } catch {
      setConnecting(false);
      setConnectionMessage({ error: true, text: vi ? 'Không thể mở trang liên kết.' : 'Could not open account linking.' });
    }
  }

  async function syncGitHub() {
    setConnecting(true);
    setConnectionMessage(undefined);
    try {
      await triggerGithubAnalysis();
      setConnectionMessage({ text: vi ? 'Đã gửi yêu cầu đồng bộ GitHub.' : 'GitHub sync requested.' });
    } catch {
      setConnectionMessage({ error: true, text: vi ? 'Không thể đồng bộ GitHub.' : 'Could not sync GitHub.' });
    } finally {
      setConnecting(false);
    }
  }

  async function confirmCv() {
    if (!cv) return;
    setConfirming(true);
    setCvMessage(undefined);
    try {
      const result = await confirmCandidateCV(cv.id);
      if (result?.status !== 'CONFIRMED') throw new Error('CV confirmation did not complete.');
      setCv({ ...cv, status: result.status });
      setCvMessage({ text: vi ? 'Hồ sơ đã được xác nhận thành công.' : 'CV confirmed.' });
    } catch {
      setCvMessage({ error: true, text: vi ? 'Không thể xác nhận CV. Kiểm tra lại nội dung CV.' : 'Could not confirm the CV. Review its content.' });
    } finally {
      setConfirming(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-7 sm:px-6 sm:py-10">
      <header className="space-y-2">
        <Link href="/candidate" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)] hover:underline">
          <ArrowLeft className="size-4" /> {vi ? 'Trang ứng viên' : 'Candidate dashboard'}
        </Link>
        <h1 className="text-2xl font-bold text-[var(--heading)] sm:text-3xl">{vi ? 'Thông tin cá nhân' : 'Personal information'}</h1>
      </header>
      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <form className={`${profilePanel} space-y-5`} onSubmit={save}>
          <h2 className="text-lg font-bold text-[var(--heading)]">{vi ? 'Chỉnh sửa hồ sơ' : 'Edit profile'}</h2>
          <fieldset disabled={saving} className="min-w-0 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map(({ key, label, ...attributes }) => <label key={key} className="text-sm font-medium">{label}{key === 'fullName' ? ' *' : ''}
                <input {...attributes} className={inputStyle} value={draft[key] || ''}
                  onChange={event => setDraft({ ...draft, [key]: event.target.value })} />
              </label>)}
              <label className="text-sm font-medium">Email
                <input className={`${inputStyle} bg-[var(--surface-secondary)]`} type="email" readOnly value={profile.email || user?.email || ''} />
              </label>
            </div>
            <label className="block text-sm font-medium">{vi ? 'Giới thiệu' : 'About'}
              <textarea rows={4} className={inputStyle} value={draft.bio || ''} onChange={event => setDraft({ ...draft, bio: event.target.value })} />
            </label>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">{vi ? 'Ngành nghề quan tâm' : 'Industries of interest'}</legend>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(industries) as Industry[]).map(industry => {
                  const active = selected.includes(industry);
                  return <button key={industry} type="button" aria-pressed={active}
                    disabled={active && selected.length === 1}
                    className={`${profileButton} ${active ? 'border-[var(--primary)] bg-[var(--surface-secondary)]' : ''}`}
                    onClick={() => {
                      const next = active ? selected.filter(item => item !== industry) : [...selected, industry];
                      setDraft({ ...draft, primaryIndustry: next[0], targetIndustry: next[0], targetIndustries: next });
                    }}>
                    {vi ? industries[industry] : industry === 'OTHER' ? 'Other' : industry}
                  </button>;
                })}
              </div>
            </fieldset>
            <label className="block text-sm font-medium">{vi ? 'Trang GitHub' : 'GitHub profile'}
              <input id="candidate-github-url" name="githubUrl" className={inputStyle} value={draft.githubUrl || ''}
                placeholder="https://github.com/username" onChange={event => setDraft({ ...draft, githubUrl: event.target.value })} />
            </label>
          </fieldset>
          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border-soft)] pt-4">
            <button type="submit" disabled={saving} className="min-h-11 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              {saving ? (vi ? 'Đang lưu…' : 'Saving…') : (vi ? 'Lưu thông tin' : 'Save changes')}
            </button>
            {message && <p role={message.error ? 'alert' : 'status'} className={`text-sm ${message.error ? 'text-red-600 dark:text-red-300' : 'text-[var(--success)]'}`}>{message.text}</p>}
          </div>
        </form>
        <aside className="grid min-w-0 gap-5">
          <AccountProfileCard name={profile.fullName || user?.fullName || (vi ? 'Ứng viên' : 'Candidate')} email={user?.email} headline={profile.headline} />
          <section className={`${profilePanel} space-y-3`}>
            <h2 className="font-bold text-[var(--heading)]">{vi ? 'Tài khoản liên kết' : 'Linked accounts'}</h2>
            {github && <p className="text-sm text-[var(--text-secondary)]">{github.ownershipVerified && github.login
              ? (vi ? `GitHub đã xác minh · @${github.login}` : `GitHub verified · @${github.login}`)
              : (vi ? 'Chưa xác minh tài khoản GitHub.' : 'GitHub account unverified.')}</p>}
            <div className="flex flex-wrap gap-2">
              {(['github', 'google', 'linkedin'] as const).map(provider => <button
                key={provider} type="button" disabled={connecting} className={profileButton} onClick={() => void connect(provider)}>
                {provider === 'github' && github?.connected ? (vi ? 'Kết nối lại' : 'Reconnect') : (vi ? 'Liên kết' : 'Link')} {{ github: 'GitHub', google: 'Google', linkedin: 'LinkedIn' }[provider]}
              </button>)}
              {profile.githubUrl && (draft.githubUrl || '').trim() === profile.githubUrl.trim() &&
                <button type="button" className={profileButton} disabled={connecting} onClick={() => void syncGitHub()}>
                  {vi ? 'Đồng bộ GitHub' : 'Sync GitHub'}
                </button>}
            </div>
            {connectionMessage && <p className="text-sm" role={connectionMessage.error ? 'alert' : 'status'}>{connectionMessage.text}</p>}
          </section>
          <section className={`${profilePanel} space-y-2`}>
            <h2 className="font-bold text-[var(--heading)]">{vi ? 'CV và kỹ năng' : 'CVs and skills'}</h2>
            {cv && <p className="break-words text-sm text-[var(--text-secondary)]">{cv.title} · {statusLabel(cv.status, locale)}</p>}
            <div className="flex flex-wrap gap-2">
              <Link href="/candidate/cvs" className={profileButton}>{vi ? 'Quản lý CV' : 'Manage CVs'}</Link>
              {cv?.status === 'DRAFT' && <button type="button" className={profileButton} disabled={confirming} onClick={() => void confirmCv()}>
                {confirming ? (vi ? 'Đang xác nhận…' : 'Confirming…') : (vi ? 'Xác nhận hồ sơ' : 'Confirm CV')}
              </button>}
            </div>
            {cvMessage && <p className="text-sm" role={cvMessage.error ? 'alert' : 'status'}>{cvMessage.text}</p>}
          </section>
        </aside>
      </div>
      <DeactivateAccountSection />
      <Link href="/help" className="inline-flex min-h-10 items-center text-sm font-semibold text-[var(--primary)] underline sm:hidden">
        {vi ? 'Trợ giúp' : 'Help'}
      </Link>
    </main>
  );
}
