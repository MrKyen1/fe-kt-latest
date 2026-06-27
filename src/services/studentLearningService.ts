import { ApiEnvelope } from "../types/api";
import { PaginationQuery } from "../types/api";
import {
  Attempt,
  StudentCurriculumAssignment,
  StudentExamAssignment,
} from "../types/backend";
import { SubmitAttemptRequest } from "../types/learning";
import { apiClient, unwrapData, unwrapList } from "./apiClient";

export const studentLearningService = {
  curriculums: {
    async list(params?: PaginationQuery) {
      return unwrapList(
        await apiClient.get<ApiEnvelope<StudentCurriculumAssignment[]>>("/learning/student/curriculums", {
          params,
        }),
      );
    },

    async get(assignmentStudentId: string) {
      return unwrapData(
        await apiClient.get<ApiEnvelope<StudentCurriculumAssignment>>(
          `/learning/student/curriculums/${assignmentStudentId}`,
        ),
      );
    },

    async startAttempt(assignmentStudentId: string, examId: string) {
      return unwrapData(
        await apiClient.post<ApiEnvelope<Attempt>>(
          `/learning/student/curriculums/${assignmentStudentId}/exams/${examId}/attempts`,
        ),
      );
    },
  },

  examAssignments: {
    async list(params?: PaginationQuery) {
      return unwrapList(
        await apiClient.get<ApiEnvelope<StudentExamAssignment[]>>(
          "/learning/student/exam-assignments",
          { params },
        ),
      );
    },

    async get(assignmentId: string) {
      return unwrapData(
        await apiClient.get<ApiEnvelope<StudentExamAssignment>>(
          `/learning/student/exam-assignments/${assignmentId}`,
        ),
      );
    },

    async startAttempt(assignmentId: string) {
      return unwrapData(
        await apiClient.post<ApiEnvelope<Attempt>>(
          `/learning/student/exam-assignments/${assignmentId}/attempts`,
        ),
      );
    },

    async attempts(assignmentId: string) {
      return unwrapData(
        await apiClient.get<ApiEnvelope<Attempt[]>>(
          `/learning/student/exam-assignments/${assignmentId}/attempts`,
        ),
      );
    },
  },

  attempts: {
    async get(attemptId: string) {
      return unwrapData(
        await apiClient.get<ApiEnvelope<Attempt>>(`/learning/student/attempts/${attemptId}`),
      );
    },

    async submit(attemptId: string, payload: SubmitAttemptRequest) {
      return unwrapData(
        await apiClient.post<ApiEnvelope<Attempt>>(
          `/learning/student/attempts/${attemptId}/submit`,
          payload,
        ),
      );
    },
  },
};
