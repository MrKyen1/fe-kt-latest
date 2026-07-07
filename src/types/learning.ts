import { PaginationQuery } from "./api";

export type QuestionType =
  | "multiple_choice"
  | "audio_choice"
  | "image_choice"
  | "word_ordering"
  | "reading_comprehension"
  | "sentence_rewrite"
  | "hint_rewrite"
  | "error_correction"
  | "matching";

export type LearningStatus = "draft" | "published" | "archived";
export type AssignmentStatus = "active" | "cancelled";
export type AttemptStatus = "in_progress" | "submitted";

export interface LearningListQuery extends PaginationQuery {
  status?: LearningStatus;
  levelId?: string;
  skillId?: string;
  topicId?: string;
  tagIds?: string | string[];
  type?: QuestionType;
  parentId?: string;
}

export interface StatusUpdateRequest {
  status: LearningStatus;
  expectedUpdatedAt?: string;
}

export interface ExamQuestionMappingRequest {
  questionId: string;
  orderIndex?: number;
  // NOTE: `score` bị bỏ — backend v2 chấm cộng dồn (mỗi câu = 1 điểm).
  // Gửi `score` sẽ bị backend từ chối với 400.
}

export interface ReorderExamQuestionsRequest {
  items: Array<{
    questionId: string;
    orderIndex: number;
  }>;
}

export interface CurriculumExamMappingRequest {
  examId: string;
  orderIndex: number;
  isRequired: boolean;
  availableFrom?: string;
  availableUntil?: string;
}

export interface ReorderCurriculumExamsRequest {
  items: Array<{
    examId: string;
    orderIndex: number;
  }>;
}

// ==================== TEACHER ASSIGNMENT TYPES ====================

/** Giao bài thi cho 1 hoặc nhiều học sinh / lớp - nhiều exam 1 lúc */
export interface ExamAssignmentRequest {
  /** Danh sách exam ID (tối thiểu 1) */
  examIds: string[];
  /** ID lớp học (tùy chọn nếu đã có studentIds) */
  classId?: string;
  /** ID học sinh cụ thể (tùy chọn – bỏ trống = toàn bộ lớp) */
  studentIds?: string[];
  /** Số lần làm tối đa (bỏ trống = vĩnh viễn) */
  maxAttempts?: number;
  title?: string;
  instructions?: string;
}

/** Giao giáo trình trực tiếp cho học sinh (không nhất thiết qua lớp) */
export interface CurriculumAssignmentRequest {
  curriculumId: string;
  /** Bắt buộc phải có ít nhất 1 học sinh */
  studentIds: string[];
  /** ID lớp học (tùy chọn) */
  classId?: string;
  /** Số lần làm tối đa (bỏ trống = vĩnh viễn) */
  maxAttempts?: number;
  title?: string;
  instructions?: string;
}

/** Gắn giáo trình vào lớp học (class-curriculum mapping) */
export interface ClassCurriculumRequest {
  classId: string;
  curriculumId: string;
  /** Số lần làm tối đa (bỏ trống = vĩnh viễn) */
  maxAttempts?: number;
}

export interface ClassCurriculumQuery extends PaginationQuery {
  classId?: string;
  curriculumId?: string;
}

export interface TeacherAssignmentQuery extends PaginationQuery {
  classId?: string;
  examId?: string;
  curriculumId?: string;
  studentId?: string;
  status?: AssignmentStatus;
}

export interface SubmitAttemptRequest {
  answers?: Array<{
    questionId: string;
    answer: unknown;
  }>;
}

// ==================== RANDOM QUESTIONS / BULK ATTACH ====================

/** Một nhóm tiêu chí để random câu hỏi */
export interface RandomQuestionCriteria {
  count: number;
  levelId?: string;
  skillId?: string;
  topicId?: string;
  type?: QuestionType;
}

export interface RandomQuestionsRequest {
  criteria: RandomQuestionCriteria[];
}

export interface BulkAttachItem {
  questionId: string;
  orderIndex?: number;
}

export interface BulkAttachQuestionsRequest {
  items: BulkAttachItem[];
}

// ==================== SUBMIT SINGLE ANSWER ====================

export interface SubmitAnswerRequest {
  answer: unknown;
}
