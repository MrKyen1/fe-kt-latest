import { ApiEnvelope } from "../types/api";
import {
  CurriculumExamMappingRequest,
  ExamQuestionMappingRequest,
  LearningListQuery,
  ReorderCurriculumExamsRequest,
  ReorderExamQuestionsRequest,
  StatusUpdateRequest,
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

function paginatedCrud(path: string) {
  return {
    async create(payload: unknown) {
      return unwrapData(await apiClient.post<ApiEnvelope<unknown>>(path, payload));
    },

    async list(params?: LearningListQuery) {
      return unwrapList(
        await apiClient.get<ApiEnvelope<unknown[]>>(path, {
          params: normalizeParams(params),
        }),
      );
    },

    async get(id: string) {
      return unwrapData(await apiClient.get<ApiEnvelope<unknown>>(`${path}/${id}`));
    },

    async update(id: string, payload: unknown) {
      return unwrapData(await apiClient.patch<ApiEnvelope<unknown>>(`${path}/${id}`, payload));
    },

    async remove(id: string) {
      return unwrapData(await apiClient.delete<ApiEnvelope<unknown>>(`${path}/${id}`));
    },
  };
}

export const learningCmsService = {
  levels: paginatedCrud("/learning/levels"),
  skills: paginatedCrud("/learning/skills"),
  topics: paginatedCrud("/learning/topics"),
  tags: paginatedCrud("/learning/tags"),

  mediaAssets: {
    async create(payload: unknown) {
      return unwrapData(
        await apiClient.post<ApiEnvelope<unknown>>("/learning/media-assets", payload),
      );
    },

    async upload(file: File, altText?: string) {
      const formData = new FormData();
      formData.append("file", file);
      if (altText) formData.append("altText", altText);

      return unwrapData(
        await apiClient.post<ApiEnvelope<unknown>>(
          "/learning/media-assets/upload",
          formData,
          { headers: { "Content-Type": "multipart/form-data" } },
        ),
      );
    },

    async list(params?: LearningListQuery & { type?: string }) {
      return unwrapList(
        await apiClient.get<ApiEnvelope<unknown[]>>("/learning/media-assets", {
          params: normalizeParams(params),
        }),
      );
    },

    async get(id: string) {
      return unwrapData(
        await apiClient.get<ApiEnvelope<unknown>>(`/learning/media-assets/${id}`),
      );
    },

    async update(id: string, payload: unknown) {
      return unwrapData(
        await apiClient.patch<ApiEnvelope<unknown>>(`/learning/media-assets/${id}`, payload),
      );
    },

    async remove(id: string) {
      return unwrapData(
        await apiClient.delete<ApiEnvelope<unknown>>(`/learning/media-assets/${id}`),
      );
    },
  },

  readingPassages: paginatedCrud("/learning/reading-passages"),

  questions: {
    ...paginatedCrud("/learning/questions"),

    async updateStatus(id: string, payload: StatusUpdateRequest) {
      return unwrapData(
        await apiClient.patch<ApiEnvelope<unknown>>(`/learning/questions/${id}/status`, payload),
      );
    },
  },

  exams: {
    ...paginatedCrud("/learning/exams"),

    async updateStatus(id: string, payload: StatusUpdateRequest) {
      return unwrapData(
        await apiClient.patch<ApiEnvelope<unknown>>(`/learning/exams/${id}/status`, payload),
      );
    },

    async attachQuestion(examId: string, payload: ExamQuestionMappingRequest) {
      return unwrapData(
        await apiClient.post<ApiEnvelope<unknown>>(
          `/learning/exams/${examId}/questions`,
          payload,
        ),
      );
    },

    async updateQuestion(
      examId: string,
      questionId: string,
      payload: Partial<ExamQuestionMappingRequest>,
    ) {
      return unwrapData(
        await apiClient.patch<ApiEnvelope<unknown>>(
          `/learning/exams/${examId}/questions/${questionId}`,
          payload,
        ),
      );
    },

    async reorderQuestions(examId: string, payload: ReorderExamQuestionsRequest) {
      return unwrapData(
        await apiClient.patch<ApiEnvelope<unknown>>(
          `/learning/exams/${examId}/questions/reorder`,
          payload,
        ),
      );
    },

    async removeQuestion(examId: string, questionId: string) {
      return unwrapData(
        await apiClient.delete<ApiEnvelope<unknown>>(
          `/learning/exams/${examId}/questions/${questionId}`,
        ),
      );
    },
  },

  curriculums: {
    ...paginatedCrud("/learning/curriculums"),

    async updateStatus(id: string, payload: StatusUpdateRequest) {
      return unwrapData(
        await apiClient.patch<ApiEnvelope<unknown>>(
          `/learning/curriculums/${id}/status`,
          payload,
        ),
      );
    },

    async attachExam(curriculumId: string, payload: CurriculumExamMappingRequest) {
      return unwrapData(
        await apiClient.post<ApiEnvelope<unknown>>(
          `/learning/curriculums/${curriculumId}/exams`,
          payload,
        ),
      );
    },

    async updateExam(
      curriculumId: string,
      examId: string,
      payload: Partial<CurriculumExamMappingRequest>,
    ) {
      return unwrapData(
        await apiClient.patch<ApiEnvelope<unknown>>(
          `/learning/curriculums/${curriculumId}/exams/${examId}`,
          payload,
        ),
      );
    },

    async reorderExams(curriculumId: string, payload: ReorderCurriculumExamsRequest) {
      return unwrapData(
        await apiClient.patch<ApiEnvelope<unknown>>(
          `/learning/curriculums/${curriculumId}/exams/reorder`,
          payload,
        ),
      );
    },

    async removeExam(curriculumId: string, examId: string) {
      return unwrapData(
        await apiClient.delete<ApiEnvelope<unknown>>(
          `/learning/curriculums/${curriculumId}/exams/${examId}`,
        ),
      );
    },
  },
};

