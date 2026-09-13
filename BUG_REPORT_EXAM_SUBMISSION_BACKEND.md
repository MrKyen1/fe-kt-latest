# BÁO CÁO LỖI BACKEND: KHÔNG THỂ NỘP CÂU TRẢ LỜI VÀ NỘP BÀI THI DO LỖI POSTGRESQL "FOR UPDATE" TRÊN OUTER JOIN

---

## 1. Tóm tắt vấn đề (Issue Summary)

* **Endpoints bị ảnh hưởng:**
  * `POST /api/v1/learning/student/attempts/:attemptId/answers/:questionId/submit` (Nộp/chấm từng câu)
  * `POST /api/v1/learning/student/attempts/:attemptId/submit` (Nộp toàn bộ bài thi)
* **Tài khoản ghi nhận lỗi thực tế:**
  * Học sinh: **Ngô Đăng Kiên 1** (`user: KE000002` / `pass: 00000000`)
  * Đề thi: **Kiểm tra giữa kì** (`examType: practice`, mã đề `Exam01`)
  * Attempt ID: `01a08f1f-a967-7036-89cc-1bee6bea945f`
* **Hiện tượng:**
  * Khi học sinh nộp câu trả lời hoặc nộp bài thi, Backend trả về mã lỗi **HTTP 409 Conflict**:
    ```json
    {
      "success": false,
      "statusCode": 409,
      "errorCode": "DATABASE_CONSTRAINT_ERROR",
      "message": "Dữ liệu bị trùng hoặc vi phạm ràng buộc"
    }
    ```
  * **Hậu quả:** Toàn bộ transaction bị `ROLLBACK`. Không có câu trả lời nào được lưu vào database (`answer = null`, `answered_at = null`), trạng thái attempt vẫn giữ nguyên `in_progress`, điểm số là `0.00`. Học sinh sau khi hoàn thành bài không thể xem lại kết quả và hệ thống không ghi nhận hoàn thành bài thi.

---

## 2. Phân tích nguyên nhân kỹ thuật chi tiết (Root Cause Analysis)

### A. Lỗi cú pháp khóa PostgreSQL: `FOR UPDATE cannot be applied to the nullable side of an outer join`
* **Vị trí file:** `src/modules/learning/services/student-exam-attempts.service.ts`
* **Hàm gây lỗi:** `loadManagedAttemptForUpdate` (dòng 1050 - 1065)
* **Đoạn mã hiện tại:**
  ```typescript
  private async loadManagedAttemptForUpdate(
    manager: EntityManager,
    attemptId: string,
  ) {
    const attempt = await manager.getRepository(ExamAttempt).findOne({
      where: { id: attemptId },
      relations: {
        answers: true,
        assignment: { class: true },
        curriculumAssignmentStudent: {
          assignment: { curriculum: true, class: true },
        },
      },
      order: { answers: { orderIndex: 'ASC' } },
      lock: { mode: 'pessimistic_write' }, // <-- NGUYÊN NHÂN LỖI
    });
    if (!attempt) throw new NotFoundException('Không tìm thấy lượt làm bài');
    return attempt;
  }
  ```

* **Cơ chế phát sinh lỗi:**
  1. Khi dùng TypeORM `findOne` kết hợp `relations` và `lock: { mode: 'pessimistic_write' }`, TypeORM sẽ sinh ra câu lệnh SQL có các mệnh đề `LEFT JOIN` (outer join) tới `exam_assignments`, `curriculum_assignment_students`, `classes`,... và thêm `FOR UPDATE` vào cuối câu query.
  2. Đối với bài thi được giao từ giáo viên (teacher assigned), trường `curriculum_assignment_student_id` mang giá trị `NULL`. Ngược lại đối với bài thi lộ trình, `assignment_id` mang giá trị `NULL`.
  3. **Quy tắc của PostgreSQL:** PostgreSQL nghiêm cấm đặt khóa `FOR UPDATE` trên các bảng nằm ở phía nullable của một phép `OUTER JOIN` (`LEFT JOIN`).
  4. Trích xuất trực tiếp từ log của PostgreSQL (`postgresql-2026-09-12_000000.log`):
     ```text
     ERROR: FOR UPDATE cannot be applied to the nullable side of an outer join
     STATEMENT: SELECT ... FROM "exam_attempts" "ExamAttempt" 
                LEFT JOIN "exam_attempt_answers" ... 
                LEFT JOIN "curriculum_assignment_students" ... 
                WHERE (("ExamAttempt"."id" = $1)) FOR UPDATE
     ```

---

### B. Exception Filter che giấu lỗi hệ thống thành HTTP 409
* **Vị trí file:** `src/common/filters/all-exceptions.filter.ts` (dòng 47 - 54)
* **Đoạn mã hiện tại:**
  ```typescript
  private normalizeException(exception: unknown): NormalizedError {
    if (exception instanceof QueryFailedError) {
      return {
        statusCode: HttpStatus.CONFLICT,
        errorCode: 'DATABASE_CONSTRAINT_ERROR',
        message: 'Dữ liệu bị trùng hoặc vi phạm ràng buộc',
        details: undefined,
      };
    }
  ```
* Lớp filter bắt mọi ngoại lệ `QueryFailedError` và ngộ nhận là lỗi ràng buộc dữ liệu (`409 Conflict`), đồng thời xóa sạch `details` và không log lỗi (vì `statusCode < 500`). Điều này che giấu lỗi truy vấn SQL thực tế, khiến cả phía Frontend và đội ngũ kiểm thử đều hiểu nhầm bản chất lỗi.

---

## 3. Giải pháp khắc phục đề xuất cho Backend (Action Items)

### Bước 1: Sửa hàm `loadManagedAttemptForUpdate` trong `student-exam-attempts.service.ts`

Tách riêng việc khóa hàng `ExamAttempt` bằng câu lệnh đơn (không kèm join), sau đó nạp quan hệ bằng hàm `loadAttemptInTransaction` đã có sẵn:

```typescript
// Sửa tại: src/modules/learning/services/student-exam-attempts.service.ts
private async loadManagedAttemptForUpdate(
  manager: EntityManager,
  attemptId: string,
) {
  // 1. Khóa bi quan (pessimistic write) chỉ trên bảng chính exam_attempts (không join relation)
  // Câu lệnh sinh ra: SELECT ... FROM exam_attempts WHERE id = $1 FOR UPDATE (an toàn 100% trong Postgres)
  const locked = await manager.getRepository(ExamAttempt).findOne({
    where: { id: attemptId },
    lock: { mode: 'pessimistic_write' },
  });
  if (!locked) throw new NotFoundException('Không tìm thấy lượt làm bài');

  // 2. Nạp đầy đủ relations trong cùng transaction bằng hàm không có khóa FOR UPDATE
  return this.loadAttemptInTransaction(manager, attemptId);
}
```

> **Lưu ý:** Khóa `FOR UPDATE` trên dòng `exam_attempts` vẫn được PostgreSQL duy trì xuyên suốt cho tới khi transaction kết thúc (`COMMIT` hoặc `ROLLBACK`), đảm bảo tính toàn vẹn và chống race condition hoàn toàn như thiết kế ban đầu.

---

### Bước 2 (Khuyến nghị): Cải thiện `all-exceptions.filter.ts`

Phân biệt lỗi `QueryFailedError` do vi phạm ràng buộc (Unique constraint code `23505`, Foreign key code `23503`) với các lỗi truy vấn khác (Cú pháp `42601`, Feature Not Supported `0A000`):

```typescript
// Gợi ý tại: src/common/filters/all-exceptions.filter.ts
if (exception instanceof QueryFailedError) {
  const driverError = (exception as any).driverError;
  const pgCode = driverError?.code;

  // Chỉ trả về 409 nếu thực sự vi phạm Unique hoặc Foreign key constraint
  if (pgCode === '23505' || pgCode === '23503') {
    return {
      statusCode: HttpStatus.CONFLICT,
      errorCode: 'DATABASE_CONSTRAINT_ERROR',
      message: 'Dữ liệu bị trùng hoặc vi phạm ràng buộc',
      details: driverError?.detail,
    };
  }

  // Các lỗi truy vấn DB khác phải coi là lỗi 500 để được log ra hệ thống
  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    errorCode: 'DATABASE_QUERY_ERROR',
    message: 'Lỗi thực thi truy vấn cơ sở dữ liệu',
    details: process.env.NODE_ENV !== 'production' ? driverError?.message : undefined,
  };
}
```

---

## 4. Cách tái hiện lỗi (Steps to Reproduce)

Chạy script Node.js dưới đây để kiểm chứng lỗi hiện tại trên Backend:

```javascript
// reproduce_issue.js
async function reproduce() {
  // 1. Đăng nhập học sinh KE000002
  const loginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'KE000002', password: '00000000' })
  });
  const { data: { accessToken } } = await loginRes.json();
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  };

  const attemptId = '01a08f1f-a967-7036-89cc-1bee6bea945f';
  const questionId = '01a084ba-db5d-7158-b302-ea6298108445';
  const selectedOptionId = '01a084ba-db63-7790-8514-b9ad7b7e48e3';

  // 2. Nộp câu trả lời
  console.log('Sending submit answer request...');
  const res = await fetch(`http://localhost:3000/api/v1/learning/student/attempts/${attemptId}/answers/${questionId}/submit`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ answer: { selectedOptionIds: [selectedOptionId] } })
  });

  console.log('Response Status:', res.status);
  console.log('Response Body:', await res.json());
  // Hiện tại trả về 409 DATABASE_CONSTRAINT_ERROR
  // Sau khi sửa Bước 1, sẽ trả về 200/201 với dữ liệu chấm điểm chính xác.
}

reproduce().catch(console.error);
```
