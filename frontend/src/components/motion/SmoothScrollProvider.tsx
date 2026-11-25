'use client';

import { ReactNode, useEffect } from 'react';
import Lenis from 'lenis';

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: true,
      duration: 1.15,
      smoothWheel: true,
      wheelMultiplier: 0.9,
      allowNestedScroll: true,
      anchors: true,
      stopInertiaOnNavigate: true,
      respectReducedMotion: true,
    });

    return () => lenis.destroy();
  }, []);

  return children;
}
