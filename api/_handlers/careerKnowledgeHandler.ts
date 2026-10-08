// Career Knowledge relational sync handlers (Phase 8 Production Hardened)
import { VercelRequest, VercelResponse } from '@vercel/node';
import {
  SUPPORTED_SCHEMA_VERSION,
  MAX_PAYLOAD_BYTES,
  payloadByteSize,
  logOperationalEvent,
  logVerificationAudit,
  logServerError,
  toIsoString,
  toJsonbParam,
  auditActorForOrigin,
  type RawProfileRow,
  type RawFactRow,
  type RawEvidenceRow,
  type RawLinkRow,
  type RawNoteRow,
  type VerificationAuditActor,
} from './shared';

// Shared fetch + serialize for GET and PULL (identical query + mapping).
// Kept in one place so the two endpoints cannot drift.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchCareerKnowledgeBundle(sql: any, profileId: string, syncId: string) {
  const profileRows = await sql`
        SELECT id, schema_version, created_at, updated_at
        FROM career_profiles
        WHERE id = ${profileId} AND account_id = ${syncId}
      `;
  if (profileRows.length === 0) return null;
  const rawProfile = profileRows[0];
  const facts = await sql`
        SELECT id, profile_id, category, subject, claim, structured, verification_state, origin, superseded_by, created_at, updated_at
        FROM career_facts
        WHERE profile_id = ${profileId}
      `;
  const evidence = await sql`
        SELECT id, profile_id, source_type, source_ref, excerpt, url, captured_at
        FROM career_evidence
        WHERE profile_id = ${profileId}
      `;
  const links = await sql`
        SELECT fact_id, evidence_id, relation
        FROM fact_evidence_links
        WHERE fact_id IN (SELECT id FROM career_facts WHERE profile_id = ${profileId})
      `;
  const notes = await sql`
        SELECT id, fact_id, scope, text, created_at, updated_at
        FROM career_notes
        WHERE fact_id IN (SELECT id FROM career_facts WHERE profile_id = ${profileId})
      `;
  return {
    profile: {
      id: rawProfile.id,
      schemaVersion: Number(rawProfile.schema_version),
      createdAt: toIsoString(rawProfile.created_at),
      updatedAt: toIsoString(rawProfile.updated_at),
    },
    facts: (facts as unknown as RawFactRow[]).map((f) => ({
      id: f.id,
      profileId: f.profile_id,
      category: f.category,
      subject: f.subject,
      claim: f.claim,
      structured: f.structured ?? undefined,
      verificationState: f.verification_state,
      origin: f.origin,
      supersededBy: f.superseded_by ?? undefined,
      createdAt: toIsoString(f.created_at),
      updatedAt: toIsoString(f.updated_at),
    })),
    evidence: (evidence as unknown as RawEvidenceRow[]).map((e) => ({
      id: e.id,
      profileId: e.profile_id,
      sourceType: e.source_type,
      sourceRef: e.source_ref ?? undefined,
      excerpt: e.excerpt ?? undefined,
      url: e.url ?? undefined,
      capturedAt: toIsoString(e.captured_at),
    })),
    links: (links as unknown as RawLinkRow[]).map((l) => ({
      factId: l.fact_id,
      evidenceId: l.evidence_id,
      relation: l.relation,
    })),
    notes: (notes as unknown as RawNoteRow[]).map((n) => ({
      id: n.id,
      factId: n.fact_id,
      scope: n.scope,
      text: n.text,
      createdAt: toIsoString(n.created_at),
      updatedAt: toIsoString(n.updated_at),
    })),
    counts: {
      facts: facts.length,
      evidence: evidence.length,
      notes: notes.length,
      links: links.length,
    },
  };
}

export async function handleCareerKnowledgeGet(
  req: VercelRequest,
  res: VercelResponse,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sql: any,
  requestId: string,
  startTime: number,
  syncId: string
): Promise<void> {
  const profileId = req.query.profileId as string;
  if (!profileId || typeof profileId !== 'string') {
    res.status(400).json({ error: 'Missing profileId' });
    return;
  }

  try {
    const bundle = await fetchCareerKnowledgeBundle(sql, profileId, syncId);
    if (!bundle) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    logOperationalEvent({
      tag: 'operational_telemetry',
      requestId,
      accountId: syncId,
      profileId,
      action: 'get_career_knowledge',
      statusCode: 200,
      durationMs: Date.now() - startTime,
      entityCounts: bundle.counts,
    });

    res.status(200).json({
      success: true,
      profileId,
      data: {
        profile: bundle.profile,
        facts: bundle.facts,
        evidence: bundle.evidence,
        links: bundle.links,
        notes: bundle.notes,
      },
    });
    return;
  } catch (err) {
    logServerError('GET career_knowledge', err, requestId);
    res.status(500).json({ error: 'Database error' });
    return;
  }
}
export async function handleListCareerProfiles(
  _req: VercelRequest,
  res: VercelResponse,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sql: any,
  requestId: string,
  startTime: number,
  syncId: string
): Promise<void> {
  try {
    const profiles = (await sql`
          SELECT id, schema_version, created_at, updated_at
          FROM career_profiles
          WHERE account_id = ${syncId}
        `) as unknown as RawProfileRow[];

    logOperationalEvent({
      tag: 'operational_telemetry',
      requestId,
      accountId: syncId,
      action: 'list_career_profiles',
      statusCode: 200,
      durationMs: Date.now() - startTime,
    });

    res.status(200).json({
      success: true,
      profiles: profiles.map((p) => ({
        id: p.id,
        schemaVersion: Number(p.schema_version),
        createdAt: toIsoString(p.created_at),
        updatedAt: toIsoString(p.updated_at),
      })),
    });
    return;
  } catch (err) {
    logServerError('POST list_career_profiles', err, requestId);
    res.status(500).json({ error: 'Database error' });
    return;
  }
}

export async function handleDeleteCareerProfile(
  _req: VercelRequest,
  res: VercelResponse,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sql: any,
  requestId: string,
  startTime: number,
  syncId: string,
  profileId?: string
): Promise<void> {
  if (!profileId || typeof profileId !== 'string') {
    res.status(400).json({ error: 'Missing profileId' });
    return;
  }

  try {
    const profile = await sql`
          SELECT id FROM career_profiles WHERE id = ${profileId} AND account_id = ${syncId}
        `;
    if (profile.length === 0) {
      logOperationalEvent({
        tag: 'operational_telemetry',
        requestId,
        accountId: syncId,
        profileId,
        action: 'delete_career_profile',
        statusCode: 404,
        durationMs: Date.now() - startTime,
        errorClass: 'not_found',
      });
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    await sql`DELETE FROM career_profiles WHERE id = ${profileId} AND account_id = ${syncId}`;
    logOperationalEvent({
      tag: 'operational_telemetry',
      requestId,
      accountId: syncId,
      profileId,
      action: 'delete_career_profile',
      statusCode: 200,
      durationMs: Date.now() - startTime,
    });
    res.status(200).json({ success: true, message: 'Profile deleted successfully' });
    return;
  } catch (err) {
    logServerError('POST delete_career_profile', err, requestId);
    res.status(500).json({ error: 'Database error' });
    return;
  }
}

export async function handlePullCareerKnowledge(
  _req: VercelRequest,
  res: VercelResponse,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sql: any,
  requestId: string,
  startTime: number,
  syncId: string,
  profileId?: string
): Promise<void> {
  if (!profileId || typeof profileId !== 'string') {
    res.status(400).json({ error: 'Missing profileId' });
    return;
  }

  try {
    const bundle = await fetchCareerKnowledgeBundle(sql, profileId, syncId);
    if (!bundle) {
      logOperationalEvent({
        tag: 'operational_telemetry',
        requestId,
        accountId: syncId,
        profileId,
        action: 'pull_career_knowledge',
        statusCode: 404,
        durationMs: Date.now() - startTime,
        errorClass: 'not_found',
      });
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    logOperationalEvent({
      tag: 'operational_telemetry',
      requestId,
      accountId: syncId,
      profileId,
      action: 'pull_career_knowledge',
      statusCode: 200,
      durationMs: Date.now() - startTime,
      entityCounts: bundle.counts,
    });

    res.status(200).json({
      success: true,
      profileId,
      data: {
        profile: bundle.profile,
        facts: bundle.facts,
        evidence: bundle.evidence,
        links: bundle.links,
        notes: bundle.notes,
      },
    });
    return;
  } catch (err) {
    logServerError('POST pull_career_knowledge', err, requestId);
    res.status(500).json({ error: 'Database error' });
    return;
  }
}
export async function handlePushCareerKnowledge(
  _req: VercelRequest,
  res: VercelResponse,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sql: any,
  requestId: string,
  startTime: number,
  syncId: string,
  profileId?: string,
  payloadData?: unknown
): Promise<void> {
  if (
    !profileId ||
    typeof profileId !== 'string' ||
    !payloadData ||
    typeof payloadData !== 'object'
  ) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const { profile, facts, evidence, links, notes } = payloadData as {
    profile?: { id: string; schemaVersion?: number; createdAt?: string; updatedAt?: string };
    facts?: Array<{
      id: string;
      profileId: string;
      category: string;
      subject: string;
      claim: string;
      structured?: Record<string, unknown>;
      verificationState: string;
      origin: string;
      supersededBy?: string;
      createdAt: string;
      updatedAt: string;
    }>;
    evidence?: Array<{
      id: string;
      profileId: string;
      sourceType: string;
      sourceRef?: string;
      excerpt?: string;
      url?: string;
      capturedAt: string;
    }>;
    links?: Array<{ factId: string; evidenceId: string; relation: string }>;
    notes?: Array<{
      id: string;
      factId: string;
      scope?: string;
      text: string;
      createdAt: string;
      updatedAt: string;
    }>;
  };

  if (!profile || profile.id !== profileId) {
    res.status(400).json({ error: 'Invalid profile payload or profileId mismatch' });
    return;
  }

  if (facts !== undefined && !Array.isArray(facts)) {
    res.status(400).json({ error: 'Invalid facts payload: must be an array' });
    return;
  }

  if (evidence !== undefined && !Array.isArray(evidence)) {
    res.status(400).json({ error: 'Invalid evidence payload: must be an array' });
    return;
  }

  if (links !== undefined && !Array.isArray(links)) {
    res.status(400).json({ error: 'Invalid links payload: must be an array' });
    return;
  }

  if (notes !== undefined && !Array.isArray(notes)) {
    res.status(400).json({ error: 'Invalid notes payload: must be an array' });
    return;
  }

  // Schema version compatibility check
  const incomingSchemaVersion = profile.schemaVersion || 1;
  if (incomingSchemaVersion > SUPPORTED_SCHEMA_VERSION) {
    logOperationalEvent({
      tag: 'operational_telemetry',
      requestId,
      accountId: syncId,
      profileId,
      action: 'push_career_knowledge',
      statusCode: 422,
      durationMs: Date.now() - startTime,
      errorClass: 'schema_mismatch',
    });
    res.status(422).json({
      error: `Unsupported schema version ${incomingSchemaVersion} (supported version: ${SUPPORTED_SCHEMA_VERSION})`,
      code: 'SCHEMA_VERSION_MISMATCH',
      supportedVersion: SUPPORTED_SCHEMA_VERSION,
      receivedVersion: incomingSchemaVersion,
    });
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
    // 1. Profile Isolation Check: Verify profile ownership (read-only)
    const existingProfile = await sql`
          SELECT account_id FROM career_profiles WHERE id = ${profileId}
        `;

    if (existingProfile.length > 0 && existingProfile[0].account_id !== syncId) {
      logOperationalEvent({
        tag: 'operational_telemetry',
        requestId,
        accountId: syncId,
        profileId,
        action: 'push_career_knowledge',
        statusCode: 403,
        durationMs: Date.now() - startTime,
        errorClass: 'authorization_failure',
      });
      res.status(403).json({ error: 'Forbidden: Profile belongs to another account' });
      return;
    }

    // 2. Validate Profile Scope for Child Records (no writes yet)
    const payloadFactIds = new Set<string>();
    const payloadEvidenceIds = new Set<string>();

    if (facts) {
      for (const fact of facts) {
        if (!fact || typeof fact !== 'object' || typeof fact.id !== 'string' || typeof fact.profileId !== 'string') {
          res.status(400).json({ error: 'Invalid fact item in payload' });
          return;
        }
        if (fact.profileId !== profileId) {
          res
            .status(400)
            .json({ error: `Fact "${fact.id}" does not match profileId "${profileId}"` });
          return;
        }
        payloadFactIds.add(fact.id);
      }
    }

    if (evidence) {
      for (const ev of evidence) {
        if (!ev || typeof ev !== 'object' || typeof ev.id !== 'string' || typeof ev.profileId !== 'string') {
          res.status(400).json({ error: 'Invalid evidence item in payload' });
          return;
        }
        if (ev.profileId !== profileId) {
          res
            .status(400)
            .json({ error: `Evidence "${ev.id}" does not match profileId "${profileId}"` });
          return;
        }
        payloadEvidenceIds.add(ev.id);
      }
    }

    // Validate links and notes reference authorized facts/evidence.
    // Batched scope checks: one ANY() query per entity kind instead of
    // one SELECT per link/note (N+1 reads).
    if (links) {
      for (const link of links) {
        if (!link || typeof link !== 'object' || typeof link.factId !== 'string' || typeof link.evidenceId !== 'string') {
          res.status(400).json({ error: 'Invalid link item in payload' });
          return;
        }
      }
      const neededFactIds = [
        ...new Set(links.map((l) => l.factId).filter((id) => !payloadFactIds.has(id))),
      ];
      const neededEvIds = [
        ...new Set(links.map((l) => l.evidenceId).filter((id) => !payloadEvidenceIds.has(id))),
      ];
      const validFactIds = new Set<string>(payloadFactIds);
      const validEvIds = new Set<string>(payloadEvidenceIds);
      if (neededFactIds.length > 0) {
        const rows = (await sql`
              SELECT id FROM career_facts WHERE id = ANY(${neededFactIds}) AND profile_id = ${profileId}
            `) as unknown as Array<{ id: string }>;
        for (const r of rows) validFactIds.add(r.id);
      }
      if (neededEvIds.length > 0) {
        const rows = (await sql`
              SELECT id FROM career_evidence WHERE id = ANY(${neededEvIds}) AND profile_id = ${profileId}
            `) as unknown as Array<{ id: string }>;
        for (const r of rows) validEvIds.add(r.id);
      }
      for (const link of links) {
        if (!validFactIds.has(link.factId)) {
          res
            .status(400)
            .json({ error: `Link references foreign or non-existent factId "${link.factId}"` });
          return;
        }
        if (!validEvIds.has(link.evidenceId)) {
          res.status(400).json({
            error: `Link references foreign or non-existent evidenceId "${link.evidenceId}"`,
          });
          return;
        }
      }
    }

    if (notes) {
      for (const note of notes) {
        if (!note || typeof note !== 'object' || typeof note.id !== 'string' || typeof note.factId !== 'string') {
          res.status(400).json({ error: 'Invalid note item in payload' });
          return;
        }
      }
      const neededFactIds = [
        ...new Set(notes.map((n) => n.factId).filter((id) => !payloadFactIds.has(id))),
      ];
      const validFactIds = new Set<string>(payloadFactIds);
      if (neededFactIds.length > 0) {
        const rows = (await sql`
              SELECT id FROM career_facts WHERE id = ANY(${neededFactIds}) AND profile_id = ${profileId}
            `) as unknown as Array<{ id: string }>;
        for (const r of rows) validFactIds.add(r.id);
      }
      for (const note of notes) {
        if (!validFactIds.has(note.factId)) {
          res.status(400).json({
            error: `Note "${note.id}" references foreign or non-existent factId "${note.factId}"`,
          });
          return;
        }
      }
    }

    // 3. Pre-read existing rows (read phase — no writes yet, so a 409
    // leaves nothing partially committed). Each entity kind is fetched
    // with a single ANY() query instead of one SELECT per id (N+1 reads).
    const existingEvidenceMap = new Map<string, RawEvidenceRow>();
    if (evidence && evidence.length > 0) {
      const evIds = evidence.map((ev) => ev.id);
      const rows = (await sql`
            SELECT id, source_type, source_ref, excerpt, url, captured_at FROM career_evidence WHERE id = ANY(${evIds}) AND profile_id = ${profileId}
          `) as unknown as RawEvidenceRow[];
      for (const r of rows) existingEvidenceMap.set(r.id, r);
    }

    // Immutability pre-check before any write
    if (evidence) {
      for (const ev of evidence) {
        const dbEv = existingEvidenceMap.get(ev.id);
        if (dbEv) {
          const isMatch =
            dbEv.source_type === ev.sourceType &&
            (dbEv.source_ref || null) === (ev.sourceRef || null) &&
            (dbEv.excerpt || null) === (ev.excerpt || null) &&
            (dbEv.url || null) === (ev.url || null);
          if (!isMatch) {
            logOperationalEvent({
              tag: 'operational_telemetry',
              requestId,
              accountId: syncId,
              profileId,
              action: 'push_career_knowledge',
              statusCode: 409,
              durationMs: Date.now() - startTime,
              errorClass: 'immutable_evidence_conflict',
            });
            res.status(409).json({
              error: `Immutable evidence "${ev.id}" cannot be modified with divergent content`,
              code: 'EVIDENCE_IMMUTABILITY_VIOLATION',
              evidenceId: ev.id,
            });
            return;
          }
        }
      }
    }

    const existingFactMap = new Map<
      string,
      { verification_state: string; updated_at: string; superseded_by: string | null }
    >();
    if (facts && facts.length > 0) {
      const factIds = facts.map((fact) => fact.id);
      const rows = (await sql`
            SELECT id, verification_state, updated_at, superseded_by FROM career_facts WHERE id = ANY(${factIds}) AND profile_id = ${profileId}
          `) as unknown as Array<{
        id: string;
        verification_state: string;
        updated_at: string;
        superseded_by: string | null;
      }>;
      for (const r of rows) existingFactMap.set(r.id, r);
    }

    const existingLinkSet = new Set<string>();
    if (links && links.length > 0) {
      // Links are keyed by (fact_id, evidence_id); fetch all rows for the
      // payload's fact ids in one query and filter pairs client-side.
      const linkFactIds = [...new Set(links.map((link) => link.factId))];
      const rows = (await sql`
            SELECT fact_id, evidence_id FROM fact_evidence_links WHERE fact_id = ANY(${linkFactIds}) AND EXISTS (SELECT 1 FROM career_facts WHERE career_facts.id = fact_evidence_links.fact_id AND career_facts.profile_id = ${profileId})
          `) as unknown as Array<{ fact_id: string; evidence_id: string }>;
      for (const r of rows) existingLinkSet.add(`${r.fact_id}:${r.evidence_id}`);
    }

    const existingNoteMap = new Map<string, { updated_at: string }>();
    if (notes && notes.length > 0) {
      const noteIds = notes.map((note) => note.id);
      const rows = (await sql`
            SELECT career_notes.id, career_notes.updated_at FROM career_notes JOIN career_facts ON career_facts.id = career_notes.fact_id WHERE career_notes.id = ANY(${noteIds}) AND career_facts.profile_id = ${profileId}
          `) as unknown as Array<{ id: string; updated_at: string }>;
      for (const r of rows) existingNoteMap.set(r.id, r);
    }

    // 4. Build all writes + audit events, then commit atomically.
    // A mid-push failure must not leave profile + evidence committed
    // without facts (all-or-nothing).
    type VerificationAudit = {
      factId: string;
      fromState: string;
      toState: string;
      actor: VerificationAuditActor;
      origin: string;
    };
    const pendingAudits: VerificationAudit[] = [];
    const txQueries = [];

    if (existingProfile.length > 0) {
      txQueries.push(sql`
            UPDATE career_profiles
            SET updated_at = ${profile.updatedAt || new Date().toISOString()}
            WHERE id = ${profileId}
          `);
    } else {
      txQueries.push(sql`
            INSERT INTO career_profiles (id, account_id, schema_version, created_at, updated_at)
            VALUES (${profileId}, ${syncId}, ${profile.schemaVersion || 1}, ${profile.createdAt || new Date().toISOString()}, ${profile.updatedAt || new Date().toISOString()})
          `);
    }

    if (evidence) {
      for (const ev of evidence) {
        if (!existingEvidenceMap.has(ev.id)) {
          txQueries.push(sql`
                INSERT INTO career_evidence (id, profile_id, source_type, source_ref, excerpt, url, captured_at)
                VALUES (${ev.id}, ${profileId}, ${ev.sourceType}, ${ev.sourceRef || null}, ${ev.excerpt || null}, ${ev.url || null}, ${ev.capturedAt})
              `);
        }
      }
    }

    if (facts) {
      for (const fact of facts) {
        const existingFact = existingFactMap.get(fact.id);
        const structuredParam = toJsonbParam(fact.structured);

        if (!existingFact) {
          txQueries.push(sql`
                INSERT INTO career_facts (id, profile_id, category, subject, claim, structured, verification_state, origin, superseded_by, created_at, updated_at)
                VALUES (${fact.id}, ${profileId}, ${fact.category}, ${fact.subject}, ${fact.claim}, ${structuredParam}, ${fact.verificationState}, ${fact.origin}, ${fact.supersededBy || null}, ${fact.createdAt}, ${fact.updatedAt})
              `);
          if (fact.verificationState === 'confirmed') {
            pendingAudits.push({
              factId: fact.id,
              fromState: 'none',
              toState: 'confirmed',
              actor: auditActorForOrigin(fact.origin),
              origin: fact.origin,
            });
          }
        } else {
          let targetVerificationState = fact.verificationState;
          const currentRemoteState = existingFact.verification_state as string;

          // Invariant protection: a remotely-confirmed fact is never
          // silently downgraded by a stale client push, regardless of which
          // non-confirmed state was pushed (matches client merge invariants).
          if (currentRemoteState === 'confirmed' && fact.verificationState !== 'confirmed') {
            targetVerificationState = 'confirmed';
          } else if (currentRemoteState !== targetVerificationState) {
            pendingAudits.push({
              factId: fact.id,
              fromState: currentRemoteState,
              toState: targetVerificationState,
              actor: auditActorForOrigin(fact.origin),
              origin: fact.origin,
            });
          }

          txQueries.push(sql`
                UPDATE career_facts
                SET category = ${fact.category},
                    subject = ${fact.subject},
                    claim = ${fact.claim},
                    structured = ${structuredParam},
                    verification_state = ${targetVerificationState},
                    origin = ${fact.origin},
                    superseded_by = ${fact.supersededBy || null},
                    updated_at = ${fact.updatedAt}
                WHERE id = ${fact.id} AND profile_id = ${profileId}
              `);
        }
      }
    }

    if (links) {
      for (const link of links) {
        if (!existingLinkSet.has(`${link.factId}:${link.evidenceId}`)) {
          txQueries.push(sql`
                INSERT INTO fact_evidence_links (fact_id, evidence_id, relation)
                VALUES (${link.factId}, ${link.evidenceId}, ${link.relation})
              `);
        }
      }
    }

    if (notes) {
      for (const note of notes) {
        if (!existingNoteMap.has(note.id)) {
          txQueries.push(sql`
                INSERT INTO career_notes (id, fact_id, scope, text, created_at, updated_at)
                VALUES (${note.id}, ${note.factId}, ${note.scope || 'global'}, ${note.text}, ${note.createdAt}, ${note.updatedAt})
              `);
        } else {
          txQueries.push(sql`
                UPDATE career_notes
                SET text = ${note.text},
                    updated_at = ${note.updatedAt}
                WHERE id = ${note.id} AND EXISTS (SELECT 1 FROM career_facts WHERE career_facts.id = ${note.factId} AND career_facts.profile_id = ${profileId})
              `);
        }
      }
    }

    if (txQueries.length > 0) {
      await sql.transaction(txQueries as unknown as Parameters<typeof sql.transaction>[0]);
    }

    for (const audit of pendingAudits) {
      logVerificationAudit({ requestId, profileId, ...audit });
    }

    logOperationalEvent({
      tag: 'operational_telemetry',
      requestId,
      accountId: syncId,
      profileId,
      action: 'push_career_knowledge',
      statusCode: 200,
      durationMs: Date.now() - startTime,
      entityCounts: {
        facts: facts?.length || 0,
        evidence: evidence?.length || 0,
        notes: notes?.length || 0,
        links: links?.length || 0,
      },
    });

    res.status(200).json({
      success: true,
      profileId,
      syncedAt: new Date().toISOString(),
      message: 'Career knowledge synchronized successfully',
    });
    return;
  } catch (err) {
    logServerError('POST push_career_knowledge', err, requestId);
    res.status(500).json({ error: 'Database error' });
    return;
  }
}
