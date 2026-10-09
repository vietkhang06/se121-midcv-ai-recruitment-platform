'use client';

import React, { ReactNode, useEffect, useRef, useState } from 'react';

interface AnimatedModalShellProps {
  isOpen: boolean;
  onRequestClose: () => void;
  titleId: string;
  descriptionId?: string;
  children: ReactNode;
  panelClassName?: string;
  overlayClassName?: string;
  id?: string;
  testId?: string;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function AnimatedModalShell({
  isOpen,
  onRequestClose,
  titleId,
  descriptionId,
  children,
  panelClassName = '',
  overlayClassName = '',
  id,
  testId,
}: AnimatedModalShellProps) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<'open' | 'closed'>('closed');
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let frame = 0;
    let exitTimer: ReturnType<typeof setTimeout> | undefined;

    if (isOpen && !mounted) {
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      frame = window.requestAnimationFrame(() => setMounted(true));
    } else if (isOpen && mounted) {
      frame = window.requestAnimationFrame(() => setPhase('open'));
    } else if (mounted) {
      frame = window.requestAnimationFrame(() => setPhase('closed'));
      const exitDuration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 170;
      exitTimer = setTimeout(() => setMounted(false), exitDuration);
    }

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      if (exitTimer) clearTimeout(exitTimer);
    };
  }, [isOpen, mounted]);

  useEffect(() => {
    if (!mounted) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusFirstElement = () => {
      const preferred = panelRef.current?.querySelector<HTMLElement>('[data-autofocus="true"]');
      const first = preferred ?? panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (first ?? panelRef.current)?.focus({ preventScroll: true });
    };
    const focusFrame = window.requestAnimationFrame(focusFirstElement);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onRequestClose();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true');

      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus({ preventScroll: true });
    };
  }, [mounted, onRequestClose]);

  if (!mounted) return null;

  return (
    <div
      className={`motion-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm ${overlayClassName}`}
      data-state={phase}
      data-testid={testId ? `${testId}-overlay` : undefined}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onRequestClose();
      }}
    >
      <div
        ref={panelRef}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className={`motion-modal-panel ${panelClassName}`}
        data-state={phase}
        data-testid={testId}
      >
        {children}
      </div>
    </div>
  );
}
