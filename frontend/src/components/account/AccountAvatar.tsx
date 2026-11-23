'use client';

import { useEffect, useState } from 'react';
import { UserRound } from 'lucide-react';
import { fetchAccountAvatar } from '@/lib/api';

function AvatarImage({ avatarId }: { avatarId: string }) {
  const [src, setSrc] = useState<string>();
  useEffect(() => {
    const request = new AbortController();
    let url: string | undefined;
    void fetchAccountAvatar(avatarId, request.signal).then(image => {
      if (request.signal.aborted) return;
      url = URL.createObjectURL(image);
      setSrc(url);
    }).catch(() => {});
    return () => {
      request.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [avatarId]);

  if (!src) return null;
  // The authenticated image is a local blob URL.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className="absolute inset-0 size-full object-cover" onError={() => setSrc(undefined)} data-account-avatar="" />;
}

export function AccountAvatar({ name, avatarId, className = 'size-10 text-sm' }: {
  name?: string;
  avatarId?: string | null;
  className?: string;
}) {
  const initials = name?.trim().split(/\s+/).slice(-2).map(word => Array.from(word)[0]).join('').toLocaleUpperCase();
  return (
    <span aria-hidden="true" style={{ clipPath: 'circle(50%)' }} className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--border-soft)] bg-[var(--surface-secondary)] font-bold text-[var(--primary)] ${className}`}>
      {initials || <UserRound className="size-1/2" />}
      {avatarId && <AvatarImage key={avatarId} avatarId={avatarId} />}
    </span>
  );
}
