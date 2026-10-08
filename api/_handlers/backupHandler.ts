// Core snapshot backup handler (Phase 8 Production Hardened)
import { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import {
  MAX_PAYLOAD_BYTES,
  isPlausibleBackupPayload,
  payloadByteSize,
  logOperationalEvent,
  logServerError,
} from './shared';

export async function handleBackupGet(
  req: VercelRequest,
  res: VercelResponse,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sql: any,
  requestId: string,
  syncId: string
): Promise<void> {
  const password =
    (req.headers['x-sync-password'] as string) || (req.query?.password as string);

  if (!password) {
    res.status(401).json({ error: 'Password required to download backup' });
    return;
  }

  try {
    const result = await sql`SELECT data, password_hash FROM backups WHERE id = ${syncId}`;

    if (result.length === 0) {
      res.status(404).json({ error: 'Backup not found' });
      return;
    }

    if (result[0].password_hash) {
      const isPasswordValid = await bcrypt.compare(password, result[0].password_hash);
      if (!isPasswordValid) {
        res.status(401).json({ error: 'Invalid backup password' });
        return;
      }
    }

    res.status(200).json({ data: result[0].data });
    return;
  } catch (err) {
    logServerError('GET backup', err, requestId);
    res.status(500).json({ error: 'Database error' });
    return;
  }
}

export async function handleBackupPost(
  _req: VercelRequest,
  res: VercelResponse,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sql: any,
  requestId: string,
  startTime: number,
  ip: string,
  syncId: string,
  password: string,
  payloadData: unknown
): Promise<void> {
  if (payloadData === undefined || payloadData === null) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  if (!isPlausibleBackupPayload(payloadData)) {
    res.status(400).json({ error: 'Invalid backup payload shape' });
    return;
  }

  const size = payloadByteSize(payloadData);
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
        logOperationalEvent({
          tag: 'operational_telemetry',
          requestId,
          accountId: syncId,
          action: 'legacy_backup_post',
          statusCode: 401,
          durationMs: Date.now() - startTime,
          errorClass: 'auth_failure',
        });
        res.status(401).json({ error: 'Invalid password' });
        return;
      }

      await sql`UPDATE backups SET data = ${payloadData}, updated_at = NOW(), last_ip = ${ip} WHERE id = ${syncId}`;
      res.status(200).json({ success: true, message: 'Updated successfully' });
      return;
    }

    const hash = await bcrypt.hash(password, 10);
    await sql`INSERT INTO backups (id, password_hash, data, last_ip) VALUES (${syncId}, ${hash}, ${payloadData}, ${ip})`;
    res.status(201).json({ success: true, message: 'Created successfully' });
    return;
  } catch (err) {
    logServerError('POST backup', err, requestId);
    res.status(500).json({ error: 'Database error' });
    return;
  }
}
