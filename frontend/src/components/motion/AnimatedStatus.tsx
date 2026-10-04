'use client';

import React, { ReactNode } from 'react';

interface AnimatedStatusProps {
  stateKey: string;
  children: ReactNode;
  isError?: boolean;
  isBusy?: boolean;
  className?: string;
}

export function AnimatedStatus({
  stateKey,
  children,
  isError = false,
  isBusy = false,
  className = '',
}: AnimatedStatusProps) {
  return (
    <div
      key={stateKey}
      className={`motion-status ${className}`}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      aria-atomic="true"
      aria-busy={isBusy || undefined}
    >
      {children}
    </div>
  );
}
