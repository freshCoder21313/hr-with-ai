# Guided Tour & Onboarding System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai hệ thống hướng dẫn người dùng (Guided Tour / Onboarding) theo ngữ cảnh trang, với nút `?` thông minh trên Header, tùy chọn bỏ qua trên mọi trang, và các bước chi tiết cho Landing Page, Mock Interview Setup, CV Studio (8 bước chi tiết) và Resume Builder.

**Architecture:** Sử dụng thư viện `react-joyride` (`v2.9.3`) có sẵn trong repo, quản lý state qua Zustand store (`useTourStore`), lưu cờ đã xem vào `localStorage`, custom Tooltip card theo Tailwind CSS tokens đảm bảo WCAG AA và tương thích màn hình di động/Capacitor WebView (`HashRouter`).

**Tech Stack:** React 18, TypeScript, Tailwind CSS v4, Zustand, react-joyride, Lucide Icons, Vitest, React Testing Library.

---

## File Structure

```
src/
├── services/tour/
│   ├── tourStore.ts                  # State store: active tour, cờ completed, dismissedAllTours, actions
│   ├── tourStore.test.ts             # Unit tests cho tourStore
│   ├── tourSteps.ts                  # Định nghĩa các steps cho landing, setup, cv-studio, builder
│   ├── tourUtils.ts                  # Lọc bước theo target DOM và viewport (buildTourSteps, isTerminalStatus)
│   └── tourUtils.test.ts             # Unit tests cho tourUtils
├── components/tour/
│   ├── TourTooltip.tsx               # Custom Joyride Tooltip card (Tailwind v4 tokens, buttons, dismiss-all)
│   ├── TourTooltip.test.tsx          # Component tests cho TourTooltip
│   ├── TourHelpButton.tsx            # Nút '?' ngữ cảnh theo route gắn trên Header
│   ├── TourHelpButton.test.tsx       # Component tests cho TourHelpButton
│   ├── GlobalTourOverlay.tsx         # Component Joyride gắn ở layout chính
│   └── index.ts                      # Barrel export
├── components/layout/
│   └── Header.tsx                    # Gắn TourHelpButton vào cạnh Settings & ThemeToggle
├── features/cv-studio/
│   └── CVStudioPage.tsx              # Thêm các class .tour-studio-* và lắng nghe sự kiện đổi tab khi tour chạy
├── features/landing/
│   └── LandingPage.tsx               # Thêm các class .tour-landing-*
└── features/interview/
    └── SetupRoom.tsx                 # Thêm các class .tour-setup-*
```

---

## Tasks

### Task 1: Xây dựng Tour Utilities & Tour Store
**Files:**
- Create: `src/services/tour/tourUtils.ts`
- Create: `src/services/tour/tourUtils.test.ts`
- Create: `src/services/tour/tourStore.ts`
- Create: `src/services/tour/tourStore.test.ts`

- [ ] **Step 1.1**: Viết test thất bại cho `tourUtils.ts` (`isTerminalTourStatus`, `buildTourSteps` lọc bỏ target không có trong document hoặc ẩn).
- [ ] **Step 1.2**: Chạy test và xác nhận thất bại: `npx vitest run src/services/tour/tourUtils.test.ts`.
- [ ] **Step 1.3**: Viết code `tourUtils.ts` kế thừa và tổng quát hóa từ logic hiện có của `resumeBuilderTour.ts`.
- [ ] **Step 1.4**: Chạy test và xác nhận vượt qua: `npx vitest run src/services/tour/tourUtils.test.ts`.
- [ ] **Step 1.5**: Viết test thất bại cho `tourStore.ts` (startTour, completeTour, dismissAllTours, resetAllTours, đồng bộ `localStorage`).
- [ ] **Step 1.6**: Chạy test và xác nhận thất bại: `npx vitest run src/services/tour/tourStore.test.ts`.
- [ ] **Step 1.7**: Viết code `tourStore.ts` với Zustand và middleware persist (hoặc thủ công localStorage an toàn).
- [ ] **Step 1.8**: Chạy test và xác nhận vượt qua: `npx vitest run src/services/tour/tourStore.test.ts`.
- [ ] **Step 1.9**: Commit: `feat(tour): implement tourStore and tourUtils with unit tests`.

---

### Task 2: Định nghĩa Danh sách Tour Steps cho các trang (Landing, Setup, CV Studio)
**Files:**
- Create: `src/services/tour/tourSteps.ts`

- [ ] **Step 2.1**: Định nghĩa các bước tour cho:
  - `tour_landing`: Hero intro, stats counter, quick actions (Mock Interview & CV Studio).
  - `tour_setup`: Role & Company inputs, Resume comparison select, AI persona config, Start button.
  - `tour_studio`: 8 bước chi tiết (3-panel intro, Smart JD Import, Auto-Tailor Wand2, Context selection, AI Chat input/STAR, Career Knowledge drawer, Preview modes, PDF export).
  - `tour_builder`: Giữ nguyên danh sách hiện tại của resume builder.
- [ ] **Step 2.2**: Export mapping hàm `getTourIdForRoute(pathname: string): string | null` để ánh xạ URL hash sang Tour ID.
- [ ] **Step 2.3**: Viết test kiểm tra mapping route ra đúng tour ID trong `tourSteps.test.ts`.
- [ ] **Step 2.4**: Chạy test: `npx vitest run src/services/tour/tourSteps.test.ts`.
- [ ] **Step 2.5**: Commit: `feat(tour): define step definitions and route-to-tour mapping`.

---

### Task 3: Xây dựng UI Component `TourTooltip` & `GlobalTourOverlay`
**Files:**
- Create: `src/components/tour/TourTooltip.tsx`
- Create: `src/components/tour/TourTooltip.test.tsx`
- Create: `src/components/tour/GlobalTourOverlay.tsx`
- Create: `src/components/tour/index.ts`

- [ ] **Step 3.1**: Viết component test cho `TourTooltip.tsx` (hiển thị tiêu đề, nội dung, số bước, nút Skip, Next, Back, và checkbox/link "Không hiển thị lại trên mọi trang").
- [ ] **Step 3.2**: Chạy test và xác nhận thất bại: `npx vitest run src/components/tour/TourTooltip.test.tsx`.
- [ ] **Step 3.3**: Viết `TourTooltip.tsx` dùng Tailwind v4 tokens (`bg-card`, `border-border`, `text-card-foreground`, `z-[60]`).
- [ ] **Step 3.4**: Chạy test và xác nhận vượt qua: `npx vitest run src/components/tour/TourTooltip.test.tsx`.
- [ ] **Step 3.5**: Tạo `GlobalTourOverlay.tsx` bọc `ReactJoyride`, lắng nghe `useTourStore` và `useLocation()`. Xử lý sự kiện chuyển step trên mobile (ví dụ: tự chuyển tab `jobs`/`chat`/`preview` trong CV Studio khi bước tiếp theo nằm ở tab khác).
- [ ] **Step 3.6**: Bổ sung `GlobalTourOverlay` vào `src/App.tsx`.
- [ ] **Step 3.7**: Commit: `feat(tour): create TourTooltip and GlobalTourOverlay`.

---

### Task 4: Xây dựng Nút `TourHelpButton` và gắn vào Header & Settings
**Files:**
- Create: `src/components/tour/TourHelpButton.tsx`
- Create: `src/components/tour/TourHelpButton.test.tsx`
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/components/settings/SettingsModal.tsx` (hoặc tab General trong settings)

- [ ] **Step 4.1**: Viết test cho `TourHelpButton.tsx` (nhận diện route hiện tại và gọi `startTour(tourId, true)` khi click).
- [ ] **Step 4.2**: Chạy test và xác nhận thất bại: `npx vitest run src/components/tour/TourHelpButton.test.tsx`.
- [ ] **Step 4.3**: Viết code `TourHelpButton.tsx` với icon `HelpCircle`, tooltip "Hướng dẫn sử dụng", variant ghost.
- [ ] **Step 4.4**: Chạy test và xác nhận vượt qua: `npx vitest run src/components/tour/TourHelpButton.test.tsx`.
- [ ] **Step 4.5**: Gắn `TourHelpButton` vào `Header.tsx` (cả desktop view cạnh Settings và mobile drawer sheet).
- [ ] **Step 4.6**: Thêm nút *"Đặt lại & Xem lại hướng dẫn sử dụng"* (`resetAllTours()`) vào `SettingsModal`.
- [ ] **Step 4.7**: Commit: `feat(tour): add TourHelpButton to Header and reset option in SettingsModal`.

---

### Task 5: Gắn Target Selectors vào các trang và Xử lý Tự động chuyển Tab trong CV Studio
**Files:**
- Modify: `src/features/landing/LandingPage.tsx`
- Modify: `src/features/interview/SetupRoom.tsx`
- Modify: `src/features/cv-studio/CVStudioPage.tsx`
- Modify: `src/features/cv-studio/components/CVJobPanel.tsx`
- Modify: `src/features/cv-studio/components/CVChatPanel.tsx`
- Modify: `src/features/cv-studio/components/CVPreviewPanel.tsx`

- [ ] **Step 5.1**: Thêm các class `.tour-landing-*` vào `LandingPage.tsx`.
- [ ] **Step 5.2**: Thêm các class `.tour-setup-*` vào `SetupRoom.tsx`.
- [ ] **Step 5.3**: Thêm các class `.tour-studio-*` vào `CVStudioPage.tsx` và 3 sub-panel (`CVJobPanel`, `CVChatPanel`, `CVPreviewPanel`).
- [ ] **Step 5.4**: Bổ sung listener sự kiện `window.dispatchEvent(new CustomEvent('tour:switch-mobile-tab', ...))` trong `CVStudioPage.tsx` để tự động đổi `mobileTab` khi step tour yêu cầu panel đang bị ẩn trên màn hình di động.
- [ ] **Step 5.5**: Commit: `feat(tour): wire tour selectors across landing, setup, and cv-studio flows`.

---

### Task 6: Kiểm thử Hợp chuẩn Toàn diện & Xác thực (Verification & Quality Gates)
**Files:**
- Run: Typecheck, Lint, Test suite

- [ ] **Step 6.1**: Chạy `npm run typecheck` để đảm bảo 0 lỗi TypeScript strict mode.
- [ ] **Step 6.2**: Chạy `npm run lint` để đảm bảo code sạch, không có `console.log`.
- [ ] **Step 6.3**: Chạy toàn bộ test suites liên quan đến tour: `npx vitest run src/services/tour src/components/tour`.
- [ ] **Step 6.4**: Chạy toàn bộ test suite dự án: `npm run test -- --run`.
- [ ] **Step 6.5**: Commit: `test(tour): verify full regression and code quality passes`.
