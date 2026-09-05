/**
 * Centralized Route Paths definition for Kata Web Application.
 * Standardized format:
 * - Public: /courses, /courses/:courseId, etc.
 * - Student: /student/:section
 * - Teacher: /teacher/:section
 * - Admin: /admin/:section (including /admin/dashboard/centers/:centerId and /admin/cms/:tab)
 */

export const PATHS = {
  HOME: "/home",
  LOGIN: "/login",
  REGISTER: "/register",
  FORGOT_PASSWORD: "/forgot-password",

  COURSES: {
    ROOT: "/courses",
    PUBLISHED_CURRICULUMS: "/courses/published-curriculums",
    CURRICULUM_DETAIL: (curriculumId: string) => `/courses/published-curriculums/${curriculumId}`,
    COURSE_DETAIL: (courseId: string) => `/courses/${courseId}`,
  },

  EXAM: {
    DETAIL: (examId: string) => `/exam/${examId}`,
  },

  STUDENT: {
    ROOT: "/student",
    PROFILE: "/student/profile",
    MY_EXAMS: "/student/my-exams",
    RANKING: "/student/leaderboard",
  },

  TEACHER: {
    ROOT: "/teacher",
    PROFILE: "/teacher/profile",
    CMS: {
      ROOT: "/teacher/cms",
      TAB: (tab: string) => `/teacher/cms/${tab}`,
    },
    ASSIGNMENTS: {
      ROOT: "/teacher/assignments",
      CLASS: (classId: string) => `/teacher/assignments/${classId}`,
    },
    RANKING: "/teacher/leaderboard",
  },

  ADMIN: {
    ROOT: "/admin",
    PROFILE: "/admin/profile",
    DASHBOARD: {
      ROOT: "/admin/dashboard",
      CENTER: (centerId: string) => `/admin/dashboard/centers/${centerId}`,
    },
    CMS: {
      ROOT: "/admin/cms",
      SUBJECT: (subjectId: string, tab = "taxonomy", taxType = "levels") =>
        `/admin/cms/subjects/${subjectId}/${tab}${tab === "taxonomy" ? `/${taxType}` : ""}`,
      TAXONOMY: "/admin/cms/taxonomy",
      TAXONOMY_TYPE: (taxType: string) => `/admin/cms/taxonomy/${taxType}`,
      MEDIA: "/admin/cms/media",
      PASSAGES: "/admin/cms/passages",
      QUESTIONS: "/admin/cms/questions",
      EXAMS: "/admin/cms/exams",
      EXAM_QUESTIONS: (examId: string) => `/admin/cms/exams/${examId}/questions`,
      CURRICULUMS: "/admin/cms/curriculums",
      CURRICULUM_EXAMS: (curriculumId: string) => `/admin/cms/curriculums/${curriculumId}/exams`,
    },
    RBAC: {
      ROOT: "/admin/rbac",
      TAB: (tab: string) => `/admin/rbac/${tab}`,
    },
    RANKING: "/admin/leaderboard",
    ABOUT: "/admin/about",
    HOMEPAGE_CMS: "/admin/homepage-cms",
  },

  PROFILE: "/profile",
};
