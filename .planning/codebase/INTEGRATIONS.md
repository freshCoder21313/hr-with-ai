# External Integrations

**Analysis Date:** 2026-09-16

## APIs & External Services

**AI Providers:**
- **Google Gemini** - Primary AI provider for resume parsing and mock interviews.
  - SDK/Client: `@google/genai`
  - Auth: API Key stored in `UserSettings` (Dexie) or via `VITE_GEMINI_API_KEY`.
- **Anthropic** - Optional AI provider.
  - Implementation: `src/services/ai/strategies/anthropic.ts`
- **OpenRouter** - Aggregator for multiple LLM models.
  - Implementation: `src/services/ai/strategies/openrouter.ts`
- **OpenAI Compatible** - Generic support for OpenAI-like API endpoints.
  - Implementation: `src/services/ai/strategies/openai-custom.ts`

**Sync & Backup:**
- **Vercel Functions** - Serverless backend for cloud sync operations.
  - Implementation: `api/sync.ts`
  - Auth: `x-sync-id` header and bcrypt-hashed password.

## Data Storage

**Databases:**
- **IndexedDB (Local)** - Primary storage for user data, resumes, and interviews.
  - Connection: Browser-native
  - Client: `Dexie.js` (`src/lib/db.ts`)
- **Neon PostgreSQL (Cloud)** - Backend storage for encrypted backups.
  - Connection: `DATABASE_URL` (Server-side)
  - Client: `@neondatabase/serverless`

**File Storage:**
- **Local filesystem (Mobile)** - Capacitor-based storage for temporary assets.
- **In-Database Blobs** - PDF data and resume text stored directly in IndexedDB.

**Caching:**
- **In-Memory Store** - Zustand for active session state.
- **LZ-String Compression** - Used to compress large resume datasets before storing in Dexie (`src/lib/resumeCompression.ts`).

## Authentication & Identity

**Auth Provider:**
- **Custom Sync ID** - Simple possession-based authentication for cloud backups.
  - Implementation: `api/sync.ts` using `bcryptjs` for password verification.
- **GitHub Auth (Optional)** - Integrated in `UserSettings` for potential GitHub API features.

## Monitoring & Observability

**Error Tracking:**
- **Custom Logger** - `src/lib/logger.ts` for structured application logging.

**Logs:**
- Browser console (monitored via `src/lib/logger.ts`).
- Serverless logs in Vercel for `api/sync.ts`.

## CI/CD & Deployment

**Hosting:**
- **Vercel** - Web application and serverless API hosting.
- **Android APK/Bundle** - Built via Capacitor and Android Studio.

**CI Pipeline:**
- **GitHub Actions** (implied) - For running lint, typecheck, and Vitest.

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` - Neon PostgreSQL connection string (Server).
- `ALLOWED_ORIGIN` - CORS configuration for sync API.
- `VITE_API_URL` - Endpoint for sync operations.

**Secrets location:**
- Vercel Environment Variables.
- `.env` files (local development).
- `UserSettings` in IndexedDB (User-provided API keys).

## Webhooks & Callbacks

**Incoming:**
- None detected.

**Outgoing:**
- AI Generation requests to Google, Anthropic, OpenRouter, and OpenAI compatible endpoints.
- Sync requests to the Vercel-hosted Neon backend.

---

*Integration audit: 2026-09-16*
