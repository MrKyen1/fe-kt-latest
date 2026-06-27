export type QuestionType =
  | "multiple_choice"
  | "audio_choice"
  | "image_choice"
  | "word_ordering"
  | "reading_comprehension"
  | "sentence_rewrite"
  | "hint_rewrite"
  | "error_correction"
  | "matching"
  | "multiple-choice"
  | "listening"
  | "word-ordering"
  | "true-false"
  | "fill-in-the-blank";

export interface ExamMedia {
  type: "image" | "audio" | "video";
  url: string;
}

export interface ExamOption {
  id?: string;
  label?: string;
  content: string;
  orderIndex?: number;
}

export interface ExamQuestion {
  id: string;
  type: QuestionType;
  passage?: string;
  questionContent: string;
  media?: ExamMedia | ExamMedia[];
  options?: Array<string | ExamOption>; // For choice, true/false, word ordering


  
  leftItems?: Array<string | { id: string; text: string }>;
  rightItems?: Array<string | { id: string; text: string }>;

  correctAnswer?: string | string[] | Record<string, string>;

  explanation?: string;
  
}

export interface ExamData {
  id: string;
  title: string;
  timeLimit: number; // in seconds
  status?: "in_progress" | "submitted";
  score?: string;
  maxScore?: string;
  percentage?: string;
  questions: ExamQuestion[];
}

export interface ExamState {
  currentQuestionIndex: number;
  userAnswers: Record<string, string | string[] | Record<string, string>>;
  isFinished: boolean;
  timeRemaining: number;
  showFeedback: boolean;
}

/* ===================== ADMIN TYPES ===================== */

export interface Student {
  id: string;
  username?: string;
  email?: string;
  fullName: string;
  createdAt?: string;
  status: 'active' | 'inactive';
  birthYear?: number;
  phone?: string;
  address?: string;
  branch?: string;
  class?: string;
  startDate?: string;
  endDate?: string;
  // Removed progress field as requested
  // New ranking fields
  totalTimeSpent?: number; // in minutes
  correctAnswers?: number;
  totalExams?: number;
}

export interface Teacher {
  id: string | number;
  name: string;
  subject: string;
  image: string;
  desc: string;
  email?: string;
  experience?: number;
}

export interface Course {
  id: string;
  title: string;
  subCourses: SubCourse[];
}

export interface SubCourse {
  id: string;
  title: string;
  image: string;
}

export interface Exam {
  id: string;
  title: string;
  timeLimit: number;
}

export interface AboutUs {
  mission: string;
  vision: string;
  studentsCount: number;
  coursesCount: number;
}

export * from "./api";
export * from "./auth";
export * from "./backend";
export * from "./learning";
