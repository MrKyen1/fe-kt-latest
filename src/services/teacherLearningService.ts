import { ApiEnvelope } from "../types/api";
import {
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

export const teacherLearningService = {
  examAssignments: {
    async create(payload: ExamAssignmentRequest) {
      return unwrapData(
        await apiClient.post<ApiEnvelope<unknown>>(
          "/learning/teacher/exam-assignments",
          payload,
        ),
      );
    },

    async list(params?: TeacherAssignmentQuery) {
      return unwrapList(
        await apiClient.get<ApiEnvelope<unknown[]>>(
          "/learning/teacher/exam-assignments",
          { params: normalizeParams(params) },
        ),
      );
    },

    async get(assignmentId: string) {
      return unwrapData(
        await apiClient.get<ApiEnvelope<unknown>>(
          `/learning/teacher/exam-assignments/${assignmentId}`,
        ),
      );
    },

    async cancel(assignmentId: string) {
      return unwrapData(
        await apiClient.delete<ApiEnvelope<unknown>>(
          `/learning/teacher/exam-assignments/${assignmentId}`,
        ),
      );
    },

    async attempts(
      assignmentId: string,
      params?: { page?: number; limit?: number; studentId?: string; status?: string },
    ) {
      return unwrapList(
        await apiClient.get<ApiEnvelope<unknown[]>>(
          `/learning/teacher/exam-assignments/${assignmentId}/attempts`,
          { params },
        ),
      );
    },

    async analytics(assignmentId: string) {
      return unwrapData(
        await apiClient.get<ApiEnvelope<unknown>>(
          `/learning/teacher/exam-assignments/${assignmentId}/analytics`,
        ),
      );
    },
  },

  curriculumAssignments: {
    async create(payload: CurriculumAssignmentRequest) {
      return unwrapData(
        await apiClient.post<ApiEnvelope<unknown>>(
          "/learning/teacher/curriculum-assignments",
          payload,
        ),
      );
    },

    async list(params?: TeacherAssignmentQuery) {
      return unwrapList(
        await apiClient.get<ApiEnvelope<unknown[]>>(
          "/learning/teacher/curriculum-assignments",
          { params: normalizeParams(params) },
        ),
      );
    },

    async get(assignmentId: string) {
      return unwrapData(
        await apiClient.get<ApiEnvelope<unknown>>(
          `/learning/teacher/curriculum-assignments/${assignmentId}`,
        ),
      );
    },

    async cancel(assignmentId: string) {
      return unwrapData(
        await apiClient.delete<ApiEnvelope<unknown>>(
          `/learning/teacher/curriculum-assignments/${assignmentId}`,
        ),
      );
    },

    async analytics(assignmentId: string) {
      return unwrapData(
        await apiClient.get<ApiEnvelope<unknown>>(
          `/learning/teacher/curriculum-assignments/${assignmentId}/analytics`,
        ),
      );
    },
  },
};

