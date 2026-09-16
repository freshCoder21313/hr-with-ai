# Technology Stack

**Analysis Date:** 2026-09-16

## Languages

**Primary:**
- TypeScript 5.9 - Core application logic, components, and service implementation.

**Secondary:**
- CSS (Tailwind v4) - Component styling and layout.
- Markdown - Documentation and AI prompt templates.

## Runtime

**Environment:**
- Node.js (Development/Build)
- Browser (Web Runtime)
- WebView (Capacitor/Android Runtime)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present.

## Frameworks

**Core:**
- React 18.3.1 - UI library for building the web interface.
- Vite 6.4.3 - Build tool and development server.
- React Router v7 - Application routing (using `HashRouter` for mobile compatibility).

**Testing:**
- Vitest 4.1.0 - Unit and integration testing runner.
- Playwright 1.61.1 - End-to-end testing framework.
- React Testing Library 16.3.2 - Component testing utilities.

**Build/Dev:**
- Capacitor 8.2.0 - Native mobile wrapper for Android deployment.
- ESLint 8.57.1 - Static code analysis and linting.
- Prettier 3.8.1 - Code formatting.

## Key Dependencies

**Critical:**
- Zustand 5.0.12 - Lightweight global state management.
- Dexie.js 4.3.0 - IndexedDB wrapper for local data persistence.
- Radix UI - Accessible headless UI primitives (Dialog, Select, etc.).
- Tailwind CSS v4 - Utility-first styling with PostCSS integration.

**Infrastructure:**
- Axios 1.13.6 - Promise-based HTTP client for API requests.
- Zod 4.4.3 - TypeScript-first schema validation for AI outputs and settings.
- PDF.js 5.5.207 - PDF document parsing for resume analysis.

## Configuration

**Environment:**
- `.env` files for build-time configuration.
- Client-side variables prefixed with `VITE_` (e.g., `VITE_API_URL`).
- Server-side variables like `DATABASE_URL` for Vercel functions.

**Build:**
- `vite.config.ts` - Main build configuration with manual chunking for optimization.
- `tsconfig.json` - TypeScript compiler configuration.
- `postcss.config.js` - PostCSS configuration for Tailwind.

## Platform Requirements

**Development:**
- Node.js environment with npm.
- Android Studio (for Capacitor/Android builds).

**Production:**
- Vercel (Web/API hosting).
- Android devices (Capacitor application).

---

*Stack analysis: 2026-09-16*
