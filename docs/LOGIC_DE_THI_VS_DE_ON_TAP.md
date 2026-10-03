# TÀI LIỆU QUY CHUẨN LOGIC: ĐỀ THI (EXAM) VS ĐỀ ÔN TẬP (PRACTICE)

> **Mục đích**: Quy chuẩn hóa nghiệp vụ về Đề thi (Exam) và Đề ôn tập (Practice). Cả hai hình thức đều áp dụng triết lý **Mastery Learning (Học tập làm chủ)** — học sinh **phải hoàn thành đúng 100% số câu hỏi** mới được tính là hoàn thành bài thi/bài giao.

---

## 1. Định nghĩa & Bản chất bài thi

| Tiêu chí | Đề thi / Kiểm tra (`exam`) | Đề ôn tập / Luyện tập (`practice`) |
| :--- | :--- | :--- |
| **Mục đích** | Đánh giá năng lực thật + Bắt buộc rèn luyện lại câu sai | Rèn luyện kiến thức, tự học theo tốc độ cá nhân |
| **Lượt đầu tiên (First Attempt)** | **Có tính giờ** (`timeLimitSeconds`), cho phép nhảy câu/sửa đáp án, **không biết đáp án ngay**. Nộp bài mới biết điểm. | **Không áp lực thời gian**, làm tuần tự từng câu, nộp câu nào **biết đúng/sai & lời giải ngay**. |
| **Điểm số chính thức (Official Score)** | Lấy từ **Điểm của Lượt 1** (`firstAttemptResult`) để giáo viên đánh giá năng lực thực tế. | Lấy điểm cao nhất hoặc tiến độ hoàn thành. |
| **Sau lượt 1 (nếu điểm < 100%)** | **Tiếp tục làm lại các câu sai / chưa làm** qua các lượt retry cho tới khi đúng 100%. | **Tiếp tục làm lại các câu sai** cho tới khi đúng 100%. |
| **Quy tắc làm lại (Remediation Retry)** | Lượt retry làm tuần tự từng câu sai, biết kết quả ngay từng câu để sửa sai. | Làm tuần tự các câu còn sai/chưa làm. |
| **Điều kiện tính là Hoàn thành (`finished` / `mastered`)** | **BẮT BUỘC ĐẠT 100%** (làm đúng toàn bộ các câu trong đề qua các lượt retry). | **BẮT BUỘC ĐẠT 100%** (làm đúng toàn bộ các câu trong đề). |
| **Trạng thái khi điểm < 100%** | **`in_progress` / Cần làm lại** (Học sinh đã có điểm thi lượt 1 nhưng chưa hoàn thành bài). | **`in_progress` / Cần ôn tiếp** (Học sinh tiếp tục làm cho tới 100%). |
| **Giới hạn số lần làm (`maxAttempts`)** | **Không giới hạn** (hệ thống đã bỏ `maxAttempts`, cho phép làm lại tới khi 100%). | **Không giới hạn** (làm lại tới khi 100%). |

---

## 2. Thống kê & Báo cáo dành cho Giáo viên

Trên màn hình Quản lý bài giao của Giáo viên (`TeacherAssignments.tsx`):

1. **Tổng quan (KPIs)**:
   - **Học sinh được giao**: Tổng số học sinh trong danh sách giao bài.
   - **Đã hoàn thành (100%)**: Số học sinh đã làm đúng 100% tất cả câu hỏi (`finished` / `mastered`).
   - **Cần làm lại / Đang làm**: Số học sinh đã nộp lượt đầu nhưng chưa đạt 100% (cần sửa câu sai) hoặc đang làm dở.
   - **Chưa làm**: Số học sinh chưa bắt đầu làm bài.
   - **Tỷ lệ hoàn thành**: Tính trên tỷ lệ học sinh đã đạt 100%.

2. **Chi tiết kết quả từng học sinh**:
   - **Điểm thi chính thức (Lượt 1)**: Điểm số & phần trăm của lượt làm đầu tiên (dùng để vào sổ điểm / xếp loại).
   - **Trạng thái hoàn thành**:
     - `Đã hoàn thành (100%)`: Đã đúng 100% toàn bộ câu hỏi.
     - `Đã nộp lượt 1 (X%) - Cần làm lại`: Đã nộp bài kiểm tra lượt 1 được X%, cần làm lại các câu sai để đạt 100%.
     - `Đang làm bài`: Đang trong một lượt làm bài dở dang.
     - `Chưa bắt đầu`: Chưa làm bài.

---

## 3. Trải nghiệm của Học sinh

1. **Danh sách bài thi (`StudentMyExams.tsx`, `ExamList.tsx`)**:
   - Bài thi chỉ hiển thị thẻ **"Đã hoàn thành"** khi đã đạt **100%** (`mastered === true` hoặc `bestPercentage >= 100`).
   - Nếu đã nộp nhưng `< 100%`: Hiển thị điểm số đạt được cùng nhãn cảnh báo **"Cần làm lại câu sai"**, nút bấm là **"Làm lại câu sai"**.
   - Khi bấm **"Làm lại câu sai"**: Backend sẽ mở attempt mới chỉ gồm các câu học sinh chưa trả lời đúng.

2. **Màn hình nộp bài (`ExamContainer.tsx`)**:
   - Sau khi nộp bài lượt 1 của Đề kiểm tra:
     - Hiển thị kết quả điểm lượt 1.
     - Nếu chưa đạt 100%, thông báo rõ: *"Bài kiểm tra đã được ghi nhận điểm. Bạn cần làm lại các câu chưa đúng để hoàn thành bài 100%"*.
     - Nút hành động chính: **"Làm lại câu sai (còn X câu)"**.
