'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest, clearAuthSession } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

type Session = {
  id: string;
  created_at: string;
  last_used_at: string;
  expires_at: string;
  current: boolean;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Request failed';
}

export function SessionList() {
  const { locale } = useLanguage();
  const vi = locale === 'vi';
  const [rows, setRows] = useState<Session[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const requestIdRef = useRef(0);
  const initialLoadRef = useRef<Promise<Session[]> | null>(null);

  const load = useCallback(async () => {
    const result = await apiRequest<{ data: Session[] }>('/api/v1/auth/sessions');
    return result.data;
  }, []);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    let active = true;
    const initialLoad = initialLoadRef.current ?? load();
    initialLoadRef.current = initialLoad;

    void initialLoad
      .then((nextRows) => {
        if (active && requestId === requestIdRef.current) setRows(nextRows);
      })
      .catch((loadError: unknown) => {
        if (active && requestId === requestIdRef.current) setError(getErrorMessage(loadError));
      });

    return () => {
      active = false;
      requestIdRef.current += 1;
    };
  }, [load]);

  async function revoke(session: Session) {
    let activeRequestId = ++requestIdRef.current;
    setBusy(true);
    setError('');

    try {
      await apiRequest('/api/v1/auth/sessions/' + session.id, { method: 'DELETE' });
      if (session.current) {
        clearAuthSession();
        window.location.replace('/login');
      } else {
        activeRequestId = ++requestIdRef.current;
        const nextRows = await load();
        if (activeRequestId === requestIdRef.current) setRows(nextRows);
      }
    } catch (revokeError: unknown) {
      if (activeRequestId === requestIdRef.current) setError(getErrorMessage(revokeError));
    } finally {
      if (activeRequestId === requestIdRef.current) setBusy(false);
    }
  }

  return (
    <section className="inbox-stack">
      <h2>{vi ? 'Phiên đăng nhập' : 'Sign-in sessions'}</h2>
      {error && <p role="alert">{error}</p>}
      {rows.map((row) => (
        <article className="inbox-list-row" key={row.id}>
          <div>
            <strong>{row.current ? (vi ? 'Phiên hiện tại' : 'Current session') : (vi ? 'Phiên khác' : 'Other session')}</strong>
            <p>{vi ? 'Bắt đầu: ' : 'Started: '}{new Date(row.created_at).toLocaleString(locale)}</p>
            <small>{vi ? 'Hết hạn: ' : 'Expires: '}{new Date(row.expires_at).toLocaleString(locale)}</small>
          </div>
          <button disabled={busy} onClick={() => void revoke(row)}>{vi ? 'Thu hồi' : 'Revoke'}</button>
        </article>
      ))}
    </section>
  );
}
