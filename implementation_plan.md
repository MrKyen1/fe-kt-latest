# Implementation Plan: Tích hợp API 2026-08-06 & 2026-08-27 từ READMEBYDATE.md vào FE (kt-fe)

Phân tích hiện trạng codebase `kt-fe` cho thấy một số phần của 2026-08-06 và 2026-08-27 đã có cấu trúc ban đầu nhưng còn thiếu các chi tiết quan trọng và UI tương tác. Kế hoạch này giúp hoàn thiện tích hợp mà **không bị trùng lặp hay tích hợp thừa code**.

## Phân tích hiện trạng & Đối chiếu (Audit Result)

| Ngày trong READMEBYDATE | Nội dung API / Tính năng | Trạng thái hiện tại trong `kt-fe` | Cần bổ sung / Sửa đổi |
| --- | --- | --- | --- |
| **2026-08-27** | Bổ sung `tagId` trong criteria của `POST /learning/exams/random-questions` | Service `learningCmsService.exams.randomQuestions` đã có, nhưng interface `RandomQuestionCriteria` thiếu field `tagId?: string`. | Thêm `tagId?: string` vào `RandomQuestionCriteria`. |
| **2026-08-27** | Gắn câu hỏi ngẫu nhiên hàng loạt vào Exam (`POST /learning/exams/:id/questions/bulk`) | Service `bulkAttachQuestions` đã có, nhưng chưa có UI cho người dùng cấu hình criteria & preview/bulk attach. | Thêm tính năng "Tạo ngẫu nhiên (Random Criteria)" trong `ManageQuestionsModal.tsx` để nhập số lượng, level, skill, topic, type, tag, xem preview & bấm Bulk Attach. |
| **2026-08-06** | Thêm các trường status lượt thi (`attemptPhase`, `expiresAt`, `firstAttemptResult`, `remainingQuestionCount`, `mastered`, `requiresRemediation`, `taskStatus`) | Interface `Attempt` trong `types/backend.ts` chưa khai báo các trường này. | Bổ sung các trường này vào type `Attempt` trong `types/backend.ts`. |
| **2026-08-06** | Lượt đầu đề thi (`exam` mode): được đổi/sửa đáp án qua `PUT /learning/student/attempts/:attemptId/answers/:questionId` (`saveAnswer`) | Service `saveAnswer` đã có trong `studentLearningService.ts`, nhưng `ExamContainer.tsx` khi đổi câu ở initial exam mode lại đang gọi `submitAnswer` (`POST .../submit`), làm khóa câu hỏi không cho HS sửa lại. | Sửa `ExamContainer.tsx`: Ở lượt đầu của `exam` mode, dùng `saveAnswer` (`PUT`) khi chọn/chuyển câu để học sinh có thể tự do sửa đáp án trước khi bấm "Nộp bài". |
| **2026-08-06** | Hạn giờ đếm ngược tự động khóa bài theo `expiresAt` | `ExamContainer.tsx` dùng `timeRemaining` dựa theo `timeLimit`, chưa tính chênh lệch thời gian còn lại thực tế từ `expiresAt` do BE cấp. | Cập nhật bộ đếm thời gian trong `ExamContainer.tsx` hỗ trợ `expiresAt` để tự động nộp bài khi hết hạn. |
| **2026-08-06** | Cho phép retry làm lại các câu chưa mastered/cần ôn tập | `StudentMyExams.tsx` đang coi `attemptsCount >= 1` của `exam` là kết thúc hoàn toàn, không hiển thị nút "Làm lại câu sai / Ôn tập tiếp" khi `requiresRemediation === true` hoặc `mastered === false`. | Cập nhật `StudentMyExams.tsx` hiển thị trạng thái `requiresRemediation` / `mastered` và cho phép học sinh ôn tập tiếp các câu chưa đạt 100%. |

---

## User Review Required

> [!IMPORTANT]
> - Mọi thay đổi đều giữ nguyên các API contract hiện có và kế thừa code dịch vụ đã viết sẵn ở `studentLearningService.ts` và `learningCmsService.ts`.
> - Giao diện "Tạo câu hỏi ngẫu nhiên" sẽ được tích hợp sẵn dưới dạng 1 tab/chế độ trong Modal cấu hình câu hỏi đề thi (`ManageQuestionsModal.tsx`), hỗ trợ xem preview trước khi bulk attach vào DB.

---

## Proposed Changes

### Component 1: Update Types (`src/types`)

#### [MODIFY] [learning.ts](file:///c:/Users/Admin/kt-fe/src/types/learning.ts)
- Bổ sung `tagId?: string` vào `RandomQuestionCriteria`.

#### [MODIFY] [backend.ts](file:///c:/Users/Admin/kt-fe/src/types/backend.ts)
- Bổ sung các field mới vào interface `Attempt`:
  - `attemptPhase?: "initial" | "remediation"`
  - `expiresAt?: string | null`
  - `firstAttemptResult?: { score?: string; percentage?: string; displayResult?: string; submittedAt?: string } | null`
  - `remainingQuestionCount?: number`
  - `mastered?: boolean`
  - `requiresRemediation?: boolean`
  - `taskStatus?: "in_progress" | "mastered" | "remediation_required"`

---

### Component 2: Admin CMS Random Questions UI (`src/pages/profilePage/admin/learningCms`)

#### [MODIFY] [ManageQuestionsModal.tsx](file:///c:/Users/Admin/kt-fe/src/pages/profilePage/admin/learningCms/components/modals/ManageQuestionsModal.tsx)
- Bổ sung tab/chuyển đổi giữa **"Chọn thủ công"** và **"Tạo ngẫu nhiên (Random Criteria)"**.
- Ở chế độ Tạo ngẫu nhiên:
  - Cho phép người dùng chọn các bộ lọc: Số lượng câu (`count`), Trình độ (`levelId`), Kỹ năng (`skillId`), Chủ đề (`topicId`), Loại câu hỏi (`type`), Thẻ gắn (`tagId`).
  - Gọi API `learningCmsService.exams.randomQuestions` để lấy preview danh sách câu hỏi theo từng tiêu chí.
  - Hiển thị preview câu hỏi tìm được kèm nút **"Thêm tất cả vào đề thi (Bulk Attach)"** calling `learningCmsService.exams.bulkAttachQuestions`.

---

### Component 3: Student Learning & Exam Logic (`src/pages/coursePage` & `src/pages/profilePage/student`)

#### [MODIFY] [ExamContainer.tsx](file:///c:/Users/Admin/kt-fe/src/pages/coursePage/ExamContainer.tsx)
- Cập nhật logic làm bài cho `exam` mode (lượt thi đầu):
  - Khi học sinh chọn/thay đổi câu trả lời hoặc bấm Next/chọn câu từ grid, gọi `studentLearningService.attempts.saveAnswer` (`PUT /learning/student/attempts/:attemptId/answers/:questionId`) thay vì `submitAnswer`.
  - Không khóa câu hỏi ở lượt thi đầu `exam` mode, cho phép quay lại chỉnh sửa đáp án bất kỳ lúc nào trước khi nộp bài.
  - Khi đếm ngược thời gian, kiểm tra `attempt.expiresAt` (nếu có) để tính chính xác số giây còn lại và tự động nộp bài khi hết giờ.

#### [MODIFY] [StudentMyExams.tsx](file:///c:/Users/Admin/kt-fe/src/pages/profilePage/student/StudentMyExams.tsx)
- Cập nhật hiển thị kết quả bài thi:
  - Hiển thị badge trạng thái `Mastered (Đã đạt 100%)` / `Remediation (Cần ôn tập tiếp)`.
  - Cho phép học sinh bấm "Làm lại câu sai / Ôn tập" nếu lượt đầu bài thi chưa đạt 100% (dựa trên `requiresRemediation` / `remainingQuestionCount`), giúp học sinh tiếp tục hoàn thành đợt ôn tập remediation theo đúng quy tắc 2026-08-06.

---

## Verification Plan

### Automated Verification
- Kiểm tra build frontend bằng `npm run build` trong `kt-fe` để đảm bảo không có lỗi TypeScript hay compile failure.

### Manual Verification
1. **Kiểm tra Tạo câu hỏi ngẫu nhiên (2026-08-27)**:
   - Vào Admin CMS -> Đề thi -> Cấu hình câu hỏi.
   - Chuyển sang Tab "Tạo ngẫu nhiên". Chọn bộ lọc bao gồm `Tag`, bấm "Xem trước" -> Kiểm tra danh sách câu hỏi trả về -> Bấm "Thêm vào đề thi" và xác nhận câu hỏi được lưu vào DB đề thi.
2. **Kiểm tra Làm bài kiểm tra lượt 1 (`exam` mode - 2026-08-06)**:
   - Mở 1 Đề kiểm tra (`examType = "exam"`).
   - Chọn đáp án câu 1 -> Chuyển sang câu 2 -> Quay lại câu 1 sửa đáp án -> Xác nhận đáp án được lưu tạm qua `PUT saveAnswer` mà không lộ kết quả đúng/sai.
   - Bấm "Nộp bài" -> Kiểm tra kết quả tổng hợp lượt 1.
3. **Kiểm tra Remediation / Ôn tập lại (2026-08-06)**:
   - Nếu làm chưa đúng 100%, quay ra danh sách bài thi -> Xác nhận hiển thị nút/trạng thái cho phép ôn tập tiếp câu chưa đúng -> Mở lại và làm tuần tự câu sai.

# Yêu Cầu Kỹ Thuật Cho Backend: Hỗ Trợ Đánh Dấu Đã Đọc Thông Báo Bài Thi Được Giao

## 1. Bối cảnh
Ở giao diện học sinh, Quả chuông thông báo hiển thị số lượng bài thi mới được giao. Khi học sinh bấm vào xem hoặc click vào thông báo, cần đánh dấu thông báo này là "đã xem" để số đếm trên quả chuông tự động biến mất và đồng bộ đa thiết bị.

## 2. Giải pháp kỹ thuật đề xuất (Tối ưu nhất)
Tận dụng bảng `exam_assignment_students` sẵn có trong module Learning, không cần tạo bảng mới.

### Bước 1: Migration DB
Bổ sung cột `viewed_at` vào bảng `exam_assignment_students`:
- Tên cột: `viewed_at`
- Kiểu dữ liệu: `timestamptz`, `nullable: true`, mặc định là `null`.

### Bước 2: Bổ sung API Endpoint
Tạo endpoint trong `StudentLearningController`:
- **Method & Route:** `PATCH /api/v1/learning/student/exam-assignments/:assignmentStudentId/seen`
- **Quyền:** Học sinh (Role: `student`).
- **Nghiệp vụ:**
  - Kiểm tra `assignmentStudentId` thuộc về đúng học sinh đang đăng nhập (`user.id` / `student.id`).
  - Cập nhật `viewed_at = new Date()`.
  - Trả về `{ success: true, data: { id, viewedAt } }`.

### Bước 3: Cập nhật API lấy danh sách bài thi của học sinh
Tại endpoint `GET /api/v1/learning/student/exam-assignments`:
- Thêm trường `viewedAt` vào response entity của từng assignment.
- Hỗ trợ thêm query param lọc thông báo mới (optional): `isUnseen=true` (điều kiện `viewed_at IS NULL AND status != 'finished'`).
