# BÁO CÁO LỖI & PHÂN TÍCH KỸ THUẬT GỬI BACKEND

**Vấn đề:** Học sinh ấn "Làm lại câu sai" ở lượt Ôn tập lại (sau khi đã hoàn thành 100%) nhưng hệ thống lại tạo lượt mới với toàn bộ câu hỏi (thay vì chỉ câu sai).  
**Ngày lập:** 2026-10-01  
**Môi trường:** Student Learning Service (`/learning/student/...`)

---

## 1. Tóm tắt vấn đề (Executive Summary)

Khi học sinh đã từng đạt **100% tiến độ** của một bài thi/bài ôn tập trong quá khứ:
1. Học sinh bấm **"Ôn tập lại"** (`POST .../attempts` với `{ "restart": true }`), Backend tạo ra một lượt làm bài mới với toàn bộ câu hỏi $\rightarrow$ **Đúng thiết kế**.
2. Học sinh làm lượt này, có **1 câu sai** (ví dụ đúng 9/10 câu) và nộp bài (`POST .../submit`). Màn hình kết quả thông báo còn 1 câu sai và có nút **"Làm lại câu sai (1 câu)"** $\rightarrow$ **Đúng thiết kế**.
3. Học sinh ấn **"Làm lại câu sai"**: Frontend gọi `POST .../attempts` (không có `restart: true` hoặc `{ "restart": false }`).
4. **LỖI PHÁT SINH:** Backend không trả về attempt mới chỉ chứa 1 câu sai, mà Backend trả về:
   ```json
   { "mastered": true }
   ```
   (Không có trường `id` của attempt mới).
5. Do không có `id` attempt mới, học sinh không thể vào làm lại câu sai vừa làm hỏng. (Trước đó tại Frontend có một đoạn fallback tự động gọi lại `{ restart: true }` khi thấy `mastered: true`, khiến Backend sinh lại toàn bộ 100% câu hỏi).

---

## 2. Các bước tái hiện lỗi (Step-by-step Reproduction)

### Bước 1: Học sinh đã đạt 100% bài thi
- Học sinh làm bài và đã hoàn thành 100% các câu hỏi.
- Database lưu trạng thái bài thi của học sinh là `mastered = true` (hoặc `progress = 100%`).

### Bước 2: Bắt đầu một chu kỳ ôn tập lại
- Học sinh bấm **"Ôn tập lại"**.
- Frontend gọi API:
  ```http
  POST /api/v1/learning/student/exam-assignments/:assignmentStudentId/exams/:examId/attempts
  Hoặc
  POST /api/v1/learning/student/curriculums/:curriculumId/exams/:examId/attempts
  ```
  **Body:**
  ```json
  { "restart": true }
  ```
- **Backend response:** Trả về attempt mới (ví dụ `attempt_id = "att_redo_01"`) chứa đầy đủ 10 câu hỏi $\rightarrow$ **Hoạt động tốt**.

### Bước 3: Làm bài và Nộp bài (có câu sai)
- Học sinh làm lượt này: Trả lời đúng 9 câu, sai câu số 5.
- Frontend gọi API nộp bài:
  ```http
  POST /api/v1/learning/student/attempts/att_redo_01/submit
  ```
- Kết quả trả về: `score = 9`, `maxScore = 10`, `mastered = false`, `remainingQuestionCount = 1`.
- Giao diện hiển thị nút: **"Làm lại câu sai (1 câu)"**.

### Bước 4: Ấn "Làm lại câu sai"
- Học sinh click nút **"Làm lại câu sai"**.
- Theo tài liệu Backend ngày **2026-09-27**:
  > *"Không gửi restart hoặc gửi false: giữ luồng cũ, chỉ đưa các câu chưa làm đúng vào lượt tiếp theo."*
- Frontend gọi API bắt đầu lượt tiếp theo:
  ```http
  POST /api/v1/learning/student/exam-assignments/:assignmentStudentId/exams/:examId/attempts
  ```
  **Body:** `{}` (hoặc không gửi body)
- **Kỳ vọng:** Backend tạo attempt `att_redo_02` chỉ chứa duy nhất câu số 5 (câu chưa làm đúng của lượt vừa nộp).
- **Thực tế Backend trả về:**
  ```json
  {
    "mastered": true
  }
  ```
  *(Backend không tạo attempt nào cả, không có `id`)*.

---

## 3. Phân tích nguyên nhân gốc rễ (Root Cause Analysis)

### 3.1. Phía Backend (Cốt lõi)
Trong cơ chế Mastery Learning hiện tại của Backend:
- Backend dường như đang kiểm tra điều kiện tạo lượt mới dựa trên trạng thái tích lũy lịch sử của bài thi (`assignment_student.mastered = true` hoặc `curriculum_exam_progress.mastered = true`):
  - Do học sinh **đã từng hoàn thành 100% trong quá khứ**, cờ `mastered` tổng thể của bài thi đã là `true`.
  - Khi học sinh làm lượt ôn tập mới (`att_redo_01`) và làm sai 1 câu, Backend không hạ tiến độ tổng thể của học sinh (đây là điều đúng đắn để bảo vệ thành tích học sinh).
  - Tuy nhiên, khi gọi `POST .../attempts` (không có `restart: true`), hàm tạo attempt của Backend lại tra cứu câu hỏi chưa làm đúng trong toàn bộ lịch sử bài học:
    ```sql
    -- Giả định logic Backend đang chạy:
    -- Kiểm tra nếu bài thi đã mastered -> trả về { mastered: true } luôn mà không xét lượt gần nhất
    if (studentExamProgress.mastered) {
      return { mastered: true };
    }
    ```
  - Do đó, Backend cho rằng học sinh "đã mastered toàn bộ câu hỏi", không còn câu hỏi nào cần ôn tập (0 câu unmastered), nên không tạo attempt mới mà trả về `{ mastered: true }`.

### 3.2. Phía Frontend
- Trước đây, trong file `src/pages/coursePage/ExamContainer.tsx` có một đoạn fallback:
  ```ts
  // Nếu Backend trả { mastered: true } mà không có attemptId, tự động gọi lại với { restart: true }
  if (!attemptResult?.id && (attemptResult as any)?.mastered && !shouldRestart) {
    attemptResult = await startAttempt(..., { restart: true });
  }
  ```
- Khi Backend trả `{ mastered: true }` ở Bước 4, đoạn code này đã tự động kích hoạt gọi lại API với `{ restart: true }`.
- Vì nhận được `{ restart: true }`, Backend lại tạo ra một lượt làm bài mới với **toàn bộ 100% câu hỏi**.
- **Frontend đã xóa bỏ hoàn toàn đoạn fallback ép `restart: true` này.** Bây giờ Frontend tuân thủ 100% kết quả từ Backend: nếu học sinh ấn làm lại câu sai thì chỉ gửi request làm lại câu sai, tuyệt đối không tự ý ép `restart`.

---

## 4. Hành vi kỳ vọng đối với Backend (Expected Behavior)

Theo đúng quy chuẩn nghiệp vụ LMS & Mastery Learning:

1. **Chu kỳ ôn tập (Redo Session) cần hỗ trợ hoàn thiện câu sai:**
   - Khi học sinh đã 100% và bấm **"Ôn tập lại"** (`restart: true`), đây là một **chu kỳ làm lại mới**.
   - Nếu trong chu kỳ mới này học sinh làm chưa đạt 100% (còn câu sai sau khi submit), học sinh cần được quyền làm tiếp các câu sai của chu kỳ đó cho đến khi hoàn thành.
2. **Logic đề xuất cho Backend tại API `POST .../attempts`:**
   - Khi nhận request **không có `restart: true`** (hoặc `restart: false`):
     - Bước A: Kiểm tra lượt làm bài gần nhất (`latestAttempt`) của học sinh trên đề thi này.
     - Bước B: Nếu `latestAttempt` ở trạng thái `submitted` và **chưa đạt điểm tuyệt đối** (`score < maxScore` hoặc có câu `isCorrect === false`):
       - Tạo một attempt mới (phase: `remediation`) **chỉ chứa danh sách các câu hỏi chưa làm đúng trong `latestAttempt`**.
       - Trả về attempt object đầy đủ với `id`, `answers` (các câu hỏi cần sửa).
     - Bước C: Nếu `latestAttempt` cũng đã đạt 100% (hoặc không còn câu nào sai trong lượt đó):
       - Lúc này mới trả về `{ "mastered": true }`.

---

## 5. Bảng so sánh luồng xử lý

| Tình huống | Request gửi lên | Phản hồi Backend hiện tại | Phản hồi Backend mong muốn |
| :--- | :--- | :--- | :--- |
| **Lần đầu đạt 100%, muốn làm lại cả đề** | `POST .../attempts`<br>`{ "restart": true }` | Tạo attempt mới có đủ 100% câu hỏi | Tạo attempt mới có đủ 100% câu hỏi (Giữ nguyên - Đã chuẩn) |
| **Vừa nộp bài ôn tập, sai 1 câu, ấn "Làm lại câu sai"** | `POST .../attempts`<br>`{}` hoặc `{ "restart": false }` | `{ "mastered": true }` *(Không tạo attempt)* | **Tạo attempt mới chỉ chứa 1 câu sai vừa làm hỏng** |
| **Đã sửa xong hết câu sai của lượt ôn tập (đạt 10/10)** | `POST .../attempts`<br>`{}` hoặc `{ "restart": false }` | `{ "mastered": true }` | `{ "mastered": true }` (Chuẩn) |

---

## 6. Trạng thái hiện tại của Frontend

- Frontend đã dọn dẹp các đoạn fallback tự ý gọi `{ restart: true }`.
- Frontend đã log chi tiết request và response của hàm `handleRetryNewAttempt` để phục vụ đối soát cùng Backend.
- Ngay khi Backend hỗ trợ trả về attempt con cho lượt ôn tập, luồng Frontend sẽ tự động nhận `attemptId` mới và hiển thị đúng các câu hỏi sai để học sinh làm bài mà không cần sửa đổi thêm.
