// Cloud sync API handler for Neon database
// This serverless function handles backup and restore operations

import { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

// Neon SQL client - handles connection pooling automatically
const sql = neon(process.env.DATABASE_URL!);

// Simple in-memory rate limiter (per-instance, works best with consistent server warm-up)
// For production, use Redis: https://vercel.com/docs/concepts/vercel-edge-network/rate-limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = parseInt(process.env.RATE_LIMIT || '20');
const RATE_WINDOW_MS = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW_MS });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

// Helper for CORS
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
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown';
  const syncId = (req.headers['x-sync-id'] as string) || (req.query.id as string);

  // Rate Limiting Check
  if (!checkRateLimit(ip)) {
    res.setHeader('Retry-After', '60');
    res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    return;
  }

  // 1. GET (Download)
  if (req.method === 'GET') {
    if (!syncId) {
      res.status(400).json({ error: 'Missing ID' });
      return;
    }

    // Validate ID format
    if (!/^[a-zA-Z0-9]{16}$/.test(syncId)) {
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
      console.error(err);
      res.status(500).json({ error: 'Database error' });
      return;
    }
  }

  // 2. POST (Upload/Sync)
  if (req.method === 'POST') {
    const { password, data: backupData } = req.body;

    if (!syncId || !password || !backupData) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Validate ID format
    if (!/^[a-zA-Z0-9]{16}$/.test(syncId)) {
      res.status(400).json({ error: 'Invalid ID format' });
      return;
    }

    try {
      // Check if exists
      const existing = await sql`SELECT password_hash FROM backups WHERE id = ${syncId}`;

      if (existing.length > 0) {
        // Update existing
        const isValid = await bcrypt.compare(password, existing[0].password_hash);
        if (!isValid) {
          res.status(401).json({ error: 'Invalid password' });
          return;
        }

        await sql`UPDATE backups SET data = ${backupData}, updated_at = NOW(), last_ip = ${ip} WHERE id = ${syncId}`;
        res.status(200).json({ success: true, message: 'Updated successfully' });
        return;
      } else {
        // Insert new
        const hash = await bcrypt.hash(password, 10);
        await sql`INSERT INTO backups (id, password_hash, data, last_ip) VALUES (${syncId}, ${hash}, ${backupData}, ${ip})`;
        res.status(201).json({ success: true, message: 'Created successfully' });
        return;
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
      return;
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
};

export default allowCors(handler);
