# Kế hoạch xử lý và tích hợp docs/data/JDs.md

Dưới đây là các ý tưởng để xử lý và tích hợp file `docs/data/JDs.md` vào dự án `hr-with-ai`, tận dụng các tính năng sẵn có như Dexie.js, AI và React:

## 1. Tính năng "Job Board" (Bảng công việc)
Hiện tại file đang ở dạng Markdown tĩnh. Cần chuyển đổi nó thành dữ liệu động để hiển thị trên ứng dụng.
*   **Xử lý:** Viết script (hoặc AI function) để parse file `docs/data/JDs.md` thành mảng JSON objects.
*   **Lưu trữ:** Lưu vào `Dexie.js` (IndexedDB) dưới bảng `jobs`.
*   **UI:** Tạo giao diện hiển thị danh sách việc làm, cho phép filter theo:
    *   Mức lương (Salary range)
    *   Địa điểm (Remote/Hanoi/HCM)
    *   Tech Stack (Python, React, AWS...)

## 2. Tính năng "AI Job Matching" (Gợi ý việc làm)
Sử dụng AI để so sánh hồ sơ (Resume) của người dùng với các JD này.
*   **Luồng:** Người dùng upload Resume -> Hệ thống parse Resume -> So khớp với danh sách JD trong Database.
*   **Đầu ra:**
    *   Chấm điểm độ phù hợp (Match Score %) cho từng job.
    *   Giải thích lý do phù hợp/chưa phù hợp (Gap Analysis).
    *   Gợi ý bổ sung kỹ năng còn thiếu.

## 3. Tính năng "Interview for this Job" (Phỏng vấn thử theo JD)
Kết hợp với tính năng Mock Interview hiện có.
*   **Luồng:** Người dùng chọn một Job cụ thể từ danh sách (ví dụ: "AI Platform Engineer").
*   **Xử lý:** Gửi nội dung JD đó vào prompt cho AI Interviewer.
*   **Kết quả:** AI sẽ đóng vai người phỏng vấn của công ty đó, hỏi sâu vào các tech stack cụ thể được yêu cầu trong JD (ví dụ: hỏi về AWS ECS, FastAPI thay vì câu hỏi chung chung).

## 4. Tính năng "Market Analytics" (Phân tích thị trường)
Tận dụng dữ liệu tổng hợp từ file để vẽ biểu đồ (sử dụng Recharts).
*   **Thống kê:**
    *   Top skills đang được tuyển dụng nhiều nhất (ví dụ: đếm từ khóa Python, RAG, Agent).
    *   Phân bố mức lương trung bình cho AI Engineer tại VN.
    *   Tỷ lệ Remote vs On-site.
