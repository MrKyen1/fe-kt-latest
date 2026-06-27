import { ApiEnvelope } from "../types/api";
import {
  CreateCurriculumRequest,
  CreateExamRequest,
  CreateQuestionRequest,
  Curriculum,
  Exam,
  LearningTaxonomy,
  MediaAsset,
  Question,
  ReadingPassage,
  UpdateCurriculumRequest,
  UpdateExamRequest,
  UpdateQuestionRequest,
} from "../types/backend";
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

function paginatedCrud<TItem, TCreate = Partial<TItem>, TUpdate = Partial<TCreate>>(
  path: string,
) {
  return {
    async create(payload: TCreate): Promise<TItem> {
      return unwrapData(await apiClient.post<ApiEnvelope<TItem>>(path, payload));
    },

    async list(params?: LearningListQuery) {
      return unwrapList(
        await apiClient.get<ApiEnvelope<TItem[]>>(path, {
          params: normalizeParams(params),
        }),
      );
    },

    async get(id: string): Promise<TItem> {
      return unwrapData(await apiClient.get<ApiEnvelope<TItem>>(`${path}/${id}`));
    },

    async update(id: string, payload: TUpdate): Promise<TItem> {
      return unwrapData(await apiClient.patch<ApiEnvelope<TItem>>(`${path}/${id}`, payload));
    },

    async remove(id: string): Promise<TItem> {
      return unwrapData(await apiClient.delete<ApiEnvelope<TItem>>(`${path}/${id}`));
    },
  };
}

export const learningCmsService = {
  levels: paginatedCrud<LearningTaxonomy>("/learning/levels"),
  skills: paginatedCrud<LearningTaxonomy>("/learning/skills"),
  topics: paginatedCrud<LearningTaxonomy>("/learning/topics"),
  tags: paginatedCrud<LearningTaxonomy>("/learning/tags"),

  mediaAssets: {
    async create(payload: Partial<MediaAsset>): Promise<MediaAsset> {
      return unwrapData(
        await apiClient.post<ApiEnvelope<MediaAsset>>("/learning/media-assets", payload),
      );
    },

    async upload(file: File, altText?: string): Promise<MediaAsset> {
      const formData = new FormData();
      formData.append("file", file);
      if (altText) formData.append("altText", altText);

      return unwrapData(
        await apiClient.post<ApiEnvelope<MediaAsset>>(
          "/learning/media-assets/upload",
          formData,
          { headers: { "Content-Type": "multipart/form-data" } },
        ),
      );
    },

    async list(params?: LearningListQuery & { type?: string }) {
      return unwrapList(
        await apiClient.get<ApiEnvelope<MediaAsset[]>>("/learning/media-assets", {
          params: normalizeParams(params),
        }),
      );
    },

    async get(id: string): Promise<MediaAsset> {
      return unwrapData(
        await apiClient.get<ApiEnvelope<MediaAsset>>(`/learning/media-assets/${id}`),
      );
    },

    async update(id: string, payload: Partial<MediaAsset>): Promise<MediaAsset> {
      return unwrapData(
        await apiClient.patch<ApiEnvelope<MediaAsset>>(`/learning/media-assets/${id}`, payload),
      );
    },

    async remove(id: string): Promise<MediaAsset> {
      return unwrapData(
        await apiClient.delete<ApiEnvelope<MediaAsset>>(`/learning/media-assets/${id}`),
      );
    },
  },

  readingPassages: paginatedCrud<ReadingPassage>("/learning/reading-passages"),

  questions: {
    ...paginatedCrud<Question, CreateQuestionRequest, UpdateQuestionRequest>(
      "/learning/questions",
    ),

    async create(payload: CreateQuestionRequest): Promise<Question> {
      return unwrapData(
        await apiClient.post<ApiEnvelope<Question>>("/learning/questions", payload),
      );
    },

    async list(params?: LearningListQuery) {
      return unwrapList(
        await apiClient.get<ApiEnvelope<Question[]>>("/learning/questions", {
          params: normalizeParams(params),
        }),
      );
    },

    async get(id: string): Promise<Question> {
      return unwrapData(await apiClient.get<ApiEnvelope<Question>>(`/learning/questions/${id}`));
    },

    async update(id: string, payload: UpdateQuestionRequest): Promise<Question> {
      return unwrapData(
        await apiClient.patch<ApiEnvelope<Question>>(`/learning/questions/${id}`, payload),
      );
    },

    async updateStatus(id: string, payload: StatusUpdateRequest): Promise<Question> {
      return unwrapData(
        await apiClient.patch<ApiEnvelope<Question>>(`/learning/questions/${id}/status`, payload),
      );
    },
  },

  exams: {
    ...paginatedCrud<Exam, CreateExamRequest, UpdateExamRequest>("/learning/exams"),

    async updateStatus(id: string, payload: StatusUpdateRequest): Promise<Exam> {
      return unwrapData(
        await apiClient.patch<ApiEnvelope<Exam>>(`/learning/exams/${id}/status`, payload),
      );
    },

    async attachQuestion(examId: string, payload: ExamQuestionMappingRequest): Promise<Exam> {
      return unwrapData(
        await apiClient.post<ApiEnvelope<Exam>>(
          `/learning/exams/${examId}/questions`,
          payload,
        ),
      );
    },

    async updateQuestion(
      examId: string,
      questionId: string,
      payload: Partial<ExamQuestionMappingRequest>,
    ): Promise<Exam> {
      return unwrapData(
        await apiClient.patch<ApiEnvelope<Exam>>(
          `/learning/exams/${examId}/questions/${questionId}`,
          payload,
        ),
      );
    },

    async reorderQuestions(examId: string, payload: ReorderExamQuestionsRequest): Promise<Exam> {
      return unwrapData(
        await apiClient.patch<ApiEnvelope<Exam>>(
          `/learning/exams/${examId}/questions/reorder`,
          payload,
        ),
      );
    },

    async removeQuestion(examId: string, questionId: string): Promise<Exam> {
      return unwrapData(
        await apiClient.delete<ApiEnvelope<Exam>>(
          `/learning/exams/${examId}/questions/${questionId}`,
        ),
      );
    },
  },

  curriculums: {
    ...paginatedCrud<Curriculum, CreateCurriculumRequest, UpdateCurriculumRequest>(
      "/learning/curriculums",
    ),

    async updateStatus(id: string, payload: StatusUpdateRequest): Promise<Curriculum> {
      return unwrapData(
        await apiClient.patch<ApiEnvelope<Curriculum>>(
          `/learning/curriculums/${id}/status`,
          payload,
        ),
      );
    },

    async attachExam(
      curriculumId: string,
      payload: CurriculumExamMappingRequest,
    ): Promise<Curriculum> {
      return unwrapData(
        await apiClient.post<ApiEnvelope<Curriculum>>(
          `/learning/curriculums/${curriculumId}/exams`,
          payload,
        ),
      );
    },

    async updateExam(
      curriculumId: string,
      examId: string,
      payload: Partial<CurriculumExamMappingRequest>,
    ): Promise<Curriculum> {
      return unwrapData(
        await apiClient.patch<ApiEnvelope<Curriculum>>(
          `/learning/curriculums/${curriculumId}/exams/${examId}`,
          payload,
        ),
      );
    },

    async reorderExams(
      curriculumId: string,
      payload: ReorderCurriculumExamsRequest,
    ): Promise<Curriculum> {
      return unwrapData(
        await apiClient.patch<ApiEnvelope<Curriculum>>(
          `/learning/curriculums/${curriculumId}/exams/reorder`,
          payload,
        ),
      );
    },

    async removeExam(curriculumId: string, examId: string): Promise<Curriculum> {
      return unwrapData(
        await apiClient.delete<ApiEnvelope<Curriculum>>(
          `/learning/curriculums/${curriculumId}/exams/${examId}`,
        ),
      );
    },
  },
};
