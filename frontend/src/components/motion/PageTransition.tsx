'use client';

import { ReactNode, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { resolveNavigationDirection } from './navigationDirection';

const subscribeToHydration = () => () => {};
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );
  const direction = mounted ? resolveNavigationDirection(pathname) : 'neutral';

  return (
    <div
      className="motion-page"
      data-navigation-direction={direction}
      data-pathname={pathname}
    >
      {children}
    </div>
  );
}
