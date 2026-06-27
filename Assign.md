# Báo cáo lỗi: Hệ thống Giao bài & Nhận bài thi (HTTP 500 & Mismatch Mappings)

Báo cáo này làm rõ nguyên nhân tại sao cả 2 tab **Giao bài của giáo viên** và **Nhận bài của học sinh** không hiển thị đề thi/lộ trình học tập, mặc dù trong database đã được gán đầy đủ.

---

## 1. Nguyên nhân: Backend trả về HTTP 500 (Lỗi cú pháp TypeORM khi phân trang)

### Mới tả lỗi
Khi truy cập các trang danh sách bài tập, các request gọi API sau đều thất bại với mã lỗi `500 Internal Server Error`:
- `GET /api/v1/learning/student/exam-assignments?page=1&limit=100`
- `GET /api/v1/learning/student/curriculums?page=1&limit=100`
- `GET /api/v1/learning/teacher/exam-assignments?limit=100`
- `GET /api/v1/learning/teacher/curriculum-assignments?limit=100`

### Chi tiết Stack Trace từ NestJS Server
```text
TypeError: Cannot read properties of undefined (reading 'databaseName')
    at SelectQueryBuilder.createOrderByCombinedWithSelectExpression (SelectQueryBuilder.ts:3748)
    at SelectQueryBuilder.executeEntitiesAndRawResults (SelectQueryBuilder.ts:3492)
    at SelectQueryBuilder.getManyAndCount (SelectQueryBuilder.ts:1874)
    at paginate (pagination.util.ts:20)
    at StudentExamAttemptsService.findAssignments (student-exam-attempts.service.ts:71)
```

### Phân tích kỹ thuật (Root Cause)
1. Trong các file Service, câu truy vấn Query Builder sử dụng sắp xếp theo tên trường database thô:
   `qb.orderBy('assignmentStudent.created_at', 'DESC');`
2. Các service này trả về kết quả qua hàm helper `paginate(qb, query)` để thực hiện phân trang. Hàm này gọi `.skip()` và `.take()` của TypeORM.
3. Khi thực hiện `.skip()`/`.take()`, TypeORM biên dịch câu lệnh phân trang phức tạp (chứa subquery) và bắt buộc phải mapping các trường trong mệnh đề `.orderBy()` ngược lại metadata của Entity class.
4. Tuy nhiên, trong Class Entity (kế thừa từ `BaseEntity`), thuộc tính lưu thời gian tạo là `createdAt` (camelCase), còn `created_at` chỉ là tên cột vật lý dưới Database (`name: 'created_at'`).
5. Vì TypeORM không tìm thấy thuộc tính tên `created_at` trên Entity, đối tượng metadata trả về `undefined`, dẫn tới crash `Cannot read properties of undefined (reading 'databaseName')` trước khi gửi câu lệnh SQL xuống database.

> [!NOTE]
> Các service khác như `users.service.ts` không crash mặc dù dùng `user.created_at` vì chúng không gọi `.skip()`/`.take()` hay hàm `paginate`, giúp TypeORM bỏ qua bước kiểm tra metadata và chuyển thẳng chuỗi thô xuống PostgreSQL.

### Các file cần sửa đổi tại Backend (Đổi `created_at` thành `createdAt` trong `.orderBy()`)

#### 1. File `src/modules/learning/services/student-exam-attempts.service.ts`
Dòng 69:
```diff
-      .orderBy('assignmentStudent.created_at', 'DESC');
+      .orderBy('assignmentStudent.createdAt', 'DESC');
```

#### 2. File `src/modules/learning/services/student-curriculums.service.ts`
Dòng 45:
```diff
-      .orderBy('assignmentStudent.created_at', 'DESC');
+      .orderBy('assignmentStudent.createdAt', 'DESC');
```

#### 3. File `src/modules/learning/services/teacher-exam-assignments.service.ts`
Dòng 114:
```diff
-    qb.orderBy('assignment.created_at', 'DESC');
+    qb.orderBy('assignment.createdAt', 'DESC');
```
Dòng 157:
```diff
-    qb.orderBy('attempt.created_at', 'DESC');
+    qb.orderBy('attempt.createdAt', 'DESC');
```

#### 4. File `src/modules/learning/services/teacher-curriculum-assignments.service.ts`
Dòng 152:
```diff
-    qb.orderBy('assignment.created_at', 'DESC');
+    qb.orderBy('assignment.createdAt', 'DESC');
```

#### 5. File `src/modules/observability/services/request-logs.service.ts`
Dòng 40:
```diff
-      .orderBy('requestLog.created_at', 'DESC');
+      .orderBy('requestLog.createdAt', 'DESC');
```

#### 6. File `src/modules/observability/services/audit-logs.service.ts`
Dòng 59:
```diff
-      .orderBy('auditLog.created_at', 'DESC');
+      .orderBy('auditLog.createdAt', 'DESC');
```

---

## 2. Bổ sung: Thiếu Quan hệ `students` ở API Danh sách của Giáo viên

### Mô tả vấn đề
Tại giao diện quản lý của giáo viên, danh sách bài tập đã giao luôn hiển thị đối tượng là **"Toàn bộ lớp"** kể cả khi giáo viên chỉ giao cho 1 học sinh cụ thể (ví dụ: giao riêng cho học sinh `139384`).

### Phân tích kỹ thuật (Root Cause)
Hàm `findAll()` trong cả `TeacherExamAssignmentsService` và `TeacherCurriculumAssignmentsService` trả về danh sách các assignment, nhưng câu lệnh Query Builder của 2 hàm này chỉ join `exam`/`curriculum`, `class`, và `teacher`, mà bỏ quên không join quan hệ `students` (tức là `assignment.students`).
- Do đó, đối tượng trả về từ API không chứa trường `students` (là `undefined`).
- Frontend kiểm tra `record.studentIds` và `record.students` đều không thấy dữ liệu nên mặc định coi như giao bài cho toàn bộ lớp.

### Các file cần sửa đổi tại Backend (Bổ sung `.leftJoinAndSelect('assignment.students', 'students')`)

#### 1. File `src/modules/learning/services/teacher-exam-assignments.service.ts`
Hàm `findAll()`:
```diff
    const qb = this.dataSource
      .getRepository(ExamAssignment)
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.exam', 'exam')
      .leftJoinAndSelect('assignment.class', 'class')
      .leftJoinAndSelect('assignment.teacher', 'teacher')
+     .leftJoinAndSelect('assignment.students', 'students')
      .where('assignment.is_active = true');
```

#### 2. File `src/modules/learning/services/teacher-curriculum-assignments.service.ts`
Hàm `findAll()`:
```diff
    const qb = this.dataSource
      .getRepository(CurriculumAssignment)
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.curriculum', 'curriculum')
      .leftJoinAndSelect('assignment.class', 'class')
      .leftJoinAndSelect('assignment.teacher', 'teacher')
+     .leftJoinAndSelect('assignment.students', 'students')
      .where('assignment.is_active = true');
```

