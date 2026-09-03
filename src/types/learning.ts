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
  /**
   * Danh sách exam cần giao. Bỏ trống `examVersionId` = pin bản published mới nhất.
   * (Thay thế `examIds: string[]` cũ)
   */
  exams: Array<{ examId: string; examVersionId?: string }>;
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
  tagId?: string;
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

// ==================== LEADERBOARD ====================

export type LeaderboardScope = "class" | "assignment" | "curriculum" | "center" | "global";
export type LeaderboardMetric = "mastery" | "accuracy" | "progress";
export type LeaderboardPeriod = "all_time" | "month" | "week";
export type LeaderboardSource = "all" | "assigned" | "self_study";

export interface LeaderboardQuery {
  scope: LeaderboardScope;
  /** Bắt buộc trừ khi scope=global */
  scopeId?: string;
  /** Bắt buộc khi scope=center hoặc global */
  specializationId?: string;
  metric?: LeaderboardMetric;
  period?: LeaderboardPeriod;
  source?: LeaderboardSource;
  page?: number;
  limit?: number;
}

export interface LeaderboardStudent {
  id: string;
  code: string;
  fullName: string;
}

export interface LeaderboardEntry {
  rank: number;
  studentId: string;
  student: LeaderboardStudent;
  masteryTotal: number | null;
  avgAccuracy: number | null;
  progressGained: number | null;
  examsCounted: number;
  lastSubmittedAt: string | null;
  /** true nếu đây là chính người đang xem */
  isMe?: boolean;
}

export interface LeaderboardViewer {
  rank: number | null;
  studentId: string;
  student: LeaderboardStudent;
  masteryTotal: number | null;
  avgAccuracy: number | null;
  progressGained: number | null;
  examsCounted: number;
  lastSubmittedAt: string | null;
  /** accuracy: examsCounted ≥ minExamsRequired; progress: progressGained > 0 */
  qualified: boolean;
  /** accuracy: số bài còn thiếu để đủ điều kiện */
  examsNeeded: number;
}

export interface LeaderboardData {
  scope: LeaderboardScope;
  scopeId: string | null;
  specializationId: string | null;
  metric: LeaderboardMetric;
  period: LeaderboardPeriod;
  source: LeaderboardSource;
  windowFrom: string | null;
  windowTo: string | null;
  /** Ngưỡng số bài cho bảng accuracy */
  minExamsRequired: number;
  generatedAt: string;
  entries: LeaderboardEntry[];
  /** null khi người xem là giáo viên/admin */
  viewer: LeaderboardViewer | null;
}

// Leaderboard Scopes
export interface LeaderboardScopeClass {
  id: string;
  name: string;
  specializationId: string;
  subjectName: string;
  centerId: string;
  centerName: string;
}

export interface LeaderboardScopeCenter {
  id: string;
  name: string;
  subjects: Array<{ id: string; name: string }>;
}

export interface LeaderboardScopeCurriculum {
  id: string;
  title: string;
  specializationId: string;
  subjectName: string;
}

export interface LeaderboardScopeAssignment {
  id: string;
  title?: string;
}

export interface LeaderboardScopeSubject {
  id: string;
  name: string;
}

export interface LeaderboardScopes {
  classes: LeaderboardScopeClass[];
  centers: LeaderboardScopeCenter[];
  curriculums: LeaderboardScopeCurriculum[];
  assignments: LeaderboardScopeAssignment[];
  subjects: LeaderboardScopeSubject[];
}

// Leaderboard Summary (hạng cá nhân trên cả 3 bảng)
export interface LeaderboardSummaryCard {
  rank: number | null;
  value: number | null;
  examsCounted: number;
  qualified: boolean;
  examsNeeded: number;
}

export interface LeaderboardSummary {
  scope: LeaderboardScope;
  scopeId: string | null;
  specializationId: string | null;
  period: LeaderboardPeriod;
  generatedAt: string;
  mastery: LeaderboardSummaryCard | null;
  accuracy: LeaderboardSummaryCard | null;
  /** null khi period=all_time */
  progress: LeaderboardSummaryCard | null;
}

export interface LeaderboardSummaryQuery {
  scope: LeaderboardScope;
  scopeId?: string;
  specializationId?: string;
  period?: LeaderboardPeriod;
  source?: LeaderboardSource;
}
