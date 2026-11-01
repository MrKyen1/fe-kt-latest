import { ApiEnvelope } from "../types/api";
import {
  Attempt,
  CurriculumAssignment,
  ExamAssignment,
  TeacherAttemptDetail,
} from "../types/backend";
import {
  ClassCurriculumQuery,
  ClassCurriculumRequest,
  CurriculumAssignmentRequest,
  ExamAssignmentRequest,
  TeacherAssignmentQuery,
  MonthlyReportQuery,
  MonthlyReportData,
  MonthlyReportSnapshotMetadata,
  MonthlyReportSnapshotDetail,
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
  // NOTE: maxAttempts da bi xoa (migration 1780000030000).
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

    async remove(id: string, confirm = false): Promise<ClassCurriculum> {
      return unwrapData(
        await apiClient.delete<ApiEnvelope<ClassCurriculum>>(
          `/learning/teacher/class-curriculums/${id}`,
          confirm ? { params: { confirm: true } } : undefined,
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

    async cancel(assignmentId: string, confirm = false) {
      return unwrapData(
        await apiClient.delete<ApiEnvelope<ExamAssignment>>(
          `/learning/teacher/exam-assignments/${assignmentId}`,
          confirm ? { params: { confirm: true } } : undefined,
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

    async attemptDetail(assignmentId: string, attemptId: string): Promise<TeacherAttemptDetail> {
      return unwrapData(
        await apiClient.get<ApiEnvelope<TeacherAttemptDetail>>(
          `/learning/teacher/exam-assignments/${assignmentId}/attempts/${attemptId}`,
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

    async cancel(assignmentId: string, confirm = false) {
      return unwrapData(
        await apiClient.delete<ApiEnvelope<CurriculumAssignment>>(
          `/learning/teacher/curriculum-assignments/${assignmentId}`,
          confirm ? { params: { confirm: true } } : undefined,
        ),
      );
    },
  },

  /**
   * Báo cáo tháng của giáo viên & Snapshots (API ngày 2026-10-23)
   */
  monthlyReports: {
    /**
     * Báo cáo học tập tháng trực tiếp
     * GET /api/v1/learning/teacher/reports/monthly
     */
    async get(params: MonthlyReportQuery): Promise<{ data: MonthlyReportData; meta: any }> {
      const response = await apiClient.get<ApiEnvelope<MonthlyReportData>>(
        "/learning/teacher/reports/monthly",
        { params },
      );
      return {
        data: unwrapData(response),
        meta: (response.data as any)?.meta || { page: 1, limit: 20, total: 0, totalPages: 1 },
      };
    },

    /**
     * Xuất Excel báo cáo học tập tháng (live)
     * GET /api/v1/learning/teacher/reports/monthly/export
     */
    async export(params: Omit<MonthlyReportQuery, "page" | "limit">): Promise<Blob> {
      const response = await apiClient.get("/learning/teacher/reports/monthly/export", {
        params,
        responseType: "blob",
        timeout: 600_000,
      });
      return response.data;
    },

    /**
     * Lưu/chốt báo cáo tháng (tạo snapshot mới)
     * POST /api/v1/learning/teacher/reports/monthly/snapshots
     */
    async createSnapshot(payload: {
      year: number;
      month: number;
      classId?: string;
      studentId?: string;
      specializationId?: string;
    }): Promise<MonthlyReportSnapshotDetail> {
      return unwrapData(
        await apiClient.post<ApiEnvelope<MonthlyReportSnapshotDetail>>(
          "/learning/teacher/reports/monthly/snapshots",
          payload,
          { timeout: 600_000 },
        ),
      );
    },

    /**
     * Danh sách các bản lưu báo cáo tháng
     * GET /api/v1/learning/teacher/reports/monthly/snapshots
     */
    async listSnapshots(
      params: {
        year: number;
        month: number;
        classId?: string;
        studentId?: string;
        specializationId?: string;
        page?: number;
        limit?: number;
      },
    ): Promise<{ data: MonthlyReportSnapshotMetadata[]; meta: any }> {
      const response = await apiClient.get<ApiEnvelope<MonthlyReportSnapshotMetadata[]>>(
        "/learning/teacher/reports/monthly/snapshots",
        { params },
      );
      return unwrapList(response);
    },

    /**
     * Xem nội dung một bản lưu đã chốt
     * GET /api/v1/learning/teacher/reports/monthly/snapshots/:id
     */
    async getSnapshot(
      id: string,
      page = 1,
      limit = 20,
    ): Promise<{ data: MonthlyReportSnapshotDetail; meta: any }> {
      const response = await apiClient.get<ApiEnvelope<MonthlyReportSnapshotDetail>>(
        `/learning/teacher/reports/monthly/snapshots/${id}`,
        { params: { page, limit } },
      );
      return {
        data: unwrapData(response),
        meta: (response.data as any)?.meta || { page, limit, total: 0, totalPages: 1 },
      };
    },

    /**
     * Xuất Excel bản lưu báo cáo tháng đã chốt
     * GET /api/v1/learning/teacher/reports/monthly/snapshots/:id/export
     */
    async exportSnapshot(id: string): Promise<Blob> {
      const response = await apiClient.get(
        `/learning/teacher/reports/monthly/snapshots/${id}/export`,
        {
          responseType: "blob",
          timeout: 600_000,
        },
      );
      return response.data;
    },
  },
};
