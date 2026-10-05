export const STAGGER_STEP_MS = 60;
export const STAGGER_MAX_MS = 280;

export function staggerDelay(index: number, step = STAGGER_STEP_MS): number {
  const safeIndex = Math.max(0, Math.floor(index));
  const safeStep = Math.min(Math.max(step, 50), 70);
  return Math.min(safeIndex * safeStep, STAGGER_MAX_MS);
}
