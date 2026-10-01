import { logger } from '@/lib/logger';
import { db } from '@/lib/db';
import { useInterviewStore } from '@/features/interview/interviewStore';
import type { Interview } from '@/types';

/**
 * Minimum gap between partial-stream persistence checkpoints. Bounds how much
 * of an in-flight answer is lost to an abrupt tab close, process kill, or
 * WebView suspension without issuing an IndexedDB write per token.
 */
export const STREAM_CHECKPOINT_MS = 2000;

/** Identity of the generation allowed to write, re-read from the store. */
type GenerationGuard = {
  generationId: number;
  isGenerationCurrent: (generationId: number) => boolean;
};

export interface StreamPersistence {
  /** Persists the live store snapshot; `false` when this writer is stale. */
  persistLiveState: () => Promise<boolean>;
  /**
   * Throttled checkpoint. `await` it before the authoritative final write so
   * a slow checkpoint cannot land after it and clobber newer state.
   */
  checkpoint: () => void;
  /** Waits for any in-flight checkpoint to settle. */
  settleCheckpoints: () => Promise<void>;
  /** Attaches the `pagehide` / `visibilitychange` flush handlers. */
  attachLifecycleFlush: () => void;
  /** Detaches them again. Safe to call when never attached. */
  detachLifecycleFlush: () => void;
}

/**
 * Owns every IndexedDB write a streaming generation performs.
 *
 * Writes are always read through `getState()` rather than a captured snapshot
 * so mutations that happen mid-stream (code editor, whiteboard, extra
 * messages) are included, and are skipped entirely once the generation loses
 * ownership or the store moves to a different interview, so a stale writer can
 * never clobber newer state.
 */
export const createStreamPersistence = (
  interview: Interview,
  { generationId, isGenerationCurrent }: GenerationGuard
): StreamPersistence => {
  const interviewId = interview.id;
  // Seeded to "now" so a short response is never checkpointed mid-stream:
  // the final persist already covers it.
  let lastCheckpointAt = Date.now();
  let inFlightCheckpoint: Promise<unknown> = Promise.resolve();

  const persistLiveState = async (): Promise<boolean> => {
    if (!isGenerationCurrent(generationId)) return false;

    const live = useInterviewStore.getState().currentInterview;
    if (!live) return false;
    if (live.id !== undefined && live.id !== interviewId) return false;
    if (interviewId === undefined) return false;

    await db.interviews.update(interviewId, {
      messages: live.messages,
      // Explicit undefined check, not `||`: a user who clears the editor
      // mid-stream must persist that clear, not resurrect the old value.
      code: live.code !== undefined ? live.code : interview.code,
      whiteboard: live.whiteboard !== undefined ? live.whiteboard : interview.whiteboard,
    });
    return true;
  };

  // A write started during `pagehide` is best-effort: this narrows the loss
  // window but cannot make arbitrary OS-level termination durable.
  // `pagehide` means the document is going away and always flushes;
  // `visibilitychange` also fires for ordinary tab switches, so it only
  // flushes when actually backgrounded.
  const flushOnLifecycle = (event: Event) => {
    if (event.type !== 'pagehide' && document.visibilityState !== 'hidden') return;
    void persistLiveState().catch((err: unknown) => {
      logger.error('Failed to flush interview state on lifecycle event:', err);
    });
  };

  return {
    persistLiveState,
    checkpoint: () => {
      const now = Date.now();
      if (now - lastCheckpointAt < STREAM_CHECKPOINT_MS) return;
      lastCheckpointAt = now;
      inFlightCheckpoint = persistLiveState().catch((err: unknown) => {
        logger.error('Failed to checkpoint interview during streaming:', err);
      });
    },
    settleCheckpoints: () => inFlightCheckpoint.then(() => undefined),
    attachLifecycleFlush: () => {
      window.addEventListener('pagehide', flushOnLifecycle);
      document.addEventListener('visibilitychange', flushOnLifecycle);
    },
    detachLifecycleFlush: () => {
      window.removeEventListener('pagehide', flushOnLifecycle);
      document.removeEventListener('visibilitychange', flushOnLifecycle);
    },
  };
};
