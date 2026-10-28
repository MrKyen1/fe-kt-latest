export type DraftSaveState = "saving" | "saved" | "error";

/** Serialize writes and retain the newest value of each question until saved. */
export function createAttemptDraftSaver(
  save: (questionId: string, answer: unknown) => Promise<unknown>,
  onError: (error: unknown) => void,
  delay = 600,
  onState?: (state: DraftSaveState) => void,
) {
  const pending = new Map<string, unknown>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running: Promise<void> | undefined;
  let disposed = false;
  const cancelTimer = () => { clearTimeout(timer); timer = undefined; };
  const flush = (): Promise<void> => {
    cancelTimer();
    if (running) return running.then(() => pending.size ? flush() : undefined);
    running = (async () => {
      while (pending.size) {
        const [id, answer] = pending.entries().next().value!;
        pending.delete(id);
        onState?.("saving");
        try { await save(id, answer); }
        catch (error) {
          if (!pending.has(id)) pending.set(id, answer);
          onState?.("error"); onError(error); throw error;
        }
      }
      onState?.("saved");
    })().finally(() => { running = undefined; });
    return running;
  };
  return {
    schedule(id: string, answer: unknown) {
      if (disposed) return;
      pending.set(id, answer); onState?.("saving"); cancelTimer();
      timer = setTimeout(() => { void flush().catch(() => {}); }, delay);
    },
    flush,
    dispose() { disposed = true; cancelTimer(); },
  };
}
