import { ApiEnvelope } from "../types/api";
import {
  CreateCurriculumRequest,
  CreateExamRequest,
  CreateQuestionRequest,
  Curriculum,
  Exam,
  ExamVersion,
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
  RandomQuestionsRequest,
  BulkAttachQuestionsRequest,
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

    async reactivate(id: string): Promise<TItem> {
      return unwrapData(await apiClient.patch<ApiEnvelope<TItem>>(`${path}/${id}/reactivate`));
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

    async listVersions(questionId: string): Promise<any[]> {
      return unwrapData(
        await apiClient.get<ApiEnvelope<any[]>>(
          `/learning/questions/${questionId}/versions`,
        ),
      );
    },

    /**
     * Lấy payload clone câu hỏi (CreateQuestionDto) để điền vào form tạo nhanh.
     * Không tạo bản ghi mới trong DB và không publish.
     */
    async duplicate(id: string): Promise<CreateQuestionRequest> {
      return unwrapData(
        await apiClient.post<ApiEnvelope<CreateQuestionRequest>>(
          `/learning/questions/${id}/duplicate`,
        ),
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

    /**
     * Random câu hỏi theo nhóm tiêu chí (preview — KHÔNG ghi DB).
     * Hỗ trợ cả 2 phương án của Backend:
     *   1. POST /learning/exams/:examId/random-questions (nếu có examId)
     *   2. POST /learning/exams/random-questions (endpoint chung kèm fallback tự động)
     */
    async randomQuestions(payload: RandomQuestionsRequest, examId?: string) {
      type RandomResponse = ApiEnvelope<{
        totalCount: number;
        items: Array<{ questionId: string; orderIndex: number }>;
        groups: Array<{
          index: number;
          filters: Record<string, unknown>;
          requested: number;
          returned: number;
          questions: Array<{
            orderIndex: number;
            id: string;
            specializationId?: string;
            prompt: string;
            type: string;
            options: unknown[];
          }>;
        }>;
      }>;

      // Sanitize criteria: backend DTO (RandomCriterionDto) strictly validates:
      // only count, levelId, type, topicId, skillId, tagId are permitted.
      // specializationId is automatically inferred by backend from the exam context and must NOT be sent in criteria.
      const cleanPayload: RandomQuestionsRequest = {
        criteria: (payload.criteria || []).map((c) => {
          const item: any = { count: Number(c.count) || 1 };
          if (c.levelId) item.levelId = c.levelId;
          if (c.type) item.type = c.type;
          if (c.topicId) item.topicId = c.topicId;
          if (c.skillId) item.skillId = c.skillId;
          if (c.tagId) item.tagId = c.tagId;
          return item;
        }),
      };

      // Phương án 1: Nếu có examId, gọi endpoint theo context bài thi: /learning/exams/${examId}/random-questions
      if (examId) {
        try {
          const res = await apiClient.post<RandomResponse>(
            `/learning/exams/${examId}/random-questions`,
            cleanPayload,
          );
          return unwrapData(res);
        } catch (err: any) {
          const status = err?.response?.status ?? err?.status;
          // Nếu backend chưa có endpoint này (404/405), tiếp tục thử phương án 2
          if (status !== 404 && status !== 405) {
            throw err;
          }
        }
      }

      // Phương án 2: Endpoint chung /learning/exams/random-questions
      const res = await apiClient.post<RandomResponse>(
        "/learning/exams/random-questions",
        cleanPayload,
      );
      return unwrapData(res);
    },

    /**
     * Bulk attach câu hỏi vào exam (lưu bộ câu vào DB).
     * Dùng kết hợp với randomQuestions: truyền data.items từ response random.
     */
    async bulkAttachQuestions(examId: string, payload: BulkAttachQuestionsRequest): Promise<Exam> {
      return unwrapData(
        await apiClient.post<ApiEnvelope<Exam>>(
          `/learning/exams/${examId}/questions/bulk`,
          payload,
        ),
      );
    },

    /**
     * Lấy danh sách version đã publish của exam.
     * GET /learning/exams/{id}/versions
     * Dùng để hiển thị dropdown chọn version khi giao bài (nếu cần).
     */
    async listVersions(examId: string): Promise<ExamVersion[]> {
      return unwrapData(
        await apiClient.get<ApiEnvelope<ExamVersion[]>>(
          `/learning/exams/${examId}/versions`,
        ),
      );
    },
  },

  questionVersions: {
    async regrade(questionVersionId: string, correctAnswer: Record<string, unknown>) {
      return unwrapData(
        await apiClient.post<ApiEnvelope<{
          questionVersionId: string;
          regradedAnswers: number;
          affectedAttempts: number;
        }>>(`/learning/question-versions/${questionVersionId}/regrade`, { correctAnswer }),
      );
    },
  },

  curriculums: {
    ...paginatedCrud<Curriculum, CreateCurriculumRequest, UpdateCurriculumRequest>(
      "/learning/curriculums",
    ),

    async popular(limit: number = 5): Promise<Curriculum[]> {
      return unwrapData(
        await apiClient.get<ApiEnvelope<Curriculum[]>>("/learning/curriculums/popular", {
          params: { limit },
        }),
      );
    },

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
