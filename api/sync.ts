// Cloud sync API handler for Neon database (Phase 8 Production Hardened)
// This serverless function delegates to modular handlers for backup and Career Knowledge sync.
// Threat model: docs/SECURITY.md

import { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import {
  SUPPORTED_SCHEMA_VERSION,
  MIN_PASSWORD_LENGTH,
  checkRateLimit,
  isValidSyncId,
  logOperationalEvent,
  allowCors,
  authenticateOrInitAccount,
} from './_handlers/shared';
import { handleHealthCheck } from './_handlers/healthHandler';
import { handleBackupGet, handleBackupPost } from './_handlers/backupHandler';
import {
  handleCareerKnowledgeGet,
  handleListCareerProfiles,
  handleDeleteCareerProfile,
  handlePullCareerKnowledge,
  handlePushCareerKnowledge,
} from './_handlers/careerKnowledgeHandler';

// neon() throws synchronously without a connection string; create the client only when configured
// so the handler can answer 503 instead of the whole function crashing at import.
const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

export { SUPPORTED_SCHEMA_VERSION };

const handler = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  const startTime = Date.now();
  const requestId =
    (req.headers['x-request-id'] as string) ||
    (req.headers['x-correlation-id'] as string) ||
    (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);

  res.setHeader('x-request-id', requestId);

  // 0. Health Diagnostics Endpoint
  if (req.method === 'GET' && (req.query.health === '1' || req.query.resource === 'health')) {
    return handleHealthCheck(req, res, sql, requestId);
  }

  if (!sql) {
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
    logOperationalEvent({
      tag: 'operational_telemetry',
      requestId,
      accountId: syncId,
      action: req.method || 'UNKNOWN',
      statusCode: 429,
      durationMs: Date.now() - startTime,
      errorClass: 'rate_limited',
    });
    return;
  }

  // 1. GET (Download)
  if (req.method === 'GET') {
    if (!syncId) {
      res.status(400).json({ error: 'Missing ID' });
      return;
    }
    if (!isValidSyncId(syncId)) {
      res.status(400).json({ error: 'Invalid ID format' });
      return;
    }

    // Structured Career Knowledge GET
    if (req.query.resource === 'career_knowledge') {
      return handleCareerKnowledgeGet(req, res, sql, requestId, startTime, syncId);
    }

    // Legacy backup GET
    return handleBackupGet(req, res, sql, requestId, syncId);
  }

  // 2. POST (Upload / Actions)
  if (req.method === 'POST') {
    const { action, password, profileId, data: payloadData } = req.body ?? {};

    if (!syncId || !password) {
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

    // Legacy Backup POST (when no action is specified)
    if (!action) {
      return handleBackupPost(
        req,
        res,
        sql,
        requestId,
        startTime,
        ip,
        syncId,
        password,
        payloadData
      );
    }

    // Reject unknown actions BEFORE authenticateOrInitAccount: auth creates a
    // backups row as a side effect, so an unrecognized action must not mint one.
    const KNOWN_CK_ACTIONS = new Set([
      'list_career_profiles',
      'delete_career_profile',
      'pull_career_knowledge',
      'push_career_knowledge',
    ]);
    if (!KNOWN_CK_ACTIONS.has(action)) {
      res.status(400).json({ error: 'Unsupported action' });
      return;
    }

    // Authenticate or initialize account in backups table for Career Knowledge actions
    const authOk = await authenticateOrInitAccount(
      sql,
      syncId,
      password,
      ip,
      requestId,
      startTime,
      action,
      res
    );
    if (!authOk) {
      return;
    }

    // A. List Career Profiles
    if (action === 'list_career_profiles') {
      return handleListCareerProfiles(req, res, sql, requestId, startTime, syncId);
    }

    // B. Delete Career Profile
    if (action === 'delete_career_profile') {
      return handleDeleteCareerProfile(req, res, sql, requestId, startTime, syncId, profileId);
    }

    // C. Pull Career Knowledge
    if (action === 'pull_career_knowledge') {
      return handlePullCareerKnowledge(req, res, sql, requestId, startTime, syncId, profileId);
    }

    // D. Push Career Knowledge
    if (action === 'push_career_knowledge') {
      return handlePushCareerKnowledge(
        req,
        res,
        sql,
        requestId,
        startTime,
        syncId,
        profileId,
        payloadData
      );
    }

    // Unreachable: unknown actions return early above.
    return;
  }

  res.setHeader('Allow', 'GET, OPTIONS, POST');
  res.status(405).json({ error: 'Method not allowed' });
};

export default allowCors(handler);
