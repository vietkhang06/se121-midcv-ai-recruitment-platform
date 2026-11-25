export type NavigationDirection = 'forward' | 'backward' | 'neutral';

let entries: string[] = [];
let currentIndex = -1;
let lastResolution: { pathname: string; direction: NavigationDirection } | null = null;

const depth = (pathname: string) => pathname.split('/').filter(Boolean).length;

export function resolveNavigationDirection(pathname: string): NavigationDirection {
  if (lastResolution?.pathname === pathname) return lastResolution.direction;

  if (currentIndex === -1) {
    entries = [pathname];
    currentIndex = 0;
    lastResolution = { pathname, direction: 'neutral' };
    return 'neutral';
  }

  const existingIndex = entries.indexOf(pathname);
  if (existingIndex !== -1) {
    const direction = existingIndex < currentIndex ? 'backward' : 'forward';
    currentIndex = existingIndex;
    lastResolution = { pathname, direction };
    return direction;
  }

  const previousPathname = entries[currentIndex];
  const previousDepth = depth(previousPathname);
  const nextDepth = depth(pathname);
  const direction = nextDepth > previousDepth
    ? 'forward'
    : nextDepth < previousDepth
      ? 'backward'
      : 'neutral';

  entries = [...entries.slice(0, currentIndex + 1), pathname];
  currentIndex += 1;
  lastResolution = { pathname, direction };
  return direction;
}
