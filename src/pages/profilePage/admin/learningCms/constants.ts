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
  { value: "audio_fill_blanks",     label: "Nghe & Điền từ (Audio Fill in Blanks)" },
  { value: "image_choice",          label: "Ảnh & Chọn (Image Choice)" },
  { value: "audio_image_choice",    label: "Nghe & Chọn ảnh (Audio Image Choice)" },
  { value: "true_false",            label: "Đúng / Sai (True / False)" },
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
  audio_fill_blanks:     "Nghe & Điền từ",
  image_choice:          "Ảnh & Chọn",
  audio_image_choice:    "Nghe & Chọn ảnh",
  true_false:            "Đúng / Sai",
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
  audio_fill_blanks:     "teal",
  image_choice:          "geekblue",
  audio_image_choice:    "purple",
  true_false:            "volcano",
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
  "audio_image_choice",
  "true_false",
  "reading_comprehension",
];

// ── Pagination defaults ──────────────────────────────────────
export const PAGE_SIZE_DEFAULT     = 20;
export const PAGE_SIZE_QUESTIONS   = 20;
export const PAGE_SIZE_PASSAGES    = 20;
export const PAGE_SIZE_EXAMS       = 20;
export const PAGE_SIZE_CURRICULUMS = 20;
export const PAGE_SIZE_MEDIA       = 20;
export const PAGE_SIZE_TAXONOMY    = 20;
export const PAGE_SIZE_OPTIONS     = ["10", "20", "50", "100"];

// ── API list limit (prevents unbounded queries) ──────────────
export const LIST_LIMIT = 100;
