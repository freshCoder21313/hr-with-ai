import { describe, it, expect, beforeEach, vi } from 'vitest';
import { careerKnowledgeTelemetry } from './telemetry';

describe('CareerKnowledgeTelemetry', () => {
  beforeEach(() => {
    careerKnowledgeTelemetry.reset();
  });

  it('tracks aggregate metrics for started, succeeded, and failed syncs', () => {
    careerKnowledgeTelemetry.emit({
      type: 'sync_started',
      action: 'push_career_knowledge',
      requestId: 'req-1',
    });

    careerKnowledgeTelemetry.emit({
      type: 'sync_succeeded',
      action: 'push_career_knowledge',
      requestId: 'req-1',
      durationMs: 45,
    });

    careerKnowledgeTelemetry.emit({
      type: 'sync_failed',
      action: 'pull_career_knowledge',
      requestId: 'req-2',
      errorClass: 'server_error',
    });

    const metrics = careerKnowledgeTelemetry.getMetrics();
    expect(metrics.totalStarted).toBe(1);
    expect(metrics.totalSucceeded).toBe(1);
    expect(metrics.totalFailed).toBe(1);
    expect(metrics.lastEventTimestamp).toBeDefined();
  });

  it('tracks security failures: auth_failure, authorization_failure, conflict, and schema_mismatch', () => {
    careerKnowledgeTelemetry.emit({
      type: 'sync_auth_failure',
      requestId: 'req-auth',
      statusCode: 401,
    });

    careerKnowledgeTelemetry.emit({
      type: 'sync_authorization_failure',
      requestId: 'req-authz',
      statusCode: 403,
    });

    careerKnowledgeTelemetry.emit({
      type: 'sync_conflict',
      requestId: 'req-conf',
      statusCode: 409,
    });

    careerKnowledgeTelemetry.emit({
      type: 'sync_schema_mismatch',
      requestId: 'req-schema',
      statusCode: 422,
    });

    const metrics = careerKnowledgeTelemetry.getMetrics();
    expect(metrics.totalAuthFailures).toBe(1);
    expect(metrics.totalAuthorizationFailures).toBe(1);
    expect(metrics.totalConflicts).toBe(1);
    expect(metrics.totalSchemaMismatches).toBe(1);
  });

  it('strictly sanitizes sensitive keys (passwords, tokens, API keys) from event metadata', () => {
    const event = careerKnowledgeTelemetry.emit({
      type: 'sync_failed',
      requestId: 'req-safe',
      metadata: {
        password: 'my-super-secret-password',
        token: 'bearer-token-12345',
        apiKey: 'sk-proj-xyz',
        profileId: 'prof-safe-1',
        count: 5,
      },
    });

    expect(event.metadata?.password).toBe('[REDACTED]');
    expect(event.metadata?.token).toBe('[REDACTED]');
    expect(event.metadata?.apiKey).toBe('[REDACTED]');
    expect(event.metadata?.profileId).toBe('prof-safe-1');
    expect(event.metadata?.count).toBe(5);
  });

  it('records verification audit transitions and emits telemetry event', () => {
    careerKnowledgeTelemetry.recordVerificationAudit({
      factId: 'fact-123',
      profileId: 'prof-456',
      fromState: 'needs_confirmation',
      toState: 'confirmed',
      actor: 'user',
      timestamp: '2026-10-01T10:00:00Z',
      requestId: 'req-audit-1',
    });

    const records = careerKnowledgeTelemetry.getAuditRecords();
    expect(records.length).toBe(1);
    expect(records[0]).toMatchObject({
      factId: 'fact-123',
      fromState: 'needs_confirmation',
      toState: 'confirmed',
      actor: 'user',
    });

    const metrics = careerKnowledgeTelemetry.getMetrics();
    expect(metrics.totalVerificationTransitions).toBe(1);
  });

  it('supports subscriber listeners and cleanup on unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = careerKnowledgeTelemetry.subscribe(listener);

    careerKnowledgeTelemetry.emit({
      type: 'sync_started',
      action: 'sync_profile',
    });

    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();

    careerKnowledgeTelemetry.emit({
      type: 'sync_succeeded',
      action: 'sync_profile',
    });

    // Should not receive second event after unsubscribe
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
