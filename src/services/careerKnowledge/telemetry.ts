// Operational Telemetry for Career Knowledge Cloud Synchronization (Phase 8).
//
// Invariants:
//   * Never captures passwords, API keys, tokens, or raw credentials
//   * Never alters Career Knowledge domain semantics
//   * Provides in-memory aggregate metrics, ring-buffer event log, and subscriber hooks

export type TelemetryEventType =
  | 'sync_started'
  | 'sync_succeeded'
  | 'sync_failed'
  | 'sync_retry'
  | 'sync_conflict'
  | 'sync_auth_failure'
  | 'sync_authorization_failure'
  | 'sync_schema_mismatch'
  | 'sync_unknown_outcome'
  | 'verification_transition_audited';

export interface TelemetryEvent {
  type: TelemetryEventType;
  timestamp: string;
  requestId?: string;
  profileId?: string;
  action?: string;
  durationMs?: number;
  retryCount?: number;
  statusCode?: number;
  errorClass?: string;
  metadata?: Record<string, unknown>;
}

export interface TelemetryMetrics {
  totalStarted: number;
  totalSucceeded: number;
  totalFailed: number;
  totalRetries: number;
  totalConflicts: number;
  totalAuthFailures: number;
  totalAuthorizationFailures: number;
  totalSchemaMismatches: number;
  totalUnknownOutcomes: number;
  totalVerificationTransitions: number;
  lastEventTimestamp?: string;
}

export interface VerificationAuditRecord {
  factId: string;
  profileId: string;
  fromState: string;
  toState: string;
  actor: string;
  timestamp: string;
  requestId?: string;
  source?: string;
}

class CareerKnowledgeTelemetryService {
  private readonly maxEvents = 100;
  private readonly events: TelemetryEvent[] = [];
  private readonly auditRecords: VerificationAuditRecord[] = [];
  private readonly listeners = new Set<(event: TelemetryEvent) => void>();

  private metrics: TelemetryMetrics = {
    totalStarted: 0,
    totalSucceeded: 0,
    totalFailed: 0,
    totalRetries: 0,
    totalConflicts: 0,
    totalAuthFailures: 0,
    totalAuthorizationFailures: 0,
    totalSchemaMismatches: 0,
    totalUnknownOutcomes: 0,
    totalVerificationTransitions: 0,
  };

  /**
   * Emit a sanitized operational telemetry event.
   */
  emit(event: Omit<TelemetryEvent, 'timestamp'> & { timestamp?: string }): TelemetryEvent {
    const sanitizedEvent: TelemetryEvent = {
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
      metadata: event.metadata ? this.sanitizeMetadata(event.metadata) : undefined,
    };

    // Update aggregate counters
    switch (sanitizedEvent.type) {
      case 'sync_started':
        this.metrics.totalStarted++;
        break;
      case 'sync_succeeded':
        this.metrics.totalSucceeded++;
        break;
      case 'sync_failed':
        this.metrics.totalFailed++;
        break;
      case 'sync_retry':
        this.metrics.totalRetries++;
        break;
      case 'sync_conflict':
        this.metrics.totalConflicts++;
        break;
      case 'sync_auth_failure':
        this.metrics.totalAuthFailures++;
        break;
      case 'sync_authorization_failure':
        this.metrics.totalAuthorizationFailures++;
        break;
      case 'sync_schema_mismatch':
        this.metrics.totalSchemaMismatches++;
        break;
      case 'sync_unknown_outcome':
        this.metrics.totalUnknownOutcomes++;
        break;
      case 'verification_transition_audited':
        this.metrics.totalVerificationTransitions++;
        break;
    }
    this.metrics.lastEventTimestamp = sanitizedEvent.timestamp;

    // Maintain in-memory ring buffer
    this.events.push(sanitizedEvent);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Notify subscribers
    for (const listener of this.listeners) {
      try {
        listener(sanitizedEvent);
      } catch {
        // Telemetry errors must never crash application code
      }
    }

    return sanitizedEvent;
  }

  /**
   * Record a structured verification transition audit entry.
   */
  recordVerificationAudit(record: VerificationAuditRecord): void {
    this.auditRecords.push(record);
    if (this.auditRecords.length > this.maxEvents) {
      this.auditRecords.shift();
    }

    this.emit({
      type: 'verification_transition_audited',
      requestId: record.requestId,
      profileId: record.profileId,
      metadata: {
        factId: record.factId,
        fromState: record.fromState,
        toState: record.toState,
        actor: record.actor,
      },
    });
  }

  getMetrics(): Readonly<TelemetryMetrics> {
    return { ...this.metrics };
  }

  getRecentEvents(limit?: number): ReadonlyArray<TelemetryEvent> {
    if (limit && limit > 0) {
      return this.events.slice(-limit);
    }
    return [...this.events];
  }

  getAuditRecords(): ReadonlyArray<VerificationAuditRecord> {
    return [...this.auditRecords];
  }

  subscribe(listener: (event: TelemetryEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  reset(): void {
    this.events.length = 0;
    this.auditRecords.length = 0;
    this.metrics = {
      totalStarted: 0,
      totalSucceeded: 0,
      totalFailed: 0,
      totalRetries: 0,
      totalConflicts: 0,
      totalAuthFailures: 0,
      totalAuthorizationFailures: 0,
      totalSchemaMismatches: 0,
      totalUnknownOutcomes: 0,
      totalVerificationTransitions: 0,
    };
  }

  private sanitizeMetadata(meta: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    const sensitiveKeys = new Set([
      'password',
      'secret',
      'token',
      'key',
      'apikey',
      'authorization',
      'bearer',
      'cookie',
    ]);

    for (const [key, val] of Object.entries(meta)) {
      if (sensitiveKeys.has(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof val === 'object' && val !== null) {
        sanitized[key] = Array.isArray(val) ? `[Array(${val.length})]` : '[Object]';
      } else {
        sanitized[key] = val;
      }
    }
    return sanitized;
  }
}

export const careerKnowledgeTelemetry = new CareerKnowledgeTelemetryService();
