export function subscribeProgress<T extends { eventId: string; step: string; code: string }>(
  open: (lastId: string, signal: AbortSignal) => Promise<Response>,
  validate: (value: unknown) => value is T,
  onEvent: (event: T) => void,
  onError?: (error: Error) => void
): () => void {
  const controller = new AbortController();
  let lastId = '';
  let terminal = false;
  let attempt = 0;
  const seen = new Set<string>();
  const pause = (ms: number) => new Promise<void>(resolve => {
    const finish = () => { clearTimeout(timer); controller.signal.removeEventListener('abort', finish); resolve(); };
    const timer = setTimeout(finish, ms);
    controller.signal.addEventListener('abort', finish, { once: true });
    if (controller.signal.aborted) finish();
  });
  void (async () => {
    while (!controller.signal.aborted && !terminal) {
      let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
      try {
        const response = await open(lastId, controller.signal);
        if (!response.ok || !response.body || !response.headers.get('content-type')?.includes('text/event-stream')) {
          if ([400, 401, 403, 404].includes(response.status)) terminal = true;
          throw new Error(`CV progress stream unavailable (HTTP ${response.status})`);
        }
        reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (!controller.signal.aborted && !terminal) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          // Normalize after joining chunks so a CRLF split across reads survives.
          buffer = buffer.replace(/\r\n/g, '\n');
          if (buffer.length > 1024 * 1024) throw new Error('CV progress event exceeds the stream limit.');
          let end: number;
          while ((end = buffer.indexOf('\n\n')) >= 0) {
            const lines = buffer.slice(0, end).split('\n'); buffer = buffer.slice(end + 2);
            const name = lines.find(line => line.startsWith('event:'))?.slice(6).trim();
            const id = lines.find(line => line.startsWith('id:'))?.slice(3).trim();
            const data = lines.filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
            if (name !== 'cv-processing-progress' || !data) continue;
            const event: unknown = JSON.parse(data);
            if (!validate(event)) throw new Error('Invalid CV progress event payload.');
            if (!seen.has(event.eventId)) {
              onEvent(event); seen.add(event.eventId);
              if (seen.size > 2000) seen.delete(seen.values().next().value!);
            }
            // Advance only after a validated event was delivered.
            if (id) lastId = id;
            attempt = 0;
            terminal = /^(SUCCEEDED|FAILED|COMPLETED|CANCELLED)$/.test(event.step)
              || /^JOB_(SUCCEEDED|FAILED|COMPLETED|CANCELLED)$/.test(event.code);
            if (terminal) break;
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) onError?.(error instanceof Error ? error : new Error('CV progress stream failed.'));
      } finally {
        try { await reader?.cancel(); } catch { /* transport already closed */ }
        reader?.releaseLock();
      }
      if (!terminal && !controller.signal.aborted) await pause(Math.min(1000 * 2 ** attempt++, 10000));
    }
  })();
  return () => controller.abort();
}
