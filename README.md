# Kata Edu Backend API Guide

Tài liệu này là contract cho frontend tích hợp API backend. Nội dung đã được đối chiếu với code trong `be/src/modules`.

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
  "avatar": "https://cdn.example.com/avatar.png"
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
- Response user đã bỏ `hashedPassword`.

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
- `GET /learning/exams/:id`
- `PATCH /learning/exams/:id`
- `PATCH /learning/exams/:id/status`
- `DELETE /learning/exams/:id`

Attach question:

```http
POST /learning/exams/:examId/questions
```

```json
{
  "questionId": "question-id",
  "orderIndex": 0,
  "score": 1
}
```

Update question mapping:

```http
PATCH /learning/exams/:examId/questions/:questionId
```

```json
{
  "orderIndex": 1,
  "score": 2
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
- `score` min `0.01`.

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

Giao exam cho cả lớp:

```http
POST /learning/teacher/exam-assignments
```

```json
{
  "examId": "exam-id",
  "classId": "class-id",
  "title": "Unit 1 Test",
  "instructions": "Complete this test"
}
```

Giao exam cho một số student trong lớp:

```json
{
  "examId": "exam-id",
  "classId": "class-id",
  "studentIds": ["student-id-1", "student-id-2"],
  "title": "Extra practice",
  "instructions": "For selected students only"
}
```

Rules:

- `classId` luôn bắt buộc.
- Nếu không gửi `studentIds`, BE assign cho toàn bộ active student trong class.
- Teacher phải phụ trách active class qua `teacher_classes`.
- Exam phải active và `published`.
- `studentIds` không được trùng và phải thuộc active class.
- Một assignment không chọn student từ nhiều lớp.

APIs:

- `GET /learning/teacher/exam-assignments?page=1&limit=20&classId=<id>&examId=<id>&studentId=<id>&status=active`
- `GET /learning/teacher/exam-assignments/:assignmentId`
- `DELETE /learning/teacher/exam-assignments/:assignmentId`
- `GET /learning/teacher/exam-assignments/:assignmentId/attempts?page=1&limit=20&studentId=<id>&status=submitted`
- `GET /learning/teacher/exam-assignments/:assignmentId/analytics`

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

### 8.2 Curriculum Assignment

Giao curriculum cho cả lớp:

```http
POST /learning/teacher/curriculum-assignments
```

```json
{
  "curriculumId": "curriculum-id",
  "classId": "class-id",
  "title": "A1 Learning Path",
  "instructions": "Complete all required exams"
}
```

Giao curriculum cho một số student:

```json
{
  "curriculumId": "curriculum-id",
  "classId": "class-id",
  "studentIds": ["student-id-1", "student-id-2"],
  "title": "Extra A1 path",
  "instructions": "For selected students only"
}
```

Rules:

- Nếu không gửi `studentIds`, BE assign cho toàn bộ active student trong class.
- Teacher phải phụ trách active class.
- Curriculum phải active và `published`.
- Curriculum phải có ít nhất một active published exam.
- Student không được có active assignment trùng cùng `curriculumId`.
- V1 không có deadline/maxAttempts/passingScore cho curriculum assignment.
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

## 9. Student Attempt Flow

Student endpoints cần Bearer token. Permission `learning.attempt` đang comment, nhưng service yêu cầu user có hồ sơ student.

### 9.1 Assigned Curriculums

```http
GET /learning/student/curriculums?page=1&limit=20
```

Response gồm row `curriculum_assignment_students`, assignment, curriculum, class và progress của chính student.

```http
GET /learning/student/curriculums/:assignmentStudentId
```

Response gồm assignment info, curriculum info, class info, progress tổng và `examProgress`.

Start attempt từ curriculum:

```http
POST /learning/student/curriculums/:assignmentStudentId/exams/:examId/attempts
```

Không cần body.

Rules:

- `assignmentStudentId` là id của row `curriculum_assignment_students`.
- `examId` phải thuộc curriculum assignment đó.
- Exam phải active và `published`.
- Exam trong curriculum mở hết ngay sau khi assign; `orderIndex` chỉ dùng hiển thị.
- Exam completed khi student có ít nhất một submitted attempt.
- Curriculum completed khi tất cả exam `isRequired=true` completed.
- Optional exam có thể làm nhưng không chặn completion.

### 9.2 Assigned Exams

```http
GET /learning/student/exam-assignments?page=1&limit=20
```

Response gồm row `exam_assignment_students`, assignment, exam, class và summary của chính student.

```http
GET /learning/student/exam-assignments/:assignmentId
```

Response gồm assignment info, exam info và attempts của chính student.

Start attempt:

```http
POST /learning/student/exam-assignments/:assignmentId/attempts
```

Không cần body.

Rules:

- Unlimited attempts.
- Mỗi lần start tạo `attemptNumber` mới.
- BE snapshot câu hỏi tại thời điểm start.
- Pre-submit response không trả đáp án đúng, score từng câu, feedback, explanation.

Pre-submit response chính:

```json
{
  "id": "attempt-id",
  "assignmentId": "assignment-id",
  "curriculumAssignmentStudentId": null,
  "examId": "exam-id",
  "studentId": "student-id",
  "attemptNumber": 1,
  "status": "in_progress",
  "startedAt": "2026-05-30T00:00:00.000Z",
  "submittedAt": null,
  "durationSeconds": null,
  "timeLimitSecondsSnapshot": 1800,
  "score": "0",
  "maxScore": "10.00",
  "percentage": "0",
  "gradingStatus": "auto_graded",
  "answers": [
    {
      "id": "attempt-answer-id",
      "questionId": "question-id",
      "questionType": "multiple_choice",
      "orderIndex": 0,
      "question": {
        "prompt": "Choose the correct answer",
        "instruction": "Select one",
        "options": [
          {
            "id": "option-id",
            "label": "A",
            "content": "Answer A",
            "orderIndex": 0
          }
        ],
        "media": [],
        "detail": {}
      },
      "maxScore": "1.00"
    }
  ]
}
```

Get attempt:

```http
GET /learning/student/attempts/:attemptId
```

- Nếu `in_progress`: trả payload làm bài.
- Nếu `submitted`: trả review đầy đủ.

Submit attempt:

```http
POST /learning/student/attempts/:attemptId/submit
```

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

Choice/audio/image/reading:

```json
{
  "questionId": "question-id",
  "answer": {
    "selectedOptionIds": ["option-id"]
  }
}
```

Word ordering:

```json
{
  "questionId": "question-id",
  "answer": {
    "tokens": ["I", "am", "a", "student"]
  }
}
```

Sentence rewrite/hint rewrite:

```json
{
  "questionId": "question-id",
  "answer": {
    "text": "She has learned English since 2020."
  }
}
```

Error correction:

```json
{
  "questionId": "question-id",
  "answer": {
    "correctedSentence": "He goes to school."
  }
}
```

Matching:

```json
{
  "questionId": "question-id",
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

Submit response là review:

```json
{
  "id": "attempt-id",
  "status": "submitted",
  "score": "8.00",
  "maxScore": "10.00",
  "percentage": "80.00",
  "submittedAt": "2026-05-30T00:10:00.000Z",
  "durationSeconds": 600,
  "answers": [
    {
      "questionId": "question-id",
      "answer": {},
      "correctAnswer": {},
      "score": "1.00",
      "maxScore": "1.00",
      "isCorrect": true,
      "feedback": {
        "explanation": "Because..."
      }
    }
  ]
}
```

Attempt history:

```http
GET /learning/student/exam-assignments/:assignmentId/attempts
```

Trả toàn bộ attempts của student trong assignment đó, bao gồm review nếu đã submit.

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
