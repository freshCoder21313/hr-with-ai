// @vitest-environment node
// Underscore prefix keeps Vercel from deploying this file as a Serverless Function.
import bcrypt from 'bcryptjs';
import type * as NeonModule from '@neondatabase/serverless';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { db, fakeSql } = vi.hoisted(() => {
  const db = {
    rows: new Map<string, { passwordHash: string; data: unknown }>(),
    failWith: undefined as Error | undefined,
  };

  /** In-memory stand-in for Neon's tagged-template client, covering the `backups` statements. */
  const fakeSql = async (
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<Record<string, unknown>[]> => {
    if (db.failWith) throw db.failWith;
    const text = strings
      .reduce((acc, part, i) => `${acc}$${i}${part}`)
      .replace(/\s+/g, ' ')
      .trim();
    const param = (placeholder: string) => values[Number(placeholder.trim().slice(1)) - 1];

    const select = /^SELECT (.+) FROM backups WHERE id = (\$\d+)$/.exec(text);
    if (select) {
      const id = String(param(select[2]));
      const row = db.rows.get(id);
      if (!row) return [];
      const columns: Record<string, unknown> = {
        id,
        password_hash: row.passwordHash,
        data: structuredClone(row.data),
      };
      const wanted =
        select[1] === '*' ? Object.keys(columns) : select[1].split(',').map((c) => c.trim());
      return [Object.fromEntries(wanted.map((c) => [c, columns[c]]))];
    }

    const update = /^UPDATE backups SET (.+) WHERE id = (\$\d+)$/.exec(text);
    if (update) {
      const row = db.rows.get(String(param(update[2])));
      for (const assignment of update[1].split(',')) {
        const [column, rhs] = assignment.split('=').map((s) => s.trim());
        if (!row || !rhs.startsWith('$')) continue; // e.g. updated_at = NOW()
        if (column === 'data') row.data = structuredClone(param(rhs));
        if (column === 'password_hash') row.passwordHash = String(param(rhs));
      }
      return [];
    }

    const insert = /^INSERT INTO backups \((.+)\) VALUES \((.+)\)$/.exec(text);
    if (insert) {
      const placeholders = insert[2].split(',');
      const record = Object.fromEntries(
        insert[1].split(',').map((c, i) => [c.trim(), param(placeholders[i])])
      );
      const id = String(record.id);
      if (db.rows.has(id)) throw new Error('duplicate key value violates unique constraint');
      db.rows.set(id, {
        passwordHash: String(record.password_hash),
        data: structuredClone(record.data),
      });
      return [];
    }

    throw new Error(`fake neon: unsupported query: ${text}`);
  };

  return { db, fakeSql };
});

vi.mock('@neondatabase/serverless', async (importOriginal) => {
  const actual = await importOriginal<typeof NeonModule>();
  return {
    ...actual,
    // Keep the real driver's connection-string validation (it throws on a missing or malformed
    // URL) but route every query to the in-memory fake: no network, no real database.
    neon: (connectionString: string) => {
      actual.neon(connectionString);
      return fakeSql;
    },
  };
});

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void>;

class FakeResponse {
  statusCode: number | undefined;
  headers: Record<string, string> = {};
  body: unknown;
  ended = false;

  setHeader(name: string, value: string): this {
    this.headers[name.toLowerCase()] = value;
    return this;
  }

  status(code: number): this {
    this.statusCode = code;
    return this;
  }

  json(body: unknown): this {
    this.body = body;
    this.ended = true;
    return this;
  }

  end(): this {
    this.ended = true;
    return this;
  }
}

interface FakeRequestInit {
  method?: string;
  query?: Record<string, string | string[]>;
  headers?: Record<string, string>;
  body?: unknown;
  ip?: string;
}

async function send(
  handler: Handler,
  { method = 'GET', query = {}, headers = {}, body, ip = '203.0.113.10' }: FakeRequestInit = {}
): Promise<FakeResponse> {
  const req = { method, query, body, headers: { 'x-forwarded-for': ip, ...headers } };
  const res = new FakeResponse();
  await handler(req as unknown as VercelRequest, res as unknown as VercelResponse);
  return res;
}

const ORIGIN = 'https://app.example.test';
const TEST_ENV = {
  DATABASE_URL: 'postgresql://user:secret@db.example.invalid/neondb',
  ALLOWED_ORIGIN: ORIGIN,
  RATE_LIMIT: '1000',
  MAX_SYNC_PAYLOAD_BYTES: undefined,
  MIN_SYNC_PASSWORD_LENGTH: undefined,
};
type TestEnv = Partial<Record<keyof typeof TEST_ENV, string | undefined>>;

/**
 * The handler reads its env limits and keeps rate-limit state at module load, so a static import
 * cannot work: every test re-imports a fresh module instance after stubbing the env.
 */
async function loadHandler(overrides: TestEnv = {}): Promise<Handler> {
  for (const [name, value] of Object.entries({ ...TEST_ENV, ...overrides })) {
    vi.stubEnv(name, value);
  }
  vi.resetModules();
  return (await import('./sync')).default;
}

const SYNC_ID = 'AbCdEfGh12345678';
const PASSWORD = 'correct-horse-battery';
const BACKUP = { compressed: 'N4IgLgpgtgFgcgVwEYQDQgCYEsDmCA2EAvkA' };

const get = (handler: Handler, id: string | string[] = SYNC_ID, ip?: string) =>
  send(handler, { query: { id }, ip });

/** `id: null` sends no x-sync-id header at all. */
const post = (handler: Handler, body: unknown, id: string | null = SYNC_ID) =>
  send(handler, { method: 'POST', headers: id === null ? {} : { 'x-sync-id': id }, body });

async function seedBackup(handler: Handler): Promise<void> {
  expect((await post(handler, { password: PASSWORD, data: BACKUP })).statusCode).toBe(201);
}

beforeEach(() => {
  db.rows.clear();
  db.failWith = undefined;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('CORS and routing', () => {
  it('answers an OPTIONS preflight with 200, the configured origin and no body', async () => {
    const handler = await loadHandler();
    const res = await send(handler, { method: 'OPTIONS' });

    expect(res.statusCode).toBe(200);
    expect(res.ended).toBe(true);
    expect(res.body).toBeUndefined();
    expect(res.headers['access-control-allow-origin']).toBe(ORIGIN);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
    const methods = (res.headers['access-control-allow-methods'] ?? '').split(',');
    expect(methods.map((m) => m.trim())).toEqual(
      expect.arrayContaining(['GET', 'POST', 'OPTIONS'])
    );
    const allowed = (res.headers['access-control-allow-headers'] ?? '').split(',');
    expect(allowed.map((h) => h.trim().toLowerCase())).toEqual(
      expect.arrayContaining(['content-type', 'x-sync-id'])
    );
  });

  it('answers 503 with CORS headers instead of crashing when DATABASE_URL is unset', async () => {
    const handler = await loadHandler({ DATABASE_URL: undefined });
    const res = await get(handler);

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ error: 'Sync service unavailable' });
    expect(res.headers['access-control-allow-origin']).toBe(ORIGIN);
  });

  it('rejects unsupported methods with 405', async () => {
    const handler = await loadHandler();
    const res = await send(handler, { method: 'DELETE', query: { id: SYNC_ID } });

    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ error: 'Method not allowed' });
    expect(res.headers.allow).toBe('GET, OPTIONS, POST');
  });
});

describe('GET (download)', () => {
  it('requires an id', async () => {
    const handler = await loadHandler();
    const res = await send(handler);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Missing ID' });
  });

  it.each([
    ['15 chars', SYNC_ID.slice(0, 15)],
    ['17 chars', `${SYNC_ID}9`],
    ['a non-alphanumeric char', 'AbCdEfGh1234567-'],
    ['a repeated query param', [SYNC_ID, SYNC_ID]],
  ])('rejects an id with %s as 400', async (_label, id) => {
    const handler = await loadHandler();
    const res = await get(handler, id);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid ID format' });
  });

  it('returns 404 for an unknown id', async () => {
    const handler = await loadHandler();
    const res = await get(handler);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: 'Backup not found' });
  });

  it('returns only the stored backup to anyone holding the id (no password, no hash)', async () => {
    const handler = await loadHandler();
    await seedBackup(handler);
    const res = await get(handler);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ data: BACKUP });
  });

  it('hides database errors behind a generic 500', async () => {
    const handler = await loadHandler();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    db.failWith = new Error('connect ECONNREFUSED postgresql://user:secret@db.example.invalid');
    const res = await get(handler);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Database error' });
  });
});

describe('POST (upload)', () => {
  it.each([
    ['no id', null, { password: PASSWORD, data: BACKUP }],
    ['no body', SYNC_ID, undefined],
    ['no password', SYNC_ID, { data: BACKUP }],
    ['no data', SYNC_ID, { password: PASSWORD }],
    ['null data', SYNC_ID, { password: PASSWORD, data: null }],
  ])('rejects a request with %s as 400', async (_label, id, body) => {
    const handler = await loadHandler();
    const res = await post(handler, body, id);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Missing required fields' });
  });

  it('rejects a malformed id with 400', async () => {
    const handler = await loadHandler();
    const res = await post(handler, { password: PASSWORD, data: BACKUP }, 'not-a-valid-id!');

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid ID format' });
  });

  it('enforces the 8-character password minimum the client also enforces', async () => {
    const handler = await loadHandler();

    const short = await post(handler, { password: '1234567', data: BACKUP });
    expect(short.statusCode).toBe(400);
    expect(short.body).toEqual({ error: 'Password must be at least 8 characters' });
    expect((await post(handler, { password: 12345678, data: BACKUP })).statusCode).toBe(400);
    expect((await post(handler, { password: '12345678', data: BACKUP })).statusCode).toBe(201);
  });

  it('honours MIN_SYNC_PASSWORD_LENGTH', async () => {
    const handler = await loadHandler({ MIN_SYNC_PASSWORD_LENGTH: '12' });

    const short = await post(handler, { password: '12345678901', data: BACKUP });
    expect(short.statusCode).toBe(400);
    expect(short.body).toEqual({ error: 'Password must be at least 12 characters' });
    expect((await post(handler, { password: '123456789012', data: BACKUP })).statusCode).toBe(201);
  });

  it.each([
    ['a bare string', 'not-a-backup'],
    ['an empty compressed wrapper', { compressed: '' }],
    ['an object without backup collections', { notes: [] }],
  ])('rejects %s as an invalid backup payload', async (_label, data) => {
    const handler = await loadHandler();
    const res = await post(handler, { password: PASSWORD, data });

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid backup payload shape' });
  });

  it('accepts a legacy uncompressed backup', async () => {
    const handler = await loadHandler();
    const legacy = { resumes: [{ id: 1, title: 'CV' }] };

    expect((await post(handler, { password: PASSWORD, data: legacy })).statusCode).toBe(201);
    expect((await get(handler)).body).toEqual({ data: legacy });
  });

  it('caps the payload at MAX_SYNC_PAYLOAD_BYTES UTF-8 bytes, inclusive', async () => {
    const limit = 4096;
    const handler = await loadHandler({ MAX_SYNC_PAYLOAD_BYTES: String(limit) });
    const overhead = Buffer.byteLength(JSON.stringify({ resumes: [''] }));
    const upload = (text: string) =>
      post(handler, { password: PASSWORD, data: { resumes: [text] } });

    const overByOne = await upload('a'.repeat(limit - overhead + 1));
    expect(overByOne.statusCode).toBe(413);
    expect(overByOne.body).toEqual({ error: 'Backup too large (max 4 KiB)' });
    // 'é' is one UTF-16 code unit but two UTF-8 bytes: within the limit by length, over it in bytes.
    expect((await upload('\u00e9'.repeat(limit - overhead))).statusCode).toBe(413);
    expect((await get(handler)).statusCode).toBe(404);

    expect((await upload('a'.repeat(limit - overhead))).statusCode).toBe(201);
  });

  it('creates a new backup (201) storing only a bcrypt hash of the password', async () => {
    const handler = await loadHandler();
    const res = await post(handler, { password: PASSWORD, data: BACKUP });

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ success: true, message: 'Created successfully' });
    const storedHash = db.rows.get(SYNC_ID)?.passwordHash ?? '';
    expect(storedHash).toMatch(/^\$2[aby]\$/);
    expect(storedHash).not.toContain(PASSWORD);
    expect(await bcrypt.compare(PASSWORD, storedHash)).toBe(true);
    expect((await get(handler)).body).toEqual({ data: BACKUP });
  });

  it('updates an existing backup (200) when the password matches', async () => {
    const handler = await loadHandler();
    await seedBackup(handler);
    const next = { compressed: 'updated-payload' };
    const res = await post(handler, { password: PASSWORD, data: next });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, message: 'Updated successfully' });
    expect((await get(handler)).body).toEqual({ data: next });
  });

  it('rejects a wrong password with 401 without leaking or overwriting the backup', async () => {
    const handler = await loadHandler();
    await seedBackup(handler);
    const res = await post(handler, { password: 'wrong-password-123', data: { compressed: 'x' } });

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid password' });
    expect((await get(handler)).body).toEqual({ data: BACKUP });
  });

  it('logs database failures without the password, payload or sync id', async () => {
    const handler = await loadHandler();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    db.failWith = new Error('connection terminated unexpectedly');
    const res = await post(handler, { password: PASSWORD, data: { compressed: 'SECRET-PAYLOAD' } });

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Database error' });
    const logged = JSON.stringify(consoleError.mock.calls);
    expect(logged).toContain('connection terminated unexpectedly');
    expect(logged).not.toContain(PASSWORD);
    expect(logged).not.toContain('SECRET-PAYLOAD');
    expect(logged).not.toContain(SYNC_ID);
  });
});

describe('rate limiting', () => {
  it('answers 429 once an IP exceeds RATE_LIMIT requests within the 60 s window', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const handler = await loadHandler({ RATE_LIMIT: '3' });

    for (let i = 0; i < 3; i++) {
      expect((await get(handler, SYNC_ID, '198.51.100.7')).statusCode).toBe(404);
    }
    const limited = await get(handler, SYNC_ID, '198.51.100.7');
    expect(limited.statusCode).toBe(429);
    expect(limited.body).toEqual({ error: 'Rate limit exceeded. Please try again later.' });
    expect(limited.headers['retry-after']).toBe('60');
    expect(limited.headers['access-control-allow-origin']).toBe(ORIGIN);

    // Keyed by the first X-Forwarded-For hop, per IP.
    expect((await get(handler, SYNC_ID, '198.51.100.7, 10.0.0.1')).statusCode).toBe(429);
    expect((await get(handler, SYNC_ID, '198.51.100.8')).statusCode).toBe(404);
    // Preflight is answered by the CORS wrapper even while the IP is limited.
    expect((await send(handler, { method: 'OPTIONS', ip: '198.51.100.7' })).statusCode).toBe(200);

    vi.setSystemTime(new Date('2026-01-01T00:00:59.999Z'));
    expect((await get(handler, SYNC_ID, '198.51.100.7')).statusCode).toBe(429);
    vi.setSystemTime(new Date('2026-01-01T00:01:00.001Z'));
    expect((await get(handler, SYNC_ID, '198.51.100.7')).statusCode).toBe(404);
  });
});

describe('env limit parsing', () => {
  const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;
  const payloadOverhead = Buffer.byteLength(JSON.stringify({ resumes: [''] }));
  const uploadOfSize = (handler: Handler, bytes: number) =>
    post(handler, { password: PASSWORD, data: { resumes: ['a'.repeat(bytes - payloadOverhead)] } });

  const warn = () => vi.spyOn(console, 'warn').mockImplementation(() => undefined);

  it.each([
    ['a non-numeric value', 'abc'],
    ['a unit-suffixed value', '2MB'],
    ['a decimal', '4096.5'],
    ['zero', '0'],
    ['a negative value', '-1'],
  ])('falls back to the default payload cap when MAX_SYNC_PAYLOAD_BYTES is %s', async (_l, raw) => {
    const consoleWarn = warn();
    const handler = await loadHandler({ MAX_SYNC_PAYLOAD_BYTES: raw });

    // Under the old parseInt reading, '2MB' became 2 bytes and every upload got a 413.
    expect((await uploadOfSize(handler, 4096)).statusCode).toBe(201);
    const overDefault = await uploadOfSize(handler, DEFAULT_MAX_BYTES + 1);
    expect(overDefault.statusCode).toBe(413);
    expect(overDefault.body).toEqual({ error: 'Backup too large (max 2048 KiB)' });
    expect(consoleWarn).toHaveBeenCalledTimes(1);
    expect(consoleWarn.mock.calls[0][0]).toContain('MAX_SYNC_PAYLOAD_BYTES');
  });

  it.each([
    ['a non-numeric value', 'abc'],
    ['zero', '0'],
    ['a negative value', '-16'],
  ])(
    'keeps the 8-character password minimum when MIN_SYNC_PASSWORD_LENGTH is %s',
    async (_l, raw) => {
      warn();
      const handler = await loadHandler({ MIN_SYNC_PASSWORD_LENGTH: raw });

      const short = await post(handler, { password: '1234567', data: BACKUP });
      expect(short.statusCode).toBe(400);
      expect(short.body).toEqual({ error: 'Password must be at least 8 characters' });
    }
  );

  it.each([
    ['a non-numeric value', 'abc'],
    ['zero', '0'],
    ['a negative value', '-5'],
  ])('keeps rate limiting active when RATE_LIMIT is %s', async (_l, raw) => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    warn();
    const handler = await loadHandler({ RATE_LIMIT: raw });

    // NaN made every `count >= RATE_LIMIT` comparison false, disabling the limit entirely.
    for (let i = 0; i < 20; i++) {
      expect((await get(handler, SYNC_ID, '198.51.100.9')).statusCode).toBe(404);
    }
    expect((await get(handler, SYNC_ID, '198.51.100.9')).statusCode).toBe(429);
  });

  it('honours a valid positive integer', async () => {
    const consoleWarn = warn();
    const handler = await loadHandler({ RATE_LIMIT: '1', MIN_SYNC_PASSWORD_LENGTH: '12' });

    expect((await get(handler, SYNC_ID, '198.51.100.11')).statusCode).toBe(404);
    expect((await get(handler, SYNC_ID, '198.51.100.11')).statusCode).toBe(429);
    expect((await post(handler, { password: '12345678901', data: BACKUP })).body).toEqual({
      error: 'Password must be at least 12 characters',
    });
    expect(consoleWarn).not.toHaveBeenCalled();
  });
});
