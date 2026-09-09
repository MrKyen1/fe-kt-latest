# BÁO CÁO KỸ THUẬT & KẾ HOẠCH PHỐI HỢP REVIEW VỚI BACKEND DEV
## Vấn đề: Không hiển thị danh sách lớp học và chuyên môn mà Giáo viên phụ trách

- **Dự án:** KATA Education System (`kata_edu-be` & `kt-fe`)
- **Đối tượng áp dụng:** Role Giáo viên (`teacher`)
- **Người lập báo cáo:** Frontend Team / Pair Programming Agent
- **Ngày lập:** 09/09/2026

---

## 1. Mô tả sự cố (Problem Statement)
- Khi giáo viên đăng nhập vào hệ thống và mở tính năng **Quản lý giao bài** (`/teacher/assignments`):
  - Mở modal **"Giao Bài Thi Mới"**, ô chọn **"Lớp học"** hiển thị **"No data"**.
  - Không thể chọn lớp học mà giáo viên phụ trách để lọc danh sách bài thi theo môn học, dẫn tới không thể giao bài hoặc bị lỗi 400 (`Lớp không thuộc cùng môn học với bài thi` / `Giáo viên không phụ trách lớp này`).

---

## 2. Phân tích nguyên nhân gốc rễ (Root Cause Analysis - RCA)

Hệ thống xảy ra chuỗi đứt gãy luồng dữ liệu (Data Flow Breakdown) từ Backend tới Frontend qua 4 chốt chặn sau:

```
[User Login / Reload]
        │
        ▼
[GET /auth/me] ──────────► Backend KHÔNG load quan hệ `teacher.classes`
        │                  (Chỉ load `role.permissions`)
        ▼
[Fallback: GET /users/:id] ──► Bị chặn 403 Forbidden
        │                  (UsersController yêu cầu quyền `users.manage`)
        ▼
[Fallback: GET /classes] ────► Bị chặn 403 Forbidden
        │                  (ClassesController yêu cầu quyền `classes.manage`)
        ▼
[Frontend State: allClasses = []]
        │
        ▼
[Dropdown Lớp học báo: "No data"]
```

### Chi tiết các điểm nghẽn mã nguồn (Code Audit):

### 🔴 Điểm nghẽn 1: `GET /auth/me` và `POST /auth/login` không nạp dữ liệu profile
- **Vị trí file backend:** `kata_edu-be/src/modules/auth/auth.service.ts`
- **Hiện trạng:**
  ```typescript
  // kata_edu-be/src/modules/auth/auth.service.ts (dòng 139-152)
  async me(user: RequestUser) {
    const entity = await this.userRepository.findOne({
      where: { id: user.id, isActive: true },
      relations: {
        role: {
          permissions: {
            permission: true,
          },
        },
      },
    });
    if (!entity) throw new NotFoundException('Không tìm thấy người dùng');
    return { data: this.mapAuthUser(entity) };
  }
  ```
  Tương tự trong `buildAuthResponse()` (dòng 224), query chỉ nạp `role` và `permissions`. Quan hệ `teacher` (chứa các lớp học `classes` và chuyên môn `teacherSpecializations`) hoàn toàn bị bỏ trống.

---

### 🔴 Điểm nghẽn 2: Giáo viên không thể tự xem thông tin cá nhân qua `GET /users/:id`
- **Vị trí file backend:** `kata_edu-be/src/modules/users/users.controller.ts`
- **Hiện trạng:**
  ```typescript
  // kata_edu-be/src/modules/users/users.controller.ts (dòng 18-22)
  @ApiBearerAuth()
  @ApiTags('Users')
  @Permissions('users.manage')   // <--- CHẶN TOÀN BỘ CONTROLLER
  @Controller('users')
  export class UsersController {
    @Get(':id')
    findOne(@Param('id') id: string) {
      return this.usersService.findOne(id);
    }
  }
  ```
- **Hậu quả:** Role `teacher` chỉ có quyền `learning.assign` và `learning.manage`, **không có quyền `users.manage`**. Do đó, khi Frontend gọi `GET /users/{currentUserId}` để lấy thông tin các lớp mình dạy thì Backend trả về mã lỗi **`403 Forbidden: Không đủ quyền truy cập`**.

---

### 🔴 Điểm nghẽn 3: Giáo viên không có quyền gọi API danh sách lớp `GET /classes`
- **Vị trí file backend:** `kata_edu-be/src/modules/academic/controllers/classes.controller.ts`
- **Hiện trạng:**
  ```typescript
  // kata_edu-be/src/modules/academic/controllers/classes.controller.ts (dòng 19-21)
  @Permissions('classes.manage')   // <--- CHẶN TOÀN BỘ CONTROLLER
  @Controller('classes')
  export class ClassesController {
    @Get()
    findAll(...) { ... }
  }
  ```
- **Hậu quả:** Giáo viên bị trả về **`403 Forbidden`** khi tải danh sách lớp học của trung tâm.

---

### 🔴 Điểm nghẽn 4: Mâu thuẫn logic nghiệp vụ (Business Rule Conflict)
- Trong nghiệp vụ giao bài tại `kata_edu-be/src/modules/learning/services/class-curriculums.service.ts` (dòng 180-187):
  ```typescript
  const teacherClass = await this.dataSource
    .getRepository(TeacherClass)
    .findOne({
      where: { teacherId: teacher.id, classId, isActive: true },
    });
  if (!teacherClass) {
    throw new ForbiddenException('Giáo viên không phụ trách lớp này');
  }
  ```
- **Nghịch lý:** Backend bắt buộc giáo viên **chỉ được phép giao bài cho lớp mình phụ trách** (`TeacherClass`), nhưng lại **không cung cấp bất kỳ API nào cho giáo viên biết mình đang phụ trách những lớp nào**.

---

## 3. Đề xuất phương án giải quyết (Proposed Solutions)

Chúng tôi đề xuất 2 phương án (có thể kết hợp để hệ thống chuẩn chỉ và bảo mật nhất):

### 🌟 PHƯƠNG ÁN 1 (Khuyến nghị ưu tiên - Chuẩn Restful & Hiệu năng cao nhất)
> **Nạp thông tin `teacher` và `student` ngay trong `GET /auth/me` và `login`**

- **Lợi ích:**
  - Frontend chỉ cần gọi 1 API duy nhất lúc đăng nhập hoặc F5 (`/auth/me`) là có toàn bộ thông tin lớp học và môn dạy của giáo viên.
  - Không phát sinh thêm HTTP round-trip request.
  - Không lo vấn đề phân quyền phức tạp.

- **Backend thực hiện (`kata_edu-be`):**
  Trong `auth.service.ts`, tại 2 hàm `me()` và `buildAuthResponse()`, bổ sung relations tương tự như hàm `findOneEntity` trong `users.service.ts`:
  ```typescript
  relations: {
    role: {
      permissions: {
        permission: true,
      },
    },
    student: {
      classes: {
        class: {
          center: true,
        },
      },
    },
    teacher: {
      classes: {
        class: {
          center: true,
        },
      },
      teacherSpecializations: {
        specialization: true,
      },
      degrees: {
        images: true,
      },
    },
  }
  ```

---

### 🌟 PHƯƠNG ÁN 2 (Bổ sung quyền tự tra cứu Profile bản thân)
> **Cho phép User tự gọi `GET /users/:id` nếu `:id === currentUser.id`**

- **Lợi ích:** Chuẩn mô hình RBAC: Quản trị viên thì xem được mọi user, cá nhân thì luôn xem được hồ sơ của chính mình.
- **Backend thực hiện (`kata_edu-be`):**
  Tách `@Permissions('users.manage')` ở cấp độ Class Controller xuống các action cụ thể (`create`, `update`, `remove`, `findAll`).
  Tại `findOne(@Param('id') id: string, @CurrentUser() currentUser: RequestUser)`:
  ```typescript
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() currentUser: RequestUser) {
    // Nếu là chính mình HOẶC có quyền users.manage thì cho phép
    const isSelf = currentUser.id === id;
    const canManage = currentUser.permissions.includes('users.manage');
    if (!isSelf && !canManage) {
      throw new ForbiddenException('Không đủ quyền truy cập');
    }
    return this.usersService.findOne(id);
  }
  ```

---

### 🌟 PHƯƠNG ÁN 3 (Mở quyền đọc danh sách lớp học)
> **Cho phép giáo viên đọc danh sách lớp qua `GET /classes`**

- Trong `classes.controller.ts`, tách permission:
  - `POST`, `PATCH`, `DELETE`: giữ nguyên `@Permissions('classes.manage')`.
  - `GET /classes`: Cho phép giáo viên (`teacher`) hoặc người có quyền `learning.assign` gọi để tra cứu danh sách lớp thuộc trung tâm của mình.

---

## 4. Kế hoạch phối hợp triển khai (Action Items)

### Phía Backend Dev (`kata_edu-be`)
| Bước | Nhiệm vụ | File cần chỉnh sửa | Thời gian dự kiến |
| :--- | :--- | :--- | :--- |
| **BE-1** | Bổ sung nạp relations `teacher` & `student` trong `me()` và `buildAuthResponse()` | `src/modules/auth/auth.service.ts` | 15 phút |
| **BE-2** | Cho phép user tự xem profile bản thân tại `GET /users/:id` | `src/modules/users/users.controller.ts` | 15 phút |
| **BE-3** | Cho phép giáo viên đọc danh sách lớp tại `GET /classes` | `src/modules/academic/controllers/classes.controller.ts` | 15 phút |
| **BE-4** | Restart service và kiểm tra trả về payload có `teacher.classes` | Swagger / Postman | 10 phút |

### Phía Frontend Dev (`kt-fe`)
| Bước | Nhiệm vụ | File cần chỉnh sửa | Trạng thái |
| :--- | :--- | :--- | :--- |
| **FE-1** | Cập nhật `AuthContext.tsx`: Khi nhận response từ `/auth/me` hoặc đăng nhập, chuyển đổi `user.teacher` thành `teacherProfile` có danh sách `classes` và `specializations` | `src/contexts/AuthContext.tsx` | Đã sẵn sàng cập nhật |
| **FE-2** | Cập nhật `TeacherAssignments.tsx`: Đảm bảo khi `academicService.classes.list()` trả về dữ liệu (hoặc fallback `user.teacherProfile.classes`), nạp đầy đủ danh sách vào Select lớp học | `src/pages/profilePage/teacher/TeacherAssignments.tsx` | Đã hoàn thiện |
| **FE-3** | Kiểm tra hiển thị lớp học kèm chuyên môn trên modal giao bài thi | Trình duyệt | Đang chờ BE |

---

## 5. Kịch bản kiểm thử nghiệm thu (Acceptance Criteria)

1. **Test Case 1: Đăng nhập tài khoản Giáo viên**
   - Đăng nhập tài khoản giáo viên (VD: `Chu Bá Thông`).
   - Gọi API `/auth/me`, payload trả về có chứa trường `teacher.classes` danh sách các lớp giáo viên được phân công.
2. **Test Case 2: Mở modal Giao bài thi mới**
   - Nhấn nút "Giao Bài Thi Mới" trong màn hình Quản lý giao bài.
   - Dropdown **"Lớp học"** hiển thị danh sách các lớp giáo viên phụ trách (kèm tên môn học tương ứng, VD: `English 6 (Tiếng Anh)`).
   - Chọn lớp -> Ô **Bài thi** bên dưới tự động lọc đúng các đề thi thuộc môn học của lớp đó.
   - Bấm **"Giao bài thi"** thành công 100%, không bị lỗi `400` hay `403`.
