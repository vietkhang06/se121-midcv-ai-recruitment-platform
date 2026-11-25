export const STAGGER_STEP_MS = 125;
export const STAGGER_MAX_MS = 625;

export function staggerDelay(index: number, step = STAGGER_STEP_MS): number {
  const safeIndex = Math.max(0, Math.floor(index));
  const safeStep = Math.min(Math.max(step, 80), 130);
  return Math.min(safeIndex * safeStep, STAGGER_MAX_MS);
}
