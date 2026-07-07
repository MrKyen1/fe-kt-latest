# Kata Edu Backend API Guide

Tài liệu này là contract cho frontend tích hợp API backend. Nội dung đã được đối chiếu với code trong `be/src/modules`.

## Mục lục

- [1. Base Info](#1-base-info)
- [Changelog — thay đổi so với version trước](#changelog--thay-đổi-so-với-version-trước)
- [2. Setup Local](#2-setup-local)
- [3. Auth](#3-auth)
- [4. Permission Thực Tế](#4-permission-thực-tế)
- [5. Admin/User/Academic APIs](#5-adminuseracademic-apis)
- [6. RBAC APIs](#6-rbac-apis)
- [7. Admin Learning CMS](#7-admin-learning-cms)
- [8. Teacher Assignment Flow](#8-teacher-assignment-flow)
- [9. Student Attempt Flow](#9-student-attempt-flow)
- [10. Auto Grading Rules](#10-auto-grading-rules)
- [11. Observability](#11-observability)
- [12. FE Integration Notes](#12-fe-integration-notes)
- [13. Flow Khởi Tạo Dữ Liệu Cơ Bản](#13-flow-khởi-tạo-dữ-liệu-cơ-bản)
- [14. Backend Change Policy](#14-backend-change-policy)

## 1. Base Info

- Base URL local: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/api/docs`
- Auth header: `Authorization: Bearer <accessToken>`
- CORS bật credentials.
- Validation bật `whitelist` và `forbidNonWhitelisted`: field ngoài DTO sẽ bị reject.
- `GET /learning/media-assets/files/:filename` là public.

Response thành công luôn qua interceptor:

```json
{
  "success": true,
  "data": {},
  "meta": {},
  "requestId": "string",
  "timestamp": "2026-05-30T00:00:00.000Z"
}
```

`meta` chỉ có ý nghĩa với response phân trang; các response không phân trang có thể không có `meta`.

Response lỗi:

```json
{
  "success": false,
  "statusCode": 400,
  "errorCode": "BAD_REQUEST",
  "message": "Dữ liệu không hợp lệ",
  "details": [],
  "fieldErrors": {},
  "path": "/api/v1/...",
  "requestId": "string",
  "timestamp": "2026-05-30T00:00:00.000Z"
}
```

List có pagination chỉ áp dụng cho các API dùng `paginate` như learning runtime/CMS, teacher assignment, student assignment, observability. `GET /users`, `/roles`, `/permissions`, `/centers`, `/classes`, `/specializations` hiện trả mảng trực tiếp trong `data`.

Pagination meta:

```json
{
  "page": 1,
  "limit": 20,
  "total": 100,
  "totalPages": 5
}
```

## Changelog — thay đổi so với version trước

Phần này để team BE/FE theo dõi các thay đổi của đợt cập nhật learning (giao bài + làm bài + tạo exam). Chi tiết contract ở các section tương ứng.

**Migrations cần chạy:** `npm run migration:run`

- `1780000014000` — multi-exam assignment + standing class↔curriculum + cột `exam_attempts.source` + `maxAttempts`.
- `1780000015000` — **DROP `exam_questions.score`** (breaking).

### 1. Exam assignment đa-exam (giao cả lớp hoặc từng HS)

- `ExamAssignment` chứa **nhiều exam** (`exam_assignment_exams`); giao cho cả lớp (`classId`) hoặc danh sách HS (`studentIds`, không cần lớp).
- `POST /learning/teacher/exam-assignments` — body đổi: `examIds: string[]`, `classId?`, `studentIds?`, `maxAttempts?`, `title?`, `instructions?`. Detail/list trả `exams: [...]` thay cho 1 `exam`. Xem [8.1](#81-exam-assignment).

### 2. Chọn exam theo curriculum khi giao

- `GET /learning/exams?curriculumId=<id>&status=published` — lọc exam thuộc 1 curriculum (không bắt buộc cùng curriculum của lớp). Xem [7.5](#75-exam).

### 3. Standing class ↔ curriculum (self-study)

- `POST/GET/DELETE /learning/teacher/class-curriculums` — gắn curriculum vào lớp; mọi HS trong lớp (kể cả vào sau) tự thấy & tự làm; enrollment + progress tạo **lazy** khi làm lần đầu.
- Student curriculum đổi sang khóa theo `curriculumId`: `GET /learning/student/curriculums/:curriculumId`, `POST /learning/student/curriculums/:curriculumId/exams/:examId/attempts`. Xem [8.3](#83-class--curriculum-standing-link) + [9.1](#91-assigned-curriculums-keyed-by-curriculumid).

### 4. Giao curriculum/exam trực tiếp cho HS (không cần lớp)

- `POST /learning/teacher/curriculum-assignments` — `studentIds` bắt buộc, `classId` optional. Xem [8.2](#82-curriculum-assignment-giao-trực-tiếp-cho-student).

### 5. Giới hạn số lần làm (`maxAttempts`)

- Đặt khi giao (exam-assignment / curriculum-assignment / class-curriculum); `null` = vĩnh viễn. Đếm theo số lần **đã nộp** mỗi exam; hết lượt → `409 Đã hết số lần làm bài cho phép`.

### 6. Phân loại nguồn attempt (`source`)

- `exam_attempts.source`: `teacher_assigned` (exam-assignment) | `self_study` (curriculum). Dùng cho phân tích.

### 7. Resume attempt khi reload (start idempotent)

- Route start exam-assignment đổi: `POST /learning/student/exam-assignments/:assignmentStudentId/exams/:examId/attempts`.
- Gọi lại start khi đang có attempt `in_progress` (cùng scope+exam) sẽ **trả lại attempt đó** (không tạo mới, không tốn lượt). Xem [9.2.2](#922-start-attempt).

### 8. Random câu hỏi theo nhóm tiêu chí + bulk attach (tạo exam nhanh)

- `POST /learning/exams/random-questions` — preview, **không ghi DB**. Body `{ criteria: [{ count, levelId?, type?, topicId?, skillId? }] }`. Trả `data.items` (đúng shape bulk-attach) + `data.groups[].questions` (full detail). Giữ thứ tự theo nhóm, không trùng giữa các nhóm; nhóm thiếu câu → `409`.
- `POST /learning/exams/:id/questions/bulk` — body `{ items: [{ questionId, orderIndex? }] }`. FE truyền thẳng `data.items` từ random. Xem [7.5](#75-exam).

### 9. Bỏ `exam_questions.score` (breaking)

- Không còn điểm trọng số per-question (chấm theo mô hình cộng dồn: mỗi câu = 1 điểm). `POST/PATCH /learning/exams/:id/questions[...]` **không nhận `score`** nữa (gửi `score` → `400`).

## 2. Setup Local

```bash
docker compose up -d
npm install
npm run migration:run
npm run start:dev
```

Tài khoản dev admin sau migration seed:

```txt
code: admin
phone: 0000000000
email: admin@kata.edu
password: Admin@123456
```

Lưu ý quan trọng: `POST /auth/login` hiện chỉ login bằng `code` qua field `identifier`, không login bằng phone/email.

## 3. Auth

Public:

- `POST /auth/login`
- `POST /auth/refresh`

Cần Bearer token:

- `POST /auth/logout`
- `POST /auth/logout-all`
- `GET /auth/me`
- `PATCH /auth/me`
- `PATCH /auth/change-password`
- `POST /auth/reset-password` cần `users.manage`

Login:

```json
{
  "identifier": "admin",
  "password": "Admin@123456"
}
```

Login/refresh response chính:

```json
{
  "user": {
    "id": "user-id",
    "code": "admin",
    "role": {
      "id": "role-id",
      "code": "admin",
      "name": "Admin",
      "permissions": ["users.manage"]
    }
  },
  "accessToken": "jwt",
  "refreshToken": "jwt"
}
```

FE cần lưu:

- `data.accessToken`
- `data.refreshToken`
- `data.user.role.code`
- `data.user.role.permissions`

Refresh token:

```json
{
  "refreshToken": "<refreshToken>"
}
```

Refresh sẽ revoke refresh token cũ và trả token pair mới.

Logout:

```http
POST /auth/logout
```

```json
{
  "refreshToken": "<refreshToken>"
}
```

Change password:

```http
PATCH /auth/change-password
```

```json
{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword123"
}
```

Sau khi đổi mật khẩu, BE revoke toàn bộ refresh token của user.

Update current user:

```http
PATCH /auth/me
```

```json
{
  "fullName": "Nguyen Van A",
  "phone": "0900000000",
  "email": "a@example.com",
  "address": "HCM",
  "avatar": "https://cdn.example.com/avatar.png",
  "code": "user-code"
}
```

Admin reset password:

```http
POST /auth/reset-password
```

```json
{
  "identifier": "user-code-or-user-id"
}
```

Response trả temporary password trong `data.password`; FE chỉ hiển thị cho admin đúng flow bảo mật.

## 4. Permission Thực Tế

Guard permission đang áp dụng trong code:

- `users.manage`: `/users`, `/auth/reset-password`
- `classes.manage`: `/centers`, `/classes`, `/specializations`
- `rbac.manage`: `/permissions`, `/role-permissions`
- `request-logs.read`: `/request-logs`
- `audit-logs.read`: `/audit-logs`

`/roles` hiện có `@Public()` trên controller, nên không cần Bearer token và không enforce `rbac.manage` dù controller vẫn khai báo `@Permissions('rbac.manage')`.

Các learning permission đang tồn tại trong seed/ý đồ hệ thống nhưng controller hiện đang comment `@Permissions`:

- `learning.read`
- `learning.write`
- `learning.publish`
- `learning.delete`
- `learning.media.upload`
- `learning.manage`
- `learning.assign`
- `learning.attempt`

Vì vậy ở thời điểm hiện tại, learning endpoints cần Bearer token nhưng chưa enforce permission riêng ở controller. Riêng service vẫn dùng `learning.manage` để admin xem assignment của mọi teacher.

## 5. Admin/User/Academic APIs

### 5.1 Users

Tất cả `/users` cần `users.manage`.

- `POST /users`
- `GET /users`
- `GET /users/:id`
- `PATCH /users/:id`
- `DELETE /users/:id`

Create admin user:

```json
{
  "code": "admin2",
  "password": "Admin@123456",
  "fullName": "Admin 2",
  "dateOfBirth": "1990-01-01",
  "phone": "0900000000",
  "email": "admin2@example.com",
  "address": "HCM",
  "roleId": "admin-role-id",
  "avatar": "https://cdn.example.com/avatar.png",
  "startDate": "2026-06-01"
}
```

Create teacher user:

```json
{
  "code": "T001",
  "password": "Teacher@123",
  "fullName": "Teacher A",
  "dateOfBirth": "1990-01-01",
  "phone": "0900000001",
  "roleId": "teacher-role-id",
  "startDate": "2026-06-01",
  "teacherProfile": {
    "yearsOfExperience": 3,
    "description": "IELTS teacher",
    "classIds": ["class-id"],
    "specializationIds": ["specialization-id"]
  }
}
```

Create student user:

```json
{
  "code": "S001",
  "password": "Student@123",
  "fullName": "Student A",
  "dateOfBirth": "2012-01-01",
  "phone": "0900000002",
  "roleId": "student-role-id",
  "startDate": "2026-06-01",
  "studentProfile": {
    "classIds": ["class-id"]
  }
}
```

Rules:

- Role `teacher` bắt buộc có `teacherProfile.description`, `classIds`, `specializationIds`.
- Role `student` bắt buộc có `studentProfile.classIds`.
- Role `admin` không được gửi teacher/student profile.
- `code` là unique.
- `password` tối thiểu 8 ký tự.
- `startDate` là bắt buộc khi tạo user và phải dùng format date-only `YYYY-MM-DD`.
- Không gửi `endDate` khi tạo user. Nếu gửi `endDate` trong `POST /users`, BE sẽ reject 400 vì field không nằm trong DTO.
- `startDate`/`endDate` không nhận ISO datetime như `2026-06-17T00:00:00.000Z`; FE phải gửi date-only như `2026-06-17`.
- BE không tự convert datetime về date để tránh lệch ngày do timezone.
- Muốn inactive user thì admin dùng `PATCH /users/:id` để set `endDate`.
- Nếu `endDate <= CURRENT_DATE` theo ngày server, user sẽ inactive ngay trong request PATCH.
- Nếu `endDate > CURRENT_DATE`, user sẽ active và cron sẽ inactive khi đến hạn.
- Nếu `endDate = null`, user sẽ active và không có lịch inactive.
- `PATCH /users/:id` không nhận field `isActive`; nếu gửi `isActive`, BE sẽ reject 400 vì field không nằm trong DTO.
- Nếu có `endDate`, `endDate` phải lớn hơn hoặc bằng `startDate`.
- Hằng ngày lúc 00:00 theo timezone server, BE tự chuyển user active có `endDate <= CURRENT_DATE` sang inactive.
- Admin active lại user bằng cách clear `endDate` hoặc gia hạn `endDate` sang một ngày tương lai.
- Response user đã bỏ `hashedPassword`.

Update user end date:

```http
PATCH /users/:id
```

Inactive ngay nếu hôm nay là `2026-06-17`:

```json
{
  "endDate": "2026-06-17"
}
```

Schedule inactive:

```json
{
  "endDate": "2026-06-30"
}
```

Clear end date and active user:

```json
{
  "endDate": null
}
```

Active user by extending end date:

```json
{
  "endDate": "2026-06-30"
}
```

`GET /users` filters:

- `isActive`
- `search`
- `code`
- `phone`
- `email`
- `roleId`
- `roleCode`
- `classId`
- `centerId`
- `specializationId`

Mặc định `GET /users` trả user active (`isActive=true`). Gửi `GET /users?isActive=false` để xem user inactive.

### 5.2 Academic

Tất cả cần `classes.manage`.

Centers:

- `POST /centers`
- `GET /centers`
- `GET /centers/:id`
- `PATCH /centers/:id`
- `DELETE /centers/:id`

```json
{
  "name": "Center 1",
  "address": "HCM",
  "phone": "0900000000",
  "email": "center@example.com",
  "description": "Main center",
  "image": "https://cdn.example.com/center.png",
  "mapEmbedUrl": "https://maps.example.com/embed"
}
```

Classes:

- `POST /classes`
- `GET /classes`
- `GET /classes/:id`
- `PATCH /classes/:id`
- `DELETE /classes/:id`

```json
{
  "name": "A1 Morning",
  "centerId": "center-id",
  "description": "Morning class",
  "image": "https://cdn.example.com/class.png"
}
```

Specializations:

- `POST /specializations`
- `GET /specializations`
- `GET /specializations/:id`
- `PATCH /specializations/:id`
- `DELETE /specializations/:id`

```json
{
  "name": "Grammar",
  "code": "grammar",
  "description": "Grammar specialization"
}
```

## 6. RBAC APIs

`/roles` hiện public theo code. `/permissions` và `/role-permissions` cần Bearer token có `rbac.manage`.

Roles:

- `POST /roles`
- `GET /roles?isActive=true&search=admin`
- `GET /roles/:id`
- `PATCH /roles/:id`
- `DELETE /roles/:id`

```json
{
  "code": "teacher",
  "name": "Teacher",
  "description": "Teacher role"
}
```

Permissions:

- `POST /permissions`
- `GET /permissions?isActive=true&search=learning`
- `GET /permissions/:id`
- `PATCH /permissions/:id`
- `DELETE /permissions/:id`

```json
{
  "code": "learning.read",
  "name": "Read learning",
  "description": "Can read learning content"
}
```

Role permissions:

- `POST /role-permissions`
- `GET /role-permissions`
- `GET /role-permissions/matrix`
- `PUT /role-permissions/matrix`
- `GET /role-permissions/:id`
- `PATCH /role-permissions/:id`
- `DELETE /role-permissions/:id`

Create mapping:

```json
{
  "roleId": "role-id",
  "permissionId": "permission-id"
}
```

Sync matrix:

```json
{
  "roleIds": ["role-id"],
  "permissionIds": ["permission-id"],
  "assignments": [
    {
      "roleId": "role-id",
      "permissionId": "permission-id"
    }
  ]
}
```

## 7. Admin Learning CMS

Tất cả route trong phần này cần Bearer token. Permission learning đang comment ở controller, xem mục 4.

Query chung cho list learning:

- `page` default `1`, min `1`
- `limit` default `20`, max `100`
- `search`
- `isActive` default `true`
- `sortBy` default `createdAt`
- `sortOrder` default `DESC`, nhận `ASC|DESC|asc|desc`

### 7.1 Taxonomy

Level:

- `POST /learning/levels`
- `GET /learning/levels?page=1&limit=20&search=A1&sortBy=rank&sortOrder=ASC`
- `GET /learning/levels/:id`
- `PATCH /learning/levels/:id`
- `DELETE /learning/levels/:id`

```json
{
  "code": "A1",
  "name": "Beginner",
  "rank": 1
}
```

Skill:

- `POST /learning/skills`
- `GET /learning/skills?page=1&limit=20`
- `GET /learning/skills/:id`
- `PATCH /learning/skills/:id`
- `DELETE /learning/skills/:id`

```json
{
  "code": "reading",
  "name": "Reading"
}
```

Topic:

- `POST /learning/topics`
- `GET /learning/topics?page=1&limit=20&parentId=<topicId>`
- `GET /learning/topics/:id`
- `PATCH /learning/topics/:id`
- `DELETE /learning/topics/:id`

```json
{
  "code": "daily-life",
  "name": "Daily Life",
  "parentId": "topic-id"
}
```

Tag:

- `POST /learning/tags`
- `GET /learning/tags?page=1&limit=20`
- `GET /learning/tags/:id`
- `PATCH /learning/tags/:id`
- `DELETE /learning/tags/:id`

```json
{
  "code": "present-simple",
  "name": "Present Simple"
}
```

Update DTO cho level/skill/topic/tag có thêm `expectedUpdatedAt` optional để optimistic lock.

### 7.2 Media

Create media bằng URL:

```http
POST /learning/media-assets
```

```json
{
  "type": "audio",
  "url": "https://cdn.example.com/audio.mp3",
  "storageKey": "audio/a1.mp3",
  "mimeType": "audio/mpeg",
  "durationSeconds": 30,
  "width": 1280,
  "height": 720,
  "altText": "Listening prompt"
}
```

Upload local:

```http
POST /learning/media-assets/upload
```

- Content-Type: `multipart/form-data`
- Field file: `file`
- Field text optional: `altText`
- Chỉ hỗ trợ `image/*`, `audio/*`, `video/*`.
- Max size lấy từ `LEARNING_UPLOAD_MAX_BYTES`, default 50MB.

Response trả media asset, ví dụ:

```json
{
  "id": "media-id",
  "type": "image",
  "url": "/api/v1/learning/media-assets/files/generated-file.png",
  "storageKey": "generated-file.png",
  "mimeType": "image/png",
  "altText": "Prompt image"
}
```

FE dùng `url` trực tiếp trong `img`, `audio`, `video`.

Other APIs:

- `GET /learning/media-assets?page=1&limit=20&type=image`
- `GET /learning/media-assets/:id`
- `PATCH /learning/media-assets/:id`
- `DELETE /learning/media-assets/:id`
- `GET /learning/media-assets/files/:filename`

### 7.3 Reading Passage

```http
POST /learning/reading-passages
```

```json
{
  "title": "A short story",
  "content": "Long reading content...",
  "source": "Book A",
  "levelId": "level-id"
}
```

APIs:

- `GET /learning/reading-passages?page=1&limit=20&levelId=<levelId>`
- `GET /learning/reading-passages/:id`
- `PATCH /learning/reading-passages/:id`
- `DELETE /learning/reading-passages/:id`

### 7.4 Question

Question types:

- `multiple_choice`
- `audio_choice`
- `image_choice`
- `word_ordering`
- `reading_comprehension`
- `sentence_rewrite`
- `hint_rewrite`
- `error_correction`
- `matching`

Media roles:

- `prompt_audio`
- `prompt_image`
- `explanation_audio`
- `explanation_image`
- `attachment`

Create common:

```http
POST /learning/questions
```

```json
{
  "type": "multiple_choice",
  "prompt": "Choose the correct answer",
  "instruction": "Select one option",
  "explanation": "Because...",
  "difficultyLevelId": "level-id",
  "skillId": "skill-id",
  "topicId": "topic-id",
  "tagIds": ["tag-id"],
  "status": "draft",
  "options": [],
  "mediaIds": [],
  "detail": {}
}
```

Choice question:

```json
{
  "type": "multiple_choice",
  "prompt": "What is the synonym of big?",
  "options": [
    {
      "label": "A",
      "content": "Large",
      "isCorrect": true,
      "orderIndex": 0,
      "explanation": "Large means big."
    },
    {
      "label": "B",
      "content": "Small",
      "isCorrect": false,
      "orderIndex": 1
    }
  ],
  "detail": {}
}
```

Audio/image choice:

```json
{
  "type": "audio_choice",
  "prompt": "Listen and choose",
  "mediaIds": [
    {
      "mediaId": "media-id",
      "role": "prompt_audio",
      "orderIndex": 0
    }
  ],
  "options": [
    {
      "content": "Answer 1",
      "isCorrect": true,
      "orderIndex": 0
    }
  ],
  "detail": {}
}
```

Reading comprehension:

```json
{
  "type": "reading_comprehension",
  "prompt": "What is the main idea?",
  "options": [
    {
      "content": "Option 1",
      "isCorrect": true
    }
  ],
  "detail": {
    "passageId": "reading-passage-id"
  }
}
```

Word ordering:

```json
{
  "type": "word_ordering",
  "prompt": "Arrange the words",
  "detail": {
    "correctTokens": ["I", "am", "a", "student"],
    "caseSensitive": false,
    "allowPunctuationVariants": true
  }
}
```

Sentence rewrite:

```json
{
  "type": "sentence_rewrite",
  "prompt": "Rewrite the sentence",
  "detail": {
    "sourceSentence": "It is too cold to swim.",
    "acceptedAnswers": ["It is not warm enough to swim."],
    "gradingMode": "normalized"
  }
}
```

Hint rewrite:

```json
{
  "type": "hint_rewrite",
  "prompt": "Rewrite using the hint",
  "detail": {
    "sourceSentence": "She started learning English in 2020.",
    "hintWord": "since",
    "acceptedAnswers": ["She has learned English since 2020."],
    "mustUseHint": true,
    "gradingMode": "normalized"
  }
}
```

Error correction:

```json
{
  "type": "error_correction",
  "prompt": "Correct the sentence",
  "detail": {
    "incorrectSentence": "He go to school.",
    "correctSentence": "He goes to school.",
    "errorSpans": []
  }
}
```

Matching:

```json
{
  "type": "matching",
  "prompt": "Match the words",
  "detail": {
    "shuffleLeft": true,
    "shuffleRight": true,
    "pairs": [
      {
        "leftText": "big",
        "rightText": "large",
        "orderIndex": 0
      },
      {
        "leftText": "small",
        "rightText": "little",
        "orderIndex": 1
      }
    ]
  }
}
```

Question APIs:

- `GET /learning/questions?page=1&limit=20&type=multiple_choice&status=draft&skillId=<id>&levelId=<id>&topicId=<id>&tagIds=id1,id2`
- `GET /learning/questions/:id`
- `PATCH /learning/questions/:id`
- `PATCH /learning/questions/:id/status`
- `DELETE /learning/questions/:id`

Status body:

```json
{
  "status": "published",
  "expectedUpdatedAt": "2026-05-30T00:00:00.000Z"
}
```

Status enum: `draft`, `published`, `archived`.

### 7.5 Exam

Create exam:

```http
POST /learning/exams
```

```json
{
  "code": "EXAM_A1_001",
  "title": "A1 Unit 1 Test",
  "description": "Short test",
  "timeLimitSeconds": 1800,
  "status": "draft"
}
```

APIs:

- `GET /learning/exams?page=1&limit=20&status=published`
- `GET /learning/exams?curriculumId=<id>&status=published` — lọc exam thuộc một curriculum (dùng khi teacher chọn bài để giao).
- `GET /learning/exams/:id`
- `PATCH /learning/exams/:id`
- `PATCH /learning/exams/:id/status`
- `DELETE /learning/exams/:id`

Random câu hỏi theo nhóm tiêu chí (preview — KHÔNG ghi DB):

```http
POST /learning/exams/random-questions
```

```json
{
  "criteria": [
    { "count": 5, "levelId": "level-id", "type": "multiple_choice" },
    { "count": 3, "topicId": "topic-id" }
  ]
}
```

- Mỗi nhóm random `count` câu khớp TẤT CẢ filter (`levelId`/`type`/`topicId`/`skillId`, đều optional) trong các câu `published` + active.
- Không trùng câu giữa các nhóm; kết quả giữ đúng thứ tự nhóm; `orderIndex` tuần tự `0..n-1`.
- Nhóm không đủ câu khả dụng → `409` (mô tả nhóm thiếu).
- Response: `data.items` đúng shape body của bulk-attach (FE truyền thẳng); `data.groups[].questions` mang full detail để hiển thị.

```json
{
  "data": {
    "totalCount": 8,
    "items": [{ "questionId": "...", "orderIndex": 0 }],
    "groups": [
      {
        "index": 0,
        "filters": {
          "levelId": "...",
          "type": "multiple_choice",
          "topicId": null,
          "skillId": null
        },
        "requested": 5,
        "returned": 5,
        "questions": [
          {
            "orderIndex": 0,
            "id": "...",
            "prompt": "...",
            "type": "multiple_choice",
            "options": []
          }
        ]
      }
    ]
  }
}
```

Bulk attach (lưu bộ câu vào exam — dùng với kết quả random):

```http
POST /learning/exams/:examId/questions/bulk
```

```json
{ "items": [{ "questionId": "...", "orderIndex": 0 }] }
```

- FE truyền thẳng `data.items` từ response random.
- `orderIndex` optional; thiếu → gán tiếp từ `max(orderIndex hiện có) + 1`. Trùng câu trong request, hoặc câu đã có trong exam, hoặc trùng `orderIndex` → `409`.

Attach question (đơn lẻ):

```http
POST /learning/exams/:examId/questions
```

```json
{
  "questionId": "question-id",
  "orderIndex": 0
}
```

Update question mapping:

```http
PATCH /learning/exams/:examId/questions/:questionId
```

```json
{
  "orderIndex": 1
}
```

Reorder:

```http
PATCH /learning/exams/:examId/questions/reorder
```

```json
{
  "items": [
    {
      "questionId": "question-1",
      "orderIndex": 0
    },
    {
      "questionId": "question-2",
      "orderIndex": 1
    }
  ]
}
```

Remove mapping:

```http
DELETE /learning/exams/:examId/questions/:questionId
```

Rules:

- Không update `status` qua `PATCH /learning/exams/:id`; phải dùng `/status`.
- Publish exam chỉ được nếu có ít nhất một active published question.
- Attach question yêu cầu question active và published.
- Không còn `score` per-question (đã bỏ): chấm theo mô hình cộng dồn, mỗi câu = 1 điểm. Gửi `score` trong body attach/update sẽ bị `400`.

### 7.6 Curriculum

Create curriculum:

```http
POST /learning/curriculums
```

```json
{
  "code": "CURR_A1",
  "title": "A1 Curriculum",
  "description": "Full A1 path",
  "levelId": "level-id",
  "status": "draft"
}
```

APIs:

- `GET /learning/curriculums?page=1&limit=20&status=published&levelId=<levelId>`
- `GET /learning/curriculums/:id`
- `PATCH /learning/curriculums/:id`
- `PATCH /learning/curriculums/:id/status`
- `DELETE /learning/curriculums/:id`

Attach exam:

```http
POST /learning/curriculums/:curriculumId/exams
```

```json
{
  "examId": "exam-id",
  "orderIndex": 0,
  "isRequired": true,
  "availableFrom": "2026-05-30T00:00:00.000Z",
  "availableUntil": "2026-06-30T00:00:00.000Z"
}
```

Update mapping:

```http
PATCH /learning/curriculums/:curriculumId/exams/:examId
```

```json
{
  "orderIndex": 1,
  "isRequired": false,
  "availableFrom": "2026-05-30T00:00:00.000Z",
  "availableUntil": "2026-06-30T00:00:00.000Z"
}
```

Reorder:

```http
PATCH /learning/curriculums/:curriculumId/exams/reorder
```

```json
{
  "items": [
    {
      "examId": "exam-1",
      "orderIndex": 0
    },
    {
      "examId": "exam-2",
      "orderIndex": 1
    }
  ]
}
```

Remove mapping:

```http
DELETE /learning/curriculums/:curriculumId/exams/:examId
```

Rules:

- Không update `status` qua `PATCH /learning/curriculums/:id`; phải dùng `/status`.
- Publish curriculum chỉ được nếu có ít nhất một active published exam.
- Attach exam yêu cầu exam active và published.
- `availableFrom` phải nhỏ hơn `availableUntil`.

## 8. Teacher Assignment Flow

Teacher endpoints cần Bearer token. Permission `learning.assign` đang comment, nhưng service yêu cầu user có hồ sơ teacher, trừ các list/detail/analytics cho user có `learning.manage`.

### 8.1 Exam Assignment

Một exam assignment giờ chứa **nhiều exam** (`examIds`) và có thể giao cho **cả lớp** (`classId`) hoặc **danh sách student bất kỳ** (`studentIds`, không cần lớp). Exam có thể lấy từ **bất kỳ curriculum nào**, không bắt buộc thuộc curriculum của lớp.

Giao nhiều exam cho cả lớp:

```http
POST /learning/teacher/exam-assignments
```

```json
{
  "examIds": ["exam-id-1", "exam-id-2"],
  "classId": "class-id",
  "maxAttempts": 3,
  "title": "Unit 1 Test",
  "instructions": "Complete these exams"
}
```

Giao trực tiếp cho một số student (không cần lớp):

```json
{
  "examIds": ["exam-id-1"],
  "studentIds": ["student-id-1", "student-id-2"],
  "maxAttempts": null,
  "title": "Extra practice",
  "instructions": "For selected students only"
}
```

Rules:

- `examIds` bắt buộc, tối thiểu 1, không trùng, mỗi exam phải active và `published`.
- Phải có `classId` HOẶC `studentIds` (ít nhất một). Có thể bỏ `classId` để giao trực tiếp cho student.
- Có `classId`, không có `studentIds` → giao cho toàn bộ active student trong class. Teacher phải phụ trách active class qua `teacher_classes`.
- Có `classId` và `studentIds` → `studentIds` phải thuộc active class đó.
- Không có `classId` → `studentIds` bắt buộc; mỗi id phải là student hợp lệ.
- `maxAttempts`: số lần làm tối đa cho mỗi exam. Bỏ trống / `null` = **vĩnh viễn** (không giới hạn). Giá trị được snapshot xuống từng `exam_assignment_students.max_attempts`.
- Lấy danh sách exam theo curriculum để chọn: `GET /learning/exams?curriculumId=<id>&status=published` (xem 7.5).

APIs:

- `GET /learning/teacher/exam-assignments?page=1&limit=20&classId=<id>&examId=<id>&studentId=<id>&status=active`
- `GET /learning/teacher/exam-assignments/:assignmentId`
- `DELETE /learning/teacher/exam-assignments/:assignmentId`
- `GET /learning/teacher/exam-assignments/:assignmentId/attempts?page=1&limit=20&studentId=<id>&status=submitted`
- `GET /learning/teacher/exam-assignments/:assignmentId/analytics`

Detail/list trả `exams: [{ examId, orderIndex, isRequired, exam }]` thay cho một `exam` đơn. Mỗi `exam_assignment_students` trả `progressPercentage`, `completedExamsCount`, `totalExamsCount`, `maxAttempts`.

Status enum: `active`, `cancelled`.
Attempt status enum: `in_progress`, `submitted`.

Cancel behavior:

- Soft cancel assignment: `status=cancelled`, `isActive=false`.
- Không xóa attempt history.
- Student không start attempt mới từ assignment inactive.

Analytics response chính:

```json
{
  "assignedCount": 10,
  "submittedCount": 8,
  "attemptsCount": 12,
  "averageScore": 7.5,
  "bestScore": 10,
  "averagePercentage": 75,
  "bestPercentage": 100,
  "scoreDistribution": {
    "0-49": 1,
    "50-69": 2,
    "70-84": 3,
    "85-100": 4
  },
  "perQuestion": [
    {
      "questionId": "question-id",
      "total": 8,
      "correct": 6,
      "correctnessRate": 75
    }
  ]
}
```

### 8.2 Curriculum Assignment (giao trực tiếp cho student)

Endpoint này dùng để giao curriculum **trực tiếp cho một số student** (kể cả ngoài lớp). Để cho cả lớp thấy curriculum, dùng **8.3 Class ↔ Curriculum** (standing link) thay cho endpoint này.

```http
POST /learning/teacher/curriculum-assignments
```

```json
{
  "curriculumId": "curriculum-id",
  "studentIds": ["student-id-1", "student-id-2"],
  "classId": "class-id",
  "maxAttempts": 5,
  "title": "Extra A1 path",
  "instructions": "For selected students only"
}
```

Rules:

- `studentIds` bắt buộc, tối thiểu 1, không trùng, mỗi id phải là student hợp lệ.
- `classId` optional (chỉ là context); nếu gửi thì teacher phải phụ trách active class đó.
- Curriculum phải active và `published`, có ít nhất một active published exam.
- Student không được có active assignment/enrollment trùng cùng `curriculumId`.
- `maxAttempts`: số lần làm tối đa cho mỗi exam trong curriculum; bỏ trống / `null` = vĩnh viễn. Snapshot xuống `curriculum_assignment_students.max_attempts`.
- Khi assign thành công, BE tạo `curriculum_assignments`, `curriculum_assignment_students`, `student_curriculum_exam_progress`.

APIs:

- `GET /learning/teacher/curriculum-assignments?page=1&limit=20&classId=<id>&curriculumId=<id>&studentId=<id>&status=active`
- `GET /learning/teacher/curriculum-assignments/:assignmentId`
- `DELETE /learning/teacher/curriculum-assignments/:assignmentId`
- `GET /learning/teacher/curriculum-assignments/:assignmentId/analytics`

Cancel behavior:

- Soft cancel assignment.
- Inactive các `curriculum_assignment_students` thuộc assignment.
- Không xóa attempt/progress history đã có.

Analytics response chính:

```json
{
  "assignedCount": 10,
  "completedCount": 4,
  "inProgressCount": 6,
  "averageProgress": 55.5
}
```

### 8.3 Class ↔ Curriculum (standing link)

Liên kết một curriculum vào một lớp. **Mọi student trong lớp** (kể cả vào lớp sau) tự động thấy curriculum này và có thể tự làm các exam của nó (self-study). Enrollment + progress của student được tạo **lazy** khi student bắt đầu làm exam lần đầu.

```http
POST /learning/teacher/class-curriculums
```

```json
{
  "classId": "class-id",
  "curriculumId": "curriculum-id",
  "maxAttempts": 3
}
```

Rules:

- Teacher phải phụ trách active class (hoặc user có `learning.manage`).
- Curriculum phải active và `published`.
- Không tạo trùng cặp `(classId, curriculumId)` đang active.
- `maxAttempts`: bỏ trống / `null` = vĩnh viễn. Khi student làm bài lần đầu, giá trị này được snapshot vào enrollment lazy của student.

APIs:

- `GET /learning/teacher/class-curriculums?page=1&limit=20&classId=<id>&curriculumId=<id>`
- `DELETE /learning/teacher/class-curriculums/:id` (soft delete, `isActive=false`)

## 9. Student Attempt Flow

Student endpoints cần Bearer token. Permission `learning.attempt` đang comment, nhưng service yêu cầu user có hồ sơ student.

### 9.1 Assigned Curriculums (keyed by curriculumId)

Student thấy curriculum qua 2 nguồn, gộp chung (dedup theo `curriculumId`):

- **class** (standing): curriculum được link vào lớp của student (8.3). Student vào lớp bất kỳ lúc nào đều thấy.
- **direct**: curriculum được giao trực tiếp cho student (8.2).

```http
GET /learning/student/curriculums?page=1&limit=20
```

Mỗi item có `curriculumId`, `accessType` (`class` | `direct`), `enrollmentId` (null nếu chưa enroll), `status`, `progressPercentage`, `completedExamsCount`, `totalRequiredExamsCount`, `maxAttempts`, `curriculum`.

```http
GET /learning/student/curriculums/:curriculumId
```

Response gồm thông tin curriculum, tiến độ tổng và danh sách `exams` (mỗi exam có progress riêng; nếu chưa enroll thì status `available`).

Start attempt từ curriculum (self-study):

```http
POST /learning/student/curriculums/:curriculumId/exams/:examId/attempts
```

Không cần body.

Rules:

- Đường dẫn dùng `curriculumId` (không còn `assignmentStudentId`).
- Lần đầu student làm bài của một curriculum truy cập qua lớp, BE tạo **lazy** `curriculum_assignment_students` (với `classCurriculumId`, `maxAttempts` lấy từ class link) và `student_curriculum_exam_progress`.
- Student không có quyền truy cập curriculum → `403`.
- `examId` phải thuộc curriculum và exam phải active + `published`.
- Attempt curriculum có `source = self_study`.
- Exam trong curriculum mở hết; `orderIndex` chỉ dùng hiển thị.
- Exam completed khi best percentage đạt 100; curriculum completed khi tất cả exam `isRequired=true` completed.

### 9.2 Student Attempt Flow

Phần này là flow FE nên bám theo khi student làm exam. Cùng một logic được dùng cho:

- Direct exam assignment: student nhận bài qua `exam_assignment_students`.
- Curriculum exam: student làm exam bên trong một assigned curriculum.

Các điểm chính:

- `score` là số câu đúng cộng dồn trên toàn bộ exam.
- `maxScore` là tổng số câu của exam.
- `percentage = score / maxScore * 100`.
- Lần đầu hiển thị toàn bộ câu hỏi.
- Lần sau chỉ hiển thị các câu chưa từng làm đúng trong những attempt đã submit trước đó.
- Sau khi submit từng câu, BE trả review của câu đó ngay để FE hiển thị đáp án đúng/sai.
- Một câu đã submit trong cùng attempt sẽ bị khóa, không submit lại được.
- Câu sai hoặc chưa làm sẽ xuất hiện lại ở attempt sau; câu đúng không xuất hiện lại.

#### 9.2.1 Assigned Exam List/Detail

List teacher-assigned exam assignments (mỗi assignment có thể nhiều exam):

```http
GET /learning/student/exam-assignments?page=1&limit=20
```

Response gồm row `exam_assignment_students` (id = `assignmentStudentId`), assignment kèm `exams[]`, class và tiến độ tổng của student.

Detail một assignment của student:

```http
GET /learning/student/exam-assignments/:assignmentStudentId
```

Response gồm assignment info, `exams[]` (mỗi exam có progress riêng: `attemptsCount`, `bestPercentage`, `status`, `maxAttempts`) và attempt history.

Nếu là exam trong curriculum, FE lấy curriculum detail trước:

```http
GET /learning/student/curriculums/:curriculumId
```

Trong response, mỗi exam item có trạng thái progress riêng. FE dùng `curriculumId` và `examId` để start attempt curriculum.

#### 9.2.2 Start Attempt

Teacher-assigned exam (chọn 1 exam trong assignment qua `assignmentStudentId` + `examId`):

```http
POST /learning/student/exam-assignments/:assignmentStudentId/exams/:examId/attempts
```

Curriculum exam (self-study):

```http
POST /learning/student/curriculums/:curriculumId/exams/:examId/attempts
```

Không cần body.

BE tạo `attemptNumber` mới và snapshot câu hỏi tại thời điểm start. Snapshot giúp attempt không bị thay đổi nếu teacher sửa đề sau đó. Attempt có trường `source`: `teacher_assigned` (exam-assignment) hoặc `self_study` (curriculum) — dùng để phân tích sau này.

Resume khi reload (start là idempotent):

- Nếu đã có attempt `in_progress` cho cùng `(scope, examId)`, start **trả về chính attempt đang dở đó** thay vì tạo mới — không tốn lượt, không reshuffle, `attemptNumber` không đổi.
- Câu đã trả lời trong attempt đó vẫn còn (review kèm đáp án); câu chưa làm trả về trống.
- Vì vậy FE có thể an toàn gọi lại start sau reload (hoặc gọi `GET /learning/student/attempts/:attemptId` nếu còn nhớ `attemptId`).
- Mỗi `(scope, examId)` chỉ tồn tại tối đa một attempt `in_progress`.

Quy tắc chọn câu hỏi:

- Attempt 1: trả toàn bộ câu hỏi của exam.
- Attempt retry: chỉ trả các câu chưa từng đúng trong các submitted attempts trước đó của cùng scope.
- Scope teacher-assigned là `assignmentStudentId + examId`.
- Scope curriculum exam là `curriculumAssignmentStudentId + examId`.
- Nếu student đã đúng hết, BE vẫn tạo attempt mới nhưng `answers` rỗng và điểm cộng dồn là tối đa.

Giới hạn số lần (`maxAttempts`):

- `maxAttempts` đếm theo số lần **đã nộp** (`submitted`) cho mỗi exam (giá trị snapshot trên enrollment của student). Lượt `in_progress` đang dở không bị tính.
- Khi số lần đã nộp ≥ `maxAttempts` và còn câu chưa đúng → start attempt mới trả `409` với message `Đã hết số lần làm bài cho phép` (vẫn resume được attempt in-progress nếu đang có).
- `maxAttempts = null` (vĩnh viễn) → làm lại không giới hạn.

Ví dụ lần 1 student chưa làm câu nào:

```json
{
  "id": "attempt-1",
  "attemptNumber": 1,
  "status": "in_progress",
  "score": "0.00",
  "maxScore": "10.00",
  "percentage": "0.00",
  "displayResult": "0/10",
  "totalQuestions": 10,
  "attemptQuestionCount": 10,
  "attemptCorrectCount": 0,
  "attemptWrongCount": 0,
  "attemptUnansweredCount": 10,
  "cumulativeCorrectCount": 0,
  "answers": [
    {
      "id": "attempt-answer-1",
      "questionId": "question-1",
      "questionType": "multiple_choice",
      "orderIndex": 0,
      "answer": null,
      "answeredAt": null,
      "maxScore": "1.00",
      "question": {
        "prompt": "Choose the correct answer",
        "instruction": "Select one",
        "options": [
          {
            "id": "option-a",
            "label": "A",
            "content": "Answer A",
            "orderIndex": 0
          }
        ],
        "media": [],
        "detail": {}
      }
    }
  ]
}
```

Ví dụ sau attempt 1 đạt `8/10`, start attempt 2 chỉ còn 2 câu sai/chưa làm:

```json
{
  "id": "attempt-2",
  "attemptNumber": 2,
  "status": "in_progress",
  "score": "8.00",
  "maxScore": "10.00",
  "percentage": "80.00",
  "displayResult": "8/10",
  "totalQuestions": 10,
  "attemptQuestionCount": 2,
  "attemptCorrectCount": 0,
  "attemptWrongCount": 0,
  "attemptUnansweredCount": 2,
  "cumulativeCorrectCount": 8,
  "answers": [
    {
      "questionId": "question-3",
      "answer": null,
      "answeredAt": null,
      "question": {}
    },
    {
      "questionId": "question-7",
      "answer": null,
      "answeredAt": null,
      "question": {}
    }
  ]
}
```

Nếu đã đúng hết:

```json
{
  "id": "attempt-4",
  "attemptNumber": 4,
  "status": "in_progress",
  "score": "10.00",
  "maxScore": "10.00",
  "percentage": "100.00",
  "displayResult": "10/10",
  "totalQuestions": 10,
  "attemptQuestionCount": 0,
  "attemptCorrectCount": 0,
  "attemptWrongCount": 0,
  "attemptUnansweredCount": 0,
  "cumulativeCorrectCount": 10,
  "answers": []
}
```

FE nên xử lý `answers.length === 0` như trạng thái đã hoàn thành toàn bộ câu hỏi, không cần render màn làm bài.

#### 9.2.3 Submit One Answer

FE nên submit ngay sau khi student chọn/điền đáp án cho một câu:

```http
POST /learning/student/attempts/:attemptId/answers/:questionId/submit
```

Body chung:

```json
{
  "answer": {}
}
```

BE sẽ:

- Chấm câu đó ngay.
- Lưu đáp án student đã điền vào `answer`.
- Set `answeredAt`.
- Trả `isCorrect`, `correctAnswer`, `score`, `feedback` để FE hiển thị kết quả câu đó.
- Khóa câu đó trong attempt hiện tại. Nếu submit lại cùng câu, BE trả `409`.
- Nếu câu sai, FE nên chuyển sang câu tiếp theo; câu sai sẽ được làm lại ở attempt sau.

Response review một câu:

```json
{
  "id": "attempt-answer-1",
  "questionId": "question-1",
  "questionType": "multiple_choice",
  "orderIndex": 0,
  "answer": {
    "selectedOptionIds": ["option-a"]
  },
  "correctAnswer": {
    "selectedOptionIds": ["option-b"]
  },
  "answeredAt": "2026-05-30T00:04:00.000Z",
  "score": "0.00",
  "maxScore": "1.00",
  "isCorrect": false,
  "feedback": {
    "explanation": "Because..."
  },
  "question": {
    "prompt": "Choose the correct answer",
    "options": []
  }
}
```

Answer body theo question type.

Choice/audio/image/reading:

```json
{
  "answer": {
    "selectedOptionIds": ["option-id"]
  }
}
```

Word ordering:

```json
{
  "answer": {
    "tokens": ["I", "am", "a", "student"]
  }
}
```

Sentence rewrite/hint rewrite:

```json
{
  "answer": {
    "text": "She has learned English since 2020."
  }
}
```

Error correction:

```json
{
  "answer": {
    "correctedSentence": "He goes to school."
  }
}
```

Matching:

```json
{
  "answer": {
    "pairs": [
      {
        "leftItemId": "left-item-id-from-attempt-snapshot",
        "rightItemId": "right-item-id-from-attempt-snapshot"
      }
    ]
  }
}
```

Quan trọng: matching item ids được BE sinh trong snapshot lúc start attempt. FE phải dùng `question.detail.leftItems[].id` và `question.detail.rightItems[].id` từ attempt, không dùng dữ liệu admin question.

#### 9.2.4 Get Current Attempt / Refresh

```http
GET /learning/student/attempts/:attemptId
```

FE dùng endpoint này khi refresh trang hoặc cần sync lại state.

Nếu attempt đang `in_progress`:

- Câu chưa trả lời có `answer = null`, `answeredAt = null` và không có `correctAnswer`/`feedback`.
- Câu đã submit từng câu sẽ có `answer`, `answeredAt`, `isCorrect`, `correctAnswer`, `feedback` để FE vẫn hiển thị được review sau refresh.
- FE không cho student sửa câu đã có `answeredAt`.

Nếu attempt đã `submitted`, response là review đầy đủ các câu trong attempt đó.

#### 9.2.5 Finish Attempt

Khi student đã đi hết các câu trong attempt hiện tại, FE gọi:

```http
POST /learning/student/attempts/:attemptId/submit
```

Body có thể để rỗng:

```json
{}
```

BE vẫn hỗ trợ body cũ để backward compatibility:

```json
{
  "answers": [
    {
      "questionId": "question-id",
      "answer": {}
    }
  ]
}
```

Nếu `answers` được gửi, BE chỉ chấm các câu chưa từng submit trong attempt hiện tại, sau đó finish attempt.

Khi finish, BE sẽ:

- Set `status = submitted`.
- Set `submittedAt` và `durationSeconds`.
- Tính lại số câu đúng trong attempt hiện tại.
- Tính lại điểm cộng dồn từ toàn bộ submitted attempts cùng scope.
- Trả `displayResult`, ví dụ `8/10`, `9/10`, `10/10`.
- Chỉ mark assignment/curriculum exam completed khi `percentage = 100`.

Ví dụ attempt 1 đúng 8/10:

```json
{
  "id": "attempt-1",
  "attemptNumber": 1,
  "status": "submitted",
  "score": "8.00",
  "maxScore": "10.00",
  "percentage": "80.00",
  "displayResult": "8/10",
  "totalQuestions": 10,
  "attemptQuestionCount": 10,
  "attemptCorrectCount": 8,
  "attemptWrongCount": 2,
  "attemptUnansweredCount": 0,
  "cumulativeCorrectCount": 8,
  "answers": []
}
```

Ví dụ attempt 2 làm lại 2 câu, đúng thêm 1 câu:

```json
{
  "id": "attempt-2",
  "attemptNumber": 2,
  "status": "submitted",
  "score": "9.00",
  "maxScore": "10.00",
  "percentage": "90.00",
  "displayResult": "9/10",
  "totalQuestions": 10,
  "attemptQuestionCount": 2,
  "attemptCorrectCount": 1,
  "attemptWrongCount": 1,
  "attemptUnansweredCount": 0,
  "cumulativeCorrectCount": 9,
  "answers": []
}
```

#### 9.2.6 Attempt History

Direct exam assignment:

```http
GET /learning/student/exam-assignments/:assignmentId/attempts
```

Detail endpoints cũng trả attempt list trong response:

```http
GET /learning/student/exam-assignments/:assignmentId
GET /learning/student/curriculums/:assignmentStudentId
```

History trả toàn bộ attempts của student theo `attemptNumber`. Mỗi attempt chỉ chứa các câu đã xuất hiện trong attempt đó, không lặp lại những câu đã đúng ở attempt trước.

Ví dụ flow hiển thị lịch sử:

```json
[
  {
    "attemptNumber": 1,
    "status": "submitted",
    "displayResult": "8/10",
    "score": "8.00",
    "maxScore": "10.00",
    "percentage": "80.00",
    "attemptQuestionCount": 10,
    "attemptCorrectCount": 8,
    "attemptWrongCount": 2,
    "cumulativeCorrectCount": 8,
    "answers": [
      {
        "questionId": "question-3",
        "answer": { "selectedOptionIds": ["wrong-option"] },
        "correctAnswer": { "selectedOptionIds": ["right-option"] },
        "isCorrect": false,
        "answeredAt": "2026-05-30T00:04:00.000Z"
      }
    ]
  },
  {
    "attemptNumber": 2,
    "status": "submitted",
    "displayResult": "9/10",
    "score": "9.00",
    "maxScore": "10.00",
    "percentage": "90.00",
    "attemptQuestionCount": 2,
    "attemptCorrectCount": 1,
    "attemptWrongCount": 1,
    "cumulativeCorrectCount": 9,
    "answers": []
  },
  {
    "attemptNumber": 3,
    "status": "submitted",
    "displayResult": "10/10",
    "score": "10.00",
    "maxScore": "10.00",
    "percentage": "100.00",
    "attemptQuestionCount": 1,
    "attemptCorrectCount": 1,
    "attemptWrongCount": 0,
    "cumulativeCorrectCount": 10,
    "answers": []
  }
]
```

FE nên dùng:

- `displayResult` để hiển thị dạng `8/10`, `9/10`, `10/10`.
- `percentage` cho progress bar/ranking.
- `answers[].answer` để hiển thị đáp án student đã điền.
- `answers[].correctAnswer` và `answers[].feedback` để hiển thị review.
- `answers[].answeredAt` để biết câu đã bị khóa trong attempt hiện tại.
- `attemptQuestionCount` để biết attempt đó student phải làm bao nhiêu câu.

## 10. Auto Grading Rules

BE chấm tự động, không có partial credit trong v1.

- Choice types đúng nếu set `selectedOptionIds` khớp chính xác set option đúng.
- Word ordering đúng nếu `tokens` khớp `correctTokens`; có xét `caseSensitive` và `allowPunctuationVariants`.
- Sentence rewrite đúng nếu `text` khớp một trong `acceptedAnswers`; `gradingMode=exact|normalized`.
- Hint rewrite như sentence rewrite, đồng thời kiểm tra `mustUseHint`.
- Error correction so sánh `correctedSentence` với đáp án đúng bằng normalized compare.
- Matching đúng nếu toàn bộ cặp `leftItemId/rightItemId` khớp correct map private.

## 11. Observability

Request logs cần `request-logs.read`:

- `GET /request-logs?page=1&limit=20&requestId=<id>&method=GET&statusCode=200&path=/api/v1/auth/me&userId=<id>&from=<date>&to=<date>`
- `GET /request-logs/:id`

Audit logs cần `audit-logs.read`:

- `GET /audit-logs?page=1&limit=20&userId=<id>&action=auth.login.success&resource=auth&resourceId=<id>&requestId=<id>&from=<date>&to=<date>`
- `GET /audit-logs/:id`

## 12. FE Integration Notes

- Luôn unwrap `success/data/meta`; list có phân trang đọc `meta`.
- Không tự tính điểm cuối cùng; BE là source of truth cho score.
- Lưu `attemptId` khi student start attempt.
- Nếu student refresh giữa lúc làm bài, gọi `GET /learning/student/attempts/:attemptId`.
- Không dùng đáp án từ admin question API cho student runtime.
- Student runtime dùng snapshot trong attempt để history không đổi khi admin sửa question sau này.
- Teacher có thể assign trực tiếp exam hoặc curriculum cho class/student.
- Attempt từ curriculum có `curriculumAssignmentStudentId`.
- Attempt từ exam assignment có `assignmentStudentId` trong entity nội bộ và `assignmentId` trong response.
- `DELETE` trong hệ thống đa số là soft delete/inactive, không nên xóa item khỏi UI history nếu backend vẫn trả trong history.
- Với optimistic lock, gửi `expectedUpdatedAt` bằng `updatedAt` hiện tại của record khi status/update DTO hỗ trợ field này.

## 13. Flow Khởi Tạo Dữ Liệu Cơ Bản

1. Tạo center.
2. Tạo class thuộc center.
3. Tạo specialization.
4. Lấy role id từ `/roles`.
5. Tạo teacher user kèm `teacherProfile`.
6. Tạo student user kèm `studentProfile`.
7. Tạo learning taxonomy: level, skill, topic, tag.
8. Tạo media/reading passage nếu question cần.
9. Tạo question.
10. Publish question.
11. Tạo exam.
12. Attach question vào exam.
13. Publish exam.
14. Tạo curriculum nếu cần.
15. Attach exam vào curriculum.
16. Publish curriculum nếu dùng curriculum.
17. Teacher assign exam hoặc curriculum cho class/student.
18. Student start attempt.
19. Student submit, xem history/progress.

## 14. Backend Change Policy

- Mỗi thay đổi BE có ảnh hưởng API, payload, permission, response, migration hoặc business flow phải update README này.
- Nếu thêm endpoint mới: ghi route, permission, request mẫu, response chính và flow FE dùng.
- Nếu sửa endpoint cũ: ghi rõ field mới/cũ, breaking change nếu có.
- Nếu thêm migration/schema: ghi tác động tới FE hoặc seed data nếu có.
