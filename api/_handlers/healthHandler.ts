// Health ping diagnostic handler for sync API (Phase 8 Production Hardened)
import { VercelRequest, VercelResponse } from '@vercel/node';
import { SUPPORTED_SCHEMA_VERSION, logServerError } from './shared';

export async function handleHealthCheck(
  _req: VercelRequest,
  res: VercelResponse,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sql: any,
  requestId: string
): Promise<void> {
  if (!sql) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: 'Database connection not configured',
    });
    return;
  }
  try {
    await sql`SELECT 1 as ping`;
    res.status(200).json({
      status: 'healthy',
      database: 'connected',
      schemaVersion: SUPPORTED_SCHEMA_VERSION,
      timestamp: new Date().toISOString(),
    });
    return;
  } catch (err) {
    logServerError('GET health ping', err, requestId);
    res.status(503).json({
      status: 'unhealthy',
      database: 'unreachable',
      error: 'Database ping failed',
    });
    return;
  }
}
