import { describe, it, expect, vi, afterEach } from 'vitest';
import { OpenRouterStrategy } from './openrouter';

/**
 * Builds a Response whose body yields exactly the given string chunks, one
 * reader.read() per chunk — mimicking TCP boundaries that do not align with
 * SSE event boundaries.
 */
function mockStreamResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  let i = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(chunks[i]));
      i += 1;
    },
  });

  return {
    ok: true,
    status: 200,
    body: stream,
  } as unknown as Response;
}

async function collect(strategy: OpenRouterStrategy): Promise<string> {
  let out = '';
  for await (const chunk of strategy.streamText([{ role: 'user', content: 'hi' }])) {
    out += chunk;
  }
  return out;
}

describe('OpenRouterStrategy.streamText', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reassembles a data: JSON event split across two stream chunks', async () => {
    const full = JSON.stringify({
      choices: [{ delta: { content: 'Hello' } }],
    });
    const event = `data: ${full}\n`;

    // Split mid-JSON so neither chunk alone is a parseable line.
    const cut = Math.floor(event.length / 2);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(mockStreamResponse([event.slice(0, cut), event.slice(cut)]))
    );

    const strategy = new OpenRouterStrategy('test-key');
    expect(await collect(strategy)).toBe('Hello');
  });

  it('streams every event and ignores the [DONE] sentinel', async () => {
    const events = [
      'data: {"choices":[{"delta":{"content":"one"}}]}\n',
      'data: {"choices":[{"delta":{"content":"two"}}]}\n',
      'data: [DONE]\n',
    ];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockStreamResponse(events)));

    const strategy = new OpenRouterStrategy('test-key');
    expect(await collect(strategy)).toBe('onetwo');
  });

  it('handles a multi-byte character split across chunk boundaries', async () => {
    const encoder = new TextEncoder();
    const text = 'né';
    const bytes = encoder.encode(`data: {"choices":[{"delta":{"content":"${text}"}}]}\n`);
    // Split inside the 2-byte 'é' sequence.
    const cut = bytes.indexOf(0xc3) + 1;

    let i = 0;
    const parts = [bytes.slice(0, cut), bytes.slice(cut)];
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (i >= parts.length) return controller.close();
        controller.enqueue(parts[i]);
        i += 1;
      },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, body: stream } as unknown as Response)
    );

    const strategy = new OpenRouterStrategy('test-key');
    expect(await collect(strategy)).toBe(text);
  });
});
