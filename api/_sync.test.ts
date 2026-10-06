// @vitest-environment node
// Underscore prefix keeps Vercel from deploying this file as a Serverless Function.
import bcrypt from 'bcryptjs';
import type * as NeonModule from '@neondatabase/serverless';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface ProfileRecord {
  id: string;
  accountId: string;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
}

interface FactRecord {
  id: string;
  profileId: string;
  category: string;
  subject: string;
  claim: string;
  structured: unknown;
  verificationState: string;
  origin: string;
  supersededBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface EvidenceRecord {
  id: string;
  profileId: string;
  sourceType: string;
  sourceRef: string | null;
  excerpt: string | null;
  url: string | null;
  capturedAt: string;
}

interface LinkRecord {
  factId: string;
  evidenceId: string;
  relation: string;
}

interface NoteRecord {
  id: string;
  factId: string;
  scope: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

const { db, fakeSql } = vi.hoisted(() => {
  const db = {
    rows: new Map<string, { passwordHash: string; data: unknown }>(),
    profiles: new Map<string, ProfileRecord>(),
    facts: new Map<string, FactRecord>(),
    evidence: new Map<string, EvidenceRecord>(),
    links: new Map<string, LinkRecord>(), // key: `${factId}::${evidenceId}`
    notes: new Map<string, NoteRecord>(),
    failWith: undefined as Error | undefined,
  };

  /** In-memory stand-in for Neon's tagged-template client */
  const fakeSql = async (
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<Record<string, unknown>[]> => {
    if (db.failWith) throw db.failWith;
    const text = strings
      .reduce((acc, part, i) => `${acc}$${i}${part}`)
      .replace(/\s+/g, ' ')
      .trim();
    const param = (placeholder: string) => values[Number(placeholder.trim().slice(1)) - 1];
    if (text === 'SELECT 1 as ping') {
      return [{ ping: 1 }];
    }

    // --- Backups Table --------------------------------------------------------
    const selectBackup = /^SELECT (.+) FROM backups WHERE id = (\$\d+)$/.exec(text);
    if (selectBackup) {
      const id = String(param(selectBackup[2]));
      const row = db.rows.get(id);
      if (!row) return [];
      const columns: Record<string, unknown> = {
        id,
        password_hash: row.passwordHash,
        data: structuredClone(row.data),
      };
      const wanted =
        selectBackup[1] === '*'
          ? Object.keys(columns)
          : selectBackup[1].split(',').map((c) => c.trim());
      return [Object.fromEntries(wanted.map((c) => [c, columns[c]]))];
    }

    const updateBackup = /^UPDATE backups SET (.+) WHERE id = (\$\d+)$/.exec(text);
    if (updateBackup) {
      const row = db.rows.get(String(param(updateBackup[2])));
      for (const assignment of updateBackup[1].split(',')) {
        const [column, rhs] = assignment.split('=').map((s) => s.trim());
        if (!row || !rhs.startsWith('$')) continue;
        if (column === 'data') row.data = structuredClone(param(rhs));
        if (column === 'password_hash') row.passwordHash = String(param(rhs));
      }
      return [];
    }

    const insertBackup = /^INSERT INTO backups \((.+)\) VALUES \((.+)\)$/.exec(text);
    if (insertBackup) {
      const placeholders = insertBackup[2].split(',');
      const record = Object.fromEntries(
        insertBackup[1].split(',').map((c, i) => [c.trim(), param(placeholders[i])])
      );
      const id = String(record.id);
      if (db.rows.has(id)) throw new Error('duplicate key value violates unique constraint');
      db.rows.set(id, {
        passwordHash: String(record.password_hash),
        data: structuredClone(record.data),
      });
      return [];
    }

    // --- Career Profiles Table ------------------------------------------------
    const selectProfileByAcc =
      /^SELECT (.+) FROM career_profiles WHERE id = (\$\d+) AND account_id = (\$\d+)$/.exec(text);
    if (selectProfileByAcc) {
      const id = String(param(selectProfileByAcc[2]));
      const accountId = String(param(selectProfileByAcc[3]));
      const profile = db.profiles.get(id);
      if (!profile || profile.accountId !== accountId) return [];
      return [
        {
          id: profile.id,
          account_id: profile.accountId,
          schema_version: profile.schemaVersion,
          created_at: profile.createdAt,
          updated_at: profile.updatedAt,
        },
      ];
    }

    const selectProfileById = /^SELECT account_id FROM career_profiles WHERE id = (\$\d+)$/.exec(
      text
    );
    if (selectProfileById) {
      const id = String(param(selectProfileById[1]));
      const profile = db.profiles.get(id);
      if (!profile) return [];
      return [{ account_id: profile.accountId }];
    }

    const selectProfilesForAcc =
      /^SELECT (.+) FROM career_profiles WHERE account_id = (\$\d+)$/.exec(text);
    if (selectProfilesForAcc) {
      const accountId = String(param(selectProfilesForAcc[2]));
      const matches = Array.from(db.profiles.values()).filter((p) => p.accountId === accountId);
      return matches.map((p) => ({
        id: p.id,
        schema_version: p.schemaVersion,
        created_at: p.createdAt,
        updated_at: p.updatedAt,
      }));
    }

    const updateProfile =
      /^UPDATE career_profiles SET updated_at = (\$\d+) WHERE id = (\$\d+)$/.exec(text);
    if (updateProfile) {
      const updatedAt = String(param(updateProfile[1]));
      const id = String(param(updateProfile[2]));
      const profile = db.profiles.get(id);
      if (profile) profile.updatedAt = updatedAt;
      return [];
    }

    const insertProfile = /^INSERT INTO career_profiles \((.+)\) VALUES \((.+)\)$/.exec(text);
    if (insertProfile) {
      const placeholders = insertProfile[2].split(',');
      const record = Object.fromEntries(
        insertProfile[1].split(',').map((c, i) => [c.trim(), param(placeholders[i])])
      );
      const id = String(record.id);
      db.profiles.set(id, {
        id,
        accountId: String(record.account_id),
        schemaVersion: Number(record.schema_version),
        createdAt: String(record.created_at),
        updatedAt: String(record.updated_at),
      });
      return [];
    }

    const deleteProfile =
      /^DELETE FROM career_profiles WHERE id = (\$\d+) AND account_id = (\$\d+)$/.exec(text);
    if (deleteProfile) {
      const id = String(param(deleteProfile[1]));
      const accountId = String(param(deleteProfile[2]));
      const profile = db.profiles.get(id);
      if (profile && profile.accountId === accountId) {
        db.profiles.delete(id);
        // Cascade delete child entities
        const factIds = Array.from(db.facts.values())
          .filter((f) => f.profileId === id)
          .map((f) => f.id);
        for (const fid of factIds) {
          db.facts.delete(fid);
          for (const [key, note] of db.notes) {
            if (note.factId === fid) db.notes.delete(key);
          }
          for (const [key, link] of db.links) {
            if (link.factId === fid) db.links.delete(key);
          }
        }
        for (const [eid, ev] of db.evidence) {
          if (ev.profileId === id) db.evidence.delete(eid);
        }
      }
      return [];
    }

    // --- Career Facts Table ---------------------------------------------------
    const selectFactsByProfile = /^SELECT (.+) FROM career_facts WHERE profile_id = (\$\d+)$/.exec(
      text
    );
    if (selectFactsByProfile) {
      const profileId = String(param(selectFactsByProfile[2]));
      const matches = Array.from(db.facts.values()).filter((f) => f.profileId === profileId);
      return matches.map((f) => ({
        id: f.id,
        profile_id: f.profileId,
        category: f.category,
        subject: f.subject,
        claim: f.claim,
        structured: f.structured,
        verification_state: f.verificationState,
        origin: f.origin,
        superseded_by: f.supersededBy,
        created_at: f.createdAt,
        updated_at: f.updatedAt,
      }));
    }

    const selectFactById =
      /^SELECT verification_state, updated_at, superseded_by FROM career_facts WHERE id = (\$\d+)$/.exec(
        text
      );
    if (selectFactById) {
      const id = String(param(selectFactById[1]));
      const f = db.facts.get(id);
      if (!f) return [];
      return [
        {
          verification_state: f.verificationState,
          updated_at: f.updatedAt,
          superseded_by: f.supersededBy,
        },
      ];
    }

    const selectFactScope =
      /^SELECT 1 FROM career_facts WHERE id = (\$\d+) AND profile_id = (\$\d+)$/.exec(text);
    if (selectFactScope) {
      const id = String(param(selectFactScope[1]));
      const profileId = String(param(selectFactScope[2]));
      const f = db.facts.get(id);
      return f && f.profileId === profileId ? [{ '1': 1 }] : [];
    }

    const selectFactIdsAny =
      /^SELECT id FROM career_facts WHERE id = ANY\((\$\d+)\) AND profile_id = (\$\d+)$/.exec(text);
    if (selectFactIdsAny) {
      const ids = param(selectFactIdsAny[1]) as unknown as string[];
      const profileId = String(param(selectFactIdsAny[2]));
      const wanted = new Set(Array.isArray(ids) ? ids.map(String) : [String(ids)]);
      return Array.from(db.facts.values())
        .filter((f) => wanted.has(f.id) && f.profileId === profileId)
        .map((f) => ({ id: f.id }));
    }

    const selectFactsAny =
      /^SELECT id, verification_state, updated_at, superseded_by FROM career_facts WHERE id = ANY\((\$\d+)\)( AND profile_id = (\$\d+))?$/.exec(
        text
      );
    if (selectFactsAny) {
      const ids = param(selectFactsAny[1]) as unknown as string[];
      const scopeProfile = selectFactsAny[3] ? String(param(selectFactsAny[3])) : null;
      const wanted = new Set(Array.isArray(ids) ? ids.map(String) : [String(ids)]);
      return Array.from(db.facts.values())
        .filter((f) => wanted.has(f.id) && (!scopeProfile || f.profileId === scopeProfile))
        .map((f) => ({
          id: f.id,
          verification_state: f.verificationState,
          updated_at: f.updatedAt,
          superseded_by: f.supersededBy,
        }));
    }

    const insertFact = /^INSERT INTO career_facts \((.+)\) VALUES \((.+)\)$/.exec(text);
    if (insertFact) {
      const placeholders = insertFact[2].split(',');
      const record = Object.fromEntries(
        insertFact[1].split(',').map((c, i) => [c.trim(), param(placeholders[i])])
      );
      const id = String(record.id);
      db.facts.set(id, {
        id,
        profileId: String(record.profile_id),
        category: String(record.category),
        subject: String(record.subject),
        claim: String(record.claim),
        structured: record.structured ? JSON.parse(String(record.structured)) : undefined,
        verificationState: String(record.verification_state),
        origin: String(record.origin),
        supersededBy: record.superseded_by ? String(record.superseded_by) : null,
        createdAt: String(record.created_at),
        updatedAt: String(record.updated_at),
      });
      return [];
    }

    const updateFact =
      /^UPDATE career_facts SET (.+) WHERE id = (\$\d+)( AND profile_id = (\$\d+))?$/.exec(text);
    if (updateFact) {
      const id = String(param(updateFact[2]));
      const scopeProfile = updateFact[4] ? String(param(updateFact[4])) : null;
      const f = db.facts.get(id);
      if (f && (!scopeProfile || f.profileId === scopeProfile)) {
        for (const assign of updateFact[1].split(',')) {
          const [col, valRef] = assign.split('=').map((s) => s.trim());
          const val = param(valRef);
          if (col === 'category') f.category = String(val);
          if (col === 'subject') f.subject = String(val);
          if (col === 'claim') f.claim = String(val);
          if (col === 'structured') f.structured = val ? JSON.parse(String(val)) : undefined;
          if (col === 'verification_state') f.verificationState = String(val);
          if (col === 'origin') f.origin = String(val);
          if (col === 'superseded_by') f.supersededBy = val ? String(val) : null;
          if (col === 'updated_at') f.updatedAt = String(val);
        }
      }
      return [];
    }

    // --- Career Evidence Table ------------------------------------------------
    const selectEvidenceByProfile =
      /^SELECT (.+) FROM career_evidence WHERE profile_id = (\$\d+)$/.exec(text);
    if (selectEvidenceByProfile) {
      const profileId = String(param(selectEvidenceByProfile[2]));
      const matches = Array.from(db.evidence.values()).filter((e) => e.profileId === profileId);
      return matches.map((e) => ({
        id: e.id,
        profile_id: e.profileId,
        source_type: e.sourceType,
        source_ref: e.sourceRef,
        excerpt: e.excerpt,
        url: e.url,
        captured_at: e.capturedAt,
      }));
    }

    const selectEvidenceById =
      /^SELECT source_type, source_ref, excerpt, url FROM career_evidence WHERE id = (\$\d+)$/.exec(
        text
      );
    if (selectEvidenceById) {
      const id = String(param(selectEvidenceById[1]));
      const e = db.evidence.get(id);
      if (!e) return [];
      return [
        {
          source_type: e.sourceType,
          source_ref: e.sourceRef,
          excerpt: e.excerpt,
          url: e.url,
        },
      ];
    }

    const selectEvidenceScope =
      /^SELECT 1 FROM career_evidence WHERE id = (\$\d+) AND profile_id = (\$\d+)$/.exec(text);
    if (selectEvidenceScope) {
      const id = String(param(selectEvidenceScope[1]));
      const profileId = String(param(selectEvidenceScope[2]));
      const e = db.evidence.get(id);
      return e && e.profileId === profileId ? [{ '1': 1 }] : [];
    }

    const selectEvidenceIdsAny =
      /^SELECT id FROM career_evidence WHERE id = ANY\((\$\d+)\) AND profile_id = (\$\d+)$/.exec(
        text
      );
    if (selectEvidenceIdsAny) {
      const ids = param(selectEvidenceIdsAny[1]) as unknown as string[];
      const profileId = String(param(selectEvidenceIdsAny[2]));
      const wanted = new Set(Array.isArray(ids) ? ids.map(String) : [String(ids)]);
      return Array.from(db.evidence.values())
        .filter((e) => wanted.has(e.id) && e.profileId === profileId)
        .map((e) => ({ id: e.id }));
    }

    const selectEvidenceAny =
      /^SELECT id, source_type, source_ref, excerpt, url, captured_at FROM career_evidence WHERE id = ANY\((\$\d+)\)( AND profile_id = (\$\d+))?$/.exec(
        text
      );
    if (selectEvidenceAny) {
      const ids = param(selectEvidenceAny[1]) as unknown as string[];
      const scopeProfile = selectEvidenceAny[3] ? String(param(selectEvidenceAny[3])) : null;
      const wanted = new Set(Array.isArray(ids) ? ids.map(String) : [String(ids)]);
      return Array.from(db.evidence.values())
        .filter((e) => wanted.has(e.id) && (!scopeProfile || e.profileId === scopeProfile))
        .map((e) => ({
          id: e.id,
          profile_id: e.profileId,
          source_type: e.sourceType,
          source_ref: e.sourceRef,
          excerpt: e.excerpt,
          url: e.url,
          captured_at: e.capturedAt,
        }));
    }

    const insertEvidence = /^INSERT INTO career_evidence \((.+)\) VALUES \((.+)\)$/.exec(text);
    if (insertEvidence) {
      const placeholders = insertEvidence[2].split(',');
      const record = Object.fromEntries(
        insertEvidence[1].split(',').map((c, i) => [c.trim(), param(placeholders[i])])
      );
      const id = String(record.id);
      db.evidence.set(id, {
        id,
        profileId: String(record.profile_id),
        sourceType: String(record.source_type),
        sourceRef: record.source_ref ? String(record.source_ref) : null,
        excerpt: record.excerpt ? String(record.excerpt) : null,
        url: record.url ? String(record.url) : null,
        capturedAt: String(record.captured_at),
      });
      return [];
    }

    // --- Fact Evidence Links Table --------------------------------------------
    const selectLinksForProfile =
      /^SELECT fact_id, evidence_id, relation FROM fact_evidence_links WHERE fact_id IN \(SELECT id FROM career_facts WHERE profile_id = (\$\d+)\)$/.exec(
        text
      );
    if (selectLinksForProfile) {
      const profileId = String(param(selectLinksForProfile[1]));
      const factIds = new Set(
        Array.from(db.facts.values())
          .filter((f) => f.profileId === profileId)
          .map((f) => f.id)
      );
      const matches = Array.from(db.links.values()).filter((l) => factIds.has(l.factId));
      return matches.map((l) => ({
        fact_id: l.factId,
        evidence_id: l.evidenceId,
        relation: l.relation,
      }));
    }

    const selectLink =
      /^SELECT 1 FROM fact_evidence_links WHERE fact_id = (\$\d+) AND evidence_id = (\$\d+)$/.exec(
        text
      );
    if (selectLink) {
      const factId = String(param(selectLink[1]));
      const evidenceId = String(param(selectLink[2]));
      const key = `${factId}::${evidenceId}`;
      return db.links.has(key) ? [{ '1': 1 }] : [];
    }

    const selectLinksAny =
      /^SELECT fact_id, evidence_id FROM fact_evidence_links WHERE fact_id = ANY\((\$\d+)\)( AND EXISTS \(SELECT 1 FROM career_facts WHERE career_facts\.id = fact_evidence_links\.fact_id AND career_facts\.profile_id = (\$\d+)\))?$/.exec(
        text
      );
    if (selectLinksAny) {
      const ids = param(selectLinksAny[1]) as unknown as string[];
      const scopeProfile = selectLinksAny[3] ? String(param(selectLinksAny[3])) : null;
      const wanted = new Set(Array.isArray(ids) ? ids.map(String) : [String(ids)]);
      return Array.from(db.links.values())
        .filter((l) => {
          if (!wanted.has(l.factId)) return false;
          if (!scopeProfile) return true;
          const f = db.facts.get(l.factId);
          return f?.profileId === scopeProfile;
        })
        .map((l) => ({ fact_id: l.factId, evidence_id: l.evidenceId }));
    }

    const insertLink = /^INSERT INTO fact_evidence_links \((.+)\) VALUES \((.+)\)$/.exec(text);
    if (insertLink) {
      const placeholders = insertLink[2].split(',');
      const record = Object.fromEntries(
        insertLink[1].split(',').map((c, i) => [c.trim(), param(placeholders[i])])
      );
      const key = `${record.fact_id}::${record.evidence_id}`;
      db.links.set(key, {
        factId: String(record.fact_id),
        evidenceId: String(record.evidence_id),
        relation: String(record.relation),
      });
      return [];
    }

    // --- Career Notes Table ---------------------------------------------------
    const selectNotesForProfile =
      /^SELECT id, fact_id, scope, text, created_at, updated_at FROM career_notes WHERE fact_id IN \(SELECT id FROM career_facts WHERE profile_id = (\$\d+)\)$/.exec(
        text
      );
    if (selectNotesForProfile) {
      const profileId = String(param(selectNotesForProfile[1]));
      const factIds = new Set(
        Array.from(db.facts.values())
          .filter((f) => f.profileId === profileId)
          .map((f) => f.id)
      );
      const matches = Array.from(db.notes.values()).filter((n) => factIds.has(n.factId));
      return matches.map((n) => ({
        id: n.id,
        fact_id: n.factId,
        scope: n.scope,
        text: n.text,
        created_at: n.createdAt,
        updated_at: n.updatedAt,
      }));
    }

    const selectNoteById = /^SELECT updated_at FROM career_notes WHERE id = (\$\d+)$/.exec(text);
    if (selectNoteById) {
      const id = String(param(selectNoteById[1]));
      const n = db.notes.get(id);
      if (!n) return [];
      return [{ updated_at: n.updatedAt }];
    }

    const selectNotesAny =
      /^SELECT (?:career_notes\.id, career_notes\.updated_at|id, updated_at) FROM career_notes (?:JOIN career_facts ON career_facts\.id = career_notes\.fact_id )?WHERE (?:career_notes\.id|id) = ANY\((\$\d+)\)( AND career_facts\.profile_id = (\$\d+))?$/.exec(
        text
      );
    if (selectNotesAny) {
      const ids = param(selectNotesAny[1]) as unknown as string[];
      const scopeProfile = selectNotesAny[3] ? String(param(selectNotesAny[3])) : null;
      const wanted = new Set(Array.isArray(ids) ? ids.map(String) : [String(ids)]);
      return Array.from(db.notes.values())
        .filter((n) => {
          if (!wanted.has(n.id)) return false;
          if (!scopeProfile) return true;
          const f = db.facts.get(n.factId);
          return f?.profileId === scopeProfile;
        })
        .map((n) => ({ id: n.id, updated_at: n.updatedAt }));
    }

    const insertNote = /^INSERT INTO career_notes \((.+)\) VALUES \((.+)\)$/.exec(text);
    if (insertNote) {
      const placeholders = insertNote[2].split(',');
      const record = Object.fromEntries(
        insertNote[1].split(',').map((c, i) => [c.trim(), param(placeholders[i])])
      );
      const id = String(record.id);
      db.notes.set(id, {
        id,
        factId: String(record.fact_id),
        scope: String(record.scope),
        text: String(record.text),
        createdAt: String(record.created_at),
        updatedAt: String(record.updated_at),
      });
      return [];
    }

    const updateNote =
      /^UPDATE career_notes SET text = (\$\d+), updated_at = (\$\d+) WHERE id = (\$\d+)( AND EXISTS \(SELECT 1 FROM career_facts WHERE career_facts\.id = (\$\d+) AND career_facts\.profile_id = (\$\d+)\))?$/.exec(
        text
      );
    if (updateNote) {
      const textVal = String(param(updateNote[1]));
      const updatedAt = String(param(updateNote[2]));
      const id = String(param(updateNote[3]));
      const n = db.notes.get(id);
      if (n) {
        // Scoped update: no-op when the note's fact belongs to another profile.
        let allowed = true;
        if (updateNote[4]) {
          const scopeFactId = String(param(updateNote[5]));
          const scopeProfile = String(param(updateNote[6]));
          const f = db.facts.get(n.factId);
          allowed = n.factId === scopeFactId && f?.profileId === scopeProfile;
        }
        if (allowed) {
          n.text = textVal;
          n.updatedAt = updatedAt;
        }
      }
      return [];
    }

    throw new Error(`fake neon: unsupported query: ${text}`);
  };

  // Support sql.transaction([...]) used by push_career_knowledge for atomic
  // writes. Tagged-template queries already executed eagerly against the
  // in-memory DB when built, so transaction just settles them together.
  (fakeSql as unknown as Record<string, unknown>).transaction = async (queries: unknown[]) =>
    Promise.all(queries);
  (fakeSql as unknown as Record<string, unknown>).query = async (text: string) =>
    fakeSql({ raw: [text] } as unknown as TemplateStringsArray);

  return { db, fakeSql };
});

vi.mock('@neondatabase/serverless', async (importOriginal) => {
  const actual = await importOriginal<typeof NeonModule>();
  return {
    ...actual,
    neon: (connectionString: string) => {
      actual.neon(connectionString);
      return fakeSql;
    },
  };
});

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void>;

class FakeResponse {
  statusCode: number | undefined;
  headers: Record<string, string> = {};
  body: unknown;
  ended = false;

  setHeader(name: string, value: string): this {
    this.headers[name.toLowerCase()] = value;
    return this;
  }

  status(code: number): this {
    this.statusCode = code;
    return this;
  }

  json(body: unknown): this {
    this.body = body;
    this.ended = true;
    return this;
  }

  end(): this {
    this.ended = true;
    return this;
  }
}

interface FakeRequestInit {
  method?: string;
  query?: Record<string, string | string[]>;
  headers?: Record<string, string>;
  body?: unknown;
  ip?: string;
}

async function send(
  handler: Handler,
  { method = 'GET', query = {}, headers = {}, body, ip = '203.0.113.10' }: FakeRequestInit = {}
): Promise<FakeResponse> {
  const req = { method, query, body, headers: { 'x-forwarded-for': ip, ...headers } };
  const res = new FakeResponse();
  await handler(req as unknown as VercelRequest, res as unknown as VercelResponse);
  return res;
}

const ORIGIN = 'https://app.example.test';
const TEST_ENV = {
  DATABASE_URL: 'postgresql://user:secret@db.example.invalid/neondb',
  ALLOWED_ORIGIN: ORIGIN,
  RATE_LIMIT: '1000',
  MAX_SYNC_PAYLOAD_BYTES: undefined,
  MIN_SYNC_PASSWORD_LENGTH: undefined,
};
type TestEnv = Partial<Record<keyof typeof TEST_ENV, string | undefined>>;

async function loadHandler(overrides: TestEnv = {}): Promise<Handler> {
  for (const [name, value] of Object.entries({ ...TEST_ENV, ...overrides })) {
    vi.stubEnv(name, value);
  }
  vi.resetModules();
  return (await import('./sync')).default;
}

const SYNC_ID = 'AbCdEfGh12345678';
const PASSWORD = 'correct-horse-battery';
const BACKUP = { compressed: 'N4IgLgpgtgFgcgVwEYQDQgCYEsDmCA2EAvkA' };

const get = (handler: Handler, id: string | string[] = SYNC_ID, ip?: string) =>
  send(handler, { query: { id }, ip });

const post = (handler: Handler, body: unknown, id: string | null = SYNC_ID) =>
  send(handler, { method: 'POST', headers: id === null ? {} : { 'x-sync-id': id }, body });

async function seedBackup(handler: Handler): Promise<void> {
  expect((await post(handler, { password: PASSWORD, data: BACKUP })).statusCode).toBe(201);
}

beforeEach(() => {
  db.rows.clear();
  db.profiles.clear();
  db.facts.clear();
  db.evidence.clear();
  db.links.clear();
  db.notes.clear();
  db.failWith = undefined;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('CORS and routing', () => {
  it('answers an OPTIONS preflight with 200, the configured origin and no body', async () => {
    const handler = await loadHandler();
    const res = await send(handler, { method: 'OPTIONS' });

    expect(res.statusCode).toBe(200);
    expect(res.ended).toBe(true);
    expect(res.body).toBeUndefined();
    expect(res.headers['access-control-allow-origin']).toBe(ORIGIN);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
    const methods = (res.headers['access-control-allow-methods'] ?? '').split(',');
    expect(methods.map((m) => m.trim())).toEqual(
      expect.arrayContaining(['GET', 'POST', 'OPTIONS'])
    );
    const allowed = (res.headers['access-control-allow-headers'] ?? '').split(',');
    expect(allowed.map((h) => h.trim().toLowerCase())).toEqual(
      expect.arrayContaining(['content-type', 'x-sync-id'])
    );
  });

  it('answers 503 with CORS headers instead of crashing when DATABASE_URL is unset', async () => {
    const handler = await loadHandler({ DATABASE_URL: undefined });
    const res = await get(handler);

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ error: 'Sync service unavailable' });
    expect(res.headers['access-control-allow-origin']).toBe(ORIGIN);
  });

  it('rejects unsupported methods with 405', async () => {
    const handler = await loadHandler();
    const res = await send(handler, { method: 'DELETE', query: { id: SYNC_ID } });

    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ error: 'Method not allowed' });
    expect(res.headers.allow).toBe('GET, OPTIONS, POST');
  });
});

describe('GET (download)', () => {
  it('requires an id', async () => {
    const handler = await loadHandler();
    const res = await send(handler);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Missing ID' });
  });

  it.each([
    ['too short (< 3 chars)', 'ab'],
    ['illegal characters with spaces', 'AbCd EfGh 1234'],
    ['illegal symbols', 'AbCd#EfGh$1234%'],
    ['a repeated query param', [SYNC_ID, SYNC_ID]],
  ])('rejects an invalid account ID format (%s) as 400', async (_label, id) => {
    const handler = await loadHandler();
    const res = await get(handler, id);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid ID format' });
  });

  it.each([
    ['email address', 'user.name+test@example.com'],
    ['standard username', 'developer_john-doe'],
    ['legacy 16-char code', 'AbCdEfGh12345678'],
  ])('accepts valid account ID format (%s)', async (_label, id) => {
    const handler = await loadHandler();
    const res = await get(handler, id);
    // Should pass ID format validation and return 404 (not found in empty db) instead of 400 (Invalid ID format)
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: 'Backup not found' });
  });

  it('returns 404 for an unknown id', async () => {
    const handler = await loadHandler();
    const res = await get(handler);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: 'Backup not found' });
  });

  it('returns only the stored backup to anyone holding the id (no password, no hash)', async () => {
    const handler = await loadHandler();
    await seedBackup(handler);
    const res = await get(handler);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ data: BACKUP });
  });

  it('hides database errors behind a generic 500', async () => {
    const handler = await loadHandler();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    db.failWith = new Error('connect ECONNREFUSED postgresql://user:secret@db.example.invalid');
    const res = await get(handler);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Database error' });
  });
});

describe('POST (upload)', () => {
  it.each([
    ['no id', null, { password: PASSWORD, data: BACKUP }],
    ['no body', SYNC_ID, undefined],
    ['no password', SYNC_ID, { data: BACKUP }],
    ['no data', SYNC_ID, { password: PASSWORD }],
    ['null data', SYNC_ID, { password: PASSWORD, data: null }],
  ])('rejects a request with %s as 400', async (_label, id, body) => {
    const handler = await loadHandler();
    const res = await post(handler, body, id);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Missing required fields' });
  });

  it('rejects a malformed id with 400', async () => {
    const handler = await loadHandler();
    const res = await post(handler, { password: PASSWORD, data: BACKUP }, 'not-a-valid-id!');

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid ID format' });
  });

  it('enforces the 8-character password minimum the client also enforces', async () => {
    const handler = await loadHandler();

    const short = await post(handler, { password: '1234567', data: BACKUP });
    expect(short.statusCode).toBe(400);
    expect(short.body).toEqual({ error: 'Password must be at least 8 characters' });
    expect((await post(handler, { password: 12345678, data: BACKUP })).statusCode).toBe(400);
    expect((await post(handler, { password: '12345678', data: BACKUP })).statusCode).toBe(201);
  });

  it('honours MIN_SYNC_PASSWORD_LENGTH', async () => {
    const handler = await loadHandler({ MIN_SYNC_PASSWORD_LENGTH: '12' });

    const short = await post(handler, { password: '12345678901', data: BACKUP });
    expect(short.statusCode).toBe(400);
    expect(short.body).toEqual({ error: 'Password must be at least 12 characters' });
    expect((await post(handler, { password: '123456789012', data: BACKUP })).statusCode).toBe(201);
  });

  it.each([
    ['a bare string', 'not-a-backup'],
    ['an empty compressed wrapper', { compressed: '' }],
    ['an object without backup collections', { notes: [] }],
  ])('rejects %s as an invalid backup payload', async (_label, data) => {
    const handler = await loadHandler();
    const res = await post(handler, { password: PASSWORD, data });

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid backup payload shape' });
  });

  it('accepts a legacy uncompressed backup', async () => {
    const handler = await loadHandler();
    const legacy = { resumes: [{ id: 1, title: 'CV' }] };

    expect((await post(handler, { password: PASSWORD, data: legacy })).statusCode).toBe(201);
    expect((await get(handler)).body).toEqual({ data: legacy });
  });

  it('caps the payload at MAX_SYNC_PAYLOAD_BYTES UTF-8 bytes, inclusive', async () => {
    const limit = 4096;
    const handler = await loadHandler({ MAX_SYNC_PAYLOAD_BYTES: String(limit) });
    const overhead = Buffer.byteLength(JSON.stringify({ resumes: [''] }));
    const upload = (text: string) =>
      post(handler, { password: PASSWORD, data: { resumes: [text] } });

    const overByOne = await upload('a'.repeat(limit - overhead + 1));
    expect(overByOne.statusCode).toBe(413);
    expect(overByOne.body).toEqual({ error: 'Backup too large (max 4 KiB)' });
    expect((await upload('\u00e9'.repeat(limit - overhead))).statusCode).toBe(413);
    expect((await get(handler)).statusCode).toBe(404);

    expect((await upload('a'.repeat(limit - overhead))).statusCode).toBe(201);
  });

  it('creates a new backup (201) storing only a bcrypt hash of the password', async () => {
    const handler = await loadHandler();
    const res = await post(handler, { password: PASSWORD, data: BACKUP });

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ success: true, message: 'Created successfully' });
    const storedHash = db.rows.get(SYNC_ID)?.passwordHash ?? '';
    expect(storedHash).toMatch(/^\$2[aby]\$/);
    expect(storedHash).not.toContain(PASSWORD);
    expect(await bcrypt.compare(PASSWORD, storedHash)).toBe(true);
    expect((await get(handler)).body).toEqual({ data: BACKUP });
  });

  it('updates an existing backup (200) when the password matches', async () => {
    const handler = await loadHandler();
    await seedBackup(handler);
    const next = { compressed: 'updated-payload' };
    const res = await post(handler, { password: PASSWORD, data: next });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, message: 'Updated successfully' });
    expect((await get(handler)).body).toEqual({ data: next });
  });

  it('rejects a wrong password with 401 without leaking or overwriting the backup', async () => {
    const handler = await loadHandler();
    await seedBackup(handler);
    const res = await post(handler, { password: 'wrong-password-123', data: { compressed: 'x' } });

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid password' });
    expect((await get(handler)).body).toEqual({ data: BACKUP });
  });

  it('logs database failures without the password, payload or sync id', async () => {
    const handler = await loadHandler();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    db.failWith = new Error('connection terminated unexpectedly');
    const res = await post(handler, { password: PASSWORD, data: { compressed: 'SECRET-PAYLOAD' } });

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Database error' });
    const logged = JSON.stringify(consoleError.mock.calls);
    expect(logged).toContain('connection terminated unexpectedly');
    expect(logged).not.toContain(PASSWORD);
    expect(logged).not.toContain('SECRET-PAYLOAD');
    expect(logged).not.toContain(SYNC_ID);
  });
});

describe('Career Knowledge remote synchronization (Phase 7)', () => {
  const PROFILE_ID = 'prof-1111-2222-3333';
  const FACT_1 = {
    id: 'fact-1',
    profileId: PROFILE_ID,
    category: 'skill',
    subject: 'TypeScript',
    claim: 'Advanced TypeScript developer with 5 years experience',
    structured: { level: 'advanced', years: 5 },
    verificationState: 'confirmed',
    origin: 'user',
    supersededBy: undefined as string | undefined,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
  };
  const FACT_2 = {
    id: 'fact-2',
    profileId: PROFILE_ID,
    category: 'skill',
    subject: 'TypeScript Architecture',
    claim: 'Expert TypeScript Architect',
    structured: { level: 'expert' },
    verificationState: 'needs_confirmation',
    origin: 'ai_inference',
    supersededBy: undefined as string | undefined,
    createdAt: '2026-10-01T11:00:00.000Z',
    updatedAt: '2026-10-01T11:00:00.000Z',
  };
  const EVIDENCE_1 = {
    id: 'ev-1',
    profileId: PROFILE_ID,
    sourceType: 'github',
    sourceRef: 'repo/hr-with-ai',
    excerpt: 'Commit authored in TypeScript',
    url: 'https://github.com/example/repo',
    capturedAt: '2026-10-01T10:05:00.000Z',
  };
  const LINK_1 = {
    factId: 'fact-1',
    evidenceId: 'ev-1',
    relation: 'supports',
  };
  const NOTE_1 = {
    id: 'note-1',
    factId: 'fact-1',
    scope: 'global',
    text: 'Core skill demonstrated in multiple client projects',
    createdAt: '2026-10-01T10:10:00.000Z',
    updatedAt: '2026-10-01T10:10:00.000Z',
  };

  const SAMPLE_CAREER_PAYLOAD = {
    profile: {
      id: PROFILE_ID,
      schemaVersion: 1,
      createdAt: '2026-10-01T09:00:00.000Z',
      updatedAt: '2026-10-01T10:00:00.000Z',
    },
    facts: [FACT_1],
    evidence: [EVIDENCE_1],
    links: [LINK_1],
    notes: [NOTE_1],
  };

  it('persists and round-trips all 5 Career Knowledge entity types', async () => {
    const handler = await loadHandler();

    // 1. Push Career Knowledge to cloud
    const pushRes = await post(handler, {
      action: 'push_career_knowledge',
      password: PASSWORD,
      profileId: PROFILE_ID,
      data: SAMPLE_CAREER_PAYLOAD,
    });
    expect(pushRes.statusCode).toBe(200);
    expect(pushRes.body).toMatchObject({ success: true, profileId: PROFILE_ID });

    // 2. Pull Career Knowledge via POST
    const pullRes = await post(handler, {
      action: 'pull_career_knowledge',
      password: PASSWORD,
      profileId: PROFILE_ID,
    });
    expect(pullRes.statusCode).toBe(200);
    const pulled = (pullRes.body as { data: typeof SAMPLE_CAREER_PAYLOAD }).data;
    expect(pulled.profile.id).toBe(PROFILE_ID);
    expect(pulled.facts).toHaveLength(1);
    expect(pulled.facts[0]).toMatchObject(FACT_1);
    expect(pulled.evidence).toHaveLength(1);
    expect(pulled.evidence[0]).toMatchObject(EVIDENCE_1);
    expect(pulled.links).toHaveLength(1);
    expect(pulled.links[0]).toMatchObject(LINK_1);
    expect(pulled.notes).toHaveLength(1);
    expect(pulled.notes[0]).toMatchObject(NOTE_1);

    // 3. Pull Career Knowledge via GET
    const getRes = await send(handler, {
      method: 'GET',
      query: { id: SYNC_ID, resource: 'career_knowledge', profileId: PROFILE_ID },
    });
    expect(getRes.statusCode).toBe(200);
    const getPulled = (getRes.body as { data: typeof SAMPLE_CAREER_PAYLOAD }).data;
    expect(getPulled.profile.id).toBe(PROFILE_ID);
    expect(getPulled.facts[0].id).toBe('fact-1');
  });

  it('enforces profile isolation across different accounts', async () => {
    const handler = await loadHandler();
    const USER_A_SYNC_ID = 'UserASyncId12345';
    const USER_B_SYNC_ID = 'UserBSyncId12345';
    const USER_A_PASSWORD = 'password-user-a';
    const USER_B_PASSWORD = 'password-user-b';

    // User A creates and pushes Profile A
    const pushA = await post(
      handler,
      {
        action: 'push_career_knowledge',
        password: USER_A_PASSWORD,
        profileId: PROFILE_ID,
        data: SAMPLE_CAREER_PAYLOAD,
      },
      USER_A_SYNC_ID
    );
    expect(pushA.statusCode).toBe(200);

    // User B attempts to read User A's profile -> 404 Not Found
    const pullB = await post(
      handler,
      {
        action: 'pull_career_knowledge',
        password: USER_B_PASSWORD,
        profileId: PROFILE_ID,
      },
      USER_B_SYNC_ID
    );
    expect(pullB.statusCode).toBe(404);

    // User B attempts to overwrite User A's profile -> 403 Forbidden
    const hijackB = await post(
      handler,
      {
        action: 'push_career_knowledge',
        password: USER_B_PASSWORD,
        profileId: PROFILE_ID,
        data: SAMPLE_CAREER_PAYLOAD,
      },
      USER_B_SYNC_ID
    );
    expect(hijackB.statusCode).toBe(403);
    expect(hijackB.body).toEqual({ error: 'Forbidden: Profile belongs to another account' });

    // User B attempts to delete User A's profile -> 404 Not Found
    const deleteB = await post(
      handler,
      {
        action: 'delete_career_profile',
        password: USER_B_PASSWORD,
        profileId: PROFILE_ID,
      },
      USER_B_SYNC_ID
    );
    expect(deleteB.statusCode).toBe(404);
  });

  it('rejects push payload with mismatched profileId on child entities', async () => {
    const handler = await loadHandler();
    const invalidPayload = {
      ...SAMPLE_CAREER_PAYLOAD,
      facts: [{ ...FACT_1, profileId: 'another-profile-id' }],
    };

    const res = await post(handler, {
      action: 'push_career_knowledge',
      password: PASSWORD,
      profileId: PROFILE_ID,
      data: invalidPayload,
    });
    expect(res.statusCode).toBe(400);
    expect((res.body as { error: string }).error).toContain('does not match profileId');
  });

  it('preserves confirmed verification state against silent downgrade', async () => {
    const handler = await loadHandler();

    // 1. Push confirmed fact
    await post(handler, {
      action: 'push_career_knowledge',
      password: PASSWORD,
      profileId: PROFILE_ID,
      data: SAMPLE_CAREER_PAYLOAD,
    });

    // 2. Incoming sync payload tries to downgrade fact-1 to needs_confirmation
    const downgradeAttempt = {
      ...SAMPLE_CAREER_PAYLOAD,
      facts: [{ ...FACT_1, verificationState: 'needs_confirmation' }],
    };
    await post(handler, {
      action: 'push_career_knowledge',
      password: PASSWORD,
      profileId: PROFILE_ID,
      data: downgradeAttempt,
    });

    // 3. Verify fact remains confirmed on remote
    const pullRes = await post(handler, {
      action: 'pull_career_knowledge',
      password: PASSWORD,
      profileId: PROFILE_ID,
    });
    const pulled = (pullRes.body as { data: typeof SAMPLE_CAREER_PAYLOAD }).data;
    expect(pulled.facts[0].verificationState).toBe('confirmed');
  });

  it('preserves supersession relationships and history across sync', async () => {
    const handler = await loadHandler();

    const supersededFact1 = { ...FACT_1, supersededBy: 'fact-2' };
    const payloadWithSupersession = {
      ...SAMPLE_CAREER_PAYLOAD,
      facts: [supersededFact1, FACT_2],
    };

    await post(handler, {
      action: 'push_career_knowledge',
      password: PASSWORD,
      profileId: PROFILE_ID,
      data: payloadWithSupersession,
    });

    const pullRes = await post(handler, {
      action: 'pull_career_knowledge',
      password: PASSWORD,
      profileId: PROFILE_ID,
    });
    const pulled = (pullRes.body as { data: typeof SAMPLE_CAREER_PAYLOAD }).data;
    expect(pulled.facts).toHaveLength(2);
    const f1 = pulled.facts.find((f) => f.id === 'fact-1');
    const f2 = pulled.facts.find((f) => f.id === 'fact-2');
    expect(f1?.supersededBy).toBe('fact-2');
    expect(f2?.id).toBe('fact-2');
  });

  it('is idempotent across multiple repeated sync pushes', async () => {
    const handler = await loadHandler();

    // Push 3 times in succession
    for (let i = 0; i < 3; i++) {
      const res = await post(handler, {
        action: 'push_career_knowledge',
        password: PASSWORD,
        profileId: PROFILE_ID,
        data: SAMPLE_CAREER_PAYLOAD,
      });
      expect(res.statusCode).toBe(200);
    }

    const pullRes = await post(handler, {
      action: 'pull_career_knowledge',
      password: PASSWORD,
      profileId: PROFILE_ID,
    });
    const pulled = (pullRes.body as { data: typeof SAMPLE_CAREER_PAYLOAD }).data;
    expect(pulled.facts).toHaveLength(1);
    expect(pulled.evidence).toHaveLength(1);
    expect(pulled.links).toHaveLength(1);
    expect(pulled.notes).toHaveLength(1);
  });

  it('lists and deletes career profiles cleanly', async () => {
    const handler = await loadHandler();

    await post(handler, {
      action: 'push_career_knowledge',
      password: PASSWORD,
      profileId: PROFILE_ID,
      data: SAMPLE_CAREER_PAYLOAD,
    });

    // List profiles
    const listRes = await post(handler, {
      action: 'list_career_profiles',
      password: PASSWORD,
    });
    expect(listRes.statusCode).toBe(200);
    const profiles = (listRes.body as { profiles: Array<{ id: string }> }).profiles;
    expect(profiles).toHaveLength(1);
    expect(profiles[0].id).toBe(PROFILE_ID);

    // Delete profile
    const delRes = await post(handler, {
      action: 'delete_career_profile',
      password: PASSWORD,
      profileId: PROFILE_ID,
    });
    expect(delRes.statusCode).toBe(200);

    // Verify profile is deleted
    const pullAfterDel = await post(handler, {
      action: 'pull_career_knowledge',
      password: PASSWORD,
      profileId: PROFILE_ID,
    });
    expect(pullAfterDel.statusCode).toBe(404);
  });
});

describe('rate limiting', () => {
  it('answers 429 once an IP exceeds RATE_LIMIT requests within the 60 s window', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const handler = await loadHandler({ RATE_LIMIT: '3' });

    for (let i = 0; i < 3; i++) {
      expect((await get(handler, SYNC_ID, '198.51.100.7')).statusCode).toBe(404);
    }
    const limited = await get(handler, SYNC_ID, '198.51.100.7');
    expect(limited.statusCode).toBe(429);
    expect(limited.body).toEqual({ error: 'Rate limit exceeded. Please try again later.' });
    expect(limited.headers['retry-after']).toBe('60');
    expect(limited.headers['access-control-allow-origin']).toBe(ORIGIN);

    // Keyed by the first X-Forwarded-For hop, per IP.
    expect((await get(handler, SYNC_ID, '198.51.100.7, 10.0.0.1')).statusCode).toBe(429);
    expect((await get(handler, SYNC_ID, '198.51.100.8')).statusCode).toBe(404);
    expect((await send(handler, { method: 'OPTIONS', ip: '198.51.100.7' })).statusCode).toBe(200);

    vi.setSystemTime(new Date('2026-01-01T00:00:59.999Z'));
    expect((await get(handler, SYNC_ID, '198.51.100.7')).statusCode).toBe(429);
    vi.setSystemTime(new Date('2026-01-01T00:01:00.001Z'));
    expect((await get(handler, SYNC_ID, '198.51.100.7')).statusCode).toBe(404);
  });
});

describe('env limit parsing', () => {
  const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;
  const payloadOverhead = Buffer.byteLength(JSON.stringify({ resumes: [''] }));
  const uploadOfSize = (handler: Handler, bytes: number) =>
    post(handler, { password: PASSWORD, data: { resumes: ['a'.repeat(bytes - payloadOverhead)] } });

  const warn = () => vi.spyOn(console, 'warn').mockImplementation(() => undefined);

  it.each([
    ['a non-numeric value', 'abc'],
    ['a unit-suffixed value', '2MB'],
    ['a decimal', '4096.5'],
    ['zero', '0'],
    ['a negative value', '-1'],
  ])('falls back to the default payload cap when MAX_SYNC_PAYLOAD_BYTES is %s', async (_l, raw) => {
    const consoleWarn = warn();
    const handler = await loadHandler({ MAX_SYNC_PAYLOAD_BYTES: raw });

    expect((await uploadOfSize(handler, 4096)).statusCode).toBe(201);
    const overDefault = await uploadOfSize(handler, DEFAULT_MAX_BYTES + 1);
    expect(overDefault.statusCode).toBe(413);
    expect(overDefault.body).toEqual({ error: 'Backup too large (max 2048 KiB)' });
    expect(consoleWarn).toHaveBeenCalledTimes(1);
    expect(consoleWarn.mock.calls[0][0]).toContain('MAX_SYNC_PAYLOAD_BYTES');
  });

  it.each([
    ['a non-numeric value', 'abc'],
    ['zero', '0'],
    ['a negative value', '-16'],
  ])(
    'keeps the 8-character password minimum when MIN_SYNC_PASSWORD_LENGTH is %s',
    async (_l, raw) => {
      warn();
      const handler = await loadHandler({ MIN_SYNC_PASSWORD_LENGTH: raw });

      const short = await post(handler, { password: '1234567', data: BACKUP });
      expect(short.statusCode).toBe(400);
      expect(short.body).toEqual({ error: 'Password must be at least 8 characters' });
    }
  );

  it.each([
    ['a non-numeric value', 'abc'],
    ['zero', '0'],
    ['a negative value', '-5'],
  ])('keeps rate limiting active when RATE_LIMIT is %s', async (_l, raw) => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    warn();
    const handler = await loadHandler({ RATE_LIMIT: raw });

    for (let i = 0; i < 20; i++) {
      expect((await get(handler, SYNC_ID, '198.51.100.9')).statusCode).toBe(404);
    }
    expect((await get(handler, SYNC_ID, '198.51.100.9')).statusCode).toBe(429);
  });

  it('honours a valid positive integer', async () => {
    const consoleWarn = warn();
    const handler = await loadHandler({ RATE_LIMIT: '1', MIN_SYNC_PASSWORD_LENGTH: '12' });

    expect((await get(handler, SYNC_ID, '198.51.100.11')).statusCode).toBe(404);
    expect((await get(handler, SYNC_ID, '198.51.100.11')).statusCode).toBe(429);
    expect((await post(handler, { password: '12345678901', data: BACKUP })).body).toEqual({
      error: 'Password must be at least 12 characters',
    });
    expect(consoleWarn).not.toHaveBeenCalled();
  });
});

describe('Career Knowledge Production Sync Hardening & Operational Telemetry (Phase 8)', () => {
  const SYNC_ID = 'AbCdEfGhIjKlMnOp';
  const PASSWORD = 'correct-horse-battery';
  const PROFILE_ID = 'prof-prod-hardened-1';

  let handler: Handler;

  beforeEach(async () => {
    db.rows.clear();
    db.profiles.clear();
    db.facts.clear();
    db.evidence.clear();
    db.links.clear();
    db.notes.clear();
    db.failWith = undefined;
    handler = await loadHandler();
  });

  it('provides a health diagnostic endpoint returning schemaVersion and DB status', async () => {
    const res = await send(handler, {
      method: 'GET',
      query: { health: '1' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      status: 'healthy',
      database: 'connected',
      schemaVersion: 1,
    });
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('propagates caller x-request-id and exposes it in CORS headers', async () => {
    const customReqId = 'custom-request-id-12345';
    const res = await send(handler, {
      method: 'POST',
      headers: {
        'x-sync-id': SYNC_ID,
        'x-request-id': customReqId,
      },
      body: {
        action: 'push_career_knowledge',
        password: PASSWORD,
        profileId: PROFILE_ID,
        data: {
          profile: { id: PROFILE_ID, schemaVersion: 1 },
          facts: [],
          evidence: [],
          links: [],
          notes: [],
        },
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['x-request-id']).toBe(customReqId);
  });

  it('rejects unsupported future schema version with 422 SCHEMA_VERSION_MISMATCH', async () => {
    const res = await post(
      handler,
      {
        action: 'push_career_knowledge',
        password: PASSWORD,
        profileId: PROFILE_ID,
        data: {
          profile: { id: PROFILE_ID, schemaVersion: 2 }, // Future unsupported version
          facts: [],
          evidence: [],
          links: [],
          notes: [],
        },
      },
      SYNC_ID
    );

    expect(res.statusCode).toBe(422);
    expect(res.body).toMatchObject({
      code: 'SCHEMA_VERSION_MISMATCH',
      supportedVersion: 1,
      receivedVersion: 2,
    });
  });

  it('enforces evidence immutability: allows identical replay but returns 409 Conflict on content divergence', async () => {
    const evidenceId = 'ev-immutable-1';

    // Initial push with evidence
    const push1 = await post(
      handler,
      {
        action: 'push_career_knowledge',
        password: PASSWORD,
        profileId: PROFILE_ID,
        data: {
          profile: { id: PROFILE_ID, schemaVersion: 1 },
          evidence: [
            {
              id: evidenceId,
              profileId: PROFILE_ID,
              sourceType: 'github',
              sourceRef: 'repo/original',
              excerpt: 'original excerpt',
              capturedAt: '2026-10-01T10:00:00Z',
            },
          ],
        },
      },
      SYNC_ID
    );
    expect(push1.statusCode).toBe(200);

    // Identical replay -> 200 OK (idempotent)
    const push2 = await post(
      handler,
      {
        action: 'push_career_knowledge',
        password: PASSWORD,
        profileId: PROFILE_ID,
        data: {
          profile: { id: PROFILE_ID, schemaVersion: 1 },
          evidence: [
            {
              id: evidenceId,
              profileId: PROFILE_ID,
              sourceType: 'github',
              sourceRef: 'repo/original',
              excerpt: 'original excerpt',
              capturedAt: '2026-10-01T10:00:00Z',
            },
          ],
        },
      },
      SYNC_ID
    );
    expect(push2.statusCode).toBe(200);

    // Divergent evidence content -> 409 Conflict
    const push3 = await post(
      handler,
      {
        action: 'push_career_knowledge',
        password: PASSWORD,
        profileId: PROFILE_ID,
        data: {
          profile: { id: PROFILE_ID, schemaVersion: 1 },
          evidence: [
            {
              id: evidenceId,
              profileId: PROFILE_ID,
              sourceType: 'github',
              sourceRef: 'repo/tampered', // Divergent!
              excerpt: 'tampered excerpt',
              capturedAt: '2026-10-01T10:00:00Z',
            },
          ],
        },
      },
      SYNC_ID
    );
    expect(push3.statusCode).toBe(409);
    expect(push3.body).toMatchObject({
      code: 'EVIDENCE_IMMUTABILITY_VIOLATION',
      evidenceId,
    });
  });

  it('rejects links or notes referencing non-existent or unowned parent entities', async () => {
    // 1. Push link referencing unowned/non-existent fact
    const resLink = await post(
      handler,
      {
        action: 'push_career_knowledge',
        password: PASSWORD,
        profileId: PROFILE_ID,
        data: {
          profile: { id: PROFILE_ID, schemaVersion: 1 },
          facts: [],
          evidence: [
            {
              id: 'ev-1',
              profileId: PROFILE_ID,
              sourceType: 'github',
              capturedAt: '2026-10-01T10:00:00Z',
            },
          ],
          links: [
            {
              factId: 'non-existent-fact',
              evidenceId: 'ev-1',
              relation: 'supports',
            },
          ],
        },
      },
      SYNC_ID
    );
    expect(resLink.statusCode).toBe(400);
    expect(resLink.body).toMatchObject({
      error: expect.stringContaining('Link references foreign or non-existent factId'),
    });

    // 2. Push note referencing unowned/non-existent fact
    const resNote = await post(
      handler,
      {
        action: 'push_career_knowledge',
        password: PASSWORD,
        profileId: PROFILE_ID,
        data: {
          profile: { id: PROFILE_ID, schemaVersion: 1 },
          facts: [],
          notes: [
            {
              id: 'note-1',
              factId: 'non-existent-fact',
              text: 'Orphan note',
              createdAt: '2026-10-01T10:00:00Z',
              updatedAt: '2026-10-01T10:00:00Z',
            },
          ],
        },
      },
      SYNC_ID
    );
    expect(resNote.statusCode).toBe(400);
    expect(resNote.body).toMatchObject({
      error: expect.stringContaining('references foreign or non-existent factId'),
    });
  });

  it('emits structured operational telemetry without leaking secrets or credentials in logs', async () => {
    const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    await post(
      handler,
      {
        action: 'push_career_knowledge',
        password: PASSWORD,
        profileId: PROFILE_ID,
        data: {
          profile: { id: PROFILE_ID, schemaVersion: 1 },
          facts: [
            {
              id: 'fact-1',
              profileId: PROFILE_ID,
              category: 'skill',
              subject: 'Rust',
              claim: 'Rust developer',
              verificationState: 'needs_confirmation',
              origin: 'user',
              createdAt: '2026-10-01T10:00:00Z',
              updatedAt: '2026-10-01T10:00:00Z',
            },
          ],
          evidence: [],
          links: [],
          notes: [],
        },
      },
      SYNC_ID
    );

    expect(consoleInfoSpy).toHaveBeenCalled();
    const calls = consoleInfoSpy.mock.calls.map((c) => c[0]);
    const telemetryCall = calls.find(
      (c) => typeof c === 'string' && c.includes('operational_telemetry')
    );
    expect(telemetryCall).toBeDefined();

    const parsed = JSON.parse(telemetryCall as string);
    expect(parsed.tag).toBe('operational_telemetry');
    expect(parsed.action).toBe('push_career_knowledge');
    expect(parsed.statusCode).toBe(200);
    expect(parsed.accountId).toBe('AbCd***Op'); // Masked account ID
    expect(parsed.requestId).toBeDefined();

    // Verify secrets are NEVER in log output
    for (const callStr of calls) {
      expect(callStr).not.toContain(PASSWORD);
      expect(callStr).not.toContain('correct-horse-battery');
    }
  });

  it('audits verification state transitions when facts transition to confirmed or rejected', async () => {
    const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    // 1. Initial fact creation in needs_confirmation
    await post(
      handler,
      {
        action: 'push_career_knowledge',
        password: PASSWORD,
        profileId: PROFILE_ID,
        data: {
          profile: { id: PROFILE_ID, schemaVersion: 1 },
          facts: [
            {
              id: 'fact-audit-1',
              profileId: PROFILE_ID,
              category: 'skill',
              subject: 'TypeScript',
              claim: 'TS Guru',
              verificationState: 'needs_confirmation',
              origin: 'user',
              createdAt: '2026-10-01T10:00:00Z',
              updatedAt: '2026-10-01T10:00:00Z',
            },
          ],
        },
      },
      SYNC_ID
    );

    // 2. User confirms the fact
    await post(
      handler,
      {
        action: 'push_career_knowledge',
        password: PASSWORD,
        profileId: PROFILE_ID,
        data: {
          profile: { id: PROFILE_ID, schemaVersion: 1 },
          facts: [
            {
              id: 'fact-audit-1',
              profileId: PROFILE_ID,
              category: 'skill',
              subject: 'TypeScript',
              claim: 'TS Guru',
              verificationState: 'confirmed', // Transitioned
              origin: 'user',
              createdAt: '2026-10-01T10:00:00Z',
              updatedAt: '2026-10-01T10:05:00Z',
            },
          ],
        },
      },
      SYNC_ID
    );

    const auditCalls = consoleInfoSpy.mock.calls
      .map((c) => c[0])
      .filter((c) => typeof c === 'string' && c.includes('verification_audit'));

    expect(auditCalls.length).toBeGreaterThan(0);
    const auditParsed = JSON.parse(auditCalls[auditCalls.length - 1] as string);
    expect(auditParsed.tag).toBe('verification_audit');
    expect(auditParsed.factId).toBe('fact-audit-1');
    expect(auditParsed.fromState).toBe('needs_confirmation');
    expect(auditParsed.toState).toBe('confirmed');
    expect(auditParsed.actor).toBe('user');
  });
});
