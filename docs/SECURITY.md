# Security notes — hr-with-ai

**Last updated:** 2026-07-09 (Phase 4)

## 1. Dependency advisories (accepted / deferred)

| Package                   | Severity | Status          | Notes                                                                                  |
| ------------------------- | -------- | --------------- | -------------------------------------------------------------------------------------- |
| `tldraw@2.x` → `nanoid@4` | **high** | **Deferred**    | Requires major tldraw upgrade (Phase 5). Whiteboard only; not network-facing server.   |
| `smol-toml` (transitive)  | moderate | **Deferred**    | Transitive via toolchain; not used for untrusted user TOML input.                      |
| High/critical             | —        | **0 remaining** | Cleared in Phase 0 via vite pin + overrides (`undici`, `path-to-regexp`, `minimatch`). |

**Policy:** Block PRs that introduce new **high/critical** vulns (`npm audit --audit-level=high`). Moderate issues tracked here until the owning package is upgraded.

## 2. Secrets handling

| Kind                 | Where                                         | Rule                                   |
| -------------------- | --------------------------------------------- | -------------------------------------- |
| AI provider API keys | User device only (IndexedDB + `localStorage`) | Never put secrets in `VITE_*` env vars |
| Client config        | `VITE_API_URL` only                           | Non-secret base URL                    |
| Cloud sync DB        | Server `DATABASE_URL`                         | Vercel / serverless only               |
| CORS / rate limit    | `ALLOWED_ORIGIN`, `RATE_LIMIT`                | Server env                             |

Backup export **strips** `apiKey`, GitHub tokens, and voice-provider keys unless the user explicitly opts in (“Include API Key & Sensitive Data”).

**Import is the mirror of export.** Imported settings (backup JSON, cloud restore) are treated as **untrusted input** and are stripped of secrets *and* endpoint overrides: `apiKey`, `githubToken`, `googleCloudApiKey`, `elevenLabsApiKey`, `deepgramApiKey`, and `baseUrl`. An imported `baseUrl` could otherwise redirect the user's real API key, resume text, and interview transcripts to an attacker-controlled host, so an import can never set one — the locally configured `custom_base_url` always wins, and imported AI provider profiles keep their local `baseUrl` (newly imported profiles are keyless and disabled).

## 3. Cloud sync threat model (`api/sync.ts`)

| Threat                     | Mitigation                                                 |
| -------------------------- | ---------------------------------------------------------- |
| Guessable backup IDs       | 16-char alphanumeric IDs from `crypto.getRandomValues`     |
| Unauthorized overwrite     | bcrypt password hash required on POST update               |
| Abuse / DoS                | Per-IP rate limit (in-memory; multi-instance caveat below) |
| Oversized payload          | Max body size enforced server-side                         |
| Weak passwords             | Min password length enforced                               |
| Data exfiltration via logs | Errors logged without request body/password                |
| CORS abuse                 | Single `ALLOWED_ORIGIN` (no wildcard in production)        |

### Access model (exact)

Cloud sync uses a **bearer-capability** model, not authentication:

- **`syncId` is the only secret for reading.** `GET /api/sync? id=<syncId>` returns the
  full dataset with **no password check**. Anyone who obtains the 16-character ID can
  download and decrypt-free read every resume, job, and interview transcript.
- **`syncId` + password is required for writing.** `POST` verifies the bcrypt hash of
  the password before overwriting, so knowing the ID alone cannot modify a backup.
- The ID is generated with `crypto.getRandomValues` (62-char alphabet, 16 bytes) and is
  only as private as wherever the user stores or shares it (clipboard, password manager,
  manual copy). **There is no ID rotation and no revocation path.**
- Rate limiting is keyed by IP only, in a per-instance in-memory `Map`. It provides no
  protection against distributed guessing of IDs and no global protection at scale.

### What is and is not protected

| | Protected |
| --- | --- |
| **API keys, tokens, custom `baseUrl`** | Yes — stripped client-side before upload (`exportData`) and again on import (`stripImportProtectedFields`, `mergeImportedProfiles`). |
| **Resume text, job descriptions, interview transcripts, code, whiteboard images** | **No.** Stored as LZ-String-compressed JSONB. Compression is not encryption; anyone with database read access can decompress and read it. |

Backups are stored as JSONB — treat the database as sensitive.

## 4. Local data (Dexie)

- Database name: `VietPhongDB`
- Schema versions: **2 → 14** (see `docs/adr/002-dexie-migrations.md`)
- Resume `parsedData` is compressed at rest in IndexedDB (`compressedData`)

## 5. Reporting

For security issues in this project, open a private report to the maintainers (do not file public issues with exploit details).
