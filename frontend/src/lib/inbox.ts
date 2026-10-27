import { apiRequest } from "./api";
export interface Notice {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string;
  created_at: string;
  read_at: string | null;
}
export interface Thread {
  id: string;
  application_id: string;
  candidate_user_id: string;
  recruiter_user_id: string;
  peer_name: string;
  job_title: string;
  accepted: boolean;
  blocked_by: string | null;
  unread: number;
  last_message: string | null;
}
export interface Message {
  id: string;
  sender_id: string;
  client_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}
export interface Account {
  id: string;
  email: string;
  full_name: string;
  email_verified: boolean;
  role: string;
  account_plan: string;
  email_available: boolean;
}
export interface Settings {
  application_alerts: boolean;
  message_alerts: boolean;
  profile_alerts: boolean;
  job_alerts: boolean;
  email_alerts: boolean;
  job_keyword: string;
  job_location: string;
}
export interface JobItem {
  id: string;
  title: string;
  company_name: string;
  location: string | null;
  status: string;
  saved: boolean;
}
export interface Letter {
  id: string;
  title: string;
  body: string;
  updated_at: string;
}
export interface ProfileView {
  id: string;
  recruiter_name: string;
  company_name: string;
  viewed_at: string;
}
export interface Contact {
  id: string;
  name: string;
  title: string;
}
export async function inbox<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const r = await apiRequest<{ data: T }>("/api/v1/inbox" + path, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return r.data;
}
export function changed() {
  window.dispatchEvent(new Event("midcv:inbox"));
}
export function failure(e: unknown) {
  return e instanceof Error
    ? e.message
    : "Không thể hoàn tất yêu cầu / Request failed";
}
export function noticeTitle(n: Notice, vi: boolean) {
  const titles: Record<string, string> = {
    MESSAGE: "New message",
    CONNECTION: "Recruiter connection request",
    PROFILE_VIEW: "Your profile was viewed",
    APPLICATION: "Application notification",
    APPLICATION_STATUS: "Application updated",
    JOB_ALERT: "New job matching your preferences",
    PLAN_REQUEST: "Account upgrade request",
  };
  return vi ? n.title : titles[n.kind] || n.title;
}
export function noticeBody(n: Notice, vi: boolean) {
  const texts: Record<string, string> = {
    MESSAGE: "You have a new recruitment message.",
    CONNECTION: "A recruiter invited you to discuss your application.",
    PROFILE_VIEW: "A recruiter opened your application profile.",
  };
  return vi ? n.body : texts[n.kind] || n.body;
}
