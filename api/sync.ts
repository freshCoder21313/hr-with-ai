// Cloud sync API handler for Neon database
// This serverless function handles backup and restore operations

import { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

// Neon SQL client - handles connection pooling automatically
const sql = neon(process.env.DATABASE_URL!);

// Helper for CORS
const allowCors = (fn: (req: VercelRequest, res: VercelResponse) => Promise<void>) => async (req: VercelRequest, res: VercelResponse) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
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
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const syncId = req.headers['x-sync-id'] as string || req.query.id as string;

  // Rate Limiting Check (Simplified 10 req/hr)
  // In production, use Redis or dedicated rate limit service
  try {
     const rateCheck = await sql`SELECT COUNT(*) FROM rate_limits WHERE ip = ${ip} AND timestamp > NOW() - INTERVAL '1 hour'`;
     if (parseInt(rateCheck[0].count) > 100) { // High limit for dev, strict for prod (e.g., 10)
         res.status(429).json({ error: 'Rate limit exceeded' });
         return;
     }
     // Log action
     await sql`INSERT INTO rate_limits (ip, action) VALUES (${ip}, ${req.method})`;
  } catch (err) {
      console.error('Rate limit error', err);
      // Fail open if rate limit DB fails? Or close. Let's proceed for now.
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
