'use client';

import { AccountAvatar } from '@/components/account/AccountAvatar';
import Link from 'next/link';
import { useId, useRef } from 'react';
import { ArrowUpRight, CalendarDays, ChevronDown } from 'lucide-react';
import type { Application, ApplicationStatus } from '@/types';
import { APPLICATION_STATUS_LABELS, APPLICATION_TRANSITIONS } from '@/lib/applicationWorkflow';
import { formatMatchScore, matchPhaseLabels, matchPresentation } from '@/lib/matchPresentation';
import styles from './pipeline-candidate-card.module.css';

const actionLabels: Partial<Record<ApplicationStatus, readonly [string, string]>> = {
  REVIEWED: ['Đánh dấu đã xem', 'Mark as reviewed'],
  SHORTLISTED: ['Đưa vào danh sách chọn', 'Shortlist'],
  INTERVIEWING: ['Chuyển sang phỏng vấn', 'Move to interview'],
  HIRED: ['Đánh dấu đã tuyển', 'Mark as hired'],
  REJECTED: ['Từ chối hồ sơ', 'Reject application'],
};

type Props = {
  application: Application;
  locale: 'vi' | 'en';
  actionsOpen: boolean;
  updating: boolean;
  updatesDisabled: boolean;
  error?: { conflict: boolean };
  onToggleActions: () => void;
  onCloseActions: () => void;
  onAdvance: (status: ApplicationStatus) => void;
  onReload: () => void;
};

export function PipelineCandidateCard({
  application, locale, actionsOpen, updating, updatesDisabled, error,
  onToggleActions, onCloseActions, onAdvance, onReload,
}: Props) {
  const vi = locale === 'vi';
  const language = vi ? 0 : 1;
  const name = application.candidateName?.trim() || (vi ? 'Ứng viên' : 'Candidate');
  const title = application.job?.title;
  const { phase, score } = matchPresentation(application);
  const date = application.appliedDate ? new Date(application.appliedDate) : null;
  const dateLabel = date && Number.isFinite(date.valueOf())
    ? new Intl.DateTimeFormat(vi ? 'vi-VN' : 'en-GB', { dateStyle: 'medium', timeZone: 'UTC' }).format(date)
    : null;
  const actions = application.status === 'REJECTED' ? [] : APPLICATION_TRANSITIONS[application.status];
  const labelId = useId();
  const actionsId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const details = useRef<HTMLAnchorElement>(null);

  return (
    <article
      className={`kanban-card ${styles.card}`}
      aria-labelledby={labelId}
      onBlur={event => {
        if (actionsOpen && !event.currentTarget.contains(event.relatedTarget)) onCloseActions();
      }}
      onKeyDown={event => {
        if (event.key === 'Escape' && actionsOpen) {
          event.stopPropagation();
          trigger.current?.focus({ preventScroll: true });
          onCloseActions();
        }
      }}
    >
      <div className={styles.identity}>
        <AccountAvatar name={name} avatarId={application.candidateAvatarId} className="size-9 text-xs" />
        <div className={styles.identityText}>
          <h3 id={labelId} className={styles.name} title={name}>{name}</h3>
          {title && <p className={styles.job} title={title}>{title}</p>}
        </div>
      </div>

      <div className={styles.metadata}>
        {dateLabel && (
          <span className={styles.date}>
            <CalendarDays size={14} aria-hidden="true" />
            <time dateTime={application.appliedDate} aria-label={`${vi ? 'Nộp ngày' : 'Applied on'} ${dateLabel}`}>{dateLabel}</time>
          </span>
        )}
        <span className={styles.score} data-phase={phase}>
          {matchPhaseLabels[phase][language]}{score !== null && ` · ${formatMatchScore(score, locale)}`}
        </span>
      </div>

      <div className={styles.footer}>
        <Link ref={details} href={`/recruiter/applications/${application.id}`} className={styles.details}>
          {vi ? 'Xem hồ sơ' : 'View application'} <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
        {actions.length > 0 && (
          <button
            ref={trigger}
            type="button"
            className={styles.trigger}
            aria-expanded={actionsOpen}
            aria-controls={actionsId}
            disabled={updatesDisabled}
            onClick={onToggleActions}
          >
            {updating ? (vi ? 'Đang cập nhật…' : 'Updating…') : (vi ? 'Thao tác' : 'Actions')}
            <ChevronDown size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      {actions.length > 0 && (
        <ul id={actionsId} hidden={!actionsOpen} className={styles.actions}>
          {actions.map(next => (
            <li key={next}>
              <button
                type="button"
                className={styles.action}
                data-danger={next === 'REJECTED' || undefined}
                disabled={updatesDisabled}
                onClick={() => {
                  details.current?.focus({ preventScroll: true });
                  onAdvance(next);
                }}
              >
                {(actionLabels[next] ?? APPLICATION_STATUS_LABELS[next])[language]}
              </button>
            </li>
          ))}
        </ul>
      )}

      {application.status === 'REJECTED' && (
        <p className={styles.hint}>{vi ? 'Mở hồ sơ để xem lại và mở lại đơn.' : 'Open the application to review or reopen it.'}</p>
      )}

      {error && (
        <div role="alert" className={styles.error}>
          <p>{error.conflict
            ? (vi ? 'Hồ sơ đã được cập nhật ở nơi khác. Hãy tải lại trước khi chuyển vòng.' : 'This application changed elsewhere. Reload before moving it.')
            : (vi ? 'Chưa chuyển được hồ sơ. Bạn có thể thử lại.' : 'The update failed. You can try again.')}</p>
          {error.conflict && (
            <button type="button" className={styles.reload} onClick={onReload}>
              {vi ? 'Tải lại hồ sơ' : 'Reload applications'}
            </button>
          )}
        </div>
      )}
    </article>
  );
}
