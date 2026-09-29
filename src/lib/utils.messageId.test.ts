import { describe, it, expect, vi, afterEach } from 'vitest';
import { nextMessageId, withIdleTimeout } from './utils';

const FROZEN = new Date('2026-01-01T00:00:00.000Z');

describe('nextMessageId', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('never repeats an id when Date.now() is frozen', () => {
    vi.useFakeTimers();
    vi.setSystemTime(FROZEN);

    const ids = Array.from({ length: 1000 }, () => nextMessageId());

    expect(new Set(ids).size).toBe(1000);
  });

  it('keeps ids strictly increasing so message order matches id order', () => {
    vi.useFakeTimers();
    vi.setSystemTime(FROZEN);

    const ids = Array.from({ length: 100 }, () => nextMessageId());

    for (let i = 1; i < ids.length; i++) {
      expect(ids[i]).toBeGreaterThan(ids[i - 1]);
    }
  });

  it('stays unique across a backwards clock change', () => {
    vi.useFakeTimers();
    vi.setSystemTime(FROZEN);
    const before = nextMessageId();

    // Clock moves backwards (NTP correction, DST bug, user clock edit).
    vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
    const after = nextMessageId();

    expect(after).toBeGreaterThan(before);
  });

  it('gives two same-tick sends distinct user and placeholder ids', () => {
    vi.useFakeTimers();
    vi.setSystemTime(FROZEN);

    // Under `Date.now() + 1` all four of these ids were identical.
    const ids = [
      nextMessageId(),
      nextMessageId(),
      nextMessageId(),
      nextMessageId(),
    ];

    expect(new Set(ids).size).toBe(4);
  });
});

describe('withIdleTimeout', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('passes chunks through and completes normally', async () => {
    const source = (async function* () {
      yield 'a';
      yield 'b';
    })();

    const out: string[] = [];
    for await (const chunk of withIdleTimeout(source, 1000, 'timed out')) out.push(chunk);

    expect(out).toEqual(['a', 'b']);
  });

  it('fails when the source produces no chunk within the idle window', async () => {
    vi.useFakeTimers();
    // Never yields and never completes: a connection that opened, then stalled.
    const source = {
      [Symbol.asyncIterator]: () => ({ next: () => new Promise<IteratorResult<string>>(() => {}) }),
    } as AsyncIterable<string>;

    const consume = async () => {
      for await (const chunk of withIdleTimeout(source, 60_000, 'stalled')) {
        // no chunks expected
        void chunk;
      }
    };

    const pending = expect(consume()).rejects.toThrow('stalled');
    await vi.advanceTimersByTimeAsync(60_000);
    await pending;
  });

  it('resets the idle window on every chunk, so a slow stream still completes', async () => {
    vi.useFakeTimers();

    // A source that is silent for 30s between chunks: three times longer than
    // a naive wall-clock budget, but never idle for the full window.
    const gates = Array.from({ length: 3 }, () => Promise.withResolvers<void>());
    let index = 0;
    const source = {
      [Symbol.asyncIterator]: () => ({
        next: async () => {
          if (index >= gates.length) return { value: undefined, done: true };
          await gates[index++].promise;
          return { value: 'chunk', done: false };
        },
        return: async () => ({ value: undefined, done: true }),
      }),
    } as AsyncIterable<string>;

    const out: string[] = [];
    const consume = (async () => {
      for await (const c of withIdleTimeout(source, 60_000, 'stalled')) out.push(c);
    })();

    for (const gate of gates) {
      await vi.advanceTimersByTimeAsync(30_000);
      gate.resolve();
    }
    await consume;

    expect(out).toEqual(['chunk', 'chunk', 'chunk']);
  });

  it('releases the underlying iterator when the consumer stops early', async () => {
    const returnFn = vi.fn();
    const source = {
      [Symbol.asyncIterator]: () => ({
        next: async () => ({ value: 'a', done: false }),
        return: returnFn,
      }),
    } as unknown as AsyncIterable<string>;

    for await (const chunk of withIdleTimeout(source, 1000, 'stalled')) {
      expect(chunk).toBe('a');
      break;
    }

    expect(returnFn).toHaveBeenCalled();
  });
});
