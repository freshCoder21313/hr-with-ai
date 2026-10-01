<div align="center">

<img width="1200" height="475" alt="HR-With-AI Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# 🤖 HR-With-AI
### *Next-Generation Autonomous AI Interview Coach & Career Intelligence Studio*

[![React 18](https://img.shields.io/badge/React-18.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Google Gemini GenAI](https://img.shields.io/badge/Google_Gemini-1.45.0-8E75C2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://ai.google.dev/)
[![Capacitor Android](https://img.shields.io/badge/Capacitor-8.2_Android-119EFF?style=for-the-badge&logo=capacitor&logoColor=white)](https://capacitorjs.com/)
[![Tldraw Canvas](https://img.shields.io/badge/Tldraw-2.4-FF6B6B?style=for-the-badge)](https://tldraw.dev/)
[![Dexie LocalFirst](https://img.shields.io/badge/Dexie.js-IndexedDB-3F51B5?style=for-the-badge)](https://dexie.org/)
[![Neon Database](https://img.shields.io/badge/Neon-Serverless_Postgres-00E599?style=for-the-badge&logo=postgresql&logoColor=black)](https://neon.tech/)
[![Vitest](https://img.shields.io/badge/Vitest-4.1-FCC72B?style=for-the-badge&logo=vitest&logoColor=black)](https://vitest.dev/)
[![Playwright](https://img.shields.io/badge/Playwright-1.61_E2E-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)](https://playwright.dev/)
[![License MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

<p align="center">
  <strong>Master technical, behavioral, and system design interviews with lifelike multimodal AI personas, interactive Monaco coding, Tldraw architectural whiteboarding, real-time voice conversations, and AI CV builder.</strong>
</p>

</div>

---

## 📑 Table of Contents

- [Executive Summary & Problem Statement](#-executive-summary--problem-statement)
- [System Architecture](#-system-architecture)
- [Key Features & Capabilities](#-key-features--capabilities)
- [Tech Stack Breakdown](#-tech-stack-breakdown)
- [Project Directory Structure](#-project-directory-structure)
- [Getting Started & Quickstart](#-getting-started--quickstart)
  - [Prerequisites](#prerequisites)
  - [Environment Configuration](#environment-configuration)
  - [Installation & Local Run](#installation--local-run)
  - [Mobile Development (Android Native)](#-mobile-development-android-native)
  - [Available Scripts](#available-scripts)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [Roadmap & Future Enhancements](#-roadmap--future-enhancements)
- [Contributing](#-contributing)
- [License & Author](#-license--author)

---

## 🎯 Executive Summary & Problem Statement

Technical job interviews are rigorous, high-stakes evaluations covering algorithmic coding, distributed system design, situational communication, and domain depth. Traditional prep platforms offer static question banks or expensive human mock interviews, lacking real-time conversational feedback and multi-modal problem solving.

**HR-With-AI** provides an immersive, end-to-end simulation environment that mimics real FAANG and enterprise interview loops. Leveraging **Google Gemini Multimodal AI**, HR-With-AI conducts interactive mock sessions where candidates can speak via Web Speech voice recognition, code in a live Monaco editor, sketch distributed architectures on a collaborative Tldraw whiteboard, and receive instant structured rubrics, radar charts, and knowledge graph citations. Additionally, a built-in CV Studio analyzes resumes against target JDs and imports verified GitHub repositories into structured CV portfolios.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph Client_App["HR-With-AI Client Application (React 18 + TypeScript + Vite)"]
        subgraph Feature_Modules["Core Feature Domains"]
            InterviewRoom["Interview Room\n(Chat, Monaco Code, Tldraw Whiteboard)"]
            CVStudio["CV Studio & Resume Builder\n(PDF Parser & GitHub Sync)"]
            Dashboard["Candidate Analytics Dashboard\n(Recharts & Radar Metrics)"]
            SkillAssess["Skill Assessment & Quiz Engine"]
        end

        subgraph Core_Services["Client Services & State"]
            ZustandStores["Zustand Store Ecosystem\n(Interview, Settings, CV, Theme)"]
            VoiceEngine["Web Speech API\n(STT Voice Input / TTS Audio)"]
            LocalDB["Dexie.js IndexedDB\n(Local-First Offline Storage)"]
            AIService["AI Service & Structured Output\n(Prompt Chains & Zod Schema Validation)"]
        end
    end

    subgraph External_AI["AI & Foundation Models"]
        GeminiSDK["@google/genai SDK\n(Gemini 2.0 Flash / Pro)"]
        VisionEngine["Multimodal Whiteboard\n(Tldraw SVG/PNG Image Critique)"]
    end

    subgraph Backend_Cloud["Serverless Sync & Database (Optional)"]
        SyncAPI["Vercel Serverless Function\n(/api/sync.ts with LZ-String + Bcrypt)"]
        NeonDB[("Neon Serverless PostgreSQL\n(Encrypted Cloud Backups)")]
    end

    subgraph Native_Mobile["Cross-Platform Native Runtime"]
        Capacitor["Capacitor 8 Android Bridge\n(Filesystem, Share, Native Webview)"]
    end

    InterviewRoom --> ZustandStores
    CVStudio --> ZustandStores
    Dashboard --> ZustandStores
    SkillAssess --> ZustandStores

    ZustandStores <--> LocalDB
    ZustandStores --> AIService
    InterviewRoom <--> VoiceEngine

    AIService --> GeminiSDK
    InterviewRoom -.->|Export Canvas Snapshot| VisionEngine
    VisionEngine --> GeminiSDK

    LocalDB <-->|Compressed Cloud Sync| SyncAPI
    SyncAPI <--> NeonDB

    Client_App --> Capacitor
```

### Multimodal Pipeline
1. **Context Ingestion**: Job Descriptions (JD) and resumes (PDF/TXT parsed via `pdfjs-dist`) are extracted into candidate context models.
2. **Adaptive Session Engine**: AI personas (Strict Tech Lead, Friendly HR, System Architect) drive dynamic interview dialogue.
3. **Multimodal Interaction**:
   - **Voice**: Bi-directional Speech-to-Text and Text-to-Speech in English (US) and Vietnamese.
   - **Live Code**: Syntax-highlighted code execution and debugging discussions.
   - **System Design**: Tldraw diagrams are serialized and visually critiqued by Gemini's multimodal vision capabilities.
4. **Structured Rubric Evaluation**: Post-interview evaluations generate scoring across technical depth, problem-solving, communication, and visual progress charts via Recharts and Mermaid.js.
5. **Local-First & Cloud Sync**: Data persists locally in Dexie IndexedDB with optional end-to-end encrypted sync to Neon PostgreSQL.

---

## ⚡ Key Features & Capabilities

### 🏢 Smart JD Analysis & Persona Configuration
- **AI Auto-Extraction**: Instantly parses pasted Job Descriptions to extract company name, role seniority, key tech stacks, and generate targeted interview questions.
- **Dynamic Interviewer Personas**: Choose from diverse personas (e.g., *Analytical Architect*, *Collaborative Senior Peer*, *Strict Hiring Manager*).

### 🎙️ Multi-Modal Interview Room
- **Real-Time Voice Dialogue**: Seamless voice input and output utilizing the Web Speech API with custom audio visualizations.
- **Interactive Monaco Code Workspace**: Collaborative coding surface supporting multiple languages, syntax highlighting, and inline problem discussion.
- **Tldraw Architectural Whiteboard**: Full system design canvas where candidates draw topologies and the AI analyzes component layouts.
- **Instant Knowledge Graph Links**: Technical terms mentioned in conversation turn into clickable study references.

### 📊 In-Depth Scorecards & Visual Feedback
- **Quantified Scoring**: Multi-dimensional rubrics scoring candidates on Problem Solving, Architecture, Code Quality, and Communication.
- **Visual Progress Charts**: Recharts metric graphs and Mermaid.js sequence and flow diagrams detailing areas of improvement.
- **Targeted Action Plans**: Curated study guides and documentation links based on weak points detected during the session.

### 📝 CV Studio & Portfolio Engine
- **Single Source of Truth**: Manage master resumes with instant ATS formatting.
- **AI Chat CV Editor**: Natural language resume editing (*"Strengthen my AWS bullets"*, *"Highlight microservices experience"*).
- **GitHub Repository Importer**: Connects to the GitHub API to summarize repositories into impactful portfolio project bullets.
- **Export Ready**: Instant client-side PDF compilation using `jspdf` and `html-to-image`.

### 📱 Android Native App Support
- Out-of-the-box native compilation via **Capacitor 8**, featuring native filesystem integration and share sheets.

---

## 🛠️ Tech Stack Breakdown

### Frontend Application
- **Core Framework**: [React 18.3.1](https://react.dev/)
- **Language**: [TypeScript 5.9.3](https://www.typescriptlang.org/)
- **Build System**: [Vite 6.4.3](https://vitejs.dev/) with `@vitejs/plugin-react`
- **Routing**: [React Router v7.13.1](https://reactrouter.com/)
- **State Management**: [Zustand 5.0.12](https://zustand-demo.pmnd.rs/) with localStorage & IndexedDB hydration

### UI & Styling
- **CSS Framework**: [Tailwind CSS v4.2.1](https://tailwindcss.com/) & `@tailwindcss/postcss`
- **Component Primitives**: [Radix UI](https://www.radix-ui.com/) (Dialog, DropdownMenu, Tooltip, Select, Progress, Slider, Switch, Slot)
- **Icons**: [Lucide React 0.577.0](https://lucide.dev/)
- **Notifications**: [Sonner 2.0.7](https://sonner.emilkowal.ski/)
- **Product Tours**: [React Joyride 2.9.3](https://react-joyride.com/)
- **Visuals & Charts**: [Recharts 3.8.0](https://recharts.org/), [Mermaid 11.13.0](https://mermaid.js.org/)

### Specialized Canvas & Editors
- **System Design Canvas**: [Tldraw 2.4.6](https://tldraw.dev/)
- **Code Editing**: [@monaco-editor/react 4.7.0](https://github.com/suren-atoyan/monaco-react) & [react-syntax-highlighter](https://github.com/react-syntax-highlighter/react-syntax-highlighter)

### AI, Data & Backend
- **Generative AI SDK**: [@google/genai 1.45.0](https://www.npmjs.com/package/@google/genai)
- **Schema Validation**: [Zod 4.4.3](https://zod.dev/)
- **Local Database**: [Dexie.js 4.3.0](https://dexie.org/) (IndexedDB wrapper)
- **Cloud Database**: [@neondatabase/serverless 1.0.2](https://neon.tech/) (PostgreSQL)
- **Compression & Crypto**: `lz-string 1.5.0`, `bcryptjs 3.0.3`
- **Document Processing**: `pdfjs-dist 5.5.207`, `jspdf 4.2.1`, `html-to-image 1.11.13`
- **Native Runtime**: [@capacitor/core 8.2.0](https://capacitorjs.com/), `@capacitor/android 8.2.0`

### Testing & Verification
- **Unit & Integration**: [Vitest 4.1.0](https://vitest.dev/) with jsdom & v8 coverage
- **End-to-End Testing**: [Playwright 1.61.1](https://playwright.dev/)
- **Component Testing**: [@testing-library/react 16.3.2](https://testing-library.com/)

---

## 📁 Project Directory Structure

```
hr-with-ai/
├── api/                            # Vercel serverless functions
│   └── sync.ts                     # Encrypted Neon DB cloud backup endpoint
├── android/                        # Capacitor native Android project
├── e2e/                            # Playwright end-to-end test suites
├── public/                         # Static assets, fonts, icons
├── scripts/                        # Database migration & dev utilities
├── src/
│   ├── components/                 # Shared UI primitives and layouts
│   │   ├── layout/                 # Navigation bars, sidebars, headers
│   │   ├── providers/              # Theme and context providers
│   │   ├── shared/                 # Common modals (API Key, confirm dialogs)
│   │   └── ui/                     # Radix UI + Tailwind styled atomic elements
│   ├── events/                     # Global event emitters (API keys, settings)
│   ├── features/                   # Domain-driven feature modules
│   │   ├── cv-studio/              # Master CV editor, AI prompts & GitHub import
│   │   ├── dashboard/              # Analytics, past session summaries, charts
│   │   ├── history/                # Interview archives and feedback reports
│   │   ├── interview/              # Live room, Monaco code editor, Tldraw whiteboard
│   │   ├── landing/                # Hero landing page & quick actions
│   │   ├── resume-analysis/        # PDF resume parsing & JD matching
│   │   ├── resume-builder/         # Structured form resume generator
│   │   ├── settings/               # User preferences & cloud sync manager
│   │   └── skill-assessment/       # Interactive quiz & knowledge drills
│   ├── hooks/                      # Custom hooks (useTheme, useDebounce, etc.)
│   ├── lib/                        # Core utilities, Dexie DB, AI structured output
│   │   ├── db.ts                   # Local IndexedDB tables and schemas
│   │   ├── aiStructuredOutput.ts   # Zod schema-to-AI response mapper
│   │   ├── github.ts               # GitHub REST API client
│   │   ├── resumeCompression.ts    # LZ-String backup compression
│   │   └── logger.ts               # Structured logging utility
│   ├── services/                   # AI, Voice, Interview, and Job services
│   │   ├── ai/                     # Gemini SDK client initialization
│   │   ├── interview/              # Session state orchestrator
│   │   ├── prompts/                # Specialized system prompt templates
│   │   ├── resume/                 # PDF extraction & parsing engines
│   │   └── voice/                  # Web Speech API wrapper (STT & TTS)
│   ├── types/                      # TypeScript schemas (Interview, AI, Resume, Job)
│   ├── App.tsx                     # Main layout & router orchestration
│   ├── index.tsx                   # React root entry point
│   └── index.css                   # Tailwind CSS root imports & custom tokens
├── capacitor.config.ts             # Capacitor mobile runtime configuration
├── playwright.config.ts            # Playwright E2E configuration
├── tailwind.config.js              # Tailwind CSS design system config
├── tsconfig.json                   # TypeScript configuration
├── vercel.json                     # Vercel deployment & API rewrite rules
└── vite.config.ts                  # Vite bundler & Vitest configuration
```

---

## 🚀 Getting Started & Quickstart

### Prerequisites
- **Node.js**: `v18.0.0` or higher (v20+ recommended)
- **Google Gemini API Key**: Obtain a key from [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Android Studio** *(Optional, for Android mobile builds)*

### Environment Configuration

Copy the sample environment file:

```bash
cp .env.example .env.local
```

Configure optional server-side sync variables in `.env.local`:

```env
# Client API base (defaults to /api)
# VITE_API_URL=/api

# Server / Neon PostgreSQL Cloud Sync (Optional)
DATABASE_URL=postgresql://username:password@host/neondb?sslmode=require
ALLOWED_ORIGIN=https://your-domain.vercel.app
RATE_LIMIT=20
```

> 🔒 **Security Notice:** AI provider keys (Google Gemini, etc.) are entered directly inside the application under **Settings > API Key** and stored locally in browser storage. Never commit secret keys to `VITE_*` variables.

### Installation & Local Run

```bash
# 1. Clone the repository
git clone https://github.com/aistudio/hr-with-ai.git
cd hr-with-ai

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Open your browser and navigate to `http://localhost:3000`.

---

## 📱 Mobile Development (Android Native)

HR-With-AI is configured with **Capacitor 8** for native Android deployment:

### One-Step Build & Sync:
```bash
npm run android
```

This automated command will:
1. Compile the web bundle (`npm run build`).
2. Synchronize assets to the native Android directory (`npx cap sync`).
3. Launch the Android project inside **Android Studio** (`npx cap open android`).

From Android Studio, you can test directly on connected physical devices or emulators, and export signed release APKs / AABs.

---

## 📋 Available Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `npm run dev` | Starts the Vite dev server with Hot Module Replacement (HMR) |
| `build` | `npm run build` | Compiles TypeScript and builds optimized production bundles |
| `preview` | `npm run preview` | Previews the production build locally |
| `test` | `npm run test` | Runs unit and component test suites via Vitest |
| `test:coverage` | `npm run test:coverage` | Executes tests with V8 code coverage report |
| `test:e2e` | `npm run test:e2e` | Runs Playwright end-to-end browser tests |
| `typecheck` | `npm run typecheck` | Executes TypeScript compiler checks without emitting files |
| `android` | `npm run android` | Builds web app, syncs Capacitor, and opens Android Studio |
| `lint` | `npm run lint` | Runs ESLint analysis across the repository |
| `format` | `npm run format` | Enforces code formatting via Prettier |

---

## 🧪 Testing & Quality Assurance

HR-With-AI incorporates multi-tiered automated testing:

```bash
# Execute unit & integration tests
npm run test:coverage

# Execute end-to-end tests across headless browsers
npm run test:e2e
```

### Testing Capabilities:
- **Unit Tests (`Vitest`)**: Validates AI structured output schemas, Dexie DB queries, resume compression algorithms, and state reducers.
- **Component Tests (`React Testing Library`)**: Verifies multi-step forms, Monaco integration, audio controls, and modal dialogs.
- **E2E Tests (`Playwright`)**: Simulates complete candidate user flows from JD upload to live interview and feedback generation.

---

## 🗺️ Roadmap & Future Enhancements

- [ ] **WebRTC Multimodal Vision**: Real-time facial sentiment and posture analysis during mock interviews.
- [ ] **Multiplayer Mock Matching**: Peer-to-peer candidate interview matching with AI co-pilot evaluation.
- [ ] **ATS Integration**: Direct one-click application submission to Greenhouse and Lever.
- [ ] **Company-Specific Rubrics**: Customized rubrics matching calibrated evaluation criteria from major tech employers.
- [ ] **iOS Native Support**: Xcode project provisioning and iOS TestFlight distribution via Capacitor.

---

## 🤝 Contributing

Contributions make the open-source community an incredible place to learn, inspire, and create:

1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'feat: add amazing feature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License & Author

Distributed under the **MIT License**. See `LICENSE` for more information.

<div align="center">
  <sub>Built with ❤️ for engineers preparing for their dream roles.</sub>
</div>
