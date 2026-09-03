import { ApiEnvelope } from "../types/api";
import { PaginationQuery } from "../types/api";
import {
  Attempt,
  StudentCurriculumAssignment,
  StudentExamAssignment,
} from "../types/backend";
import { SubmitAttemptRequest, SubmitAnswerRequest } from "../types/learning";
import { apiClient, unwrapData, unwrapList } from "./apiClient";

export const studentLearningService = {
  /**
   * Curriculum access:
   * - Học sinh thấy curriculum từ 2 nguồn:
   *   1. class-curriculum: lớp được gắn curriculum → toàn lớp thấy
   *   2. direct enrollment: được giao trực tiếp không qua lớp
   * - Backend tự merge cả 2 nguồn vào /student/curriculums
   */
  curriculums: {
    async list(params?: PaginationQuery) {
      return unwrapList(
        await apiClient.get<ApiEnvelope<StudentCurriculumAssignment[]>>(
          "/learning/student/curriculums",
          { params },
        ),
      );
    },

    /**
     * Lấy chi tiết curriculum và exam progress.
     * @param curriculumId - ID của curriculum (không phải enrollmentId)
     */
    async get(curriculumId: string) {
      return unwrapData(
        await apiClient.get<ApiEnvelope<StudentCurriculumAssignment>>(
          `/learning/student/curriculums/${curriculumId}`,
        ),
      );
    },

    /**
     * Bắt đầu attempt cho 1 exam trong curriculum.
     * @param curriculumId - ID của curriculum
     * @param examId - ID của exam
     */
    async startAttempt(curriculumId: string, examId: string) {
      return unwrapData(
        await apiClient.post<ApiEnvelope<Attempt>>(
          `/learning/student/curriculums/${curriculumId}/exams/${examId}/attempts`,
        ),
      );
    },
  },

  /**
   * Exam assignments (bài thi được giáo viên giao trực tiếp)
   */
  examAssignments: {
    async list(params?: PaginationQuery) {
      return unwrapList(
        await apiClient.get<ApiEnvelope<StudentExamAssignment[]>>(
          "/learning/student/exam-assignments",
          { params },
        ),
      );
    },

    async get(assignmentStudentId: string) {
      return unwrapData(
        await apiClient.get<ApiEnvelope<StudentExamAssignment>>(
          `/learning/student/exam-assignments/${assignmentStudentId}`,
        ),
      );
    },

    /**
     * Bắt đầu attempt cho 1 exam cụ thể trong assignment.
     * @param assignmentStudentId - ID của exam_assignment_students record
     * @param examId - ID của exam muốn làm
     */
    async startAttempt(assignmentStudentId: string, examId: string) {
      return unwrapData(
        await apiClient.post<ApiEnvelope<Attempt>>(
          `/learning/student/exam-assignments/${assignmentStudentId}/exams/${examId}/attempts`,
        ),
      );
    },

    async attempts(assignmentStudentId: string) {
      return unwrapList(
        await apiClient.get<ApiEnvelope<Attempt[]>>(
          `/learning/student/exam-assignments/${assignmentStudentId}/attempts`,
        ),
      );
    },
  },

  attempts: {
    async get(attemptId: string) {
      return unwrapData(
        await apiClient.get<ApiEnvelope<Attempt>>(
          `/learning/student/attempts/${attemptId}`,
        ),
      );
    },

    /**
     * Submit từng câu sau khi student chọn/điền đáp án.
     * BE chấm ngị và trả isCorrect, correctAnswer, feedback ngay.
     * Câu đã submit bị khóa (answeredAt ≠ null), nếu submit lại → 409.
     */
    async submitAnswer(attemptId: string, questionId: string, payload: SubmitAnswerRequest) {
      return unwrapData(
        await apiClient.post<ApiEnvelope<{
          id?: string;
          questionId: string;
          questionType?: string;
          orderIndex?: number;
          answer: unknown;
          correctAnswer: unknown;
          answeredAt: string;
          score: string;
          maxScore: string;
          isCorrect: boolean;
          feedback?: Record<string, unknown>;
          question?: Record<string, unknown>;
        }>>(
          `/learning/student/attempts/${attemptId}/answers/${questionId}/submit`,
          payload,
        ),
      );
    },

    /**
     * Lưu đáp án tạm thời cho từng câu (chỉ dùng cho lượt thi đầu tiên - isInitialExamAttempt).
     * Endpoint Backend: PUT /learning/student/attempts/:attemptId/answers/:questionId
     */
    async saveAnswer(attemptId: string, questionId: string, payload: SubmitAnswerRequest) {
      return unwrapData(
        await apiClient.put<ApiEnvelope<{
          attemptId: string;
          questionId: string;
          answer: unknown;
          answeredAt: string;
        }>>(
          `/learning/student/attempts/${attemptId}/answers/${questionId}`,
          payload,
        ),
      );
    },

    /**
     * Nộp toàn bộ attempt (finish).
     * Body có thể rỗng {} hoặc gửi thêm answers[] cho câu chưa submit.
     */
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
