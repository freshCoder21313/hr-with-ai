import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * Generates a message id that is unique within a session.
 *
 * `Message.timestamp` doubles as the message's identity key: the store and
 * CV chat both update a message with `messages.map(m => m.timestamp === id)`.
 * That map rewrites *every* match, so a repeated `Date.now()` makes two
 * distinct messages alias onto each other and a stream writes into the wrong
 * one. `Date.now() + 1` was not sufficient: two sends in the same millisecond
 * produced an identical user/placeholder pair.
 *
 * The counter is monotonic and always greater than the current wall clock, so
 * ids stay unique *and* remain correctly ordered across a clock change.
 */
let lastMessageId = 0;

export function nextMessageId(): number {
  const now = Date.now();
  lastMessageId = now > lastMessageId ? now : lastMessageId + 1;
  return lastMessageId;
}

/**
 * Yields from `source`, failing if it produces no chunk for `idleMs`.
 *
 * The AI providers only apply their 30s AbortController to the request that
 * opens the stream; it is cleared as soon as response headers arrive, so a
 * connection that opens and then stalls produces chunks forever. This wraps
 * the *consumption* side, which is the only place that can observe silence,
 * and bounds the wait without changing provider behaviour.
 *
 * The timer is per-`next()` call, so a long but healthy stream that keeps
 * emitting is never interrupted.
 */
export async function* withIdleTimeout<T>(
  source: AsyncIterable<T>,
  idleMs: number,
  message: string
): AsyncGenerator<T, void, unknown> {
  const iterator = source[Symbol.asyncIterator]();
  try {
    while (true) {
      let timer: ReturnType<typeof setTimeout>;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), idleMs);
      });

      let result: IteratorResult<T>;
      try {
        result = await Promise.race([iterator.next(), timeout]);
      } finally {
        clearTimeout(timer!);
      }

      if (result.done) return;
      yield result.value;
    }
  } finally {
    // Releases the underlying connection when the consumer stops early
    // (timeout, superseded generation, or component unmount).
    await iterator.return?.(undefined);
  }
}
