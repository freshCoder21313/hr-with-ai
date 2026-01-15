Tên chính thức đề xuất cuối cùng: HR-With-AI
Tech Stack cuối cùng – Pure Frontend, Zero Server

    Vite + React 18 + TypeScript

    Tailwind CSS + Shadcn/ui + Lucide icons

    Zustand (state management)

    TanStack Router (file-based routing, cực nhanh)

    IndexedDB → dùng dexie.js (wrapper siêu ngon, code như MongoDB)

    OpenRouter + Google Gemini 3 (Lấy danh sách model từ [url]/models để người dùng chọn)

    Monaco Editor (coding live)

    tldraw (whiteboard system design – đẹp hơn Excalidraw)

    Web Speech API (Speech-to-Text + Text-to-Speech native browser)

    Mermaid.js (feedback chart cuối buổi)

    pdfjs-dist (parse CV .pdf ngay trên browser)

    zustand/middleware persist → tự động sync Zustand → IndexedDB

→ 100% offline capable sau lần đầu load (PWA ready)
Cấu trúc thư mục cuối cùng (SOLID + siêu dễ bảo trì)
code Bash

src/
├── app/
│   ├── routes/
│   │   ├── __root.tsx
│   │   ├── index.tsx          # Landing
│   │   ├── dashboard.tsx
│   │   ├── interview.$id.tsx  # Phòng phỏng vấn
│   │   ├── history.tsx
│   │   └── history.$id.tsx    # Xem lại buổi cũ
│
├── components/
│   ├── ui/                    # shadcn components
│   ├── interview/
│   │   ├── ChatBubble.tsx
│   │   ├── VoiceRecorder.tsx
│   │   ├── InterviewHeader.tsx
│   │   ├── CodeEditor.tsx
│   │   ├── Whiteboard.tsx
│   │   └── FeedbackMermaid.tsx
│   └── layout/
│
├── features/
│   ├── interview/
│   │   ├── interviewStore.ts         # Zustand store chính
│   │   ├── interviewService.ts       # toàn bộ logic gọi OpenRouter
│   │   ├── promptSystem.ts           # PROMPT SIÊU KHỦNG (sẽ gửi riêng)
│   │   └── types.ts
│   ├── resume/
│   │   ├── resumeParser.ts           # parse CV pdf/text → skills, years exp
│   │   └── cvStore.ts
│   └── history/
│       └── historyDb.ts              # Dexie wrapper
│
├── lib/
│   ├── dexie.ts             # IndexedDB config
│   ├── openrouter.ts        # wrapper streaming + fallback model
│   ├── speech.ts            # Web Speech API wrapper
│   └── utils.ts
│
└── hooks/
    ├── useInterview.ts
    ├── useVoice.ts
    └── useMermaid.ts

IndexedDB Schema (dexie.js – chỉ 3 bảng siêu gọn)
code Ts

const db = new Dexie("VietPhongDB");
db.version(3).stores({
  userSettings: "++id, apiKey, defaultModel, voiceEnabled",
  interviews: "++id, createdAt, title, company, jobTitle, status, messages",
  resumes: "++id, createdAt, fileName, rawText, parsedData"
});

→ Tất cả lịch sử, CV, setting đều lưu local, không cần đăng nhập gì cả!
Các thành phần chức năng chi tiết (đúng thứ tự ưu tiên triển khai)

Giai đoạn 1 – MVP hoàn hảo trong 2-3 tuần (text chat + feedback đỉnh cao)

    Landing Page

        Hero + video demo 20s (dùng tldraw ghi lại buổi phỏng vấn thật)

        Nút “Bắt đầu ngay – Không cần đăng ký”

    Setup Room (Dashboard)
    Các field bắt buộc:

        Paste Job Description (JD)

        Upload CV hoặc paste text

        Chọn công ty (dropdown 50+ công ty Việt + FAANG)

        Tên & phong cách Interviewer (textarea tự do – ví dụ: “Chị Lan – HR Shopee, rất ngọt nhưng hỏi sâu behavioral”, “Anh Nam – Tech Lead FPT, hỏi system design cực gắt”)

        Ngôn ngữ: Tiếng Việt / Tiếng Anh / Bilingual

        Độ khó: Tự động (dựa trên CV + JD) hoặc chọn tay
        → Nút “Bắt đầu phỏng vấn” → tạo room mới, lưu vào IndexedDB

    Interview Room – Text Mode (core)

        AI hỏi câu đầu tiên ngay khi vào phòng

        Streaming answer siêu mượt (như ChatGPT)

        User gõ + Enter

        Nút “Kết thúc phỏng vấn” bất kỳ lúc nào

    Feedback Screen – SIÊU ĐỈNH (điểm khác biệt lớn nhất)
    Khi user bấm kết thúc → AI tổng hợp toàn bộ buổi → trả về 1 lần duy nhất (tiết kiệm token) gồm:

        Tổng điểm: 8.7/10

        Đánh giá tổng quan 3-4 câu

        Phân tích từng câu hỏi quan trọng (3-5 câu khó nhất)

        Transcript đầy đủ + highlight filler words (ừm, à, thì, cái…)

        2 biểu đồ Mermaid cực chất:
        code Mermaid

        graph TD
            A[Phong cách trả lời hiện tại] --> B{Tư duy của HR}
            B --> C[Ổn định, rõ ràng\nnhưng thiếu leadership]
            B --> D[Technical depth tốt\nnhưng chưa thấy impact]
            A --> E[Điểm dự kiến: 7.8/10]
            A --> F[Xác suất pass: 62%]

        graph TD
            G[Nếu trả lời theo gợi ý AI] --> H{Tư duy HR sẽ thay đổi}
            H --> I[Structured + Impactful\n+ Leadership rõ ràng]
            H --> J[Rất impressive\nSẽ được push mạnh vòng sau]
            G --> K[Điểm dự kiến: 9.6/10]
            G --> L[Xác suất pass: 94%]
            style I fill:#10b981, color:white
            style K fill:#10b981, color:white

Giai đoạn 2 – Thêm chỉ trong 1-2 tuần nữa

    Voice Mode

        Nút mic → Web Speech API (tiếng Việt hỗ trợ rất tốt)

        AI trả lời bằng giọng nói (Web Speech API tiếng Việt cực giống người)

        Tự động detect filler words chính xác hơn

    Coding Live

        Monaco Editor tích hợp sẵn

        AI có thể yêu cầu: “Hãy code 1 LRU Cache trong 15 phút”

        User code → gửi code cho AI đánh giá → AI chạy test cases (dùng worker)

    System Design Whiteboard

        tldraw embed

        AI có thể yêu cầu vẽ → user vẽ → chụp ảnh gửi AI phân tích

    History Page

        Danh sách tất cả buổi đã luyện (lưu IndexedDB)

        Click vào xem lại toàn bộ chat + feedback + mermaid

        Nút “Share link” → export thành JSON → người khác import vào app của họ được luôn!