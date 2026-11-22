'use client';

import React, { CSSProperties, ReactNode, useEffect, useRef, useState, useSyncExternalStore } from 'react';

type RevealDirection = 'up' | 'down' | 'left' | 'right' | 'none';

const subscribeToHydration = () => () => {};
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

interface RevealProps {
  children: ReactNode;
  className?: string;
  direction?: RevealDirection;
  delay?: number;
  duration?: number;
  once?: boolean;
  threshold?: number;
}

export function Reveal({
  children,
  className = '',
  direction = 'up',
  delay = 0,
  duration = 360,
  once = true,
  threshold = 0.08,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );
  const [revealed, setRevealed] = useState(false);
  const hasIntersectionObserver = typeof IntersectionObserver !== 'undefined';
  const isRevealed = revealed || (mounted && !hasIntersectionObserver);

  useEffect(() => {
    const node = ref.current;
    if (!node || !hasIntersectionObserver) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          if (once) observer.unobserve(entry.target);
        } else if (!once) {
          setRevealed(false);
        }
      },
      { threshold, rootMargin: '0px 0px -20px 0px' },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [hasIntersectionObserver, once, threshold]);

  const boundedDelay = Math.min(Math.max(delay, 0), 240);
  const boundedDuration = Math.min(Math.max(duration, 150), 600);

  const style = {
    '--motion-delay': `${boundedDelay}ms`,
    '--motion-duration': `${boundedDuration}ms`,
  } as CSSProperties;

  return (
    <div
      ref={ref}
      className={`motion-reveal ${className}`}
      data-direction={direction}
      data-mounted={mounted ? 'true' : 'false'}
      data-revealed={isRevealed ? 'true' : 'false'}
      data-motion-ready={mounted ? 'true' : 'false'}
      data-visible={isRevealed ? 'true' : 'false'}
      style={style}
    >
      {children}
    </div>
  );
}
