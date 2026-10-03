# Kata Web — URL & Routing Architecture Guide (`README_ROUTES.md`)

Bàn tài liệu này mô tả toàn bộ cấu trúc **URL & Routing Architecture** chuẩn hóa của dự án **Kata Web Frontend**. Được thiết kế lại để thay thế mô hình Query/State monolith cũ (`/profile?tab=...`), đảm bảo **Deep-linking, F5 Refresh persistence, Browser History Back/Forward** và **Phân quyền Route chuẩn hóa**.

---

## 🗺️ 1. Cấu Trúc Tổng Quan (Route Tree Hierarchy)

```text
/ (Layout)
 ├── / (Trang chủ)
 ├── /login (Đăng nhập)
 ├── /register (Đăng ký)
 ├── /forgot-password (Quên mật khẩu)
 │
 ├── /courses (Danh mục khóa học công khai)
 │    ├── /courses/published-curriculums (Giáo trình xuất bản)
 │    │    └── /courses/published-curriculums/:curriculumId (Chi tiết đề thi thuộc giáo trình)
 │    └── /courses/:courseId (Danh sách đề thi theo khóa học)
 │
 ├── /exam/:examId (Phòng thi / Giao diện làm bài)
 │
 ├── /student (Phân hệ Học sinh - Guard: ProtectedRoute role="student")
 │    ├── /student/profile (Thông tin tài khoản)
 │    ├── /student/my-exams (Bài tập & Lịch sử làm bài thi)
 │    └── /student/leaderboard (Bảng xếp hạng học sinh)
 │
 ├── /teacher (Phân hệ Giáo viên - Guard: ProtectedRoute role="teacher")
 │    ├── /teacher/profile (Thông tin cá nhân)
 │    ├── /teacher/cms/* (Nội dung CMS bài giảng & câu hỏi dành cho Giáo viên)
 │    │    ├── /teacher/cms/taxonomy/:taxType (levels | skills | topics | tags)
 │    │    ├── /teacher/cms/media
 │    │    ├── /teacher/cms/passages
 │    │    ├── /teacher/cms/questions
 │    │    ├── /teacher/cms/exams
 │    │    └── /teacher/cms/curriculums
 │    ├── /teacher/assignments (Quản lý & Giao bài thi cho lớp học)
 │    │    └── /teacher/assignments/:classId
 │    └── /teacher/leaderboard (Bảng xếp hạng)
 │
 └── /admin (Phân hệ Quản trị - Guard: ProtectedRoute role="admin")
      ├── /admin/profile (Thông tin cá nhân)
      ├── /admin/dashboard (Dashboard tổng quan & Quản lý trung tâm)
      │    └── /admin/dashboard/centers/:centerId (Quản lý trung tâm cụ thể)
      ├── /admin/cms/* (Learning CMS toàn hệ thống)
      │    ├── /admin/cms/taxonomy/:taxType (levels | skills | topics | tags)
      │    ├── /admin/cms/media
      │    ├── /admin/cms/passages
      │    ├── /admin/cms/questions
      │    ├── /admin/cms/exams
      │    └── /admin/cms/curriculums
      ├── /admin/rbac/* (Quản lý vai trò & Phân quyền)
      │    ├── /admin/rbac/roles
      │    └── /admin/rbac/users
      ├── /admin/leaderboard (Bảng xếp hạng)
      └── /admin/about (Thông tin hệ thống)
```

---

## 📌 2. Bảng Đường Dẫn Chuẩn (Route Paths Map)

| Path Pattern | Component | Guard Role | Mô tả chức năng |
|---|---|---|---|
| `/` | `Home.tsx` | Public | Trang chủ Landing Page |
| `/login` | `Login.tsx` | Public | Trang đăng nhập |
| `/register` | `Register.tsx` | Public | Trang đăng ký tài khoản |
| `/forgot-password` | `ForgotPassword.tsx` | Public | Trang khôi phục mật khẩu |
| `/courses` | `Courses.tsx` | Authenticated | Danh sách khóa học |
| `/courses/published-curriculums` | `PublishedCurriculums.tsx` | Authenticated | Danh sách giáo trình xuất bản |
| `/courses/published-curriculums/:curriculumId` | `CurriculumExams.tsx` | Authenticated | Đề thi thuộc giáo trình public |
| `/courses/:courseId` | `ExamList.tsx` | Authenticated | Đề thi thuộc khóa học public |
| `/exam/:examId` | `ExamDetail.tsx` | Authenticated | Giao diện làm bài thi |
| `/student/profile` | `UserProfile.tsx` | Student | Hồ sơ cá nhân học sinh |
| `/student/my-exams` | `StudentMyExams.tsx` | Student | Bài học & Đề thi của tôi |
| `/student/leaderboard` | `Leaderboard.tsx` | Student | Bảng xếp hạng học sinh |
| `/teacher/profile` | `UserProfile.tsx` | Teacher | Hồ sơ cá nhân giáo viên |
| `/teacher/cms/*` | `LearningCms.tsx` | Teacher | CMS bài giảng & câu hỏi |
| `/teacher/assignments` | `TeacherAssignments.tsx` | Teacher | Giao bài thi cho lớp học |
| `/teacher/assignments/:classId` | `TeacherAssignments.tsx` | Teacher | Lớp học đang được chọn để giao bài |
| `/teacher/leaderboard` | `Leaderboard.tsx` | Teacher | Bảng xếp hạng |
| `/admin/dashboard` | `AdminDashboard.tsx` | Admin | Dashboard quản lý tổng quan |
| `/admin/dashboard/centers/:centerId` | `AdminDashboard.tsx` | Admin | Quản lý Trung tâm cụ thể theo `centerId` |
| `/admin/cms/*` | `LearningCms.tsx` | Admin | Learning CMS toàn hệ thống |
| `/admin/cms/subjects/:subjectId` | `LearningCms.tsx` | Admin | CMS theo Môn học/Chuyên môn cụ thể theo `subjectId` |
| `/admin/cms/subjects/:subjectId/taxonomy/:taxType` | `LearningCms.tsx` | Admin | Quản lý Phân loại theo môn học (`levels`, `skills`, `topics`, `tags`) |
| `/admin/cms/subjects/:subjectId/media` | `LearningCms.tsx` | Admin | Thư viện File phương tiện theo môn học |
| `/admin/cms/subjects/:subjectId/passages` | `LearningCms.tsx` | Admin | Ngân hàng Bài đọc theo môn học |
| `/admin/cms/subjects/:subjectId/questions` | `LearningCms.tsx` | Admin | Ngân hàng Câu hỏi theo môn học |
| `/admin/cms/subjects/:subjectId/exams` | `LearningCms.tsx` | Admin | Ngân hàng Đề thi theo môn học |
| `/admin/cms/subjects/:subjectId/curriculums` | `LearningCms.tsx` | Admin | Quản lý Giáo trình theo môn học |
| `/admin/rbac/*` | `RbacManagement.tsx` | Admin | Phân quyền vai trò (RBAC) |
| `/admin/leaderboard` | `Leaderboard.tsx` | Admin | Bảng xếp hạng toàn hệ thống |
| `/admin/about` | `AdminAboutUs.tsx` | Admin | Giới thiệu hệ thống |

---

## 🔄 3. Tương Thích Tự Động (Backwards Compatibility Redirects)

Để đảm bảo người dùng hoặc liên kết cũ dạng `/profile?tab=...` không bị đứt gãy, component `Profile.tsx` sẽ **tự động chuyển hướng (Auto-Redirect)** sang URL chuẩn hóa dựa trên Role của người dùng:

- `/profile?tab=cms` $\rightarrow$ Chuyển thành `/admin/cms` (nếu là Admin) hoặc `/teacher/cms` (nếu là Teacher).
- `/profile?tab=dashboard` $\rightarrow$ Chuyển thành `/admin/dashboard`.
- `/profile?tab=assignments` $\rightarrow$ Chuyển thành `/teacher/assignments`.
- `/profile?tab=my-exams` $\rightarrow$ Chuyển thành `/student/my-exams`.
- `/profile?tab=ranking` $\rightarrow$ Chuyển thành `/:role/leaderboard`.
- `/profile?tab=profile` $\rightarrow$ Chuyển thành `/:role/profile`.

---

## 🛠️ 4. File Khai Báo Routes Hằng Số (`src/routes/paths.ts`)

Toàn bộ các URL pattern trong code đều được tập trung tại `src/routes/paths.ts` để tiện gọi và tránh gõ nhầm string:

```typescript
import { PATHS } from "./routes/paths";

// Ví dụ chuyển trang:
navigate(PATHS.ADMIN.CMS.TAXONOMY);
navigate(PATHS.ADMIN.DASHBOARD.CENTER("center-id-123"));
```

---

## 🔍 5. Hướng Dẫn Trace & Debug

1. **Top-Level Route Definitions**: Trỏ tại [App.tsx](file:///c:/Users/Admin/kt-fe/src/App.tsx).
2. **Profile Shell & Role Menu Routing**: Trỏ tại [Profile.tsx](file:///c:/Users/Admin/kt-fe/src/pages/profilePage/Profile.tsx).
3. **Sub-Path Navigation in Learning CMS**: Trỏ tại [LearningCms.tsx](file:///c:/Users/Admin/kt-fe/src/pages/profilePage/admin/LearningCms.tsx).
4. **Center-ID Deep Linking in Dashboard**: Trỏ tại [centerManagement.tsx](file:///c:/Users/Admin/kt-fe/src/pages/profilePage/admin/centerManagement.tsx).
