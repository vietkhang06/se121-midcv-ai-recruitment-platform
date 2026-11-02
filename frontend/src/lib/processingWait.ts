// Waiting is cancellable; closing the UI does not cancel a server job.
export function abortableDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(signal.reason ?? new DOMException('Aborted', 'AbortError')); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
  });
}

export interface ProcessingUpdate {
  status?: string; stage?: string; step?: string | null; code?: string | null;
  progress?: number; message?: string | null;
}

export async function waitForProcessing<T extends ProcessingUpdate>(options: {
  signal: AbortSignal;
  poll: (signal: AbortSignal) => Promise<T>;
  subscribe: (onEvent: (event: ProcessingUpdate) => void) => () => void;
  onProgress: (event: ProcessingUpdate) => void;
  intervalMs?: number;
}): Promise<ProcessingUpdate> {
  const { signal, onProgress } = options;
  let terminal: ProcessingUpdate | undefined;
  const receive = (event: ProcessingUpdate) => {
    if (signal.aborted || terminal) return;
    onProgress(event);
    const states = [event.status, event.stage, event.step, event.code].map(value => value?.toUpperCase());
    if (states.some(value => ['FAILED', 'JOB_FAILED', 'CANCELLED', 'JOB_CANCELLED', 'SUCCEEDED', 'JOB_SUCCEEDED', 'COMPLETED', 'JOB_COMPLETED', 'NEEDS_REVIEW', 'CONFIRMED'].includes(value || ''))) terminal = event;
  };
  let closeStream: (() => void) | undefined;
  try { closeStream = options.subscribe(receive); }
  catch { /* Polling remains available when SSE setup itself fails. */ }
  const unsubscribe = () => {
    const close = closeStream; closeStream = undefined;
    try { close?.(); } catch { /* Stream cleanup must not mask the job result. */ }
  };
  signal.addEventListener('abort', unsubscribe, { once: true });
  try {
    // Only the server decides that processing failed. A job can legitimately exceed 60 seconds.
    while (!terminal) {
      signal.throwIfAborted();
      try { receive(await options.poll(signal)); }
      catch (error) {
        signal.throwIfAborted();
        const status = (error as { status?: number }).status;
        if (status && [400, 401, 403, 404].includes(status)) throw error;
        // Transport errors are recoverable; status polling also handles a closed SSE stream.
      }
      if (!terminal) await abortableDelay(options.intervalMs ?? 2000, signal);
    }
    signal.throwIfAborted();
    return terminal;
  } finally {
    signal.removeEventListener('abort', unsubscribe);
    unsubscribe();
  }
}
