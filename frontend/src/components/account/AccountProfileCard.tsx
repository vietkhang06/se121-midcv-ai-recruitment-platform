'use client';

import { Camera, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { saveAccountAvatar } from '@/lib/api';
import { AccountAvatar } from './AccountAvatar';

export const profilePanel = 'min-w-0 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-5 sm:p-7';
export const profileButton = 'inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm font-semibold text-[var(--heading)] hover:bg-[var(--surface-secondary)] focus-visible:outline-2 focus-visible:outline-[var(--primary)] disabled:opacity-50';

export function AccountProfileCard({ name, email, headline }: { name: string; email?: string; headline?: string }) {
  const { user, updateAccountIdentity } = useAuth();
  const { locale } = useLanguage();
  const vi = locale === 'vi';
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ error?: boolean; text: string }>();

  async function change(file: File | null) {
    setMessage(undefined);
    if (file && (!/\.(jpe?g|png)$/i.test(file.name) || file.size > 5 * 1024 * 1024)) {
      setMessage({ error: true, text: vi ? 'Chọn ảnh JPG hoặc PNG tối đa 5 MB.' : 'Choose a JPG or PNG up to 5 MB.' });
      return;
    }
    setBusy(true);
    try {
      updateAccountIdentity({ avatarId: await saveAccountAvatar(file) });
      setMessage({ text: file ? (vi ? 'Đã cập nhật ảnh.' : 'Photo updated.') : (vi ? 'Đã xóa ảnh.' : 'Photo removed.') });
    } catch {
      setMessage({ error: true, text: vi ? 'Không thể lưu ảnh. Kiểm tra tệp và thử lại.' : 'Could not save the photo. Check the file and try again.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={profilePanel} aria-label={vi ? 'Tài khoản' : 'Account'}>
      <div className="flex items-center gap-4">
        <AccountAvatar name={name} avatarId={user?.avatarId} className="size-16 text-xl" />
        <div className="min-w-0">
          <h2 className="break-words text-lg font-bold text-[var(--heading)]">{name}</h2>
          {headline && <p className="break-words text-sm text-[var(--text-secondary)]">{headline}</p>}
          {email && <p className="break-all text-sm text-[var(--text-secondary)]">{email}</p>}
          {user?.emailVerified != null && <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {user.emailVerified ? (vi ? 'Email đã xác thực' : 'Email verified') : (vi ? 'Email chưa xác thực' : 'Email not verified')}
          </p>}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2" aria-busy={busy}>
        <input id={inputId} type="file" className="peer sr-only" disabled={busy} accept="image/jpeg,image/png"
          onChange={event => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = '';
            if (file) void change(file);
          }} />
        <label htmlFor={inputId} className={`${profileButton} cursor-pointer peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--primary)] ${busy ? 'opacity-50' : ''}`}>
          <Camera className="size-4" /> {busy ? (vi ? 'Đang lưu…' : 'Saving…') : user?.avatarId ? (vi ? 'Đổi ảnh' : 'Change photo') : (vi ? 'Thêm ảnh' : 'Add photo')}
        </label>
        {user?.avatarId && <button type="button" disabled={busy} className={profileButton} onClick={() => void change(null)}>
          <Trash2 className="size-4" /> {vi ? 'Xóa ảnh' : 'Remove photo'}
        </button>}
      </div>
      <p className="mt-2 text-xs text-[var(--text-secondary)]">{vi ? 'JPG hoặc PNG, tối đa 5 MB. Ảnh được cắt vuông từ giữa.' : 'JPG or PNG, up to 5 MB. The image is cropped to a square from the center.'}</p>
      {message && <p role={message.error ? 'alert' : 'status'} className={`mt-2 text-sm ${message.error ? 'text-red-600 dark:text-red-300' : 'text-[var(--success)]'}`}>{message.text}</p>}
    </section>
  );
}
