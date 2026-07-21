import { PaginationQuery } from "./api";
import {
  AssignmentStatus,
  AttemptStatus,
  LearningListQuery,
  LearningStatus,
  QuestionType,
} from "./learning";

export interface Role {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive?: boolean;
  permissions?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface RolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  role?: Role;
  permission?: Permission;
  isActive?: boolean;
}

export interface RolePermissionMatrix {
  roles: Role[];
  permissions: Permission[];
  assignments: Array<{
    roleId: string;
    permissionId: string;
  }>;
}

export interface User {
  id: string;
  code: string;
  fullName?: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  address?: string;
  avatar?: string;
  isActive?: boolean;
  roleId?: string;
  role?: Role;
  citizenId?: string | null;
  teacherProfile?: TeacherProfile;
  studentProfile?: StudentProfile;
  startDate?: string;
  endDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TeacherProfile {
  id?: string;
  yearsOfExperience?: number;
  description?: string;
  bankAccountNumber?: string;
  bankName?: string;
  insuranceStartDate?: string | null;
  employmentType?: "full_time" | "part_time" | null;
  degrees?: Array<{
    id: string;
    name: string;
    orderIndex: number;
    images: Array<{
      id: string;
      url: string;
      orderIndex: number;
    }>;
  }>;
  classIds?: string[];
  specializationIds?: string[];
  classes?: ClassRoom[];
  specializations?: Specialization[];
}

export interface StudentProfile {
  id?: string;
  parentFullName?: string;
  classIds?: string[];
  classes?: ClassRoom[];
}

export interface CreateUserRequest {
  password?: string;
  fullName: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  address?: string;
  roleId: string;
  avatar?: string;
  startDate: string;
  citizenId?: string | null;
  teacherProfile?: {
    yearsOfExperience?: number;
    description: string;
    bankAccountNumber: string;
    bankName: string;
    insuranceStartDate?: string | null;
    employmentType?: "full_time" | "part_time" | null;
    classIds: string[];
    specializationIds: string[];
    degrees?: Array<{
      name: string;
      imageUrls: string[];
    }>;
  };
  studentProfile?: {
    parentFullName?: string;
    classIds: string[];
  };
}

export type UpdateUserRequest = Partial<Omit<CreateUserRequest, "password">> & {
  password?: string;
  isActive?: boolean;
  endDate?: string | null;
};

export interface CenterImage {
  id: string;
  centerId: string;
  url: string;
  orderIndex: number;
  isActive: boolean;
}

export interface Center {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  description?: string;
  image?: string;         // Ảnh đại diện chính
  images?: CenterImage[]; // [Mới] Danh sách ảnh phụ
  mapEmbedUrl?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClassRoom {
  id: string;
  name: string;
  centerId?: string;
  center?: Center;
  specializationId?: string;
  description?: string;
  image?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Specialization {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCenterRequest extends Omit<Center, "id" | "isActive" | "createdAt" | "updatedAt" | "images"> {
  images?: string[]; // Gửi danh sách URL dạng string[] lên BE
}

export type UpdateCenterRequest = Partial<CreateCenterRequest> & { isActive?: boolean };
export type CreateClassRequest = Omit<ClassRoom, "id" | "center" | "isActive" | "createdAt" | "updatedAt">;
export type UpdateClassRequest = Partial<CreateClassRequest> & { isActive?: boolean };
export type CreateSpecializationRequest = Omit<
  Specialization,
  "id" | "isActive" | "createdAt" | "updatedAt"
>;
export type UpdateSpecializationRequest = Partial<CreateSpecializationRequest> & {
  isActive?: boolean;
};

export interface LearningTaxonomy {
  id: string;
  code: string;
  name: string;
  rank?: number;
  parentId?: string;
  description?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface MediaAsset {
  id: string;
  type: "image" | "audio" | "video" | string;
  url: string;
  storageKey?: string;
  mimeType?: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
  altText?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReadingPassage {
  id: string;
  title: string;
  content: string;
  source?: string;
  levelId?: string;
  level?: LearningTaxonomy;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface QuestionOption {
  id?: string;
  label?: string;
  content: string;
  isCorrect?: boolean;
  orderIndex?: number;
  explanation?: string;
}

export interface QuestionMediaMapping {
  mediaId: string;
  role:
    | "prompt_audio"
    | "prompt_image"
    | "explanation_audio"
    | "explanation_image"
    | "attachment"
    | string;
  orderIndex?: number;
}

export interface Question {
  id: string;
  specializationId?: string;
  type: QuestionType;
  prompt: string;
  instruction?: string;
  explanation?: string;
  difficultyLevelId?: string;
  skillId?: string;
  topicId?: string;
  tagIds?: string[];
  status: LearningStatus;
  options?: QuestionOption[];
  mediaIds?: QuestionMediaMapping[];
  media?: MediaAsset[];
  detail?: Record<string, unknown>;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type CreateQuestionRequest = Omit<
  Question,
  "id" | "media" | "isActive" | "createdAt" | "updatedAt"
>;
export type UpdateQuestionRequest = Partial<CreateQuestionRequest> & {
  expectedUpdatedAt?: string;
};

export interface ExamVersion {
  id: string;
  versionNumber: number;
  title?: string;
  timeLimitSeconds?: number;
  questionCount?: number;
  isCurrent?: boolean;
  createdAt?: string;
}

export interface Exam {
  id: string;
  specializationId?: string;
  code: string;
  title: string;
  description?: string;
  timeLimitSeconds?: number;
  /** ID của version được publish hiện tại */
  currentVersionId?: string;
  /** true khi exam đã sửa sau publish, cần republish */
  hasUnpublishedChanges?: boolean;
  status: LearningStatus;
  questions?: Question[];
  examQuestions?: Array<{
    questionId: string;
    orderIndex: number;
    score: number;
    question?: Question;
  }>;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Curriculum {
  id: string;
  specializationId?: string;
  code: string;
  title: string;
  description?: string;
  levelId?: string;
  level?: LearningTaxonomy;
  status: LearningStatus;
  exams?: Array<{
    examId: string;
    orderIndex: number;
    isRequired: boolean;
    availableFrom?: string;
    availableUntil?: string;
    exam?: Exam;
  }>;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type CreateExamRequest = Omit<
  Exam,
  "id" | "questions" | "examQuestions" | "isActive" | "createdAt" | "updatedAt"
>;
export type UpdateExamRequest = Partial<CreateExamRequest> & { expectedUpdatedAt?: string };
export type CreateCurriculumRequest = Omit<
  Curriculum,
  "id" | "level" | "exams" | "isActive" | "createdAt" | "updatedAt"
>;
export type UpdateCurriculumRequest = Partial<CreateCurriculumRequest> & {
  expectedUpdatedAt?: string;
};

export interface TeacherAssignment {
  id: string;
  title?: string;
  instructions?: string;
  classId?: string;
  class?: ClassRoom;
  teacherId?: string;
  studentIds?: string[];
  maxAttempts?: number | null;
  status: AssignmentStatus;
  isActive?: boolean;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface ExamAssignment extends TeacherAssignment {
  /**
   * Multiple exams per assignment (v2 API).
   * List/Detail trả `exams: [{ examId, examVersionId, orderIndex, isRequired, exam }]`.
   */
  exams?: Array<{
    examId: string;
    examVersionId?: string;
    orderIndex?: number;
    isRequired?: boolean;
    exam?: Exam;
  }>;
  /** Legacy single-exam fallback (có thể vẫn được trả trong một số context) */
  examId?: string;
  exam?: Exam;
}

export interface CurriculumAssignment extends TeacherAssignment {
  curriculumId: string;
  curriculum?: Curriculum;
}

export interface StudentExamAssignment {
  /** assignmentStudentId (dùng để start attempt) */
  id: string;
  assignmentId?: string;
  assignment?: ExamAssignment;
  class?: ClassRoom;
  /** Mỗi exam trong assignment có progress riêng */
  exams?: Array<{
    examId: string;
    exam?: Exam;
    attemptsCount?: number;
    bestScore?: string | null;
    bestPercentage?: string | null;
    status?: string;
    maxAttempts?: number | null;
  }>;
  /** Điểm tiến tổng assignment */
  progressPercentage?: string;
  completedExamsCount?: number;
  totalExamsCount?: number;
  maxAttempts?: number | null;
  /** Legacy single-exam summary */
  exam?: Exam;
  summary?: {
    attemptsCount?: number;
    bestScore?: string;
    bestPercentage?: string;
  };
}

/**
 * Student curriculum access record.
 * Returned by GET /learning/student/curriculums and /student/curriculums/:curriculumId
 * Both class-grant and direct-enrollment cases are merged by backend.
 */
export interface StudentCurriculumAssignment {
  /** The curriculum ID (use for startAttempt API) */
  curriculumId: string;
  /** 'class' | 'direct' */
  accessType?: string;
  /** null if accessed via class grant (lazy enrollment) */
  enrollmentId?: string | null;
  status?: string;
  assignedAt?: string | null;
  progressPercentage?: string;
  completedExamsCount?: number;
  totalRequiredExamsCount?: number;
  maxAttempts?: number | null;
  isActive?: boolean;
  curriculum?: Curriculum;
  /** Exam progress list (populated on detail endpoint) */
  exams?: Array<{
    examId: string;
    curriculumExamId?: string;
    orderIndex?: number;
    isRequired?: boolean;
    status?: string;
    attemptsCount?: number;
    bestScore?: string | null;
    bestPercentage?: string | null;
    lastAttemptId?: string | null;
    completedAt?: string | null;
    exam?: Exam;
    curriculumExam?: { id: string; orderIndex: number; isRequired: boolean };
  }>;
}

export interface AttemptAnswer {
  id?: string;
  questionId: string;
  questionType?: QuestionType;
  orderIndex?: number;
  question?: {
    prompt?: string;
    instruction?: string;
    options?: QuestionOption[];
    media?: Array<MediaAsset | { media?: MediaAsset; url?: string; type?: string }>;
    detail?: Record<string, unknown>;
  };
  answer?: unknown;
  correctAnswer?: unknown;
  score?: string;
  maxScore?: string;
  isCorrect?: boolean;
  /** Thời điểm student đã submit câu này. Khác null = câu đã bị khóa, không submit lại được. */
  answeredAt?: string | null;
  feedback?: Record<string, unknown>;
}

export interface Attempt {
  id: string;
  assignmentId?: string | null;
  curriculumAssignmentStudentId?: string | null;
  examId: string;
  exam?: Exam;
  studentId?: string;
  attemptNumber?: number;
  status: AttemptStatus;
  startedAt?: string;
  submittedAt?: string | null;
  durationSeconds?: number | null;
  timeLimitSecondsSnapshot?: number | null;
  score?: string;
  maxScore?: string;
  percentage?: string;
  /** Ví dụ: "8/10" — dùng để hiển thị kết quả sau nộp bài */
  displayResult?: string;
  /** Tổng số câu của exam */
  totalQuestions?: number;
  /** Số câu xuất hiện trong attempt này */
  attemptQuestionCount?: number;
  /** Số câu đúng trong attempt này */
  attemptCorrectCount?: number;
  /** Số câu sai trong attempt này */
  attemptWrongCount?: number;
  /** Số câu chưa làm trong attempt này */
  attemptUnansweredCount?: number;
  /** Tổng câu đúng cộng dồn từ tất cả submitted attempts cùng scope */
  cumulativeCorrectCount?: number;
  gradingStatus?: string;
  answers?: AttemptAnswer[];
}

export interface ExamAssignmentAnalytics {
  assignedCount: number;
  submittedCount: number;
  attemptsCount: number;
  averageScore: number;
  bestScore: number;
  averagePercentage: number;
  bestPercentage: number;
  scoreDistribution: Record<string, number>;
  perQuestion: Array<{
    questionId: string;
    total: number;
    correct: number;
    correctnessRate: number;
  }>;
}

export interface CurriculumAssignmentAnalytics {
  assignedCount: number;
  completedCount: number;
  inProgressCount: number;
  averageProgress: number;
}

export interface RequestLog {
  id: string;
  requestId?: string;
  method?: string;
  statusCode?: number;
  path?: string;
  userId?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  requestId?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface UserListQuery {
  isActive?: boolean;
  search?: string;
  code?: string;
  phone?: string;
  email?: string;
  roleId?: string;
  roleCode?: string;
  classId?: string;
  centerId?: string;
  specializationId?: string;
  /** Phân trang */
  page?: number;
  limit?: number;
}

export interface LogQuery extends PaginationQuery {
  requestId?: string;
  method?: string;
  statusCode?: number;
  path?: string;
  userId?: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  from?: string;
  to?: string;
}

export interface LearningCmsServices {
  list(params?: LearningListQuery): Promise<unknown>;
}
