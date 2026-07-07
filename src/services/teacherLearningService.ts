import { ApiEnvelope } from "../types/api";
import {
  Attempt,
  CurriculumAssignment,
  CurriculumAssignmentAnalytics,
  ExamAssignment,
  ExamAssignmentAnalytics,
} from "../types/backend";
import {
  ClassCurriculumQuery,
  ClassCurriculumRequest,
  CurriculumAssignmentRequest,
  ExamAssignmentRequest,
  TeacherAssignmentQuery,
} from "../types/learning";
import { apiClient, unwrapData, unwrapList } from "./apiClient";

function normalizeParams(params?: Record<string, unknown>) {
  if (!params) return undefined;
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.join(",") : value,
    ]),
  );
}

export interface ClassCurriculum {
  id: string;
  classId: string;
  curriculumId: string;
  maxAttempts?: number | null;
  class?: { id: string; name?: string };
  curriculum?: { id: string; title?: string; code?: string };
  isActive?: boolean;
  createdAt?: string;
}

export const teacherLearningService = {
  /**
   * Gắn giáo trình vào lớp học (class → curriculum mapping).
   * Học sinh thuộc lớp đó sẽ tự động thấy tất cả exam trong giáo trình.
   */
  classCurriculums: {
    async create(payload: ClassCurriculumRequest): Promise<ClassCurriculum> {
      return unwrapData(
        await apiClient.post<ApiEnvelope<ClassCurriculum>>(
          "/learning/teacher/class-curriculums",
          payload,
        ),
      );
    },

    async list(params?: ClassCurriculumQuery) {
      return unwrapList(
        await apiClient.get<ApiEnvelope<ClassCurriculum[]>>(
          "/learning/teacher/class-curriculums",
          { params: normalizeParams(params) },
        ),
      );
    },

    async remove(id: string): Promise<ClassCurriculum> {
      return unwrapData(
        await apiClient.delete<ApiEnvelope<ClassCurriculum>>(
          `/learning/teacher/class-curriculums/${id}`,
        ),
      );
    },
  },

  /**
   * Giao bài thi (ExamAssignment).
   * Hỗ trợ nhiều exam cùng lúc, maxAttempts, giao cho lớp hoặc học sinh cụ thể.
   */
  examAssignments: {
    async create(payload: ExamAssignmentRequest) {
      return unwrapData(
        await apiClient.post<ApiEnvelope<ExamAssignment | ExamAssignment[]>>(
          "/learning/teacher/exam-assignments",
          payload,
        ),
      );
    },

    async list(params?: TeacherAssignmentQuery) {
      return unwrapList(
        await apiClient.get<ApiEnvelope<ExamAssignment[]>>(
          "/learning/teacher/exam-assignments",
          { params: normalizeParams(params) },
        ),
      );
    },

    async get(assignmentId: string) {
      return unwrapData(
        await apiClient.get<ApiEnvelope<ExamAssignment>>(
          `/learning/teacher/exam-assignments/${assignmentId}`,
        ),
      );
    },

    async cancel(assignmentId: string) {
      return unwrapData(
        await apiClient.delete<ApiEnvelope<ExamAssignment>>(
          `/learning/teacher/exam-assignments/${assignmentId}`,
        ),
      );
    },

    async attempts(
      assignmentId: string,
      params?: { page?: number; limit?: number; studentId?: string; status?: string },
    ) {
      return unwrapList(
        await apiClient.get<ApiEnvelope<Attempt[]>>(
          `/learning/teacher/exam-assignments/${assignmentId}/attempts`,
          { params },
        ),
      );
    },

    async analytics(assignmentId: string) {
      return unwrapData(
        await apiClient.get<ApiEnvelope<ExamAssignmentAnalytics>>(
          `/learning/teacher/exam-assignments/${assignmentId}/analytics`,
        ),
      );
    },
  },

  /**
   * Giao giáo trình trực tiếp cho học sinh (CurriculumAssignment).
   * Không nhất thiết phải qua lớp.
   */
  curriculumAssignments: {
    async create(payload: CurriculumAssignmentRequest) {
      return unwrapData(
        await apiClient.post<ApiEnvelope<CurriculumAssignment>>(
          "/learning/teacher/curriculum-assignments",
          payload,
        ),
      );
    },

    async list(params?: TeacherAssignmentQuery) {
      return unwrapList(
        await apiClient.get<ApiEnvelope<CurriculumAssignment[]>>(
          "/learning/teacher/curriculum-assignments",
          { params: normalizeParams(params) },
        ),
      );
    },

    async get(assignmentId: string) {
      return unwrapData(
        await apiClient.get<ApiEnvelope<CurriculumAssignment>>(
          `/learning/teacher/curriculum-assignments/${assignmentId}`,
        ),
      );
    },

    async cancel(assignmentId: string) {
      return unwrapData(
        await apiClient.delete<ApiEnvelope<CurriculumAssignment>>(
          `/learning/teacher/curriculum-assignments/${assignmentId}`,
        ),
      );
    },

    async analytics(assignmentId: string) {
      return unwrapData(
        await apiClient.get<ApiEnvelope<CurriculumAssignmentAnalytics>>(
          `/learning/teacher/curriculum-assignments/${assignmentId}/analytics`,
        ),
      );
    },
  },
};
