// Cloud sync API handler for Neon database
// This serverless function handles backup and restore operations
// Threat model: docs/SECURITY.md

import { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const sql = neon(process.env.DATABASE_URL!);

// In-memory rate limiter (per-instance). Prefer edge/Redis limits at scale.
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = parseInt(process.env.RATE_LIMIT || '20', 10);
const RATE_WINDOW_MS = 60 * 1000;
const MAX_RATE_MAP_SIZE = 10_000;

/** Max serialized backup payload (~2 MiB) */
const MAX_PAYLOAD_BYTES = parseInt(
  process.env.MAX_SYNC_PAYLOAD_BYTES || String(2 * 1024 * 1024),
  10
);
const MIN_PASSWORD_LENGTH = parseInt(process.env.MIN_SYNC_PASSWORD_LENGTH || '8', 10);
const SYNC_ID_RE = /^[a-zA-Z0-9]{16}$/;

function checkRateLimit(ip: string): boolean {
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

function isValidSyncId(id: unknown): id is string {
  return typeof id === 'string' && SYNC_ID_RE.test(id);
}

function payloadByteSize(data: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(data), 'utf8');
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}

/** Accept compressed wrapper or legacy SyncData-shaped object */
function isPlausibleBackupPayload(data: unknown): boolean {
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

function logServerError(context: string, err: unknown): void {
  // Never log request bodies / passwords
  const message = err instanceof Error ? err.message : 'unknown error';
  console.error(`[sync] ${context}:`, message);
}

const allowCors =
  (fn: (req: VercelRequest, res: VercelResponse) => Promise<void>) =>
  async (req: VercelRequest, res: VercelResponse) => {
    const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://hr-with-ai.vercel.app';
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-sync-id'
    );
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    return await fn(req, res);
  };

const handler = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  if (!process.env.DATABASE_URL) {
    res.status(503).json({ error: 'Sync service unavailable' });
    return;
  }

  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown';
  const syncId = (req.headers['x-sync-id'] as string) || (req.query.id as string);

  if (!checkRateLimit(ip)) {
    res.setHeader('Retry-After', '60');
    res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    return;
  }

  // 1. GET (Download) — possession of sync ID is the capability
  if (req.method === 'GET') {
    if (!syncId) {
      res.status(400).json({ error: 'Missing ID' });
      return;
    }
    if (!isValidSyncId(syncId)) {
      res.status(400).json({ error: 'Invalid ID format' });
      return;
    }

    try {
      const result = await sql`SELECT data FROM backups WHERE id = ${syncId}`;

      if (result.length === 0) {
        res.status(404).json({ error: 'Backup not found' });
        return;
      }

      res.status(200).json({ data: result[0].data });
      return;
    } catch (err) {
      logServerError('GET', err);
      res.status(500).json({ error: 'Database error' });
      return;
    }
  }

  // 2. POST (Upload/Sync)
  if (req.method === 'POST') {
    const { password, data: backupData } = req.body ?? {};

    if (!syncId || !password || backupData === undefined || backupData === null) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    if (!isValidSyncId(syncId)) {
      res.status(400).json({ error: 'Invalid ID format' });
      return;
    }

    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      res.status(400).json({
        error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      });
      return;
    }

    if (!isPlausibleBackupPayload(backupData)) {
      res.status(400).json({ error: 'Invalid backup payload shape' });
      return;
    }

    const size = payloadByteSize(backupData);
    if (size > MAX_PAYLOAD_BYTES) {
      res.status(413).json({
        error: `Backup too large (max ${Math.floor(MAX_PAYLOAD_BYTES / 1024)} KiB)`,
      });
      return;
    }

    try {
      const existing = await sql`SELECT password_hash FROM backups WHERE id = ${syncId}`;

      if (existing.length > 0) {
        const isValid = await bcrypt.compare(password, existing[0].password_hash);
        if (!isValid) {
          res.status(401).json({ error: 'Invalid password' });
          return;
        }

        await sql`UPDATE backups SET data = ${backupData}, updated_at = NOW(), last_ip = ${ip} WHERE id = ${syncId}`;
        res.status(200).json({ success: true, message: 'Updated successfully' });
        return;
      }

      const hash = await bcrypt.hash(password, 10);
      await sql`INSERT INTO backups (id, password_hash, data, last_ip) VALUES (${syncId}, ${hash}, ${backupData}, ${ip})`;
      res.status(201).json({ success: true, message: 'Created successfully' });
      return;
    } catch (err) {
      logServerError('POST', err);
      res.status(500).json({ error: 'Database error' });
      return;
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
};

export default allowCors(handler);
