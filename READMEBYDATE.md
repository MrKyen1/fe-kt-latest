# Kata Edu Backend — Nhật ký thay đổi API theo ngày (hướng dẫn FE)

> Với những thay đổi trước ngày 15/7/2026 hãy đọc file README.md.

File này ghi lại các thay đổi API dành cho Frontend **theo ngày sửa đổi code**, mới nhất ở trên cùng. Nội dung và văn phong hướng dẫn giống `README.md`, nhưng tổ chức theo dòng thời gian để FE dễ theo dõi "hôm đó đổi gì". Contract đầy đủ vẫn tra ở `README.md`.

Mọi response đều bọc trong envelope chuẩn:

```jsonc
// success
{ "success": true, "data": { }, "meta": { }, "requestId": "…", "timestamp": "…" }
// error
{ "success": false, "statusCode": 400, "errorCode": "…", "message": "…",
  "fieldErrors": { }, "path": "…", "requestId": "…", "timestamp": "…" }
```

## 2026-09-18

### 1. Báo cáo lỗi Backend: `GET /api/v1/learning/curriculums/popular` trả về HTTP 500 (DATABASE_QUERY_ERROR)

- **Endpoint bị lỗi:** `GET /api/v1/learning/curriculums/popular?limit=5`
- **Mức độ nghiêm trọng:** Cao (Ảnh hưởng đến khối "Khóa Luyện Thi Nổi Bật" tại Trang chủ).
- **Chi tiết phản hồi lỗi từ Backend:**
  ```json
  {
    "success": false,
    "statusCode": 500,
    "errorCode": "DATABASE_QUERY_ERROR",
    "message": "Lỗi thực thi truy vấn cơ sở dữ liệu",
    "path": "/api/v1/learning/curriculums/popular?limit=5"
  }
  ```
- **Hiện tượng và nguyên nhân dự kiến phía Backend:**
  1. **Lỗi thực thi SQL (DATABASE_QUERY_ERROR):**
     - Endpoint `popular` (thêm ngày 17/09/2026) thực hiện đếm số học sinh qua `COUNT(DISTINCT assignmentStudent.id)` từ `curriculum_assignment_students`, kết hợp lọc `status = 'published'` và sắp xếp theo alias `assigned_students_count DESC`.
     - Trong TypeORM / PostgreSQL, câu truy vấn này đang vấp phải lỗi cú pháp SQL hoặc thiếu các cột trong mệnh đề `GROUP BY` bắt buộc của PostgreSQL, dẫn đến exception `DATABASE_QUERY_ERROR`.
  2. **Vấn đề phân quyền `@Public()`:**
     - Khi gọi không kèm Bearer token, backend trả về `401 Unauthorized` (`Access token là bắt buộc`), dù tài liệu quy định endpoint này là `@Public()` để phục vụ khách vãng lai xem trang chủ.
- **Tác động phía Frontend:**
  - Trình duyệt tự động in log đỏ `GET http://localhost:.../api/v1/learning/curriculums/popular 500 (Internal Server Error)` trong Console DevTools khi vào trang chủ.
- **Trạng thái Frontend:**
  - Phía FE đã sẵn sàng khối hiển thị và cơ chế fallback an toàn, hiện đang tạm hoãn can thiệp sâu để **đợi Backend kiểm tra, hiệu chỉnh lại câu lệnh query SQL & cờ `@Public()`** cho endpoint này.

### 2. Báo cáo lỗi Backend: `POST /api/v1/auth/logout` bị treo (hang/timeout vô hạn) khi truyền token hợp lệ

- **Endpoint bị lỗi:** `POST /api/v1/auth/logout`
- **Body:** `{ "refreshToken": "<token>" }` | **Header:** `Authorization: Bearer <accessToken>`
- **Hiện tượng phía Backend:**
  - Khi gửi request có đầy đủ `Authorization: Bearer <accessToken>`, request bị **treo vô hạn không phản hồi** (socket hang up sau 4-15 giây).
  - Kiểm tra cổng kết nối phát hiện: Redis trên cổng `6379` (`localhost:6379`) hiện đang không hoạt động (TCP connection failed). Có khả năng `AuthService.logout` phía Backend cố gắng ghi token vào Redis Blacklist nhưng thư viện Redis client không cấu hình timeout hoặc retry vô hạn.
  - Ngược lại, nếu gửi request thiếu `Authorization`, Backend phản hồi ngay lập tức `401 {"errorCode": "UNAUTHORIZED", "message": "Access token là bắt buộc"}`.
- **Xử lý phía Frontend:**
  - Frontend đã tối ưu hóa logic Logout chuẩn chuyên gia: Chụp snapshot `accessToken` + `refreshToken`, xóa sạch session cục bộ ngay lập tức để bảo đảm UX người dùng luôn tức thì và an toàn, đồng thời gửi request logout lên server với timeout an toàn (2s) và silent handling để không gây treo giao diện và không làm bẩn Console.
- **Đề xuất cho Backend:**
  - Bổ sung timeout và fallback an toàn khi thao tác với Redis trong `AuthService.logout` để tránh treo kết nối khi Redis offline.

### 3. Đề xuất Backend: Cung cấp API Public lấy danh sách Đội ngũ Giáo viên hiển thị Trang chủ

- **Vấn đề:**
  - Trang chủ (`/home`) là trang công khai (Public) dành cho cả Khách vãng lai, Học sinh, Giáo viên và Quản trị viên.
  - Hiện tại, endpoint duy nhất để lấy thông tin giáo viên là `GET /api/v1/users?roleCode=teacher`. Tuy nhiên, endpoint `/users` lại yêu cầu bắt buộc quyền `users.read` (chỉ Admin và Teacher có).
  - Khi học sinh (Student) hoặc khách vãng lai (Guest) vào trang chủ, request bị Backend trả về `403 Forbidden` hoặc `401 Unauthorized`.
- **Đề xuất Backend:**
  - Bổ sung endpoint công khai, ví dụ: `GET /api/v1/homepage/teachers` hoặc gán cờ `@Public()` cho truy vấn lấy danh sách giáo viên đang active, trả về các thông tin công khai (họ tên, ảnh đại diện, chuyên môn, số năm kinh nghiệm, trung tâm trực thuộc) mà không để lộ các trường nhạy cảm (số CCCD, ngày sinh, điện thoại, email riêng).

---

## 2026-09-17

### 1. Fix phân quyền Homepage Admin (Lỗi 403 Forbidden: Vai trò không đủ quyền)

- **Nguyên nhân**: `HomepageAdminController` (`src/modules/homepage/homepage.controller.ts`) trước đây dùng decorator `@Roles('ADMIN')` (chữ HOA), trong khi bảng `roles` và user token trong hệ thống lưu mã role là `'admin'` (chữ thường). `PermissionsGuard` kiểm tra phân biệt hoa thường nên tài khoản Admin bị từ chối truy cập (403).
- **Khắc phục**:
  - `homepage.controller.ts`: Đổi decorator thành `@Roles('admin', 'ADMIN')`.
  - `permissions.guard.ts`: Chuẩn hóa so sánh `roleCode` không phân biệt hoa thường (`some(r => r.toLowerCase() === user.roleCode?.toLowerCase())`).
- **Endpoint ảnh hưởng**: `GET /api/v1/admin/homepage`, `GET /api/v1/admin/homepage/media` và các API quản trị homepage.

### 2. Thêm Public API lấy Top giáo trình phân công nhiều nhất cho học sinh

- **Endpoint mới**: `GET /api/v1/learning/curriculums/popular?limit=5`
- **Quyền hạn**: `@Public()` (Truy cập công khai không bắt buộc token, dùng cho Homepage/Trang chủ).
- **Query Params**:
  - `limit` (number, tùy chọn, mặc định 5): Số lượng giáo trình cần lấy.
- **Logic sắp xếp**:
  - Đếm số lượng học sinh được phân công (`COUNT(DISTINCT assignmentStudent.id)` từ `curriculum_assignment_students`).
  - Lọc các giáo trình có `status = 'published'` và `is_active = true`.
  - Sắp xếp giảm dần theo số học sinh được gán (`assigned_students_count DESC`) và ngày tạo (`createdAt DESC`).
- **Dữ liệu trả về**: Mảng các giáo trình đầy đủ thông tin kèm:
  - `assignedStudentsCount`: Số lượng học sinh đã được phân công giáo trình này.
  - `examsCount`: Số lượng đề thi trong giáo trình.
  - `level`, `specialization`, `exams`, `image`, v.v.
- **Áp dụng Frontend**: Phần "Khóa Luyện Thi Nổi Bật" trên trang chủ gọi API này để hiển thị các khóa học / giáo trình thực tế có nhiều học viên theo học nhất thay vì dùng mockData tĩnh.

---

## 2026-09-16

### Curriculum có một ảnh bìa

**Migration cần chạy:**

```bash
npm run migration:run
```

Migration `1780000031000-add-curriculum-image` thêm cột `curriculums.image`.

`POST /api/v1/learning/curriculums` và `PATCH /api/v1/learning/curriculums/:id` nhận thêm field tùy chọn `image` (string URL). Mỗi curriculum chỉ có một ảnh bìa.

```jsonc
{
  "specializationId": "specialization-id",
  "code": "CURR_A1",
  "title": "A1 Curriculum",
  "image": "/api/v1/learning/media-assets/files/a1-cover.jpg",
}
```

Ảnh không được upload trực tiếp trong request tạo/cập nhật curriculum. FE upload file ảnh trước qua `POST /api/v1/learning/media-assets/upload` (`multipart/form-data`, field `file`), sau đó lấy URL ảnh từ response và gửi URL đó vào `image`. Field `image` cũng được trả trong response curriculum.

---

## 2026-09-09

### Tách quyền đọc dữ liệu học vụ và người dùng

**Migration cần chạy:** `npm run migration:run` (`1780000028000-add-academic-read-permissions`).

> **Trước:** toàn bộ endpoint `/centers`, `/specializations`, `/classes` cần `classes.manage`; toàn bộ endpoint `/users` cần `users.manage`.
>
> **Sau:** các endpoint `GET` dùng permission đọc riêng; `POST`, `PATCH`, `DELETE` vẫn cần permission quản lý như trước.

| Permission             | Admin | Teacher | Student | Endpoint GET áp dụng                                                               |
| ---------------------- | ----- | ------- | ------- | ---------------------------------------------------------------------------------- |
| `centers.read`         | Có    | Có      | Có      | `GET /centers`, `GET /centers/:id`                                                 |
| `specializations.read` | Có    | Có      | Có      | `GET /specializations`, `GET /specializations/:id`                                 |
| `classes.read`         | Có    | Có      | Không   | `GET /classes`, `GET /classes/:id`                                                 |
| `users.read`           | Có    | Có      | Không   | `GET /users`, `GET /users/:id`, `GET /users/teacher-degree-images/files/:filename` |

- Các mutation `/centers`, `/specializations`, `/classes` tiếp tục cần `classes.manage`.
- Các mutation `/users` và upload ảnh bằng cấp (`POST /users/teacher-degree-images/upload/multiple`) tiếp tục cần `users.manage`.
- Sau khi chạy migration, người dùng cần đăng nhập hoặc refresh token để JWT nhận danh sách permission mới.

### Auth response trả profile theo phân công lớp/môn

**Migration cần chạy:** không có.

> **Trước:** login, refresh và `/auth/me` chỉ trả role/permission cùng thông tin user cơ bản. Teacher không có nguồn dữ liệu scoped để biết các lớp mình phụ trách; FE phải gọi API user/class tổng quát, dẫn đến dropdown giao bài rỗng hoặc dễ hiển thị cả lớp không thuộc teacher.
>
> **Sau:** auth response trả profile teacher/student cùng các quan hệ active cần cho UI. Teacher lấy danh sách lớp giao bài trực tiếp từ `teacher.classes`, kèm center và môn của từng lớp.

#### Endpoint áp dụng và vị trí dữ liệu

```http
POST /api/v1/auth/login
POST /api/v1/auth/refresh
GET /api/v1/auth/me
Authorization: Bearer <accessToken> // GET /auth/me
```

Không đổi request body, endpoint hay permission.

| Endpoint             | Vị trí profile trong envelope `data` | Token pair                                    |
| -------------------- | ------------------------------------ | --------------------------------------------- |
| `POST /auth/login`   | `data.user`                          | Có `data.accessToken`, `data.refreshToken`    |
| `POST /auth/refresh` | `data.user`                          | Có token pair mới; refresh token cũ bị revoke |
| `GET /auth/me`       | trực tiếp ở `data`                   | Không trả token                               |

#### Response teacher — phần FE cần dùng

```jsonc
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "code": "GV000001",
      "role": {
        "code": "teacher",
        "permissions": [
          "centers.read",
          "specializations.read",
          "classes.read",
          "users.read",
        ],
      },
      "teacher": {
        "id": "teacher-id",
        "classes": [
          {
            "id": "teacher-class-id",
            "teacherId": "teacher-id",
            "classId": "class-id",
            "isActive": true,
            "class": {
              "id": "class-id",
              "name": "English 6",
              "centerId": "center-id",
              "specializationId": "specialization-id",
              "center": {
                "id": "center-id",
                "name": "Kata Center",
                "isActive": true,
              },
              "specialization": {
                "id": "specialization-id",
                "code": "english",
                "name": "Tiếng Anh",
                "isActive": true,
              },
            },
          },
        ],
        "teacherSpecializations": [
          {
            "id": "teacher-specialization-id",
            "teacherId": "teacher-id",
            "specializationId": "specialization-id",
            "isActive": true,
            "specialization": {
              "id": "specialization-id",
              "code": "english",
              "name": "Tiếng Anh",
              "isActive": true,
            },
          },
        ],
      },
    },
    "accessToken": "jwt",
    "refreshToken": "jwt",
  },
}
```

Với `GET /auth/me`, bỏ lớp `user`, `accessToken`, `refreshToken` bên ngoài: object user trong ví dụ là chính `data`.

#### Quy tắc scope và dữ liệu active

- `teacher.classes` chỉ chứa teacher-class membership active mà class, center và specialization đều active.
- `teacher.teacherSpecializations` chỉ chứa teacher-specialization membership và specialization active.
- `student.classes` được trả theo cùng nguyên tắc và mỗi item cũng có `class.center`, `class.specialization`.
- Teacher profile luôn dùng hai mảng `classes` và `teacherSpecializations`; mảng rỗng nghĩa là không có phân công active, không phải lỗi API.
- Không dùng `GET /api/v1/classes` làm danh sách lớp giao bài. API đó không giới hạn theo teacher đăng nhập, nên có thể chứa lớp mà BE sẽ từ chối khi giao bài.

#### Hướng dẫn FE cho modal “Giao Bài Thi Mới”

1. Sau login/refresh, lưu `data.user` vào auth state. Khi reload app, thay bằng kết quả `GET /auth/me`.
2. Lấy dropdown lớp từ `user.teacher?.classes ?? []`; `Select.value` là `item.classId` và label khuyến nghị là `item.class.name + ' (' + item.class.specialization.name + ')'`.
3. Khi teacher chọn lớp, lấy `item.class.specializationId` để chỉ hiển thị các đề cùng môn.
4. Gửi đúng `classId` tới `POST /api/v1/learning/teacher/exam-assignments`; không cho tạo value từ một class ngoài auth profile.
5. Nếu admin đổi phân công teacher trong khi teacher đang đăng nhập, gọi lại `GET /api/v1/auth/me` trước lần giao bài tiếp theo để lấy scope mới.

BE vẫn kiểm tra độc lập, nên FE cần xử lý các lỗi sau nếu scope đã cũ hoặc request bị can thiệp:

| Điều kiện                          | HTTP  | `message`                                  |
| ---------------------------------- | ----- | ------------------------------------------ |
| Teacher không phụ trách lớp        | `403` | `Giáo viên không phụ trách lớp này`        |
| Teacher không phụ trách môn của đề | `403` | `Giáo viên không phụ trách môn học này`    |
| Lớp khác môn với đề                | `400` | `Lớp không thuộc cùng môn học với bài thi` |

#### Acceptance checklist

- Đăng nhập bằng teacher có phân công class và xác nhận `data.user.teacher.classes[].class.specialization` có dữ liệu.
- Reload trang, gọi `/auth/me` và xác nhận dữ liệu/shape teacher không đổi ngoài vị trí `data`.
- Dropdown chỉ hiện class trong `teacher.classes`; chọn từng class chỉ hiển thị đề cùng `specializationId`.
- Giao bài với class trong dropdown và đề cùng môn thành công; không phát sinh `400` khác môn hoặc `403` không phụ trách lớp.
- Gỡ một teacher-class hoặc teacher-specialization rồi gọi lại `/auth/me`: relationship vừa inactive không còn trong profile.

---

## 2026-09-04

### Bổ sung CMS settings cho Homepage

**Migration cần chạy:** `1780000027000-add-homepage-cms.ts`.

Nội dung Homepage được công khai ngay sau khi admin lưu. Không có trạng thái draft/publish.

#### 1. API public lấy toàn bộ dữ liệu Homepage

```http
GET /api/v1/homepage
```

Không cần Bearer token, không có request body. API chỉ trả Slider và Gallery có `isActive=true`, sắp xếp theo `orderIndex` tăng dần.

```jsonc
{
  "success": true,
  "data": {
    "slider": [
      {
        "id": "slide-uuid",
        "mediaId": "media-uuid",
        "media": {
          "id": "media-uuid",
          "url": "/api/v1/homepage/media/files/hero.jpg",
          "mimeType": "image/jpeg",
          "altText": "Banner khai giảng",
        },
        "altText": "Học viên Kata Edu",
        "title": "Khai giảng khóa mới",
        "subtitle": "Đăng ký để được tư vấn",
        "ctaLabel": "Đăng ký ngay",
        "ctaLink": "/dang-ky",
        "orderIndex": 0,
        "isActive": true,
      },
    ],
    "about": {
      "title": "Về Kata Edu",
      "description": "...",
      "mission": "...",
      "vision": "...",
      "stats": [{ "label": "Học viên", "value": "1000+" }],
      "image": {
        "id": "media-uuid",
        "url": "/api/v1/homepage/media/files/about.jpg",
      },
    },
    "facilities": {
      "title": "Cơ sở vật chất & Hoạt động",
      "description": "...",
      "highlights": [{ "title": "Phòng học hiện đại", "description": "..." }],
      "gallery": [
        {
          "id": "gallery-uuid",
          "mediaId": "media-uuid",
          "media": { "url": "/api/v1/homepage/media/files/gallery.jpg" },
          "altText": "Hoạt động ngoại khóa",
          "orderIndex": 0,
          "isActive": true,
        },
      ],
    },
    "footer": {
      "brandName": "Kata Edu",
      "description": "...",
      "socialLinks": [
        { "platform": "Facebook", "url": "https://facebook.com/kataedu" },
      ],
      "phone": "0900000000",
      "email": "contact@kata.edu",
      "copyright": "© Kata Edu",
    },
  },
}
```

#### 2. Quy ước Footer và API Centers

Homepage settings **không lưu/không trả** `centerId`, tên cơ sở, địa chỉ, Google Maps URL hoặc liên hệ riêng từng cơ sở.

- Danh sách cơ sở ở Footer: FE gọi `GET /api/v1/centers`, dùng `data[].name` để hiển thị.
- Số điện thoại/email Footer: lấy lần lượt từ `data.footer.phone` và `data.footer.email` của `GET /api/v1/homepage`; hai giá trị này **dùng chung cho toàn bộ cơ sở**.
- Địa chỉ và map theo từng cơ sở: FE lấy từ API Centers, không lấy từ Homepage settings.

#### 3. API admin cập nhật singleton settings

Tất cả API `/api/v1/admin/homepage/*` yêu cầu Bearer token của user có `roleCode = ADMIN`. User đã đăng nhập nhưng không phải ADMIN nhận `403`; không có token nhận `401`.

```http
PATCH /api/v1/admin/homepage
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```jsonc
{
  "aboutTitle": "Về Kata Edu",
  "aboutDescription": "...",
  "aboutMission": "...",
  "aboutVision": "...",
  "aboutStats": [{ "label": "Giáo viên", "value": "50+" }],
  "aboutMediaId": "media-uuid", // gửi null để bỏ ảnh About
  "facilitiesTitle": "Cơ sở vật chất & Hoạt động",
  "facilitiesDescription": "...",
  "facilitiesHighlights": [
    { "title": "Hoạt động ngoại khóa", "description": "..." },
  ],
  "footerBrandName": "Kata Edu",
  "footerDescription": "...",
  "footerSocialLinks": [
    { "platform": "Facebook", "url": "https://facebook.com/kataedu" },
  ],
  "footerPhone": "0900000000",
  "footerEmail": "contact@kata.edu",
  "footerCopyright": "© Kata Edu",
}
```

Response `200` trả cùng shape `data` của API public nhưng gồm cả Slider/Gallery inactive. Các field trong body đều optional. Nested payload sai (ví dụ social URL không hợp lệ hoặc email không đúng định dạng) trả `400`.

#### 4. Site media

```http
POST /api/v1/admin/homepage/media/upload
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data
```

```txt
file: <file-ảnh>
altText: Banner khai giảng
```

Response `201`:

```jsonc
{
  "success": true,
  "data": {
    "id": "media-uuid",
    "url": "/api/v1/homepage/media/files/hero.jpg",
    "mimeType": "image/jpeg",
    "altText": "Banner khai giảng",
  },
}
```

- Field multipart bắt buộc là `file`; chỉ nhận MIME type `image/*`. File không phải ảnh hoặc thiếu file trả `400`.
- `GET /api/v1/admin/homepage/media` trả danh sách media.
- `DELETE /api/v1/admin/homepage/media/:id` trả `{ "data": { "id": "media-uuid" } }` khi xóa được.
- Media đang được About, Slider hoặc Gallery tham chiếu trả `409` và không bị xóa.

#### 5. Slider và Gallery

Tạo Slider:

```http
POST /api/v1/admin/homepage/slides
```

```jsonc
{
  "mediaId": "media-uuid",
  "altText": "Lớp học Kata Edu",
  "title": "Khai giảng khóa mới",
  "subtitle": "...",
  "ctaLabel": "Xem chi tiết",
  "ctaLink": "/khoa-hoc",
  "orderIndex": 0,
  "isActive": true,
}
```

Response `201` trả Slider vừa tạo. `ctaLink` nhận route nội bộ hoặc URL ngoài. `PATCH /api/v1/admin/homepage/slides/:id` nhận các field tương tự; `DELETE` trả `{ "data": { "id": "slide-uuid" } }`.

Tạo Gallery:

```http
POST /api/v1/admin/homepage/gallery
```

```json
{
  "mediaId": "media-uuid",
  "altText": "Hoạt động ngoại khóa",
  "orderIndex": 0,
  "isActive": true
}
```

Response `201` trả Gallery vừa tạo. `PATCH /api/v1/admin/homepage/gallery/:id` và `DELETE /api/v1/admin/homepage/gallery/:id` hoạt động tương ứng.

Sắp xếp Slider hoặc Gallery:

```http
PATCH /api/v1/admin/homepage/slides/reorder
PATCH /api/v1/admin/homepage/gallery/reorder
```

```json
{
  "items": [
    { "id": "item-uuid-1", "orderIndex": 0 },
    { "id": "item-uuid-2", "orderIndex": 1 }
  ]
}
```

Response `200` trả toàn bộ settings admin sau khi sắp xếp. ID trùng, ID không tồn tại hoặc `orderIndex` không hợp lệ bị reject.

Giới hạn nghiệp vụ:

- Tối đa **8 Slider active** và **4 Gallery active**; tạo/kích hoạt vượt giới hạn trả `409`.
- About có đúng một trường `aboutMediaId`, nên tối đa một ảnh.
- Có thể lưu Slider/Gallery inactive; chúng không xuất hiện ở API public.

### Sửa lọc trạng thái tài khoản người dùng

**Migration cần chạy:** không có.

```http
GET /api/v1/users
```

- Không truyền `isActive` sẽ chỉ trả user đang active.
- Gửi `?isActive=true` để chỉ lấy user active; gửi `?isActive=false` để chỉ lấy user inactive.
- Backend parse chính xác chuỗi query `true` và `false`; giá trị khác trả `400` do không phải boolean hợp lệ.

---

## 2026-08-27

### Bổ sung lọc theo tag khi random câu hỏi cho exam

**Migration cần chạy:** không có.

```http
POST /api/v1/learning/exams/random-questions
```

API này chỉ preview danh sách câu hỏi, **không ghi dữ liệu vào exam**. Mỗi phần tử trong `criteria` chọn ngẫu nhiên `count` câu hỏi khớp tất cả bộ lọc được truyền:

```jsonc
{
  "criteria": [
    {
      "count": 5,
      "levelId": "...",
      "type": "multiple_choice",
      "topicId": "...",
      "skillId": "...",
      "tagId": "...",
    },
  ],
}
```

- `levelId`, `type`, `topicId`, `skillId` và `tagId` đều optional; `tagId` là bộ lọc được bổ sung trong đợt này.
- Chỉ chọn câu hỏi đang active và có trạng thái `published`.
- Một câu hỏi không xuất hiện lại ở nhóm sau; kết quả giữ thứ tự nhóm và có `orderIndex` liên tục từ `0`.
- `tagId` không tồn tại trả `404`; nhóm không đủ số câu phù hợp trả `409`.
- Response trả `data.items` để FE truyền thẳng sang API bulk attach và `data.groups[].questions` để preview đầy đủ nội dung câu hỏi.

```http
POST /api/v1/learning/exams/:id/questions/bulk
```

```jsonc
{
  "items": [{ "questionId": "...", "orderIndex": 0 }],
}
```

---

## 2026-08-06

### Tách đề ôn tập và đề thi, bắt buộc làm đúng 100%

**Migration cần chạy:** `1780000026000-add-exam-type.ts`.

- Exam có `examType = practice | exam`; dữ liệu cũ được backfill `practice`, cần phân loại lại các đề thi cũ trước khi sử dụng.
- `practice`: làm tuần tự, nộp từng câu, nhận đúng/sai và lời giải ngay, không sửa được câu đã nộp.
- Lượt đầu của `exam`: được nhảy câu/bỏ qua/sửa đáp án qua `PUT /learning/student/attempts/:attemptId/answers/:questionId`; không lộ review trước khi nộp.
- Lượt đầu của `exam` tự kết thúc khi hết `timeLimitSeconds`; backend cưỡng chế deadline và có scheduler đóng attempt hết hạn.
- Sau lượt đầu, cả hai loại chỉ tạo lại câu sai/chưa làm. Retry làm tuần tự, chấm ngay và không bị `maxAttempts` chặn.
- Exam/assignment/curriculum chỉ `finished` khi mọi câu bắt buộc đạt 100%.
- Response attempt thêm `examType`, `attemptPhase`, `expiresAt`, `firstAttemptResult`, `remainingQuestionCount`, `mastered`, `requiresRemediation`, `taskStatus`.
- Điểm báo cáo chính thức lấy từ attempt số 1; teacher analytics không dùng điểm cộng dồn của retry làm điểm thi.

---

## 2026-07-18

### Siết invariant môn học và phạm vi giao bài của giáo viên

**Migration cần chạy:** không có. Đợt này chỉ thay đổi validation, quyền truy cập và cơ chế soft-revoke; request/response DTO không đổi.

> **Trước:** teacher có thể được gắn class nhưng thiếu specialization của class; `studentIds` không có `classId` có thể chứa học viên ngoài phạm vi teacher; standing curriculum có thể lệch môn với class; enrollment sinh từ class có thể còn active sau khi quan hệ cấp quyền bị thu hồi.
> **Sau:** BE kiểm tra trạng thái cuối của teacher, giới hạn mọi recipient theo class teacher quản lý, bắt buộc class ↔ curriculum cùng môn và revalidate quyền class-derived ở mọi luồng student.

#### 1) Tạo/cập nhật teacher — class phải được phủ bởi specialization

Áp dụng cho:

```http
POST /api/v1/users
PATCH /api/v1/users/:id
```

- Mọi active class trong `teacherProfile.classIds` phải có `specializationId` nằm trong `teacherProfile.specializationIds` của teacher.
- Teacher vẫn được có thêm specialization chưa gắn class.
- Khi `PATCH` chỉ gửi `classIds` hoặc chỉ gửi `specializationIds`, BE ghép với danh sách hiện tại rồi kiểm tra **trạng thái cuối**; không thể lách invariant bằng partial update.
- Vi phạm trả `400`:

```jsonc
{
  "success": false,
  "statusCode": 400,
  "message": "Chuyên môn của mọi lớp giáo viên phụ trách phải nằm trong danh sách chuyên môn của giáo viên",
  "path": "…",
  "requestId": "…",
  "timestamp": "…",
}
```

#### 2) Giao exam/curriculum — `studentIds` luôn nằm trong phạm vi teacher

Áp dụng cho:

```http
POST /api/v1/learning/teacher/exam-assignments
POST /api/v1/learning/teacher/curriculum-assignments
```

| Input recipient                  | Quy tắc mới                                                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Chỉ có `classId`                 | Giao cho toàn bộ học viên đang active trong class; teacher phải đang quản lý class.                                      |
| Có `classId` và `studentIds`     | Mọi student phải đang thuộc chính class đó.                                                                              |
| Chỉ có `studentIds`, không class | Mỗi student phải thuộc ít nhất một active class mà teacher đang quản lý; chỉ cần một student sai là hủy toàn bộ request. |

Các lỗi recipient chính:

| Điều kiện                                                         | HTTP  | `message`                                                        |
| ----------------------------------------------------------------- | ----- | ---------------------------------------------------------------- |
| Class không có học viên active khi giao cả lớp                    | `409` | `Lớp chưa có học viên đang hoạt động để giao bài`                |
| Có `classId` nhưng một hoặc nhiều student không thuộc class       | `404` | `Một hoặc nhiều học viên không thuộc lớp đang hoạt động`         |
| Không có `classId` và student nằm ngoài các class teacher quản lý | `404` | `Một hoặc nhiều học viên không thuộc lớp giáo viên đang quản lý` |

Lưu ý:

- Curriculum giao trực tiếp **không cần** là standing curriculum của class. Teacher vẫn có thể giao một curriculum ngoài cho học viên tự học thêm, miễn teacher phụ trách môn của curriculum và học viên nằm trong phạm vi class teacher quản lý.
- Nếu gửi `classId`, exam/curriculum phải cùng specialization với class như trước.
- Không thay đổi shape response của assignment.

#### 3) Standing curriculum của class — cùng môn và thu hồi quyền đúng nguồn

Áp dụng cho:

```http
POST /api/v1/learning/teacher/class-curriculums
DELETE /api/v1/learning/teacher/class-curriculums/:id
DELETE /api/v1/classes/:id
PATCH /api/v1/users/:studentUserId
```

Khi tạo standing curriculum:

- Class và curriculum bắt buộc cùng `specializationId`; lệch môn trả `400 "Lớp không thuộc cùng môn học với chương trình"`.
- Teacher thường phải đang quản lý class và có active specialization tương ứng; thiếu specialization trả `403 "Giáo viên không phụ trách môn học của chương trình"`.
- User có `learning.manage` vẫn có thể quản lý mọi class, nhưng không được gắn curriculum lệch môn.

Quyền class-derived của học viên bị soft-revoke khi xảy ra một trong các trường hợp:

- Xóa standing link class ↔ curriculum.
- Học viên bị gỡ khỏi class qua `studentProfile.classIds`.
- Class bị vô hiệu hóa.
- Class hoặc standing link không còn active khi student truy cập.

Ảnh hưởng tới FE:

- `GET /api/v1/learning/student/curriculums` không còn trả enrollment class-derived đã mất quyền.
- Detail/start attempt cũng revalidate quyền, không chỉ tin vào enrollment cũ.
- Assignment trực tiếp từ teacher và lịch sử attempt **không bị xóa hoặc thu hồi** bởi các thao tác trên.
- Nếu học viên còn một class active khác có cùng standing curriculum, chương trình vẫn truy cập được qua class hợp lệ đó.

#### 4) Không thể vô hiệu hóa specialization còn dữ liệu active tham chiếu

```http
DELETE /api/v1/specializations/:id
```

BE trả `409 "Không thể vô hiệu hóa chuyên môn đang được dữ liệu active tham chiếu"` nếu specialization còn được tham chiếu bởi class, teacher specialization, level, skill, topic, reading passage, question, exam hoặc curriculum đang active.

Khi reactivate class/level/skill/topic, specialization cha cũng phải active; nếu không, BE trả `404 "Không tìm thấy môn học"`.

---

## 2026-07-16

### Bảng xếp hạng (Leaderboard / Ranking)

**Migration cần chạy:** `npm run migration:run` (`1780000025000-add-leaderboard-indexes` — chỉ thêm chỉ mục, không đổi dữ liệu).

> **Trước:** hệ thống chưa có bảng xếp hạng.
> **Sau:** thêm 1 endpoint `GET /learning/leaderboard` tính xếp hạng học viên theo **5 phạm vi** × **3 tiêu chí** × **3 khung thời gian**, kèm **hạng của chính người xem**. Tính trực tiếp từ `exam_attempts` (không có bảng mới, không thay đổi contract cũ).

#### Endpoint

```http
GET /api/v1/learning/leaderboard
```

- **Quyền:** chỉ cần **đăng nhập** (gửi `Authorization: Bearer <accessToken>`). Không cần permission đặc biệt. Quyền xem được kiểm theo phạm vi trong service (xem bảng lỗi).
- Mỗi lần gọi trả **một bảng** (chọn bằng `metric`). Muốn hiển thị 2–3 bảng cạnh nhau thì FE gọi song song nhiều lần (mỗi lần một `metric`), phân trang độc lập.

#### Tham số query

| Tham số            | Bắt buộc                                 | Giá trị                                                         | Ý nghĩa                                                        |
| ------------------ | ---------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------- |
| `scope`            | ✅                                       | `class` \| `assignment` \| `curriculum` \| `center` \| `global` | Phạm vi so kè                                                  |
| `scopeId`          | ✅ trừ khi `scope=global`                | UUID                                                            | classId / assignmentId / curriculumId / centerId tương ứng     |
| `specializationId` | ✅ khi `scope` là `center` hoặc `global` | UUID                                                            | Môn học (Specialization) cần lọc                               |
| `metric`           | ❌ (mặc định `mastery`)                  | `mastery` \| `accuracy` \| `progress`                           | Tiêu chí xếp hạng                                              |
| `period`           | ❌ (mặc định `all_time`)                 | `all_time` \| `month` \| `week`                                 | Khung thời gian. **`metric=progress` bắt buộc `month`/`week`** |
| `source`           | ❌ (mặc định `all`)                      | `all` \| `assigned` \| `self_study`                             | Lọc nguồn attempt                                              |
| `page`             | ❌ (mặc định 1)                          | số ≥ 1                                                          | Trang                                                          |
| `limit`            | ❌ (mặc định 20, tối đa 100)             | 1–100                                                           | Số dòng/trang                                                  |

**3 tiêu chí (`metric`):**

- `mastery` — **Cao thủ**: `masteryTotal` = tổng số câu _distinct_ đã làm đúng (`SUM(best_score)`) trong phạm vi + môn.
- `accuracy` — **Chính xác nhất**: `avgAccuracy` = trung bình `best_percentage` các bài đã làm. Có **cổng tối thiểu** số bài: `center`/`global` cần **≥ 3 bài** mới lên bảng; `class`/`assignment`/`curriculum` cần ≥ 1. Xem `data.minExamsRequired`.
- `progress` — **Tiến bộ nhất**: `progressGained` = số câu master **tăng thêm** trong kỳ (`period`). Luôn ≥ 0.

**Ngữ nghĩa `source`:** `assigned` = attempt của Exam Assignment (`teacher_assigned`); `self_study` = attempt luyện tập theo Curriculum. Mặc định `all` gộp cả hai.

**Khung thời gian:** `month` = từ đầu tháng hiện tại; `week` = 7 ngày gần nhất — tính theo múi giờ **Asia/Ho_Chi_Minh**.

#### Ví dụ request

```http
GET /api/v1/learning/leaderboard?scope=class&scopeId=018f7f76-0000-7000-8000-000000001102&metric=mastery
GET /api/v1/learning/leaderboard?scope=center&scopeId=<centerId>&specializationId=<specId>&metric=accuracy
GET /api/v1/learning/leaderboard?scope=global&specializationId=<specId>&metric=progress&period=week
```

#### Response `data` (ví dụ thật, `scope=class`, `metric=mastery`)

```jsonc
{
  "success": true,
  "data": {
    "scope": "class",
    "scopeId": "018f7f76-0000-7000-8000-000000001102",
    "specializationId": "018f7f76-0000-7000-8000-000000001103",
    "metric": "mastery",
    "period": "all_time",
    "source": "all",
    "windowFrom": null, // khác null khi period=month/week
    "windowTo": null,
    "minExamsRequired": 1, // ngưỡng số bài cho bảng accuracy
    "generatedAt": "2026-07-16T01:44:57.631Z",
    "entries": [
      {
        "rank": 1,
        "studentId": "018f7f76-0000-7000-8000-000000001202",
        "student": {
          "id": "018f7f76-0000-7000-8000-000000001202",
          "code": "student.demo",
          "fullName": "Demo Student",
        },
        "masteryTotal": 1, // SUM(best_score)
        "avgAccuracy": 11.11, // AVG(best_percentage)
        "progressGained": null, // chỉ có số khi metric=progress
        "examsCounted": 1,
        "lastSubmittedAt": "2026-07-04T01:14:34.030Z",
        "isMe": true,
      },
      // …
    ],
    "viewer": {
      // hạng của chính người xem; null nếu người xem là GV/admin
      "rank": 1, // null nếu chưa có dữ liệu / chưa đủ điều kiện xếp hạng
      "studentId": "018f7f76-0000-7000-8000-000000001202",
      "student": {
        "id": "…",
        "code": "student.demo",
        "fullName": "Demo Student",
      },
      "masteryTotal": 1,
      "avgAccuracy": 11.11,
      "progressGained": null,
      "examsCounted": 1,
      "lastSubmittedAt": "2026-07-04T01:14:34.030Z",
      "qualified": true, // accuracy: examsCounted ≥ minExamsRequired; progress: progressGained > 0
      "examsNeeded": 0, // accuracy: số bài còn thiếu để đủ điều kiện
    },
  },
  "meta": { "page": 1, "limit": 20, "total": 2, "totalPages": 1 },
  "requestId": "…",
  "timestamp": "…",
}
```

- Khi `metric=progress`: mỗi entry có `progressGained` là số (câu tăng thêm trong kỳ); `masteryTotal`/`avgAccuracy` không dùng.
- `viewer=null` khi người gọi là **giáo viên/admin** (không phải học viên trong phạm vi). Học viên trong phạm vi luôn có `viewer` (kể cả khi chưa lọt bảng — lúc đó `rank=null`).

#### Bảng lỗi (điều kiện → statusCode + message)

| Điều kiện                                                 | statusCode | message (tiếng Việt)                                               |
| --------------------------------------------------------- | ---------- | ------------------------------------------------------------------ |
| `metric=progress` mà `period=all_time`                    | 400        | `Bảng Tiến bộ cần chọn kỳ thống kê (tháng hoặc tuần)`              |
| Thiếu/không hợp lệ `scope`, `scopeId`, `specializationId` | 400        | `Dữ liệu không hợp lệ` (kèm `fieldErrors`)                         |
| HS xem lớp không thuộc                                    | 403        | `Bạn không có quyền xem bảng xếp hạng của lớp này`                 |
| HS xem lượt giao bài không thuộc                          | 403        | `Bạn không thuộc lượt giao bài này`                                |
| HS xem chương trình không thuộc                           | 403        | `Bạn không thuộc chương trình học này`                             |
| HS xem trung tâm không thuộc                              | 403        | `Bạn không thuộc trung tâm này`                                    |
| HS xem môn chưa tham gia                                  | 403        | `Bạn chưa tham gia môn học này`                                    |
| GV xem phạm vi không quản lý                              | 403        | `Không có quyền xem bảng xếp hạng này` (hoặc message theo phạm vi) |
| `scopeId` lớp không tồn tại                               | 404        | `Không tìm thấy lớp đang hoạt động`                                |
| `scopeId` assignment không tồn tại                        | 404        | `Không tìm thấy lượt giao bài`                                     |
| `scopeId` curriculum không tồn tại                        | 404        | `Không tìm thấy chương trình học`                                  |
| `scopeId` center không tồn tại                            | 404        | `Không tìm thấy trung tâm đang hoạt động`                          |
| `specializationId` (global) không tồn tại                 | 404        | `Không tìm thấy môn học đang hoạt động`                            |

#### Lưu ý khi dùng API

- **Ai được xem gì:** HS chỉ xem phạm vi mình thuộc (lớp/lượt giao/chương trình/trung tâm/môn của mình). GV xem phạm vi mình dạy/sở hữu/được phân môn. Admin (`learning.manage`) xem tất cả.
- **Điểm dựa trên đếm câu** (mỗi câu = 1 điểm mastery); chống cày lại nhờ mô hình mastery cộng dồn + lấy `best`.
- **Bảng accuracy ở `center`/`global`** cần ≥ 3 bài mới xuất hiện — HS chưa đủ vẫn thấy `viewer` với `qualified=false` và `examsNeeded` = số bài còn thiếu.
- **`viewer.rank=null`** nghĩa là người xem chưa lọt bảng (chưa có dữ liệu trong kỳ, hoặc chưa đủ điều kiện).
- Endpoint **chỉ đọc**, không đổi state; có thể gọi lại tuỳ ý (không idempotency concern).

#### Endpoint phụ trợ

**1) `GET /learning/leaderboard/scopes`** — trả về **các phạm vi người dùng hiện tại được phép chọn**, để FE đổ thẳng vào bộ chọn (không cần ghép nhiều API). Không tham số. Học viên → lớp/trung tâm/lộ trình/lượt giao/môn của mình; giáo viên → phạm vi mình dạy/sở hữu/được phân môn; admin → tất cả.

```jsonc
GET /api/v1/learning/leaderboard/scopes
{
  "data": {
    "classes":     [{ "id": "…1102", "name": "KATA-DEMO-A1", "specializationId": "…1103", "subjectName": "Demo English", "centerId": "…1101", "centerName": "Kata Demo Center" }],
    "centers":     [{ "id": "…1101", "name": "Kata Demo Center", "subjects": [{ "id": "…1103", "name": "Demo English" }] }],
    "curriculums": [{ "id": "…1701", "title": "Demo A1 Curriculum", "specializationId": "…1103", "subjectName": "Demo English" }],
    "assignments": [{ "id": "019f…", "title": "cumulative-check" }],
    "subjects":    [{ "id": "…1103", "name": "Demo English" }]
  }
}
```

FE dùng: `classes[].id`→`scopeId` (scope=class); `assignments[].id`, `curriculums[].id` tương tự; `centers[].id`+`centers[].subjects[].id`→`scopeId`+`specializationId` (scope=center); `subjects[].id`→`specializationId` (scope=global).

**2) `GET /learning/leaderboard/summary`** — trả về **hạng của chính người xem trên cả 3 bảng** trong 1 lời gọi (cho widget hồ sơ/dashboard, khỏi gọi endpoint chính 3 lần).

| Tham số            | Bắt buộc                 | Ghi chú                                           |
| ------------------ | ------------------------ | ------------------------------------------------- |
| `scope`            | ✅                       | như endpoint chính                                |
| `scopeId`          | ✅ trừ `global`          |                                                   |
| `specializationId` | ✅ khi `center`/`global` |                                                   |
| `period`           | ❌ (mặc định `month`)    | `all_time` \| `month` \| `week` — áp cho cả 3 thẻ |
| `source`           | ❌ (mặc định `all`)      |                                                   |

```jsonc
GET /api/v1/learning/leaderboard/summary?scope=class&scopeId=…1102&period=month
{
  "data": {
    "scope": "class", "scopeId": "…1102", "specializationId": "…1103", "period": "month",
    "generatedAt": "2026-07-16T02:22:13.249Z",
    "mastery":  { "rank": 1, "value": 1,     "examsCounted": 1, "qualified": true, "examsNeeded": 0 },
    "accuracy": { "rank": 1, "value": 11.11, "examsCounted": 1, "qualified": true, "examsNeeded": 0 },
    "progress": { "rank": 1, "value": 1,     "examsCounted": 1, "qualified": true, "examsNeeded": 0 }
  }
}
```

- `value` = `masteryTotal` / `avgAccuracy` / `progressGained` tương ứng.
- **`progress=null`** khi `period=all_time` (bảng Tiến bộ cần kỳ tháng/tuần).
- **Cả 3 thẻ = `null`** khi người xem là giáo viên/admin (không có hạng cá nhân).
- Lỗi quyền/không tồn tại giống endpoint chính (403/404).

#### Gợi ý các bảng xếp hạng nên dựng (FE tham khảo)

FE **không phải tự tính toán gì** — thứ hạng, điểm, tie-break, hạng của người xem đều do BE trả sẵn; FE chỉ hiển thị + truyền tham số. Bộ leaderboard khuyến nghị (ưu tiên theo giá trị thực tế):

**Nhóm PHẢI CÓ (làm trước):**

| #   | Leaderboard                       | Query                                                      | Đặt ở đâu                            | Số chính         |
| --- | --------------------------------- | ---------------------------------------------------------- | ------------------------------------ | ---------------- |
| 1   | Bảng vàng của Lớp                 | `scope=class&scopeId=<lớp>&metric=mastery&period=all_time` | Trang lớp / tab "Xếp hạng"           | `masteryTotal`   |
| 2   | Ngôi sao tiến bộ tháng (cùng lớp) | `scope=class&scopeId=<lớp>&metric=progress&period=month`   | Tab cạnh #1                          | `progressGained` |
| 3   | Bảng điểm Bài kiểm tra            | `scope=assignment&scopeId=<assignment>&metric=mastery`     | Sau khi nộp bài + chi tiết lượt giao | `masteryTotal`   |

- #1 là bảng dùng hằng ngày, công bằng nhất (cùng GV/đề/môn).
- #2 giúp học sinh yếu vẫn có cửa lên top → giữ chân.
- #3 là bảng điểm tức thì sau khi làm bài — engagement cao.

**Nhóm NÊN CÓ (giai đoạn sau):**

| #   | Leaderboard                                  | Query                                                                           | Mục đích                                                     |
| --- | -------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 4   | Vinh danh Trung tâm — Chính xác nhất (tháng) | `scope=center&scopeId=<tt>&specializationId=<môn>&metric=accuracy&period=month` | So kè liên lớp, vinh danh định kỳ; cổng ≥3 bài giữ công bằng |
| 5   | BXH Lộ trình tự học                          | `scope=curriculum&scopeId=<lộ trình>&metric=mastery&period=all_time`            | Đua cho nhóm cùng học tự luyện                               |

**Widget "Hạng của tôi":** đọc thẳng field `viewer` từ lời gọi #1 (không cần bảng đầy đủ) — VD "Bạn đang hạng #3 trong lớp · 64 câu". Đặt ở dashboard học viên.

**Mặc định UX gợi ý:**

- Mở màn "Xếp hạng lớp" → mặc định tab Cao thủ (`metric=mastery`, `all_time`), 2 tab phụ: Chính xác (`metric=accuracy`) và Tiến bộ tháng (`metric=progress&period=month`).
- **Ẩn combo ít ý nghĩa**: Tiến bộ/Chính xác cho một Bài kiểm tra (#3 chỉ nên có Cao thủ).
- Bảng rỗng (chưa ai đủ điều kiện ở #4) → hiện thông điệp + `viewer.examsNeeded`.
- `scope=global` chưa nên ưu tiên khi hệ thống còn ít trung tâm (gần trùng #4, cân nhắc quyền riêng tư).
- Bộ chọn (lớp/trung tâm/môn nào được xem) lấy từ các endpoint sẵn có (`/learning/student/exam-assignments`, `/learning/student/curriculums`, lớp/môn của học viên), rồi truyền `scopeId`/`specializationId` vào leaderboard.

---

## 2026-07-15

Trong ngày có các nhóm thay đổi lớn (đọc theo thứ tự nếu triển khai mới):

- **C)** Version hoá đề (item + exam version) — **thay thế cho A)**, áp dụng cho cả 3 loại phát đề.
- **A)** ~~Snapshot đề bài Exam Assignment tại thời điểm giao~~ — **đã bị C) thay thế** (đọc để hiểu bối cảnh; cơ chế cuối cùng là C).
- **B)** Gắn môn học (Specialization) vào lớp và toàn bộ nội dung.

### C) Version hoá đề — item version + exam version (thay thế A)

**Migration cần chạy:** `npm run migration:run` (`1780000024000-exam-item-versioning`).

> **Trước (A):** chỉ Exam Assignment đóng băng đề khi giao (bảng `exam_assignment_questions`); Curriculum/tự học đóng băng khi start attempt — không đồng nhất.
> **Sau (C):** đề được **version hoá 2 tầng**: `question_version` (nội dung câu, bất biến) + `exam_version` (bố cục đề = danh sách question_version theo thứ tự). Publish exam = **cắt một version**. Mọi nơi phát đề chỉ **pin `exam_version_id`**. Sửa question/exam về sau **không** đụng version đã phát.

#### Khái niệm & vòng đời

- `exam` là bản thảo **sống** (sửa được). Publish (`PATCH /learning/exams/:id/status` với `status=published`) → **cắt version mới**; `exams.current_version_id` trỏ bản mới nhất.
- Sửa exam/câu hỏi trong exam → cờ `exams.has_unpublished_changes=true` (nhắc "cần republish để áp dụng"). **Sửa question trong ngân hàng KHÔNG tự bật cờ** — muốn áp dụng phải republish exam.
- Object `exam` trong mọi response nay có thêm `currentVersionId`, `hasUnpublishedChanges`.

#### Liệt kê version (để FE đổ dropdown chọn version)

```http
GET /api/v1/learning/exams/{id}/versions
```

```jsonc
{
  "success": true,
  "data": [
    {
      "id": "…v2",
      "versionNumber": 2,
      "title": "…",
      "timeLimitSeconds": 1800,
      "questionCount": 9,
      "isCurrent": true,
      "createdAt": "…",
    },
    {
      "id": "…v1",
      "versionNumber": 1,
      "questionCount": 9,
      "isCurrent": false,
      "createdAt": "…",
    },
  ],
}
```

#### Giao bài — chọn version (FE mặc định bản mới nhất)

> **Trước:** body `{"examIds": ["…"]}`.
> **Sau:** body `{"exams": [{ "examId": "…", "examVersionId"?: "…" }]}`. Bỏ trống `examVersionId` = **pin bản published mới nhất**. Truyền version cũ = **rollback / giao đúng bản** (validate version thuộc đúng exam, nếu sai → `404 "Phiên bản bài thi không hợp lệ"`).

```http
POST /api/v1/learning/teacher/exam-assignments
```

```jsonc
// body — giao bản mới nhất
{ "exams": [{ "examId": "…-001601" }], "studentIds": ["…"], "title": "Kiểm tra A1" }
// body — giao đúng version 1
{ "exams": [{ "examId": "…-001601", "examVersionId": "…v1" }], "studentIds": ["…"] }
```

- Response: khối `exams[]` có thêm `examVersionId`.
- Lỗi: exam chưa có version xuất bản (chưa từng publish) → `409 "Một hoặc nhiều bài thi chưa có phiên bản xuất bản, vui lòng xuất bản lại bài thi"`.

#### Curriculum Assignment & Class Curriculum — danh mục sống, pin lúc mở bài

- **Không** pin lúc giao/enroll. Thêm/cập nhật exam trong curriculum → học viên **thấy ngay** (danh mục sống).
- Khi học viên **mở một bài lần đầu**, hệ thống **pin `exam_version` hiện hành** cho riêng (học viên, bài) đó (`student_curriculum_exam_progress.exam_version_id`). Sửa bài + republish sau đó: học viên đã mở **không đổi**; học viên khác mở sau nhận bản mới.
- **Sticky:** đã FINISHED không bị thu hồi khi thêm bài bắt buộc; bài bị gỡ khỏi curriculum vẫn **giữ kết quả** (không tính vào mẫu số required nữa).

#### Làm bài

- Attempt đọc từ `exam_version` đã pin (assignment) hoặc pin-lúc-mở (curriculum). `timeLimitSecondsSnapshot` lấy từ version.
- Mỗi answer trong response có thêm `questionVersionId`. Thứ tự xáo trộn (word_ordering/matching) **vẫn ngẫu nhiên mỗi lượt**.

#### Sửa lỗi đáp án + chấm lại (hotfix, có chủ đích)

```http
POST /api/v1/learning/question-versions/{questionVersionId}/regrade
```

Quyền `learning.manage`. Body `{ "correctAnswer": { … } }` (đúng cấu trúc correctAnswer của loại câu). Tác dụng: cập nhật đáp án đúng của **phiên bản câu** đó, **chấm lại** mọi answer đã trả lời trỏ tới nó, và cập nhật điểm attempt + best/last summary + best của curriculum progress.

```jsonc
// data trả về
{ "questionVersionId": "…", "regradedAnswers": 3, "affectedAttempts": 3 }
```

> Đây là thao tác **riêng biệt** với sửa question thường (sửa thường không lan ngược tới bài đã phát/chấm).

#### Bảng điều kiện → lỗi (C)

| Tình huống                                    | Kết quả                                                                      |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| Giao bài chưa từng publish (không có version) | `409` `"…chưa có phiên bản xuất bản, vui lòng xuất bản lại bài thi"`         |
| Giao với `examVersionId` không thuộc exam     | `404` `"Phiên bản bài thi không hợp lệ"`                                     |
| Học viên mở bài curriculum chưa publish       | `409` `"Bài thi chưa có phiên bản xuất bản"`                                 |
| Sửa question/exam sau khi phát                | Bản đã phát **không đổi**; muốn áp dụng phải **republish** + phát lại/mở mới |
| regrade phiên bản câu không tồn tại           | `404` `"Không tìm thấy phiên bản câu hỏi"`                                   |

#### Lưu ý thay thế A)

Cơ chế A (`exam_assignment_questions`, cột `exam_assignment_exams.time_limit_seconds_snapshot`) **đã bị gỡ**. Exam Assignment nay pin `exam_version_id`; time limit lấy từ version. Mục A giữ lại chỉ để hiểu bối cảnh.

### A) Snapshot đề bài Exam Assignment tại thời điểm GIAO

**Migration cần chạy:** `npm run migration:run` (`1780000023000-snapshot-exam-assignment-at-issue`).

> **Trước:** đề (câu hỏi + đáp án) chỉ được "đóng băng" **khi học viên bắt đầu làm bài**. Nếu giáo viên sửa/thêm/bớt câu hỏi sau khi giao nhưng trước khi học viên start, học viên sẽ làm **bản mới**.
> **Sau:** đề được đóng băng **ngay khi giáo viên bấm giao** (`POST .../exam-assignments`). Sửa đề sau đó **không** ảnh hưởng các lượt đã giao. Muốn học viên nhận bản mới → **hủy lượt cũ và giao lại** (lượt mới chụp đề hiện tại).

#### Phạm vi & lưu ý chung

- Chỉ áp dụng **Exam Assignment**. Curriculum Assignment và tự học (self-study) **vẫn** đóng băng khi start attempt như cũ (chưa đồng nhất — sẽ làm sau).
- Không có API "cập nhật snapshot tại chỗ": snapshot **chốt cứng** theo từng lượt giao. Vòng đời để lấy bản mới = `DELETE` lượt cũ → `POST` giao lại.
- FE **không cần đổi shape request/response**; đây chủ yếu là thay đổi hành vi phía BE. Điểm FE cần biết nêu ở bảng dưới.

#### 1) Giao bài — `POST /api/v1/learning/teacher/exam-assignments`

Quyền: có **hồ sơ giáo viên**, dạy đúng môn của (các) bài thi (đã áp dụng từ mục specialization).

Request (không đổi):

```jsonc
{
  "examIds": ["018f7f76-0000-7000-8000-000000001601"],
  "studentIds": ["018f7f76-0000-7000-8000-000000001203"],
  "title": "Giao đề kiểm tra A1",
}
```

Hành vi mới: trong cùng transaction, BE chụp toàn bộ câu hỏi **đã xuất bản** của mỗi bài thi tại thời điểm này (đề, phương án, đáp án đúng, và **giới hạn thời gian**). Response `data` **không đổi** so với trước.

Lỗi mới cần lưu ý:

- Bài thi không còn câu hỏi đã xuất bản để chụp → `409` `"Bài thi chưa có câu hỏi đã xuất bản để giao"`.

#### 2) Lấy snapshot mới sau khi sửa đề — hủy rồi giao lại

```http
DELETE /api/v1/learning/teacher/exam-assignments/{id}
```

Đánh dấu lượt giao `CANCELLED` + `isActive=false` (học viên không start được nữa → `409 "Lượt giao bài thi không còn hoạt động"`). Sau đó `POST` giao lại để chụp đề hiện tại. Dữ liệu lượt cũ (attempts, snapshot) vẫn được giữ.

#### 3) Học viên làm bài — `POST /api/v1/learning/student/exam-assignments/{assignmentStudentId}/exams/{examId}/attempts`

> **Trước:** đọc câu hỏi live từ ngân hàng đề tại lúc start.
> **Sau:** đọc từ snapshot đã đóng băng khi giao. Số câu, nội dung, đáp án đúng và `timeLimitSecondsSnapshot` đều theo bản tại thời điểm giao. Thứ tự xáo trộn (word_ordering, matching) **vẫn ngẫu nhiên mỗi lượt** (không bị đóng băng).

Response `data` (rút gọn, shape **không đổi**):

```jsonc
{
  "id": "…",
  "source": "teacher_assigned",
  "status": "in_progress",
  "timeLimitSecondsSnapshot": 1800,
  "answers": [
    {
      "questionId": "…-001401",
      "questionType": "multiple_choice",
      "orderIndex": 1,
      "question": {
        "prompt": "Choose the correct word: She _____ to school every day.",
        "options": [
          /* … */
        ],
      },
    },
  ],
}
```

#### Bảng điều kiện → lỗi

| Tình huống                                            | Kết quả                                                    |
| ----------------------------------------------------- | ---------------------------------------------------------- |
| Giao bài thi không còn câu hỏi published              | `409` `"Bài thi chưa có câu hỏi đã xuất bản để giao"`      |
| Học viên start lượt đã bị hủy/không active            | `409` `"Lượt giao bài thi không còn hoạt động"`            |
| Sửa đề sau khi giao                                   | Lượt đã giao **không đổi**; cần hủy + giao lại để cập nhật |
| Bài thi đã xuất bản nhưng gỡ hết câu hỏi sau khi giao | Lượt đã giao **vẫn làm được** (đề đã đóng băng)            |

---

### B) Gắn môn học (Specialization) vào lớp và toàn bộ nội dung

**Migration cần chạy:** `npm run migration:run` (`1780000022000-add-specialization-links`).

#### Tóm tắt

Hệ thống hỗ trợ nhiều môn (Tiếng Anh, Toán…). Môn học (`Specialization`) trở thành **gốc** của cả lớp và nội dung học tập. Mọi thứ con suy ra môn từ cha; BE **chặn trộn môn khi ghi**.

Điểm đổi với FE:

- `specializationId` (UUID) **bắt buộc** trong body khi tạo: lớp, skill, topic, level, reading passage, question, exam, curriculum.
- Các `PATCH` tương ứng **không nhận** `specializationId` (không cho đổi môn) — gửi lên sẽ `400`.
- Mọi endpoint list ở trên nhận thêm query `?specializationId=<uuid>`.
- Object `question` / `exam` / `curriculum` / `class` trong mọi response nay đều có `specializationId`.

**Quyền truy cập** (không đổi so với trước):

- `/classes`, `/specializations`: cần permission `classes.manage`.
- Learning CMS (`/learning/skills|topics|levels|reading-passages|questions|exams|curriculums`): hiện chỉ cần đăng nhập (các permission `learning.*` đang tạm tắt ở controller).
- Giao bài (`/learning/teacher/...`): cần tài khoản có **hồ sơ giáo viên**; admin có `learning.manage` xem được mọi lượt giao.

Gửi kèm header `Authorization: Bearer <accessToken>` cho mọi request dưới đây.

#### 0) Lấy danh sách môn học để có `specializationId`

> **Trước:** endpoint này đã có, nhưng `specializationId` chỉ dùng để gán chuyên môn cho giáo viên.
> **Sau:** endpoint không đổi, nhưng `specializationId` lấy ở đây giờ là **đầu vào bắt buộc** cho toàn bộ luồng tạo lớp/nội dung bên dưới — FE nên gọi đầu tiên để đổ dropdown chọn môn.

`GET /api/v1/specializations?isActive=true`

```jsonc
{
  "success": true,
  "data": [
    {
      "id": "018f7f76-0000-7000-8000-000000001103",
      "name": "Demo English",
      "code": "DEMO-EN",
      "description": "English specialization for seeded teacher",
      "isActive": true,
      "createdAt": "2026-07-15T02:00:00.000Z",
      "updatedAt": "2026-07-15T02:00:00.000Z",
    },
    {
      "id": "018f7f76-0000-7000-8000-000000001104",
      "name": "Demo Math",
      "code": "DEMO-MATH",
      "description": "Math specialization to demo multi-subject listing",
      "isActive": true,
      "createdAt": "2026-07-15T02:00:00.000Z",
      "updatedAt": "2026-07-15T02:00:00.000Z",
    },
  ],
}
```

#### 1) Tạo lớp — `POST /api/v1/classes`

> **Trước:** body chỉ có `name`, `centerId`, `description?`, `image?`; lớp không gắn môn; unique theo `(name, center_id)`.
> **Sau:** body **bắt buộc thêm** `specializationId`; lớp thuộc đúng 1 môn; unique đổi thành `(name, center_id, specialization_id)`; response có thêm `specializationId`; list nhận `?specializationId=…`; `PATCH` không cho đổi môn.

Body (thêm `specializationId`):

```jsonc
{
  "name": "KATA-EN-A1",
  "centerId": "018f7f76-0000-7000-8000-000000001101",
  "specializationId": "018f7f76-0000-7000-8000-000000001103",
  "description": "Lớp Tiếng Anh A1",
}
```

Response `data`:

```jsonc
{
  "id": "018f80aa-1111-7000-8000-000000000201",
  "name": "KATA-EN-A1",
  "centerId": "018f7f76-0000-7000-8000-000000001101",
  "specializationId": "018f7f76-0000-7000-8000-000000001103",
  "description": "Lớp Tiếng Anh A1",
  "image": null,
  "isActive": true,
  "createdAt": "2026-07-15T03:10:00.000Z",
  "updatedAt": "2026-07-15T03:10:00.000Z",
}
```

- Lọc: `GET /api/v1/classes?specializationId=018f7f76-0000-7000-8000-000000001103`
- Unique lớp đổi thành `(name, center_id, specialization_id)`; trùng → `409` với `reactivateEndpoint` như cũ.
- `PATCH /classes/:id` **không nhận** `specializationId`.

#### 2) Tạo taxonomy — skill / topic / level

> **Trước:** skill/topic/level dùng chung toàn hệ thống; `code` skill/level unique toàn cục; topic unique `(parent_id, code)`; không có ràng buộc môn.
> **Sau:** mỗi skill/topic/level **thuộc 1 môn** (`specializationId` bắt buộc); `code` skill/level unique **trong 1 môn**; topic unique `(specialization_id, parent_id, code)` và topic con phải cùng môn với cha; list nhận `?specializationId=…`.

`POST /api/v1/learning/skills`:

```jsonc
// body
{ "specializationId": "018f7f76-0000-7000-8000-000000001103", "code": "reading", "name": "Reading" }
// data
{
  "id": "018f80aa-2222-7000-8000-000000000301",
  "specializationId": "018f7f76-0000-7000-8000-000000001103",
  "code": "reading",
  "name": "Reading",
  "isActive": true,
  "createdAt": "2026-07-15T03:11:00.000Z",
  "updatedAt": "2026-07-15T03:11:00.000Z"
}
```

`POST /api/v1/learning/topics` — body `{ specializationId, code, name, parentId? }`. Nếu có `parentId`, topic cha phải **cùng môn** (lệch → `409 "Chủ đề cha không thuộc cùng môn học"`). `code` unique theo `(specialization_id, parent_id, code)`.

`POST /api/v1/learning/levels` — body `{ specializationId, code, name, rank }`. `code` unique theo `(specialization_id, code)`.

Cả 3 nhận query lọc `?specializationId=…`.

#### 3) Tạo câu hỏi — `POST /api/v1/learning/questions`

> **Trước:** câu hỏi không gắn môn; `skillId`/`topicId`/`difficultyLevelId`/`passageId` chỉ cần tồn tại là được.
> **Sau:** body **bắt buộc thêm** `specializationId`; các tham chiếu `skillId`/`topicId`/`difficultyLevelId`/`passageId` phải **cùng môn** với câu hỏi (lệch → `400`); response có thêm `specializationId`; list nhận `?specializationId=…`; `PATCH` không cho đổi môn.

Body (thêm `specializationId`; `skillId`/`topicId`/`difficultyLevelId` phải cùng môn):

```jsonc
{
  "specializationId": "018f7f76-0000-7000-8000-000000001103",
  "type": "multiple_choice",
  "prompt": "She _____ to school every day.",
  "instruction": "Chọn một đáp án.",
  "difficultyLevelId": "018f7f76-0000-7000-8000-000000001301",
  "skillId": "018f7f76-0000-7000-8000-000000001311",
  "topicId": "018f7f76-0000-7000-8000-000000001321",
  "options": [
    { "label": "A", "content": "go", "isCorrect": false, "orderIndex": 1 },
    { "label": "B", "content": "goes", "isCorrect": true, "orderIndex": 2 },
  ],
  "detail": {},
  "status": "draft",
}
```

Response `data` (có `specializationId`):

```jsonc
{
  "id": "018f80aa-3333-7000-8000-000000000401",
  "specializationId": "018f7f76-0000-7000-8000-000000001103",
  "type": "multiple_choice",
  "prompt": "She _____ to school every day.",
  "instruction": "Chọn một đáp án.",
  "explanation": null,
  "difficultyLevelId": "018f7f76-0000-7000-8000-000000001301",
  "difficultyLevel": {
    "id": "018f7f76-0000-7000-8000-000000001301",
    "specializationId": "018f7f76-0000-7000-8000-000000001103",
    "code": "DEMO-A1",
    "name": "Demo A1",
    "rank": 1,
    "isActive": true,
  },
  "skillId": "018f7f76-0000-7000-8000-000000001311",
  "skill": {
    "id": "018f7f76-0000-7000-8000-000000001311",
    "specializationId": "018f7f76-0000-7000-8000-000000001103",
    "code": "demo-grammar",
    "name": "Demo Grammar",
    "isActive": true,
  },
  "topicId": "018f7f76-0000-7000-8000-000000001321",
  "topic": {
    "id": "018f7f76-0000-7000-8000-000000001321",
    "specializationId": "018f7f76-0000-7000-8000-000000001103",
    "code": "demo-basics",
    "name": "Demo Basics",
    "parentId": null,
    "isActive": true,
  },
  "status": "draft",
  "isActive": true,
  "options": [
    {
      "id": "…",
      "questionId": "018f80aa-3333-7000-8000-000000000401",
      "label": "A",
      "content": "go",
      "isCorrect": false,
      "orderIndex": 1,
      "explanation": null,
    },
    {
      "id": "…",
      "questionId": "018f80aa-3333-7000-8000-000000000401",
      "label": "B",
      "content": "goes",
      "isCorrect": true,
      "orderIndex": 2,
      "explanation": null,
    },
  ],
  "media": [],
  "tags": [],
  "detail": {},
  "createdAt": "2026-07-15T03:12:00.000Z",
  "updatedAt": "2026-07-15T03:12:00.000Z",
}
```

Lỗi đồng-môn (vd `skillId` thuộc môn khác):

```jsonc
{
  "success": false,
  "statusCode": 400,
  "message": "Kỹ năng không thuộc cùng môn học với câu hỏi",
  "path": "/api/v1/learning/questions",
  "requestId": "…",
  "timestamp": "…",
}
```

Lọc: `GET /api/v1/learning/questions?specializationId=…&status=published`.

#### 4) Tạo bài thi & gắn câu hỏi

> **Trước:** exam không gắn môn; gắn câu hỏi vào exam chỉ cần câu hỏi tồn tại/active.
> **Sau:** tạo exam **bắt buộc thêm** `specializationId`; gắn câu hỏi vào exam thì câu hỏi phải **cùng môn** với exam (lệch → `400`); response có thêm `specializationId`; list nhận `?specializationId=…`; `PATCH` không cho đổi môn.

`POST /api/v1/learning/exams`:

```jsonc
// body
{ "specializationId": "018f7f76-0000-7000-8000-000000001103", "code": "EN-A1-01", "title": "English A1 Test 01", "timeLimitSeconds": 1800 }
// data
{
  "id": "018f80aa-4444-7000-8000-000000000501",
  "specializationId": "018f7f76-0000-7000-8000-000000001103",
  "code": "EN-A1-01",
  "title": "English A1 Test 01",
  "description": null,
  "status": "draft",
  "timeLimitSeconds": 1800,
  "isActive": true,
  "questions": [],
  "createdAt": "2026-07-15T03:13:00.000Z",
  "updatedAt": "2026-07-15T03:13:00.000Z"
}
```

`POST /api/v1/learning/exams/018f80aa-4444-7000-8000-000000000501/questions`:

```jsonc
// body
{ "questionId": "018f80aa-3333-7000-8000-000000000401", "orderIndex": 1 }
```

Nếu câu hỏi khác môn với bài thi:

```jsonc
{
  "success": false,
  "statusCode": 400,
  "message": "Câu hỏi không thuộc cùng môn học với bài thi",
  "path": "…",
  "requestId": "…",
  "timestamp": "…",
}
```

#### 5) Tạo chương trình & gắn bài thi

> **Trước:** curriculum không gắn môn; `levelId` chỉ cần tồn tại; gắn exam vào curriculum chỉ cần exam tồn tại/active.
> **Sau:** tạo curriculum **bắt buộc thêm** `specializationId`; `levelId` (nếu có) phải cùng môn; gắn exam vào curriculum thì exam phải **cùng môn** (lệch → `400`); response có thêm `specializationId`; list nhận `?specializationId=…`; `PATCH` không cho đổi môn.

`POST /api/v1/learning/curriculums`:

```jsonc
// body — levelId (nếu có) phải cùng môn
{ "specializationId": "018f7f76-0000-7000-8000-000000001103", "code": "EN-A1-CUR", "title": "English A1 Curriculum", "levelId": "018f7f76-0000-7000-8000-000000001301" }
// data
{
  "id": "018f80aa-5555-7000-8000-000000000601",
  "specializationId": "018f7f76-0000-7000-8000-000000001103",
  "code": "EN-A1-CUR",
  "title": "English A1 Curriculum",
  "description": null,
  "levelId": "018f7f76-0000-7000-8000-000000001301",
  "level": { "id": "018f7f76-0000-7000-8000-000000001301", "specializationId": "018f7f76-0000-7000-8000-000000001103", "code": "DEMO-A1", "name": "Demo A1", "rank": 1, "isActive": true },
  "status": "draft",
  "isActive": true,
  "exams": [],
  "createdAt": "2026-07-15T03:14:00.000Z",
  "updatedAt": "2026-07-15T03:14:00.000Z"
}
```

`POST /api/v1/learning/curriculums/:id/exams` body `{ examId, orderIndex, isRequired? }`. Exam khác môn → `400 "Bài thi không thuộc cùng môn học với chương trình"`.

#### 6) Giao bài — kiểm quyền theo môn

> **Trước:** giáo viên giao exam/curriculum cho bất kỳ lớp mình phụ trách; không kiểm môn; một lượt exam-assignment có thể trộn exam khác môn.
> **Sau:** giáo viên chỉ giao được nội dung của **môn mình đang dạy** (`403` nếu không); `classId` (nếu có) phải **cùng môn** với nội dung (`400` nếu lệch); mọi exam trong một lượt phải **cùng một môn** (`400` nếu trộn); khối `exam`/`curriculum`/`class` trong response có thêm `specializationId`.

`POST /api/v1/learning/teacher/exam-assignments`:

```jsonc
// body
{
  "examIds": ["018f80aa-4444-7000-8000-000000000501"],
  "classId": "018f80aa-1111-7000-8000-000000000201",
  "title": "Giao bài A1",
}
```

Response `data` (khối `exams[].exam` và `class` có `specializationId`):

```jsonc
{
  "id": "018f80aa-6666-7000-8000-000000000701",
  "teacherId": "018f7f76-0000-7000-8000-000000001201",
  "classId": "018f80aa-1111-7000-8000-000000000201",
  "title": "Giao bài A1",
  "status": "active",
  "isActive": true,
  "exams": [
    {
      "id": "…",
      "examId": "018f80aa-4444-7000-8000-000000000501",
      "orderIndex": 0,
      "isRequired": true,
      "exam": {
        "id": "018f80aa-4444-7000-8000-000000000501",
        "specializationId": "018f7f76-0000-7000-8000-000000001103",
        "code": "EN-A1-01",
        "title": "English A1 Test 01",
        "status": "published",
        "timeLimitSeconds": 1800,
      },
    },
  ],
  "class": {
    "id": "018f80aa-1111-7000-8000-000000000201",
    "name": "KATA-EN-A1",
    "centerId": "018f7f76-0000-7000-8000-000000001101",
    "specializationId": "018f7f76-0000-7000-8000-000000001103",
  },
  "students": [
    /* … */
  ],
}
```

Các lỗi có thể gặp:

```jsonc
// giáo viên không dạy môn của nội dung
{ "success": false, "statusCode": 403, "message": "Giáo viên không phụ trách môn học này", "path": "…", "requestId": "…", "timestamp": "…" }
// lớp khác môn với bài thi
{ "success": false, "statusCode": 400, "message": "Lớp không thuộc cùng môn học với bài thi", "path": "…", "requestId": "…", "timestamp": "…" }
// các exam trong 1 lượt giao không cùng môn
{ "success": false, "statusCode": 400, "message": "Các bài thi trong một lượt giao phải cùng một môn học", "path": "…", "requestId": "…", "timestamp": "…" }
```

`POST /api/v1/learning/teacher/curriculum-assignments` áp cùng quy tắc: giáo viên phải dạy môn của curriculum; nếu có `classId` thì lớp phải cùng môn. Khối `curriculum` và `class` trong response cũng có `specializationId`.

#### 7) Lưu ý khi dùng API (điều kiện → lỗi)

Bảng dưới gom các trường hợp lỗi liên quan tới môn học để FE bắt và hiển thị đúng:

| Khi nào                                                  | HTTP          | `message`                                                                                |
| -------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------- |
| Tạo lớp/nội dung mà thiếu `specializationId` trong body  | `400`         | `specializationId should not be empty` / `specializationId must be a UUID` (fieldErrors) |
| `specializationId` không tồn tại hoặc đang inactive      | `404`         | `Không tìm thấy môn học`                                                                 |
| Gửi `specializationId` trong `PATCH` (đổi môn)           | `400`         | `property specializationId should not exist` (forbidNonWhitelisted)                      |
| Tạo/sửa question có `skillId` khác môn                   | `400`         | `Kỹ năng không thuộc cùng môn học với câu hỏi`                                           |
| Tạo/sửa question có `topicId` khác môn                   | `400`         | `Chủ đề không thuộc cùng môn học với câu hỏi`                                            |
| Tạo/sửa question có `difficultyLevelId` khác môn         | `400`         | `Cấp độ không thuộc cùng môn học với câu hỏi`                                            |
| Question `reading_comprehension` có `passageId` khác môn | `400`         | `Bài đọc không thuộc cùng môn học với câu hỏi`                                           |
| Tạo topic con mà topic cha khác môn                      | `409`         | `Chủ đề cha không thuộc cùng môn học`                                                    |
| Reading passage / curriculum có `levelId` khác môn       | `409` / `400` | `Cấp độ không thuộc cùng môn học` / `Cấp độ không thuộc cùng môn học với chương trình`   |
| Gắn câu hỏi vào exam khác môn                            | `400`         | `Câu hỏi không thuộc cùng môn học với bài thi`                                           |
| Gắn exam vào curriculum khác môn                         | `400`         | `Bài thi không thuộc cùng môn học với chương trình`                                      |
| Giáo viên giao nội dung của môn mình không dạy           | `403`         | `Giáo viên không phụ trách môn học này`                                                  |
| Giao kèm `classId` mà lớp khác môn với nội dung          | `400`         | `Lớp không thuộc cùng môn học với bài thi` / `… với chương trình`                        |
| Một lượt exam-assignment gồm nhiều exam khác môn nhau    | `400`         | `Các bài thi trong một lượt giao phải cùng một môn học`                                  |
| Trùng `(name, center_id, specialization_id)` khi tạo lớp | `409`         | `Tên lớp đã tồn tại trong trung tâm và môn học này` (+ `reactivateEndpoint`)             |
| Trùng `code` skill/level trong cùng môn                  | `409`         | `Mã kỹ năng đã tồn tại` / `Mã cấp độ đã tồn tại` (+ `reactivateEndpoint`)                |

Quy tắc chung cần nhớ:

- **Chọn môn trước, chọn dữ liệu con sau.** Luôn lấy `specializationId` (mục 0) rồi mới gọi các list `?specializationId=…` để đổ dropdown skill/topic/level/exam… đúng môn, tránh 400 đồng-môn.
- **Trình tự publish không đổi:** question `published` → gắn vào exam → exam `published` → gắn vào curriculum → curriculum `published` → mới giao được. Ràng buộc môn chỉ **thêm** một lớp kiểm tra, không thay đổi trình tự này.
- **Không sửa được môn** sau khi tạo; muốn đổi thì tạo bản ghi mới ở môn đích.
- `code` skill/level chỉ unique **trong một môn** — hai môn khác nhau được trùng `code`.

#### Ghi chú

- `Student` **không** gắn môn trực tiếp — suy ra từ lớp đang học.
- Loại câu hỏi cho Toán: hiện dùng `multiple_choice` / `image_choice` / `matching`; kiểu nhập số/biểu thức nằm trong roadmap, chưa triển khai.
