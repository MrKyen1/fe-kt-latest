# TÀI LIỆU QUY CHUẨN LOGIC: ĐỀ THI (EXAM) VS ĐỀ ÔN TẬP (PRACTICE)

> **Mục đích**: Làm rõ sự khác biệt giữa hai hình thức bài giao (Đề thi vs Đề ôn tập), chỉ ra lỗi nhầm lẫn logic trước đây và hướng dẫn giải pháp xử lý triệt để trên Backend & Frontend.

---

## 1. Định nghĩa & Bản chất bài thi

| Tiêu chí | Đề thi / Kiểm tra (`exam`) | Đề ôn tập / Luyện tập (`practice`) |
| :--- | :--- | :--- |
| **Mục đích** | Đánh giá năng lực, chấm điểm chính thức | Rèn luyện kiến thức, học tập hướng làm chủ (Mastery Learning) |
| **Số cơ hội làm bài** | **Duy nhất 1 lần** (`attemptNumber = 1`) | **Nhiều lần** (làm lại các câu sai cho tới khi nắm vững) |
| **Điều kiện tính là Hoàn thành (`finished`)** | **Ngay khi nộp bài** (`submitted`), bất kể điểm số là 0%, 50% hay 100% | **Phải đạt 100%** (làm đúng toàn bộ các câu hỏi trong đề) |
| **Trạng thái khi điểm < 100%** | Vẫn là **`finished`** (Đã hoàn thành lượt thi và đã có điểm) | Là **`in_progress`** (Đang làm dở, học sinh cần tiếp tục làm lại) |
| **Quyền làm lại (`retake`)** | **Bị chặn tuyệt đối** (không được tạo attempt mới) | **Được phép** (tạo attempt tiếp theo với danh sách câu chưa làm đúng) |
| **Hiển thị cho Giáo viên** | `Đã hoàn thành (Điểm: X/Y - Z%)` | `Đã hoàn thành (100%)` hoặc `Đang làm (Đã nộp: Z% - Cần ôn tiếp)` |

---

## 2. Phân tích nguyên nhân lỗi logic trước đây

Trong hàm tính toán tiến độ `recomputeAssignmentStudentProgress` của `student-exam-attempts.service.ts`:

```typescript
// ❌ ĐOẠN CODE CŨ GÂY LỖI:
const submitted = await manager.getRepository(ExamAttempt).find({
  where: {
    assignmentStudentId,
    status: ExamAttemptStatus.SUBMITTED,
  },
});
const masteredExamIds = new Set<string>();
for (const item of submitted) {
  // ⚠️ LỖI: Luôn đòi hỏi percentage >= 100 mới coi là hoàn thành!
  if (Number(item.percentage) >= 100) masteredExamIds.add(item.examId);
}
```

### Hệ quả:
1. Bạn học sinh **Ngô Đăng Kiên 1** làm Đề thi `Toán 6` (loại `exam`, thời gian 15 phút), nộp bài được **0/1 (0%)**:
   - Backend kiểm tra thấy `0% < 100%` nên **KHÔNG** đưa bài thi vào `masteredExamIds`.
   - Dẫn đến `assignmentStudent.status` bị gán là `'in_progress'`, `finishedExamsCount = 0`.
2. Trên màn hình Giáo viên:
   - **Tổng quan** đếm theo số học sinh đã nộp ít nhất 1 bài $\rightarrow$ Hiện **2/2**.
   - **Chi tiết học sinh** lại hiển thị Kiên 1 là **"Đang làm"** (thay vì "Đã nộp bài / Đã hoàn thành").

---

## 3. Giải pháp chuẩn đã triển khai

### A. Backend (`student-exam-attempts.service.ts`)

#### 1. Sửa hàm tính toán tiến độ `recomputeAssignmentStudentProgress`:
```typescript
const masteredExamIds = new Set<string>();
for (const item of submitted) {
  // ✅ Đề thi (EXAM): Học sinh chỉ làm 1 lần, đã nộp bài là hoàn thành (bất kể điểm số).
  // ✅ Đề ôn tập (PRACTICE): Phải làm tới khi đạt 100% mới tính là hoàn thành.
  if (
    item.examTypeSnapshot === ExamType.EXAM ||
    Number(item.percentage) >= 100
  ) {
    masteredExamIds.add(item.examId);
  }
}
```

#### 2. Chặn học sinh làm lại khi đã nộp Đề thi (`startAssignmentExamAttempt`):
```typescript
const examVersion = await this.loadExamVersion(manager, examVersionId);
const isExam =
  (examVersion?.examType ?? ExamType.PRACTICE) === ExamType.EXAM ||
  assignmentStudent.maxAttempts === 1;

const submittedCount = await this.countSubmittedAttempts(manager, scope);

// ✅ Nếu là Đề thi và đã nộp 1 lần -> Chặn không cho làm lại
if (isExam && submittedCount >= 1) {
  throw new ConflictException(
    'Đề thi chỉ được làm 1 lần và bạn đã hoàn thành bài thi',
  );
}
this.ensureAttemptsRemaining(
  assignmentStudent.maxAttempts,
  submittedCount,
);
```

#### 3. Đồng bộ tương tự cho bài thi trong Giáo trình (`updateCurriculumProgress`):
```typescript
const isExam = attempt.examTypeSnapshot === ExamType.EXAM;
const mastered = isExam || Number(best.percentage) >= 100;
progress.status = mastered
  ? CurriculumExamProgressStatus.FINISHED
  : CurriculumExamProgressStatus.IN_PROGRESS;
```

---

### B. Frontend (`TeacherAssignments.tsx`)

1. **Nhận diện chế độ bài giao**:
   ```typescript
   const isExamType = useMemo(() => {
     if (assignmentDetail?.maxAttempts === 1) return true;
     if (assignmentDetail?.exams?.some((e: any) => e.exam?.examType === "exam")) return true;
     if (attemptsList?.some((a: any) => a.examType === "exam" || a.examTypeSnapshot === "exam")) return true;
     return false;
   }, [assignmentDetail, attemptsList]);
   ```

2. **Hiển thị trạng thái học sinh chuẩn xác**:
   - **Nếu là Đề thi (`isExamType = true`)**:
     - Học sinh đã nộp $\rightarrow$ `<Tag color="success">Đã hoàn thành (Điểm: X%)</Tag>`.
     - Học sinh đang làm $\rightarrow$ `<Tag color="warning">Đang làm bài</Tag>`.
     - Học sinh chưa làm $\rightarrow$ `<Tag color="default">Chưa bắt đầu</Tag>`.
   - **Nếu là Đề ôn tập (`isExamType = false`)**:
     - Đã đạt 100% $\rightarrow$ `<Tag color="success">Đã hoàn thành (100%)</Tag>`.
     - Đã nộp nhưng < 100% $\rightarrow$ `<Tag color="cyan">Đã nộp (X%)</Tag> Cần ôn tập tiếp tới 100%`.
     - Đang làm $\rightarrow$ `<Tag color="warning">Đang làm bài</Tag>`.
     - Chưa làm $\rightarrow$ `<Tag color="default">Chưa bắt đầu</Tag>`.

3. **Giao diện Modal thống kê**:
   - Gắn nhãn phân biệt trực tiếp trên tiêu đề:
     - `Đề kiểm tra (1 lần duy nhất)` (Màu tím)
     - `Đề ôn tập (Làm lại tới khi 100%)` (Màu xanh dương)
   - Thẻ KPI "Đã hoàn thành" và bộ lọc học sinh đồng bộ chính xác giữa Tab Tổng quan và Tab Chi tiết.
