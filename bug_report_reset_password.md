# Báo cáo lỗi: API Reset Password trả về HTTP 409 (Conflict)

## 1. Mô tả hiện tượng
Khi Admin thực hiện tính năng **Khôi phục mật khẩu (Reset Password)** tài khoản học sinh ở màn hình quản trị, hệ thống báo lỗi **`POST http://localhost:5173/api/v1/auth/reset-password 409 (Conflict)`**.

---

## 2. Phân tích & Dẫn chứng phía Frontend (Xử lý đúng)
Frontend đã gửi đúng và đủ theo định dạng DTO yêu cầu của Backend:
* **API Endpoint**: `POST /api/v1/auth/reset-password`
* **Payload gửi lên**: `{ "identifier": "139384" }` (mã số định danh của học sinh dạng `string`).
* **Mã nguồn Frontend gọi API**:
  Tại file [centerManagement.tsx](file:///c:/Users/Admin/kt-fe/src/pages/profilePage/admin/centerManagement.tsx#L540):
  ```typescript
  const result = await authService.resetPassword({
    identifier: resetPasswordUser.code, // "139384"
  });
  ```
* **Đối chiếu DTO phía Backend**:
  Tại file [reset-password.dto.ts](file:///C:/Users/Admin/kata_edu-be/src/modules/auth/dto/reset-password.dto.ts):
  ```typescript
  export class ResetPasswordDto {
    @IsString()
    identifier!: string;
  }
  ```
  => Frontend truyền đúng cấu trúc DTO nên request đã đi qua được tầng Validation (`ValidationPipe`) của NestJS thành công (nếu sai cấu trúc sẽ nhận lỗi `400 Bad Request` chứ không lỗi `409`).

---

## 3. Nguyên nhân lỗi phía Backend (Lỗi cú pháp truy vấn Database)

### Vị trí code lỗi
Tại file [auth.service.ts](file:///C:/Users/Admin/kata_edu-be/src/modules/auth/auth.service.ts#L192):
```typescript
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.hashedPassword')
      .where('user.is_active = true')
      .andWhere('(user.code = :identifier OR user.id::text = :identifier)', { // <-- LỖI Ở ĐÂY
        identifier: dto.identifier,
      })
      .getOne();
```

### Phân tích chi tiết câu lệnh SQL được sinh ra
Khi câu lệnh trên thực thi, TypeORM dịch đoạn điều kiện `andWhere` thành SQL như sau:
```sql
SELECT ... 
FROM "users" "user" 
WHERE "user"."is_active" = true 
  AND ("user"."code" = $1 OR user.id::text = $1)
```

1. **Từ khóa dự trữ (Reserved Keyword)**: 
   Trong cơ sở dữ liệu PostgreSQL, `user` là một từ khóa dự trữ của hệ thống (dùng để lấy thông tin session user hiện tại). Để dùng nó làm alias cho bảng, bắt buộc phải bọc trong dấu nháy kép `"user"`.
2. **TypeORM bỏ sót việc bọc nháy kép**:
   * Với thuộc tính thông thường `user.code`, TypeORM tự động biên dịch thành `"user"."code"`.
   * Tuy nhiên, với biểu thức có sử dụng toán tử ép kiểu của PostgreSQL là `user.id::text`, TypeORM nhận diện đây là một biểu thức SQL thô (raw SQL expression) nên đã truyền trực tiếp chuỗi `user.id::text` xuống PostgreSQL mà không tự bọc dấu nháy kép cho từ khóa `user`.
3. **Phản hồi lỗi từ PostgreSQL**:
   Khi PostgreSQL parse câu truy vấn trên, nó hiểu `user.id` thành `CURRENT_USER.id` và báo lỗi cú pháp **`42601 (syntax error at or near ".")`** ngay lập tức ở bước compile query (trước khi đánh giá dữ liệu đầu vào).
4. **Tại sao lỗi cú pháp lại trả về HTTP 409 (Conflict)?**
   Tại file [all-exceptions.filter.ts](file:///C:/Users/Admin/kata_edu-be/src/common/filters/all-exceptions.filter.ts#L53):
   Bộ lọc lỗi của hệ thống bắt toàn bộ lỗi phát sinh từ tầng DB (`QueryFailedError`) và tự động chuẩn hóa (map) thành HTTP Status `409 (HttpStatus.CONFLICT)` với mã lỗi `DATABASE_CONSTRAINT_ERROR`.

---

## 4. Cách khắc phục ở Backend
Cần sửa lại biểu thức điều kiện trong Query Builder tại file [auth.service.ts](file:///C:/Users/Admin/kata_edu-be/src/modules/auth/auth.service.ts#L192), chủ động bọc dấu nháy kép cho bảng `"user"` để tránh xung đột với từ khóa của PostgreSQL:

```diff
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.hashedPassword')
      .where('user.is_active = true')
-     .andWhere('(user.code = :identifier OR user.id::text = :identifier)', {
+     .andWhere('(user.code = :identifier OR "user".id::text = :identifier)', {
        identifier: dto.identifier,
      })
      .getOne();
```
