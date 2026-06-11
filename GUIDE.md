# GUIDE.md - Review frontend theo README backend

## Ket luan ngan gon

Du an frontend hien tai dang dung dung huong neu muc tieu la prototype UI: da co routing, layout, login screen, profile/admin area, course/exam UI va mot so component lam bai. Tuy nhien neu doi chieu voi `README.md` backend thi code chua dung huong tich hop san pham that. Phan lon data flow van la mock/localStorage, auth chua goi backend, model cau hoi/ky thi khac contract, va student exam flow dang cham diem o frontend trong khi backend quy dinh BE la source of truth.

Muc tieu tiep theo khong nen la sua UI truoc, ma nen tach data layer va mapping API truoc. Sau khi co API client, auth/session, type contract va exam runtime dung, cac man hinh UI hien co co the tai su dung lai kha nhieu.

## Nhung diem dang lam tot

- Cau truc route va page da co nen tang ro: `App.tsx` tach public pages, protected pages va exam layout.
- UI lam bai da co nhieu trang thai can thiet: loading, start screen, timer, progress, question navigation, review.
- Da dung TypeScript va chia folder theo domain/page, de refactor tung phan.
- Stack hien tai phu hop: React, Vite, Ant Design, axios da co trong dependency, react-hook-form/zod co the dung cho form validation sau nay.

## Van de uu tien cao

### 1. Auth dang la mock local, chua dung backend

Hien tai `AuthContext` dung hardcoded credentials va chi luu `user` vao `localStorage`:

- `src/contexts/AuthContext.tsx:11` chi co role `"admin" | "student"`, thieu `teacher`.
- `src/contexts/AuthContext.tsx:21` khai bao `credentials` local.
- `src/contexts/AuthContext.tsx:49` login so sanh password local.
- `src/contexts/AuthContext.tsx:56` chi luu user, khong luu `accessToken`, `refreshToken`.

Theo README backend, `POST /auth/login` dung body:

```json
{
  "identifier": "admin",
  "password": "Admin@123456"
}
```

Response can luu:

- `data.accessToken`
- `data.refreshToken`
- `data.user.role.code`
- `data.user.role.permissions`

Huong lam:

1. Tao `src/services/apiClient.ts` dung axios voi `baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1"`.
2. Tao response unwrap chung: thanh cong lay `response.data.data`, pagination lay them `response.data.meta`.
3. Them interceptor gan `Authorization: Bearer <accessToken>`.
4. Khi gap `401`, goi `POST /auth/refresh` bang refresh token, luu token pair moi, retry request cu mot lan.
5. `AuthContext.login` doi sang async va goi `/auth/login`.
6. `logout` goi `/auth/logout` kem `refreshToken`, sau do clear local session.
7. Role trong FE nen la string tu backend: `admin`, `teacher`, `student`; permission nen la `string[]`.

Khong nen tiep tuc mo rong hardcoded account vi se lam cac protected flow sau nay sai tu goc.

### 2. ProtectedRoute moi check login, chua check role/permission

`src/components/ProtectedRoute.tsx` chi kiem tra `isLoggedIn`. Theo README, backend co permission thuc te:

- `users.manage`
- `classes.manage`
- `rbac.manage`
- `request-logs.read`
- `audit-logs.read`
- learning permissions dang comment o controller nhung van nen thiet ke FE theo permission.

Huong lam:

```tsx
<ProtectedRoute roles={["admin"]} permissions={["users.manage"]}>
  <UserManagement />
</ProtectedRoute>
```

Trong UI, dung permission de an/hien menu va action button. Nhung luu y: FE permission chi de UX, backend van la noi enforce security.

### 3. Exam service dang lay mock data, khong dung student runtime

`src/services/examService.ts:1` import `examDataMap` tu mock data. `fetchExamData` chi tra data local sau `setTimeout`.

Trong README, student khong lay exam detail truc tiep kieu admin. Flow dung la:

1. Student lay assignment:
   - `GET /learning/student/exam-assignments?page=1&limit=20`
   - hoac `GET /learning/student/curriculums?page=1&limit=20`
2. Student start attempt:
   - `POST /learning/student/exam-assignments/:assignmentId/attempts`
   - hoac `POST /learning/student/curriculums/:assignmentStudentId/exams/:examId/attempts`
3. FE luu `attemptId`.
4. Neu refresh khi dang lam bai, goi:
   - `GET /learning/student/attempts/:attemptId`
5. Khi nop bai:
   - `POST /learning/student/attempts/:attemptId/submit`

Vi vay route `/exam/:examId` nen duoc xem lai. Trong backend contract, man lam bai can biet assignment/curriculum context de start attempt dung endpoint, khong chi co `examId`.

Goi y route:

- `/student/exam-assignments/:assignmentId/start`
- `/student/curriculums/:assignmentStudentId/exams/:examId/start`
- `/student/attempts/:attemptId`

### 4. Dang lo dap an dung va cham diem tren frontend

`src/types/index.ts:28` co `correctAnswer` trong `ExamQuestion`. `src/pages/coursePage/ExamContainer.tsx:108` co `checkCorrectness`, `:133` cham tung cau, `:160` tong ket diem.

Day la sai voi README backend:

- Pre-submit response khong tra dap an dung, score tung cau, feedback, explanation.
- FE khong duoc dung dap an tu admin question API cho student runtime.
- Backend la source of truth cho score.

Rui ro:

- Hoc sinh co the xem bundle/local state de lay dap an.
- Diem tren FE co the khac backend.
- Matching/sentence rewrite/error correction se sai vi BE co grading rules rieng.

Huong lam:

- Bo `correctAnswer` khoi type runtime cua student.
- Component lam bai chi render snapshot question tu attempt.
- Khi hoc sinh tra loi, luu local state theo `questionId -> answer`.
- Khi bam nop bai, gui toan bo answers len `/submit`.
- Chi hien correct answer, feedback, score sau khi backend tra review submitted.
- Admin question type co the co correct answer, nhung phai tach type rieng: `AdminQuestion` va `AttemptQuestion`.

### 5. Question type trong FE khac enum backend

FE dang dung:

- `multiple-choice`
- `listening`
- `word-ordering`
- `true-false`
- `fill-in-the-blank`
- `matching`

Backend dung:

- `multiple_choice`
- `audio_choice`
- `image_choice`
- `word_ordering`
- `reading_comprehension`
- `sentence_rewrite`
- `hint_rewrite`
- `error_correction`
- `matching`

Huong lam:

- Doi type frontend theo backend enum, dung snake_case de tranh mapping thua.
- Neu UI muon label dep, tao helper:

```ts
const questionTypeLabels: Record<QuestionType, string> = {
  multiple_choice: "Multiple choice",
  audio_choice: "Audio choice",
  image_choice: "Image choice",
  word_ordering: "Word ordering",
  reading_comprehension: "Reading comprehension",
  sentence_rewrite: "Sentence rewrite",
  hint_rewrite: "Hint rewrite",
  error_correction: "Error correction",
  matching: "Matching",
};
```

### 6. Admin course/subCourse model khong khop learning CMS

`AdminCourses` hien quan ly `Course -> SubCourse -> Exam` trong localStorage. Backend khong co concept `Course/SubCourse` nhu hien tai. Backend learning CMS gom:

- Taxonomy: levels, skills, topics, tags
- Media assets
- Reading passages
- Questions
- Exams
- Curriculums
- Exam-question mappings
- Curriculum-exam mappings

Huong lam:

- Doi `AdminCourses` thanh nhom man learning CMS:
  - Taxonomy management
  - Question bank
  - Exam builder
  - Curriculum builder
- `Course` hien tai neu muon giu UI marketing/public thi tach rieng voi learning CMS, khong dung no lam data source lam bai.

### 7. Admin academic/user flow chua dung DTO backend

`centerManagement.tsx` co state local cho centers/classes/teachers/students. Backend quy dinh:

- Tao teacher/student qua `POST /users`, khong co endpoint tao teacher rieng.
- Teacher can `teacherProfile.description`, `classIds`, `specializationIds`.
- Student can `studentProfile.classIds`.
- Centers/classes/specializations co endpoint rieng va can `classes.manage`.

Huong lam:

- Tach page:
  - Centers
  - Classes
  - Specializations
  - Users
- Khi tao teacher/student, form phai lay `roleId` tu `/roles`, class list tu `/classes`, specialization list tu `/specializations`.
- Payload create user phai dung dung shape README, khong gui field thua vi backend bat `forbidNonWhitelisted`.

## Kien truc nen lam tiep

### De xuat folder data layer

```txt
src/
  services/
    apiClient.ts
    authService.ts
    userService.ts
    academicService.ts
    learningCmsService.ts
    teacherLearningService.ts
    studentLearningService.ts
  types/
    api.ts
    auth.ts
    user.ts
    learning.ts
  contexts/
    AuthContext.tsx
```

### Type response chung

```ts
export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  requestId: string;
  timestamp: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiErrorBody {
  success: false;
  statusCode: number;
  errorCode: string;
  message: string;
  details?: unknown[];
  fieldErrors?: Record<string, string | string[]>;
  path: string;
  requestId: string;
  timestamp: string;
}
```

### Service nen return data da unwrap

Component khong nen biet envelope backend. Vi du:

```ts
const me = await authService.getMe();
const { items, meta } = await learningCmsService.listQuestions(params);
```

Ben trong service moi unwrap `success/data/meta`.

## Lo trinh thuc hien de it vo nhat

### Phase 1 - Nen mong API/auth

1. Tao `.env` voi `VITE_API_BASE_URL=http://localhost:3000/api/v1`.
2. Tao axios client + unwrap response + error normalize.
3. Refactor `AuthContext` sang login/logout/me/refresh dung backend.
4. Cap nhat `ProtectedRoute` ho tro role/permission.
5. Chay `npm run build` va fix type error.

Ket qua phase nay: app dang nhap bang account seed backend duoc, route protected dung token that.

### Phase 2 - Student runtime dung backend

1. Tao `studentLearningService`.
2. Doi course/exam list cua student sang assignment list backend.
3. Doi start exam sang start attempt.
4. Doi `ExamData/ExamQuestion` thanh attempt snapshot type.
5. Bo cham diem frontend; submit len backend.
6. Review screen dung submit response/get attempt response.

Ket qua phase nay: hoc sinh lam bai that, refresh giua bai co the resume bang `attemptId`.

### Phase 3 - Admin CMS toi thieu

1. Tao taxonomy CRUD: levels, skills, topics, tags.
2. Tao media upload/select.
3. Tao question bank theo 9 question types backend.
4. Tao exam builder: create exam, attach/reorder questions, publish.
5. Tao curriculum builder neu can.

Ket qua phase nay: admin tao duoc noi dung hoc tap dung contract.

### Phase 4 - Teacher assignment

1. Teacher xem class minh phu trach.
2. Teacher assign exam/curriculum cho class/student.
3. Teacher xem attempts va analytics.

Ket qua phase nay: du flow admin -> teacher -> student.

## Luu y validation/form

Backend bat whitelist va forbid non-whitelisted, nen form FE phai map payload rat chat:

- Khong gui field UI-only len API.
- Empty string nen convert thanh `undefined` neu field optional.
- Date gui theo ISO string neu backend yeu cau datetime.
- Update status phai goi endpoint `/status`, khong goi PATCH resource chung.
- Optimistic lock: neu DTO ho tro `expectedUpdatedAt`, gui bang `updatedAt` hien tai.

## Luu y media

Backend tra media URL co the la relative:

```txt
/api/v1/learning/media-assets/files/generated-file.png
```

Neu `url` bat dau bang `/`, FE nen prefix origin backend, khong prefix origin Vite:

```ts
function resolveMediaUrl(url: string) {
  if (url.startsWith("http")) return url;
  return `${API_ORIGIN}${url}`;
}
```

## Luu y encoding

Nhieu text tieng Viet trong repo dang bi mojibake, vi du `ÄÄƒng nháº­p`. Nen chuan hoa tat ca source ve UTF-8. Day khong phai bug logic, nhung anh huong UI va maintainability. Khi sua nen lam theo batch rieng de de review diff.

## Danh sach viec nen lam ngay

1. Dung mo rong mock/localStorage nua cho auth, exam, admin data.
2. Tao API client va auth service truoc.
3. Tach type `AdminQuestion` va `AttemptQuestion`; xoa `correctAnswer` khoi runtime student.
4. Doi enum question type ve dung backend.
5. Doi flow `/exam/:examId` thanh flow attempt.
6. Doi admin course/subCourse thanh learning CMS theo exam/curriculum backend.
7. Them build/lint vao thoi quen sau moi phase.

## Danh gia tong the

Code hien tai phu hop lam UI demo, nhung chua san sang tich hop backend README. Huong dung la giu lai cac component UI tot, nhung thay lop data model va service ben duoi. Neu refactor theo phase o tren, ban se tranh viec sua lan man va khong phai viet lai toan bo giao dien.
