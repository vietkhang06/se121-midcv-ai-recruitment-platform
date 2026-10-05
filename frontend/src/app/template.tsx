'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Reveal } from '@/components/motion/Reveal';

export default function RootTemplate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <Reveal key={pathname} direction="up" delay={0} className="w-full min-h-full">
      {children}
    </Reveal>
  );
}
