// Shared utilities, constants, types and middleware for sync API handlers (Phase 8 Production Hardened)
import { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';

export const SUPPORTED_SCHEMA_VERSION = 1;

// In-memory rate limiter (per-instance). Prefer edge/Redis limits at scale.
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

/**
 * Strict positive-integer env parsing. A typo must never silently disable a
 * protection: parseInt('abc') and parseInt('2MB') both yield a number that
 * makes every comparison false (NaN) or absurdly small (2). Anything that is
 * not a positive integer falls back to the default and logs one warning.
 */
export function readPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const parsed = Number(raw.trim());
  if (Number.isInteger(parsed) && parsed > 0) return parsed;
  console.warn(`[sync] ignoring invalid ${name}=${JSON.stringify(raw)}; using ${fallback}`);
  return fallback;
}

export const RATE_LIMIT = readPositiveInt('RATE_LIMIT', 20);
export const RATE_WINDOW_MS = 60 * 1000;
export const MAX_RATE_MAP_SIZE = 10_000;

/** Max serialized backup payload (~2 MiB) */
export const MAX_PAYLOAD_BYTES = readPositiveInt('MAX_SYNC_PAYLOAD_BYTES', 2 * 1024 * 1024);
export const MIN_PASSWORD_LENGTH = readPositiveInt('MIN_SYNC_PASSWORD_LENGTH', 8);
/** Accepts standard email, username (3-64 chars), or legacy 16-char alphanumeric ID */
export const ACCOUNT_ID_RE =
  /^(?:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|[a-zA-Z0-9_.-]{3,64})$/;
export const SYNC_ID_RE = ACCOUNT_ID_RE;

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    // Prevent unbounded growth of the map
    if (rateLimitMap.size > MAX_RATE_MAP_SIZE) {
      for (const [key, value] of rateLimitMap) {
        if (now > value.resetTime) rateLimitMap.delete(key);
      }
    }
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW_MS });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

export function isValidSyncId(id: unknown): id is string {
  return typeof id === 'string' && ACCOUNT_ID_RE.test(id.trim());
}

export function payloadByteSize(data: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(data), 'utf8');
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}

/** Accept compressed wrapper or legacy SyncData-shaped object */
export function isPlausibleBackupPayload(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  if (typeof obj.compressed === 'string' && obj.compressed.length > 0) return true;
  if (
    Array.isArray(obj.interviews) ||
    Array.isArray(obj.resumes) ||
    Array.isArray(obj.userSettings)
  ) {
    return true;
  }
  return false;
}

export function maskAccountId(id?: string): string {
  if (!id) return 'anonymous';
  if (id.includes('@')) {
    const [local, domain] = id.split('@');
    const maskedLocal =
      local.length <= 2 ? `${local[0] || ''}*` : `${local.slice(0, 2)}***${local.slice(-1)}`;
    return `${maskedLocal}@${domain || ''}`;
  }
  if (id.length < 6) return `${id.slice(0, 1)}***`;
  return `${id.slice(0, 4)}***${id.slice(-2)}`;
}

/**
 * Constrained audit actor: user-initiated transitions vs system-applied ones
 * (e.g. invariant-preserving downgrade guards). The raw fact origin is stored
 * separately in `origin` so the audit log schema stays a closed enum.
 */
export type VerificationAuditActor = 'user' | 'system';

export function auditActorForOrigin(origin: string): VerificationAuditActor {
  return origin === 'user' ? 'user' : 'system';
}

/**
 * Serialize a value for a JSONB column. The driver receives an explicit JSON
 * string and Postgres casts text → jsonb. Passing the raw object instead
 * would depend on driver-specific JSON serialization (verified to break the
 * Neon mock and risky across driver versions), so the stringify stays here
 * in one documented helper rather than scattered inline.
 */
export function toJsonbParam(value: unknown): string {
  return JSON.stringify(value ?? null);
}

export interface OperationalLogEvent {
  tag: 'operational_telemetry';
  requestId: string;
  accountId?: string;
  profileId?: string;
  action: string;
  statusCode: number;
  durationMs: number;
  entityCounts?: {
    facts?: number;
    evidence?: number;
    notes?: number;
    links?: number;
  };
  errorClass?: string;
  message?: string;
}

export function logOperationalEvent(event: OperationalLogEvent): void {
  // Never log passwords, tokens, database URLs, or raw claim PII
  console.info(
    JSON.stringify({
      ...event,
      timestamp: new Date().toISOString(),
      accountId: event.accountId ? maskAccountId(event.accountId) : undefined,
    })
  );
}

export interface VerificationAuditLog {
  tag: 'verification_audit';
  requestId: string;
  factId: string;
  profileId: string;
  fromState: string;
  toState: string;
  /** Constrained actor: user-initiated vs system-applied transitions. */
  actor: VerificationAuditActor;
  /** Original fact origin preserved for debugging (user|ai_inference|migration|external). */
  origin?: string;
  timestamp: string;
}

export function logVerificationAudit(audit: Omit<VerificationAuditLog, 'tag' | 'timestamp'>): void {
  console.info(
    JSON.stringify({
      tag: 'verification_audit',
      ...audit,
      timestamp: new Date().toISOString(),
    })
  );
}

export function logServerError(context: string, err: unknown, requestId?: string): void {
  // Never log request bodies / passwords
  const message = err instanceof Error ? err.message : 'unknown error';
  console.error(`[sync${requestId ? ` req=${requestId}` : ''}] ${context}:`, message);
}

export const allowCors =
  (fn: (req: VercelRequest, res: VercelResponse) => Promise<void>) =>
  async (req: VercelRequest, res: VercelResponse) => {
    const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://hr-with-ai.vercel.app';
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-sync-id, x-request-id, x-correlation-id'
    );
    res.setHeader('Access-Control-Expose-Headers', 'x-request-id, Retry-After');
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    return await fn(req, res);
  };

export interface RawProfileRow {
  id: string;
  account_id?: string;
  schema_version: number;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface RawFactRow {
  id: string;
  profile_id: string;
  category: string;
  subject: string;
  claim: string;
  structured: unknown;
  verification_state: string;
  origin: string;
  superseded_by: string | null;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface RawEvidenceRow {
  id: string;
  profile_id: string;
  source_type: string;
  source_ref: string | null;
  excerpt: string | null;
  url: string | null;
  captured_at: string | Date;
}

export interface RawLinkRow {
  fact_id: string;
  evidence_id: string;
  relation: string;
}

export interface RawNoteRow {
  id: string;
  fact_id: string;
  scope: string;
  text: string;
  created_at: string | Date;
  updated_at: string | Date;
}

export function toIsoString(val: string | Date | undefined | null): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

/**
 * Authenticates against backups table or initializes account on first push.
 * Returns true if authenticated/initialized, false if error response was sent.
 */
export async function authenticateOrInitAccount(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sql: any,
  syncId: string,
  password: string,
  ip: string,
  requestId: string,
  startTime: number,
  action: string,
  res: VercelResponse
): Promise<boolean> {
  try {
    const existing = await sql`SELECT password_hash FROM backups WHERE id = ${syncId}`;
    if (existing.length > 0) {
      const isValid = await bcrypt.compare(password, existing[0].password_hash);
      if (!isValid) {
        logOperationalEvent({
          tag: 'operational_telemetry',
          requestId,
          accountId: syncId,
          action,
          statusCode: 401,
          durationMs: Date.now() - startTime,
          errorClass: 'auth_failure',
        });
        res.status(401).json({ error: 'Invalid password' });
        return false;
      }
    } else {
      const hash = await bcrypt.hash(password, 10);
      await sql`INSERT INTO backups (id, password_hash, data, last_ip) VALUES (${syncId}, ${hash}, '{}', ${ip})`;
    }
    return true;
  } catch (err) {
    logServerError('POST check password', err, requestId);
    res.status(500).json({ error: 'Database error' });
    return false;
  }
}
