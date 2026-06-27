# Backend Integration Mission

## Done

- [x] Read `README.md` and mapped the backend contract to the current frontend project.
- [x] Kept existing frontend work that was already integrated instead of rebuilding it:
  - [x] Auth login uses `POST /auth/login` with `identifier` and `password`.
  - [x] Token storage keeps `accessToken`, `refreshToken`, user role code, and permissions.
  - [x] Axios client unwraps `success/data/meta` envelopes and normalizes backend errors.
  - [x] Axios client attaches `Authorization: Bearer <accessToken>`.
  - [x] Axios client refreshes tokens through `POST /auth/refresh` on `401`.
  - [x] Protected routes use backend auth state.
  - [x] Student course hub reads assigned exams and curriculums from backend runtime APIs.
  - [x] Student exam list starts attempts through backend APIs.
  - [x] Exam page loads attempt snapshots from backend and submits answers to backend grading.
  - [x] Admin learning CMS screen already calls backend taxonomy, exam, and curriculum APIs.
- [x] Added typed backend contract models in `src/types/backend.ts`.
- [x] Typed user management service for `/users`.
- [x] Typed academic services for `/centers`, `/classes`, and `/specializations`.
- [x] Typed RBAC services for `/roles`, `/permissions`, `/role-permissions`, and matrix sync.
- [x] Typed learning CMS services for:
  - [x] Levels, skills, topics, tags.
  - [x] Media assets by URL and upload.
  - [x] Reading passages.
  - [x] Questions and status updates.
  - [x] Exams, exam questions, publish, reorder, and remove mappings.
  - [x] Curriculums, curriculum exams, publish, reorder, and remove mappings.
- [x] Typed teacher assignment services for:
  - [x] Exam assignment create/list/detail/cancel.
  - [x] Exam assignment attempts and analytics.
  - [x] Curriculum assignment create/list/detail/cancel/analytics.
- [x] Typed student runtime services for:
  - [x] Assigned curriculums.
  - [x] Assigned exams.
  - [x] Start attempts.
  - [x] Get attempts.
  - [x] Submit attempts.
  - [x] Attempt history.
- [x] Typed observability services for `/request-logs` and `/audit-logs`.
- [x] Exported backend integration types from `src/types/index.ts`.
- [x] Connected the profile form to `PATCH /auth/me`.
- [x] Connected profile avatar upload through `POST /learning/media-assets/upload`.

## Not Duplicated

- [x] Did not recreate API client, auth context, token storage, or existing student runtime pages because they were already present and wired to backend services.
- [x] Did not replace existing admin UI layouts. The backend service layer is ready for all README endpoints; individual admin screens can consume these services incrementally.

## Verification

- [x] `npm run build` completed successfully after integration changes.
- [x] `npm run lint` completed successfully after integration changes.
- [x] Vite reported only a large chunk warning, with no build errors.
