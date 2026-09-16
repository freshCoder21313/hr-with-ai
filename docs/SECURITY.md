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

**Known limitations:**

1. **In-memory rate limit** is per serverless instance — not global. Prefer Vercel/Redis rate limiting for production scale.
2. **Download (GET) is unauthenticated** by design (ID secrecy). Anyone with the ID can restore; password only protects _overwrite_.
3. Backups are stored as JSONB; treat the database as sensitive.

## 4. Local data (Dexie)

- Database name: `VietPhongDB`
- Schema versions: **2 → 13** (see `docs/adr/002-dexie-migrations.md`)
- Resume `parsedData` is compressed at rest in IndexedDB (`compressedData`)

## 5. Reporting

For security issues in this project, open a private report to the maintainers (do not file public issues with exploit details).
