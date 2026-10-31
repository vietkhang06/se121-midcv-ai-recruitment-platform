'use client';
import { useCallback, useEffect, useState } from 'react';
import { apiRequest, clearAuthSession } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
type Session = {id:string; created_at:string; last_used_at:string; expires_at:string; current:boolean};
export function SessionList() {
  const {locale}=useLanguage(); const vi=locale==='vi';
  const [rows,setRows]=useState<Session[]>([]); const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  const load=useCallback(async()=>{ const result=await apiRequest<{data:Session[]}>('/api/v1/auth/sessions'); setRows(result.data); },[]);
  useEffect(()=>{ void load().catch(e=>setError(e.message)); },[load]);
  async function revoke(session:Session) {
    setBusy(true); setError('');
    try { await apiRequest('/api/v1/auth/sessions/'+session.id,{method:'DELETE'}); if(session.current) { clearAuthSession(); window.location.replace('/login'); } else await load(); }
    catch(e) { setError(e instanceof Error?e.message:'Request failed'); } finally { setBusy(false); }
  }
  return <section className="inbox-stack"><h2>{vi?'Phiên đăng nhập':'Sign-in sessions'}</h2>{error&&<p role="alert">{error}</p>}
    {rows.map(row=><article className="inbox-list-row" key={row.id}><div><strong>{row.current?(vi?'Phiên hiện tại':'Current session'):(vi?'Phiên khác':'Other session')}</strong><p>{vi?'Bắt đầu: ':'Started: '}{new Date(row.created_at).toLocaleString(locale)}</p><small>{vi?'Hết hạn: ':'Expires: '}{new Date(row.expires_at).toLocaleString(locale)}</small></div><button disabled={busy} onClick={()=>void revoke(row)}>{vi?'Thu hồi':'Revoke'}</button></article>)}
  </section>;
}
