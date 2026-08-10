// ============================================================
// Learning CMS — Shared Constants
// ============================================================
// Centralise every lookup table and static list so every
// consumer (tab, modal, helper) reads from a single source of
// truth.  No API calls or React hooks belong here.
// ============================================================

export interface QuestionTypeOption {
  value: string;
  label: string;
}

export const QUESTION_TYPES: QuestionTypeOption[] = [
  { value: "multiple_choice",       label: "Trắc nghiệm (Multiple Choice)" },
  { value: "audio_choice",          label: "Nghe & Chọn (Audio Choice)" },
  { value: "image_choice",          label: "Ảnh & Chọn (Image Choice)" },
  { value: "word_ordering",         label: "Sắp xếp từ (Word Ordering)" },
  { value: "reading_comprehension", label: "Đọc hiểu (Reading Comprehension)" },
  { value: "sentence_rewrite",      label: "Viết lại câu (Sentence Rewrite)" },
  { value: "hint_rewrite",          label: "Gợi ý viết lại (Hint Rewrite)" },
  { value: "error_correction",      label: "Sửa lỗi (Error Correction)" },
  { value: "matching",              label: "Ghép đôi (Matching)" },
];

export const QUESTION_TYPE_LABELS: Record<string, string> = {
  multiple_choice:       "Trắc nghiệm",
  audio_choice:          "Nghe & Chọn",
  image_choice:          "Ảnh & Chọn",
  word_ordering:         "Sắp xếp từ",
  reading_comprehension: "Đọc hiểu",
  sentence_rewrite:      "Viết lại câu",
  hint_rewrite:          "Gợi ý viết lại",
  error_correction:      "Sửa lỗi",
  matching:              "Ghép đôi",
};

export const QUESTION_TYPE_COLORS: Record<string, string> = {
  multiple_choice:       "blue",
  audio_choice:          "cyan",
  image_choice:          "geekblue",
  word_ordering:         "purple",
  reading_comprehension: "magenta",
  sentence_rewrite:      "orange",
  hint_rewrite:          "gold",
  error_correction:      "red",
  matching:              "lime",
};

/**
 * Question types that use an `options[]` array for their answers.
 * All others use the `detail` object for correct-answer storage.
 */
export const CHOICE_TYPES: string[] = [
  "multiple_choice",
  "audio_choice",
  "image_choice",
  "reading_comprehension",
];

// ── Pagination defaults ──────────────────────────────────────
export const PAGE_SIZE_DEFAULT   = 15;
export const PAGE_SIZE_QUESTIONS = 10;
export const PAGE_SIZE_PASSAGES  = 8;

// ── API list limit (prevents unbounded queries) ──────────────
export const LIST_LIMIT = 100;
