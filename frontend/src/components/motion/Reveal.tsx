'use client';

import React, { CSSProperties, ReactNode, useEffect, useRef, useState } from 'react';

type RevealDirection = 'up' | 'down' | 'left' | 'right' | 'none';

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
  duration = 2580,
  once = true,
  threshold = 0.08,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setMounted(true);
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setRevealed(true);
      return;
    }

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
  }, [once, threshold]);

  const boundedDelay = Math.min(Math.max(delay, 0), 1000);
  const boundedDuration = Math.min(Math.max(duration, 150), 5000);

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
      data-revealed={revealed ? 'true' : 'false'}
      data-motion-ready={mounted ? 'true' : 'false'}
      data-visible={revealed ? 'true' : 'false'}
      style={style}
    >
      {children}
    </div>
  );
}
