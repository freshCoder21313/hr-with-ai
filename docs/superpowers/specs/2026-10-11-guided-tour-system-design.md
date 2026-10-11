# Guided Tour & Onboarding System Design Spec

- **Branch**: `feat/app-guided-tour`
- **Status**: Draft
- **Date**: 2026-10-11
- **Author**: Antigravity & Team

---

## 1. Executive Summary & Intent

### 1.1 Mục tiêu
Hệ thống **Guided Tour & Onboarding** giúp người dùng (cả người dùng mới và người dùng quay lại) nhanh chóng nắm bắt các tính năng chính của web app `hr-with-ai`:
- **Landing Dashboard (`/`)**: Khám phá quick actions, thống kê, điều hướng.
- **Mock Interview Setup (`/setup`)**: Hướng dẫn 3 bước cấu hình phiên phỏng vấn mock thông minh.
- **CV Studio (`/studio`)**: Quản lý JD, AI Chat tinh chỉnh CV, xem trước bản in.
- **Resume Builder (`/resumes/:id/edit`)**: Tận dụng và chuẩn hóa tour chỉnh sửa CV hiện có.
- **Skill Assessment (`/skill-assessment`)**: Hướng dẫn quy trình trắc nghiệm kỹ năng.

### 1.2 Tiêu chí thành công & Trải nghiệm (UX Principles)
1. **Không gây phiền toái (Non-intrusive)**:
   - Người dùng mới thấy tour tự động lần đầu khi vào trang.
   - Hỗ trợ nút **"Bỏ qua tour này"** (*Skip*) và **"Tôi đã biết cách dùng, không hiện lại trên mọi trang"** (*Dismiss all future tours*).
2. **Kích hoạt theo ngữ cảnh thông minh (Context-Aware Trigger)**:
   - Nút **`?` (Help)** trên Header tự động nhận diện trang/tính năng người dùng đang đứng để chạy đúng bài hướng dẫn của trang đó, bất kể cờ tự động đã tắt hay chưa.
3. **Phục hồi & Đặt lại (Replay & Reset)**:
   - Cho phép người dùng bật lại toàn bộ hướng dẫn trong trang **SettingsModal** (tab General).
4. **Không thêm thư viện thừa (Zero New Dependencies)**:
   - Sử dụng thư viện `react-joyride` (`v2.9.3`) đã cài sẵn trong dự án.
   - Đảm bảo tương thích hoàn hảo với: React 18, Vite, Tailwind CSS v4 tokens, `HashRouter` (Capacitor Android WebView) và Accessibility (WCAG AA).

---

## 2. Kiến trúc Kỹ thuật (Technical Architecture)

### 2.1 Cấu trúc Thư mục

```
src/
├── services/tour/
│   ├── tourStore.ts             # Zustand store quản lý active tour, cờ đã xem, dismissedAllTours
│   ├── tourSteps.ts             # Định nghĩa danh sách các steps cho từng route/feature
│   └── tourUtils.ts             # Lọc selector DOM tồn tại (buildTourSteps), kiểm tra terminal status
├── components/tour/
│   ├── GlobalTourProvider.tsx   # Wrapper ReactJoyride toàn cục theo dõi route
│   ├── TourTooltip.tsx          # Custom Tooltip card (Tailwind tokens, dark mode, actions)
│   └── TourHelpButton.tsx       # Nút '?' thông minh gắn trên Header & Mobile drawer
```

### 2.2 Quản lý Trạng thái (`tourStore.ts`)

Lưu trữ trạng thái vào `localStorage` dưới khóa `app_tour_preferences`:

```typescript
export interface TourPreferences {
  dismissedAllTours: boolean; // Người dùng chọn "Không hiện lại trên mọi tính năng"
  completedTours: Record<string, boolean>; // Đánh dấu từng flow đã xem (ví dụ: { landing: true, setup: true })
}

export interface TourState {
  preferences: TourPreferences;
  activeTourId: string | null; // Id tour đang chạy ('landing' | 'setup' | 'studio' | ...)
  isRunning: boolean;
  stepIndex: number;

  // Actions
  startTour: (tourId: string, force?: boolean) => void;
  stopTour: () => void;
  setStepIndex: (index: number) => void;
  completeTour: (tourId: string) => void;
  dismissAllTours: () => void;
  resetAllTours: () => void;
}
```

### 2.3 Cơ chế Kích hoạt (Trigger Logic)

```mermaid
flowchart TD
    RouteEnter[Người dùng chuyển vào Route mới] --> CheckDismissAll{dismissedAllTours?}
    CheckDismissAll -- Yes --> Idle[Không tự động chạy]
    CheckDismissAll -- No --> CheckCompleted{completedTours[routeId]?}
    CheckCompleted -- Yes --> Idle
    CheckCompleted -- No --> AutoStart[Chạy tour sau 800ms khi DOM đã sẵn sàng]

    UserClicksHelp[Người dùng bấm nút ? trên Header] --> DetectRoute[Lấy route hiện tại qua useLocation]
    DetectRoute --> ForceStart[startTour(currentRouteTourId, force=true)]
    ForceStart --> RunJoyride[Hiển thị Tour Tooltip cho trang đó]
```

---

## 3. Thiết kế Giao diện (UI/UX Design)

### 3.1 Custom Tooltip Component (`TourTooltip.tsx`)
Thay thế giao diện mặc định của Joyride bằng custom card sử dụng Design Tokens của hệ thống:
- **Card Container**: `bg-card border border-border text-card-foreground shadow-2xl rounded-xl p-4 max-w-sm`
- **Header**:
  - Icon `Sparkles` hoặc `HelpCircle` màu `text-primary`.
  - Step counter badge: `Step {index + 1} / {totalSteps}`.
  - Nút đóng nhanh `X` (`variant="ghost" size="icon"`).
- **Body**:
  - Tiêu đề bước (`font-semibold text-base`).
  - Nội dung mô tả (`text-sm text-muted-foreground leading-relaxed mt-1.5`).
- **Footer Actions**:
  - Hàng trên: Checkbox hoặc text link nhỏ: *"Không hiện lại trên mọi trang"* (`dismissAllTours`).
  - Hàng dưới:
    - Nút `Bỏ qua` (*Skip*).
    - Cụm nút `Quay lại` (*Back*) và `Tiếp tục / Hoàn thành` (*Next / Finish* với `Button variant="default"`).

### 3.2 Tối ưu hóa Mobile & Capacitor WebView
- **Z-Index Layering**: Overlay đặt `z-index: 60`, đảm bảo nằm trên `Header` (`z-50`) và `BottomNav` (`z-40`).
- **Safe Area Insets**: Thêm padding `calc(var(--safe-bottom) + 70px)` để tránh che khuất thanh BottomNav trên điện thoại.
- **Viewport Step Filtering (`buildTourSteps`)**:
  - Kiểm tra xem target selector có thực sự hiển thị trên DOM hay không.
  - Trên mobile (`< 768px`), các selector chỉ có trên Desktop (như thanh desktop NavLinks) sẽ tự động bị loại bỏ, tránh việc overlay bị treo.

---

## 4. Danh sách các Tour Steps chi tiết

### 4.1 Landing Page Tour (`tour_landing`)
1. `.tour-welcome`: Thẻ chào mừng trên Hero section.
2. `.tour-stats`: Thống kê số giờ luyện tập & điểm phỏng vấn trung bình.
3. `.tour-action-interview`: Nút bắt đầu Mock Interview.
4. `.tour-action-cv`: Nút vào CV Studio.
5. `.tour-header-actions`: Nút Cloud Sync và Cài đặt trên Header.

### 4.2 Mock Interview Setup Tour (`tour_setup`)
1. `.tour-role-input`: Ô nhập chức danh công việc và công ty mục tiêu (kèm quick-pick Big Tech).
2. `.tour-resume-select`: Bộ chọn CV để đối sánh trong buổi phỏng vấn.
3. `.tour-persona-config`: Cấu hình độ khó, persona phỏng vấn viên (Khắt khe / Thân thiện).
4. `.tour-start-interview`: Nút Bắt đầu phỏng vấn.

### 4.3 CV Studio Tour (`tour_studio`) - Chi tiết hóa toàn diện
Do CV Studio là trung tâm đa năng với 3 panel và rất nhiều thao tác, tour sẽ đi sâu qua 8 bước cụ thể:
1. `.tour-studio-intro`: Giới thiệu tổng quan không gian làm việc CV Studio (3 cột: Quản lý việc làm, AI Chat & Xem trước CV).
2. `.tour-studio-job-add`: Cách thêm mới Job Description hoặc dùng **Smart JD Import** (nhập link/dán văn bản JD để AI tự động bóc tách).
3. `.tour-studio-tailoring`: Nút **Auto-Tailor (Wand2)** — Tính năng tự động đối sánh CV gốc với các JD đã chọn để sinh ra bản CV may đo riêng.
4. `.tour-studio-chat-context`: Chọn ngữ cảnh CV và Job mục tiêu cho phiên AI Chat (`Target Job` & `Context CV`).
5. `.tour-studio-chat-input`: Khung chat và các lệnh tắt AI (tối ưu hóa STAR bullet points, import GitHub repos, gợi ý từ khóa ATS).
6. `.tour-studio-career-knowledge`: Drawer **Career Knowledge** — Kho lưu trữ sự thật nghề nghiệp (fact checking, dự án, chứng chỉ) để AI không bao giờ bịa đặt kinh nghiệm.
7. `.tour-studio-preview-mode`: Thanh chuyển đổi chế độ xem: Preview (xem trang in), Form (chỉnh sửa trực tiếp) và Split View (song song).
8. `.tour-studio-export-pdf`: Tùy chỉnh màu sắc/template và nút **Xuất file PDF chuẩn in ấn**.

> **Lưu ý Mobile**: Trên điện thoại, các cột được gom vào 3 tab di động (`jobs`, `chat`, `preview`). Trước khi chuyển sang bước của cột tiếp theo, hệ thống sẽ tự động dispatch sự kiện chuyển tab tương ứng để target element luôn hiển thị trước mắt người dùng.

### 4.4 Resume Builder Tour (`tour_builder`)
- Chuẩn hóa từ hook `resumeBuilderTour.ts` hiện có: Magic Format, Layout switch, Dịch đa ngữ, Split preview.

---

## 5. Kế hoạch Kiểm thử & Bảo đảm Chất lượng (QA & Test Plan)

1. **Unit & Store Tests**:
   - Kiểm thử `tourStore.ts`: `startTour`, `completeTour`, `dismissAllTours`, `resetAllTours`.
   - Kiểm thử `tourUtils.ts`: Lọc bỏ step khi DOM target không tồn tại.
2. **Component Tests**:
   - Kiểm thử `TourHelpButton.tsx`: Bấm nút gọi đúng `startTour(routeId)`.
   - Kiểm thử `TourTooltip.tsx`: Render đúng số bước, gọi action Next/Back/Dismiss All chuẩn xác.
3. **End-to-End / Visual Verification**:
   - Chạy trên Desktop và giả lập Mobile viewport (< 768px).
   - Kiểm tra phím `Escape` đóng tour an toàn.
   - Kiểm tra chế độ Dark Mode không bị lỗi tương phản.
