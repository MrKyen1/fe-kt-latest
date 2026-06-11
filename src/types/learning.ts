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
  orderIndex: number;
  score: number;
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

export interface TeacherAssignmentRequest {
  classId: string;
  studentIds?: string[];
  title?: string;
  instructions?: string;
}

export interface ExamAssignmentRequest extends TeacherAssignmentRequest {
  examId: string;
}

export interface CurriculumAssignmentRequest extends TeacherAssignmentRequest {
  curriculumId: string;
}

export interface TeacherAssignmentQuery extends PaginationQuery {
  classId?: string;
  examId?: string;
  curriculumId?: string;
  studentId?: string;
  status?: AssignmentStatus;
}

export interface SubmitAttemptRequest {
  answers: Array<{
    questionId: string;
    answer: unknown;
  }>;
}

