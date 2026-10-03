# Architecture — KT-FE (Kỳ Thi Frontend)

> **Cập nhật lần cuối:** Tháng 8 năm 2026  
> **Tech stack:** React 18 + TypeScript + Vite + Ant Design + Tailwind CSS (utility-only)

---

## 1. Tổng quan hệ thống

KT-FE là ứng dụng Single-Page Application (SPA) phục vụ ba nhóm người dùng:

| Role        | Chức năng chính |
|-------------|-----------------|
| **Admin**   | Quản lý nội dung học tập (CMS), phân quyền RBAC, quản lý trung tâm & lớp học |
| **Teacher** | Soạn đề thi, giao bài, xem xếp hạng học sinh |
| **Student** | Làm bài thi, xem kết quả, theo dõi tiến độ |

---

## 2. Cấu trúc thư mục

```
src/
├── assets/               # Static assets (ảnh, icon, font)
│   └── logo/
│
├── components/           # Shared UI components (dùng lại ở nhiều trang)
│   ├── Header.tsx        # Navigation bar, auth dropdown
│   └── ...
│
├── contexts/             # React Context providers
│   └── AuthContext.tsx   # Quản lý session user, role, logout
│
├── hooks/                # Custom React hooks
│
├── pages/                # Page components (1 file = 1 route)
│   ├── Home/
│   ├── profilePage/      # Dashboard sau khi đăng nhập
│   │   ├── admin/        # Các trang dành riêng cho Admin
│   │   │   ├── LearningCms.tsx           ← Orchestrator CMS
│   │   │   ├── learningCms/              ← Module CMS (xem §4)
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── centerManagement.tsx
│   │   │   ├── RbacManagement.tsx
│   │   │   └── AdminAboutUs.tsx
│   │   ├── teacher/
│   │   │   └── TeacherAssignments.tsx
│   │   ├── student/
│   │   │   └── StudentMyExams.tsx
│   │   ├── layouts/
│   │   │   └── ProfileLayout.tsx
│   │   ├── Profile.tsx                   ← Shell điều hướng tab
│   │   ├── Leaderboard.tsx
│   │   └── userProfile.tsx
│   └── ...
│
├── services/             # API layer — KHÔNG CHẠM VÀO KHI REFACTOR
│   ├── apiClient.ts      # Axios instance + interceptors
│   ├── authService.ts
│   ├── learningCmsService.ts
│   ├── academicService.ts
│   ├── userService.ts
│   ├── rbacService.ts
│   └── teacherLearningService.ts
│
├── types/                # TypeScript types — KHÔNG CHẠM VÀO KHI REFACTOR
│   ├── index.ts
│   ├── backend.ts
│   ├── learning.ts
│   ├── auth.ts
│   └── api.ts
│
├── App.tsx               # Router định nghĩa tất cả routes
├── main.tsx              # React entry point
└── index.css             # Global styles
```

---

## 3. Data Flow

```
Browser
  │
  ▼
App.tsx (React Router)
  │   Route matching
  ▼
Page Component (e.g. Profile.tsx)
  │   reads AuthContext → decides which sub-page to show
  ▼
Feature Component (e.g. LearningCms.tsx)
  │   useState / useEffect → calls Service
  ▼
Service Layer (e.g. learningCmsService.ts)
  │   wraps API calls via apiClient (Axios)
  ▼
Backend REST API
  │   JSON response
  ▼
Service Layer resolves data
  ▼
Feature Component updates state → triggers re-render
  ▼
Sub-components receive data via props → render UI
```

### Quy tắc data flow

- **Chỉ Page / Feature component** mới được gọi API (thông qua service).
- **Sub-components** nhận data qua `props` và trả về sự kiện qua callback props (`onXxx`).
- **Context** chỉ dùng cho global state ít thay đổi (auth, user info). Không dùng Context để truyền domain data (câu hỏi, đề thi, ...).

---

## 4. Module CMS — Learning CMS Architecture

Module CMS là phần phức tạp nhất của hệ thống. Sau khi refactor, nó tuân theo mô hình **Orchestrator + Sub-component**:

```
LearningCms.tsx (Orchestrator ~500 LOC)
│
│   owns: all useState, all handlers, all Form instances
│
├── learningCms/
│   ├── constants.ts              # QUESTION_TYPES, colors, labels, page sizes
│   │
│   └── components/
│       ├── TaxonomyTab.tsx       # Tab danh mục (Levels/Skills/Topics/Tags)
│       ├── MediaTab.tsx          # Tab thư viện Media
│       ├── PassagesTab.tsx       # Tab bài đọc
│       ├── QuestionsTab.tsx      # Tab ngân hàng câu hỏi
│       ├── ExamsTab.tsx          # Tab đề thi
│       ├── CurriculumsTab.tsx    # Tab giáo trình
│       ├── QuestionPopoverContent.tsx  # Pure component, hover preview
│       │
│       └── modals/
│           ├── TaxonomyModal.tsx
│           ├── MediaUploadModal.tsx
│           ├── PassageFormModal.tsx
│           ├── QuestionFormModal.tsx   # Phức tạp nhất — type-specific fields
│           ├── ExamFormModal.tsx
│           ├── CurriculumFormModal.tsx
│           ├── ExamVersionsModal.tsx
│           ├── QuestionVersionsModal.tsx
│           ├── ManageQuestionsModal.tsx  # Dual-pane: exam ↔ question bank
│           └── ManageExamsModal.tsx      # Dual-pane: curriculum ↔ exam list
```

### Luật của module này

| Luật | Mô tả |
|------|-------|
| **Props-down, events-up** | Sub-component chỉ nhận data qua props, gọi callback để giao tiếp ngược |
| **No API in sub-components** | Tất cả API call đặt trong orchestrator (ngoại lệ duy nhất: `ExamVersionsModal` có handler publish nội bộ) |
| **Constants tập trung** | Mọi lookup table, label, màu sắc ở `constants.ts`, không hard-code trong component |
| **Columns ngoài JSX** | Table column definitions viết thành hàm/biến bên ngoài return(), không inline |

---

## 5. Service Layer

```
services/
├── apiClient.ts
│   • Axios instance với baseURL từ env
│   • Interceptor tự động gắn Authorization header
│   • Interceptor bắt 401 → redirect to login
│   • resolveMediaUrl() helper
│
├── learningCmsService.ts
│   • levels, skills, topics, tags (taxonomy)
│   • mediaAssets (upload, list, delete)
│   • readingPassages
│   • questions (CRUD + status + versions + attach media)
│   • exams (CRUD + status + versions + attach/reorder questions)
│   • curriculums (CRUD + status + attach/reorder exams)
│
├── academicService.ts
│   • centers, classes, specializations
│
├── userService.ts
│   • list, get, create, update
│   • resetPassword
│
├── rbacService.ts
│   • roles, permissions, userRoles
│
└── teacherLearningService.ts
    • classCurriculums (giao bài)
```

**Quy tắc:** Không bao giờ gọi `fetch()` hay `axios` trực tiếp trong component. Luôn sử dụng hàm từ service tương ứng.

---

## 6. Authentication & Authorization

```
AuthContext.tsx
  • stores: user (role, id, fullName, teacherProfile, ...)
  • provides: isLoggedIn, login(), logout()
  • localStorage key: "authToken"

Route-level guard (App.tsx)
  • PrivateRoute wrapper: redirect to /login nếu !isLoggedIn
  • Role check: một số tab chỉ render nếu user.role === "admin"

API-level guard (apiClient interceptor)
  • Gắn Bearer token vào mọi request
  • 401 response → clear token + redirect /login
```

---

## 7. Naming Conventions

| Loại | Convention | Ví dụ |
|------|-----------|-------|
| **Component** | PascalCase | `QuestionFormModal` |
| **File (component)** | PascalCase.tsx | `ExamVersionsModal.tsx` |
| **File (util/const)** | camelCase.ts | `constants.ts` |
| **Hook** | `use` + PascalCase | `useAuth` |
| **Service object** | camelCase | `learningCmsService` |
| **Handler** | `handle` + Action + Subject | `handleQuestionEdit`, `handleAddExamToCurriculum` |
| **Modal state** | `xxxModalOpen` / `xxxOpen` | `taxModalOpen`, `manageQuestionsOpen` |
| **Editing item state** | `editingXxx` | `editingItem`, `editingCenter` |
| **Callback prop** | `onXxx` | `onEditClick`, `onCreateClick` |

---

## 8. Scalability Guide

### Thêm một loại câu hỏi mới

1. Thêm object vào `QUESTION_TYPES` trong `constants.ts`
2. Thêm label + màu vào `QUESTION_TYPE_LABELS` và `QUESTION_TYPE_COLORS`
3. Tạo component `XxxFields.tsx` trong `QuestionFormModal.tsx` hoặc file riêng
4. Thêm case vào `QuestionDetailFields` dispatcher
5. Thêm payload builder vào `handleQuestionSubmit` trong `LearningCms.tsx`

### Thêm một tab CMS mới

1. Tạo `components/NewTab.tsx` với interface `Props` rõ ràng
2. Tạo modals liên quan trong `components/modals/`
3. Thêm state và handlers vào `LearningCms.tsx`
4. Thêm item vào mảng `tabItems`

### Thêm một route/page mới

1. Tạo file trong `src/pages/`
2. Thêm route vào `App.tsx`
3. Nếu cần cho authenticated user: bọc bằng `PrivateRoute`
4. Nếu chỉ cho một role: thêm điều kiện trong `Profile.tsx`

### Performance tips

- Dùng `React.memo` cho sub-component ít thay đổi (ví dụ: `QuestionPopoverContent`)
- Tránh tạo object/array mới bên trong JSX (gây re-render không cần thiết)
- Dùng `useCallback` cho handlers truyền vào Table rows
- Phân trang API-side (không load toàn bộ data về client) — đã áp dụng với `limit: 100`

---

## 9. Environment Variables

```env
VITE_API_BASE_URL=https://api.example.com   # Backend URL
```

Truy cập trong code: `import.meta.env.VITE_API_BASE_URL`

---

## 10. Công nghệ sử dụng

| Thư viện | Mục đích |
|----------|----------|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool + dev server |
| React Router v6 | Client-side routing |
| Ant Design 5 | UI component library |
| Tailwind CSS | Utility classes |
| Axios | HTTP client |
| Lucide React | Supplementary icons |

---

*Tài liệu này được tạo tự động từ quá trình phân tích source code. Cập nhật khi có thay đổi kiến trúc lớn.*
