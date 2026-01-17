// This file is a simulated serverless function handler.
// In a real Vercel environment, this would be in api/sync.ts
// and executed by Node.js.
// Since we are in a Vite SPA, we will provide the code structure
// but it technically needs a running Node server or Vercel to execute.
// I will place this in 'api/index.js' (using CommonJS for simpler Node compat if run directly)
// or 'api/sync.ts' if we assume Vercel/Next.js environment which supports TS.
// Given the project is Vite + React, we might not be able to "run" this locally
// without a separate server, but I will provide the implementation as requested.

import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

// Connection pool - re-used in serverless function warm starts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Helper for CORS
const allowCors = (fn: any) => async (req: VercelRequest, res: VercelResponse) => {
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

const handler = async (req: VercelRequest, res: VercelResponse) => {
  const client = await pool.connect();
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const syncId = req.headers['x-sync-id'] as string || req.query.id as string;
  
  // Rate Limiting Check (Simplified 10 req/hr)
  // In production, use Redis or dedicated rate limit service
  try {
     const rateCheck = await client.query(
        "SELECT COUNT(*) FROM rate_limits WHERE ip = $1 AND timestamp > NOW() - INTERVAL '1 hour'",
        [ip]
     );
     if (parseInt(rateCheck.rows[0].count) > 100) { // High limit for dev, strict for prod (e.g., 10)
         return res.status(429).json({ error: 'Rate limit exceeded' });
     }
     // Log action
     await client.query("INSERT INTO rate_limits (ip, action) VALUES ($1, $2)", [ip, req.method]);
  } catch (err) {
      console.error('Rate limit error', err);
      // Fail open if rate limit DB fails? Or close. Let's proceed for now.
  }

  // 1. GET (Download)
  if (req.method === 'GET') {
      if (!syncId) return res.status(400).json({ error: 'Missing ID' });
      
      // Validate ID format
      if (!/^[a-zA-Z0-9]{16}$/.test(syncId)) {
          client.release();
          return res.status(400).json({ error: 'Invalid ID format' });
      }

      try {
          const result = await client.query('SELECT data FROM backups WHERE id = $1', [syncId]);
          client.release();
          
          if (result.rows.length === 0) {
              return res.status(404).json({ error: 'Backup not found' });
          }
          
          return res.status(200).json({ data: result.rows[0].data });
      } catch (err) {
          client.release();
          console.error(err);
          return res.status(500).json({ error: 'Database error' });
      }
  }

  // 2. POST (Upload/Sync)
  if (req.method === 'POST') {
      const { password, data } = req.body;

      if (!syncId || !password || !data) {
          client.release();
          return res.status(400).json({ error: 'Missing required fields' });
      }
      
       // Validate ID format
      if (!/^[a-zA-Z0-9]{16}$/.test(syncId)) {
          client.release();
          return res.status(400).json({ error: 'Invalid ID format' });
      }

      try {
          // Check if exists
          const existing = await client.query('SELECT password_hash FROM backups WHERE id = $1', [syncId]);
          
          if (existing.rows.length > 0) {
              // Update existing
              const isValid = await bcrypt.compare(password, existing.rows[0].password_hash);
              if (!isValid) {
                  client.release();
                  return res.status(401).json({ error: 'Invalid password' });
              }
              
              await client.query(
                  'UPDATE backups SET data = $1, updated_at = NOW(), last_ip = $2 WHERE id = $3',
                  [data, ip, syncId]
              );
              client.release();
              return res.status(200).json({ success: true, message: 'Updated successfully' });
              
          } else {
              // Insert new
              const hash = await bcrypt.hash(password, 10);
              await client.query(
                  'INSERT INTO backups (id, password_hash, data, last_ip) VALUES ($1, $2, $3, $4)',
                  [syncId, hash, data, ip]
              );
              client.release();
              return res.status(201).json({ success: true, message: 'Created successfully' });
          }
      } catch (err) {
          client.release();
          console.error(err);
          return res.status(500).json({ error: 'Database error' });
      }
  }
  
  client.release();
  return res.status(405).json({ error: 'Method not allowed' });
};

export default allowCors(handler);
