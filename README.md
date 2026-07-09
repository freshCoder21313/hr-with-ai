<div align="center">
  <img width="1200" height="475" alt="HR-With-AI Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# 🤖 HR-With-AI: Your Personal AI Interview Coach

[![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)](https://reactjs.org/)
[![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Gemini](https://img.shields.io/badge/Google%20Gemini-8E75C2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://deepmind.google/technologies/gemini/)

**Practice interviews like a pro with highly realistic AI personas, real-time coding, and system design tools.**

</div>

---

## 📍 Index

- [🤖 HR-With-AI: Your Personal AI Interview Coach](#-hr-with-ai-your-personal-ai-interview-coach)
  - [📍 Index](#-index)
  - [🌟 Key Features](#-key-features)
    - [🏢 Smart Setup \& JD Analysis](#-smart-setup--jd-analysis)
    - [🎙️ Immersive Interview Room](#️-immersive-interview-room)
    - [🛠️ Professional Tools](#️-professional-tools)
    - [📊 In-depth Feedback](#-in-depth-feedback)
  - [🛠️ Tech Stack](#️-tech-stack)
  - [🚀 Getting Started](#-getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
  - [📱 Mobile Development](#-mobile-development)
  - [📖 How to Use](#-how-to-use)
  - [🤝 Contributing](#-contributing)
  - [📄 License](#-license)

---

## 🌟 Key Features

### 🏢 Smart Setup & JD Analysis

- **AI Auto-fill**: Just paste a Job Description, and our AI will automatically extract the **Company**, **Job Title**, and suggest a relevant **Interviewer Persona**.
- **Resume Parsing**: Upload your PDF/TXT resume to give the AI context about your experience.

### 🎙️ Immersive Interview Room

- **Multi-modal Interaction**: Switch seamlessly between **Chat**, **Coding**, and **Whiteboard** modes.
- **Voice Support**: Full Speech-to-Text and Text-to-Speech integration for a natural conversation feel.
- **Language Support**: Practice in **English (US)** or **Vietnamese (Tiếng Việt)**.

### 🛠️ Professional Tools

- **Live Code Editor**: Write and discuss code in real-time with the AI.
- **System Design Whiteboard**: Draw architectural diagrams directly in the room; the AI can "see" and critique your drawings.
- **Smart Knowledge Graph**: AI mentions technical concepts with clickable search links to help you learn on the fly.

### 📊 In-depth Feedback

- **Score Analysis**: Get an overall score out of 10.
- **STRENGTHS & WEAKNESSES**: Detailed breakdown of what you did well and where to improve.
- **Visualized Progress**: Mermaid.js graphs visualizing your current performance vs. potential improvement.
- **Recommended Resources**: Targeted topics to study with direct search links.

### 📝 CV Chat Assistant & Builder

- **Main CV Management**: Designate a master resume to serve as your single source of truth.
- **AI Chat Editor**: Chat naturally with the AI to refine your resume content (e.g., "Add React to my skills", "Rewrite my summary to be more punchy").
- **GitHub Import**: Connect your GitHub account to automatically analyze, summarize, and import your best repositories as portfolio projects.
- **Real-time Preview**: See changes instantly in a professional, export-ready format.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TypeScript
- **Styling**: Tailwind CSS, Lucide Icons, Shadcn/UI
- **AI Engine**: Google Gemini (Flash 2.0) / OpenAI Compatible APIs
- **Database**: Dexie.js (IndexedDB for local storage)
- **Voice**: Web Speech API
- **Editors**: Tldraw (Whiteboard), Monaco-like editor

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (Latest LTS recommended)
- An API Key from [Google AI Studio](https://aistudio.google.com/)

### Installation

1. **Clone the repository:**

   ```bash
   git clone <your-repo-url>
   cd hr-with-ai
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up environment variables (optional):**
   Copy the example file and fill in values as needed:

   ```bash
   cp .env.example .env.local
   ```

   | Variable | Where | Purpose |
   |----------|--------|---------|
   | `VITE_API_URL` | Client | Optional API base (default `/api`) |
   | `DATABASE_URL` | Server | Neon DB for cloud sync |
   | `ALLOWED_ORIGIN` | Server | CORS for sync API |
   | `RATE_LIMIT` | Server | Sync requests per minute (default 20) |

   **AI API keys** are set in the app (**Settings / API Key modal**) and stored locally — do not put provider secrets in `VITE_*` vars.

4. **Run the development server:**

   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to `http://localhost:3000`

---

## 📱 Mobile Development

This project uses [Capacitor](https://capacitorjs.com/) to build native Android apps.

### Prerequisites for Android

- [Android Studio](https://developer.android.com/studio) installed and configured.
- Android SDK platforms and tools installed via Android Studio.

### Building the APK

We have streamlined the process into a single command:

```bash
npm run android
```

This command will:

1. Build the web application (`npm run build`).
2. Sync the web assets to the native Android project (`npx cap sync`).
3. Open the Android project in Android Studio (`npx cap open android`).

From Android Studio, you can run the app on an emulator or a connected device, or build a signed APK/Bundle for release.

---

## 📖 How to Use

1. **Setup**: Enter your target company, role, and JD. Use the **Sparkles (Auto-fill)** button for speed.
2. **Interview**: Introduce yourself and answer the AI's questions. Use the tabs to switch to Code or Design modes when appropriate.
3. **Review**: After ending the session, wait for the **Analyzing Overlay**. Review your detailed feedback report to improve for your next real interview.
4. **Build CV**: Go to the Dashboard, set a **Main CV**, and use the **CV Chat** to import GitHub projects or refine your resume with AI assistance.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

<div align="center">
  <sub>Built with ❤️ by AI Enthusiasts</sub>
</div>
