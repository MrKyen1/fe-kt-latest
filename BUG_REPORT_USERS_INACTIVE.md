# BÁO CÁO LỖI: API `GET /users` KHÔNG TRẢ VỀ NGƯỜI DÙNG INACTIVE

---

## 1. Tóm tắt vấn đề (Issue Summary)

* **Endpoint:** `GET /api/v1/users`
* **Hiện tượng:** Phía Frontend gửi request kèm tham số `isActive=false` (ví dụ: `GET /api/v1/users?roleCode=student&isActive=false`), nhưng Backend **vẫn trả về danh sách người dùng `is_active = true`**. Hệ thống hoàn toàn không thể lấy được danh sách tài khoản đã nghỉ / vô hiệu hóa (`inactive`).

---

## 2. Phân tích nguyên nhân kỹ thuật (Root Cause Analysis)

### Nguyên nhân 1: Lỗi ép kiểu DTO với `@Type(() => Boolean)` (Nghiêm trọng nhất)

* **File:** `src/modules/users/dto/user-query.dto.ts`
* **Đoạn mã hiện tại:**
  ```typescript
  export class UserQueryDto {
    @ApiPropertyOptional({ type: Boolean })
    @IsOptional()
    @Type(() => Boolean) // <-- NGUYÊN NHÂN LỖI
    @IsBoolean()
    isActive?: boolean;
    ...
  }
  ```
* **Giải thích cơ chế lỗi:**
  - Trong giao thức HTTP, tất cả query parameter từ URL (`req.query`) gửi lên qua request GET đều có kiểu dữ liệu là chuỗi (`string`).
  - Khi Frontend gửi `?isActive=false`, Backend nhận được giá trị `req.query.isActive = "false"`.
  - Decorator `@Type(() => Boolean)` của thư viện `class-transformer` sẽ thực hiện hàm ép kiểu JavaScript:
    ```javascript
    Boolean("false") // Kết quả: TRUE
    ```
    *(Trong JavaScript, bất kỳ chuỗi ký tự nào khác rỗng `""` đều là truthy, kể cả chuỗi `"false"` hoặc chuỗi `"0"`).*
  - Do đó, `query.isActive` luôn bị chuyển đổi thành giá trị boolean `true`.
  - Trong `users.service.ts`:
    ```typescript
    .where('user.is_active = :isActive', {
      isActive: query.isActive ?? true,
    });
    ```
    Câu truy vấn SQL luôn được tạo thành:
    ```sql
    WHERE user.is_active = true
    ```
  - **Hệ quả:** Dù Frontend truyền `isActive=false` hay `isActive=true`, Backend đều chỉ trả về các tài khoản đang hoạt động (`is_active = true`).

---

### Nguyên nhân 2: Lọc cứng điều kiện `is_active = true` ở bảng quan hệ lớp học

* **File:** `src/modules/users/users.service.ts` (hàm `findAll`)
* **Đoạn mã hiện tại:**
  ```typescript
  .leftJoinAndSelect(
    'student.classes',
    'studentClass',
    'studentClass.is_active = true', // <-- Lọc cứng
  )
  .leftJoinAndSelect('studentClass.class', 'studentClassEntity')
  .leftJoinAndSelect('studentClassEntity.center', 'studentClassCenter')
  .leftJoinAndSelect(
    'teacher.classes',
    'teacherClass',
    'teacherClass.is_active = true', // <-- Lọc cứng
  )
  ```
* **Giải thích cơ chế lỗi:**
  - Khi học sinh hoặc giáo viên nghỉ việc/nghỉ học (bị inactive), quan hệ lớp học của họ (`student_classes`, `teacher_classes`) có thể bị đánh dấu `is_active = false`.
  - Do query builder join cứng điều kiện `is_active = true`, dữ liệu trả về của user inactive sẽ có `classes: []` (mảng rỗng).
  - Do bảng `users` không có cột `center_id` trực tiếp mà phụ thuộc vào trung tâm của lớp học (`studentClassEntity.center`), việc mất toàn bộ thông tin lớp khiến Frontend không thể xác định user này từng thuộc trung tâm nào để hiển thị trong danh sách của trung tâm đó.

---

## 3. Hướng dẫn sửa đổi đề xuất (Proposed Solutions)

### Bước 1: Sửa DTO `user-query.dto.ts`

Thay thế `@Type(() => Boolean)` bằng decorator `@Transform` để parse chuỗi `"true"` / `"false"` một cách chính xác:

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class UserQueryDto {
  @ApiPropertyOptional({ 
    type: Boolean, 
    description: 'Lọc theo trạng thái hoạt động: true (đang hoạt động), false (đã nghỉ/vô hiệu hóa). Bỏ trống = tất cả' 
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true || value === '1' || value === 1) return true;
    if (value === 'false' || value === false || value === '0' || value === 0) return false;
    return undefined;
  })
  @IsBoolean()
  isActive?: boolean;

  // ... các trường khác giữ nguyên
}
```

---

### Bước 2: Sửa câu lệnh truy vấn trong `users.service.ts`

1. **Điều kiện lọc `isActive`:** Chỉ áp dụng điều kiện lọc `is_active` khi `query.isActive` được truyền lên (có giá trị `boolean`), tránh ép cứng mặc định nếu Admin muốn xem tất cả:

```typescript
// Thay vì .where('user.is_active = :isActive', { isActive: query.isActive ?? true })
if (query.isActive !== undefined) {
  qb.andWhere('user.is_active = :isActive', { isActive: query.isActive });
}
```

2. **Giữ lại liên kết lớp học cho mục đích quản lý:**
   Đối với màn hình quản lý Dashboard, nên trả về các lớp học (kèm cờ `isActive` của lớp học đó) để Frontend có thể hiển thị lịch sử lớp và trung tâm gốc của tài khoản đã nghỉ:

```typescript
.leftJoinAndSelect('student.classes', 'studentClass')
.leftJoinAndSelect('studentClass.class', 'studentClassEntity')
.leftJoinAndSelect('studentClassEntity.center', 'studentClassCenter')
.leftJoinAndSelect('teacher.classes', 'teacherClass')
.leftJoinAndSelect('teacherClass.class', 'teacherClassEntity')
.leftJoinAndSelect('teacherClassEntity.center', 'teacherClassCenter')
```

---

## 4. Kịch bản kiểm thử sau khi sửa (Verification)

1. **Test lấy tài khoản Inactive:**
   ```http
   GET /api/v1/users?roleCode=student&isActive=false
   ```
   * **Kỳ vọng:** Trả về danh sách học sinh có `isActive: false` (hoặc `endDate` trong quá khứ).
2. **Test lấy tài khoản Active:**
   ```http
   GET /api/v1/users?roleCode=student&isActive=true
   ```
   * **Kỳ vọng:** Trả về danh sách học sinh có `isActive: true`.
3. **Kiểm tra thông tin lớp & trung tâm:**
   * Các tài khoản inactive vẫn có thông tin `classes` và `center` liên kết để Frontend hiển thị đúng thuộc trung tâm nào.
