import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { QuestionCard } from "./QuestionCard";
import { ExamData } from "../../types";
import { ClockCircleOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import logoImg from "../../assets/logo/logo.png";
import { motion, AnimatePresence } from "framer-motion";
import { Modal, Button, message, Tag, Progress } from "antd";
import {
  Trophy,
  ChevronDown,
  ChevronUp,
  History,
  User,
  RotateCcw,
  BookOpen,
  ArrowLeft,
  ClipboardList,
  Target,
  Award,
  CheckCircle2,
} from "lucide-react";
import AttemptHistoryModal from "../../components/AttemptHistoryModal";
import { studentLearningService } from "../../services/studentLearningService";
import { resolveMediaUrl } from "../../services/apiClient";
import { parseBackendAnswer } from "./ExamDetail";
import { formatScore, formatPercentage, formatStudentExamScoreDisplay } from "../../utils/studentExamUtils";
import { createAttemptDraftSaver, type DraftSaveState } from "../../utils/attemptDraftSaver";

const formatDateTime = (iso?: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const percentColor = (pct?: string | number) => {
  const n = parseFloat(String(pct ?? "0"));
  if (n >= 80) return "#10b981";
  if (n >= 50) return "#f59e0b";
  return "#ef4444";
};

const normalizeExplanationMediaList = (mediaList: any[]): any[] => {
  if (!Array.isArray(mediaList)) return [];
  return mediaList
    .map((item: any) => {
      const m = item?.media || item;
      const url = m?.url || (typeof m === "string" ? m : null);
      if (!url) return null;
      const role = item?.role || m?.role || "explanation_image";
      const isAudio =
        m?.type === "audio" ||
        role === "explanation_audio" ||
        /\.(mp3|wav|ogg|m4a|aac)$/i.test(url);
      return {
        type: isAudio ? "audio" : "image",
        url: resolveMediaUrl(url),
        role,
      };
    })
    .filter(Boolean);
};

interface ExamContainerProps {
  examData: ExamData;
}

type AnswerValue = string | string[] | Record<string, string>;

// checkIsCorrect được giữ lại chỉ dùng để hiển thị optimistic UI trước khi BE trả kết quả.
// Kết quả thực tế luôn lấy từ response của submitAnswer API.
const checkIsCorrect = (question: any, answer: AnswerValue | undefined): boolean => {
  if (answer === undefined || answer === null || answer === "") return false;

  const normalizeText = (text: any): string => {
    if (typeof text !== "string") return "";
    return text
      .toLowerCase()
      .trim()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
      .replace(/\s+/g, " ");
  };

  const norm = (text: any): string => normalizeText(text);
  const ansStr = norm(answer);
  const correct = question.correctAnswer;

  switch (question.type) {
    case "multiple_choice":
    case "audio_choice":
    case "image_choice":
    case "audio_image_choice":
    case "true_false":
    case "reading_comprehension":
    case "multiple-choice":
    case "listening":
    case "true-false": {
      const options: any[] = question.options || [];

      // Lấy danh sách ID các đáp án đúng từ câu hỏi (options có isCorrect hoặc correctAnswer)
      const correctOptionIdsFromOptions = options
        .filter((o: any) => o && (o.isCorrect === true || String(o.isCorrect) === "true"))
        .map((o: any) => norm(o.id || o.label || o.content));

      let backendCorrectIds: string[] = [];
      if (Array.isArray(correct)) {
        backendCorrectIds = correct.map(norm);
      } else if (typeof correct === "object" && correct !== null) {
        if (Array.isArray((correct as any).selectedOptionIds)) {
          backendCorrectIds = (correct as any).selectedOptionIds.map(norm);
        } else if (Array.isArray((correct as any).correctOptionIds)) {
          backendCorrectIds = (correct as any).correctOptionIds.map(norm);
        }
      } else if (correct !== undefined && correct !== null && correct !== "") {
        backendCorrectIds = [norm(correct)];
      }

      const allCorrectIds = Array.from(new Set([...correctOptionIdsFromOptions, ...backendCorrectIds])).filter(Boolean);

      // Nếu người dùng chọn mảng (câu hỏi chọn nhiều đáp án)
      if (Array.isArray(answer)) {
        const userSelectedIds = answer.map((a) => {
          const opt = options.find((o: any) => norm(o.id) === norm(a) || norm(o.label) === norm(a) || norm(o.content) === norm(a));
          return opt ? norm(opt.id || opt.label || opt.content) : norm(a);
        });

        if (allCorrectIds.length > 0) {
          if (userSelectedIds.length !== allCorrectIds.length) return false;
          return allCorrectIds.every((id) => userSelectedIds.includes(id));
        }
      }

      // 1. Check if selected option object itself has isCorrect === true
      const ansOpt = options.find((o: any) => {
        const val = typeof o === "string" ? { content: o } : o;
        return (
          norm(val.id) === ansStr ||
          norm(val.label) === ansStr ||
          norm(val.content) === ansStr
        );
      });

      // Nếu là câu đơn đáp án đúng
      if (allCorrectIds.length <= 1) {
        if (ansOpt && (ansOpt.isCorrect === true || String((ansOpt as any).isCorrect) === "true")) {
          return true;
        }

        if (correct !== undefined && correct !== null && correct !== "") {
          const corrStr = norm(correct);
          if (ansStr === corrStr) return true;
          if (ansOpt) {
            if (norm(ansOpt.id) === corrStr || norm(ansOpt.label) === corrStr || norm(ansOpt.content) === corrStr) {
              return true;
            }
          }
          if (typeof correct === "object" && Array.isArray((correct as any).selectedOptionIds)) {
            const ids = (correct as any).selectedOptionIds.map(norm);
            if (ids.includes(ansStr) || (ansOpt && (ids.includes(norm(ansOpt.id)) || ids.includes(norm(ansOpt.label)) || ids.includes(norm(ansOpt.content))))) {
              return true;
            }
          }
        }

        const correctOpt = options.find((o: any) => o && (o.isCorrect === true || String(o.isCorrect) === "true"));
        if (correctOpt && ansOpt) {
          if (ansOpt === correctOpt || (ansOpt.id && ansOpt.id === correctOpt.id) || (ansOpt.content && norm(ansOpt.content) === norm(correctOpt.content))) {
            return true;
          }
        }
      }

      return false;
    }

    case "word_ordering":
    case "word-ordering": {
      const ansArr = Array.isArray(answer) ? answer : [];
      if (Array.isArray(correct)) {
        if (ansArr.length !== correct.length) return false;
        return ansArr.every((val, idx) => normalizeText(val) === normalizeText(correct[idx]));
      } else if (typeof correct === "string") {
        const correctArr = correct.split(" ").filter(Boolean);
        if (ansArr.length !== correctArr.length) return false;
        return ansArr.every((val, idx) => normalizeText(val) === normalizeText(correctArr[idx]));
      }
      return false;
    }

    case "sentence_rewrite":
    case "hint_rewrite":
    case "fill-in-the-blank": {
      const userText = normalizeText(answer);
      if (typeof correct === "string") {
        const accepted = correct.split("\n").map(normalizeText).filter(Boolean);
        if (accepted.length > 0) {
          return accepted.some(ans => ans === userText);
        }
        return userText === normalizeText(correct);
      } else if (Array.isArray(correct)) {
        return correct.map(normalizeText).some(ans => ans === userText);
      }
      return false;
    }

    case "error_correction": {
      return normalizeText(answer) === normalizeText(correct);
    }

    case "matching": {
      if (typeof answer !== "object" || typeof correct !== "object" || answer === null || correct === null) return false;

      const leftItems = question.leftItems || [];
      return leftItems.every((item: any) => {
        const leftId = typeof item === "string" ? item : item.id;
        const leftText = typeof item === "string" ? item : item.text;

        const userMatchedId = (answer as any)[leftId];
        const rightItems = question.rightItems || [];
        const userMatchedItem = rightItems.find((r: any) => (typeof r === "string" ? r : r.id) === userMatchedId);
        const userMatchedText = userMatchedItem ? (typeof userMatchedItem === "string" ? userMatchedItem : userMatchedItem.text) : "";

        let correctMatchedText = "";
        if ((correct as any)[leftId] !== undefined) {
          const correctMatchedId = (correct as any)[leftId];
          const correctMatchedItem = rightItems.find((r: any) => (typeof r === "string" ? r : r.id) === correctMatchedId);
          correctMatchedText = correctMatchedItem ? (typeof correctMatchedItem === "string" ? correctMatchedItem : correctMatchedItem.text) : "";
        } else if ((correct as any)[leftText] !== undefined) {
          correctMatchedText = (correct as any)[leftText];
        }

        return normalizeText(userMatchedText) === normalizeText(correctMatchedText);
      });
    }

    case "audio_fill_blanks":
    case "audio-fill-blanks": {
      if (!answer || typeof answer !== "object") return false;
      const userMap = Array.isArray((answer as any).blanks)
        ? (answer as any).blanks.reduce((acc: any, b: any) => ({ ...acc, [b.id]: b.value }), {})
        : (answer as Record<string, string>);

      const blanksList: any[] = question.detail?.blanks || question.blanks || [];
      if (blanksList.length === 0) return true;

      return blanksList.every((b: any, bIdx: number) => {
        const userVal = normalizeText(userMap[b.id] ?? userMap[`blank${bIdx + 1}`] ?? "");
        if (!userVal) return false;
        const accepted: string[] = Array.isArray(b.acceptedAnswers)
          ? b.acceptedAnswers.map(String)
          : b.acceptedAnswers
            ? [String(b.acceptedAnswers)]
            : [];
        if (accepted.length === 0) {
          if (typeof correct === "object" && correct !== null) {
            const rawCorr =
              (correct as any)[b.id] ||
              (correct as any)[`blank${bIdx + 1}`] ||
              (correct as any)?.blanks?.find((x: any) => x.id === b.id)?.value ||
              (correct as any)?.blanks?.find((x: any) => x.id === b.id)?.acceptedAnswers ||
              Object.values(correct)[bIdx];

            if (Array.isArray(rawCorr)) {
              return rawCorr.some((ans: string) => normalizeText(ans) === userVal);
            }
            if (rawCorr) {
              return userVal === normalizeText(String(rawCorr));
            }
          }
          return false;
        }
        return accepted.some((ans: string) => normalizeText(ans) === userVal);
      });
    }

    default:
      return false;
  }
};

interface QuestionNavigatorProps {
  isInitialExam: boolean;
  isReviewMode: boolean;
  currentMasteredCount: number;
  currentIndex: number;
  totalQuestions: number;
  examData: ExamData;
  progressPercent: number;
  activeQuestions: any[];
  userAnswers: Record<string, AnswerValue>;
  getQuestionStatus: (q: any) => string;
  onSelectQuestion: (idx: number) => void;
  /** compact mode: hide progress/legend, tight grid — for inline mobile panel */
  compact?: boolean;
}

const QuestionNavigator: React.FC<QuestionNavigatorProps> = ({
  isInitialExam,
  isReviewMode,
  currentMasteredCount,
  currentIndex,
  totalQuestions,
  examData,
  progressPercent,
  activeQuestions,
  userAnswers,
  getQuestionStatus,
  onSelectQuestion,
  compact = false,
}) => {
  return (
    <div className="flex flex-col h-full">
      <div className={compact ? "px-3 py-2" : "p-4 sm:p-5 flex-1 overflow-y-auto"}>
        {/* Progress section — hidden in compact mode (shown in slim top bar instead) */}
        {!compact && (
          <div className="mb-5 sm:mb-6">
            <div className="flex justify-between items-end mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {!isInitialExam && !isReviewMode ? "Tiến độ ôn tập" : "Tiến độ làm bài"}
              </span>
              <span className="text-sm font-bold text-emerald-600">
                {!isInitialExam && !isReviewMode
                  ? `${currentMasteredCount}/${examData.questions.length}`
                  : `${currentIndex + 1}/${totalQuestions}`}
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Section label — hidden in compact mode */}
        {!compact && (
          <div className="mb-3 sm:mb-4 text-xs font-semibold text-slate-400 uppercase tracking-widest">
            {!isInitialExam && !isReviewMode ? "Câu hỏi cần ôn tập" : "Danh sách câu hỏi"}
          </div>
        )}

        {/* Question grid */}
        <div className={compact ? "grid gap-1.5" : "grid grid-cols-5 gap-2"}
          style={compact ? { gridTemplateColumns: "repeat(auto-fill, minmax(32px, 1fr))" } : undefined}>
          {activeQuestions.map((q, idx) => {
            const originalIdx = examData.questions.findIndex((item) => item.id === q.id);
            const questionNumber = originalIdx >= 0 ? originalIdx + 1 : idx + 1;
            const isCurrent = idx === currentIndex;
            const isSelected =
              !!userAnswers[q.id] &&
              (!Array.isArray(userAnswers[q.id]) ||
                (userAnswers[q.id] as string[]).length > 0);
            const questionStatus = getQuestionStatus(q);

            let itemClass = compact
              ? "h-8 flex items-center justify-center rounded-md text-[12px] font-semibold border transition-all cursor-pointer select-none"
              : "w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg text-[13px] font-semibold border transition-all cursor-pointer select-none";

            if (isCurrent) {
              if (questionStatus === "correct") {
                itemClass += " bg-emerald-500 text-white border-emerald-500";
              } else if (questionStatus === "wrong") {
                itemClass += " bg-rose-500 text-white border-rose-500";
              } else if (isSelected) {
                itemClass += " bg-blue-700 text-white border-blue-200";
              } else {
                itemClass += " border-2 border-blue-600 text-blue-600";
              }
            } else {
              if (questionStatus === "correct") {
                itemClass += " bg-emerald-500 text-white border-emerald-500";
              } else if (questionStatus === "wrong") {
                itemClass += " bg-rose-500 text-white border-rose-500";
              } else if (isSelected) {
                itemClass += " bg-blue-700 text-white border-blue-200";
              } else {
                itemClass += " border-slate-200 text-slate-600 hover:bg-slate-50";
              }
            }
            return (
              <div
                key={q.id}
                className={itemClass}
                onClick={() => onSelectQuestion(idx)}
              >
                {questionNumber}
              </div>
            );
          })}
        </div>

        {/* Compact legend — inline row, minimal */}
        {compact && (
          <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-200 border border-gray-300 inline-block" />
              Chưa chọn
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              Đã chọn
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              Đúng
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              Sai
            </span>
          </div>
        )}
      </div>

      {/* Full legend — only in non-compact (desktop sidebar) mode */}
      {!compact && (
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 shrink-0">
          <div className="text-[10px] text-slate-400 italic mb-2 text-center underline uppercase">
            Chú thích:
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 text-[10px]">
            <div className="flex items-center gap-1.5 sm:gap-2 text-slate-600">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-slate-200 border border-gray-300" />
              Chưa chọn
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-slate-600">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-blue-500" />
              Đã chọn
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-slate-600">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500" />
              Đúng
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-slate-600">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-rose-500" />
              Sai
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ExamContainer: React.FC<ExamContainerProps> = ({
  examData,
}) => {
  const navigate = useNavigate();
  const { courseId, examId: attemptIdParam } = useParams<{ courseId?: string; examId?: string }>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [navPanelOpen, setNavPanelOpen] = useState(true);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [reportAttempts, setReportAttempts] = useState<any[]>([]);
  const [reportStudent, setReportStudent] = useState<{ id?: string; code?: string; fullName?: string } | null>(null);
  const [isReportLoading, setIsReportLoading] = useState(false);
  type AnswerValue = string | string[] | Record<string, string>;

  const [userAnswers, setUserAnswers] = useState<Record<string, AnswerValue>>(() => {
    const initial: Record<string, AnswerValue> = {};
    // Load userAnswer cho cả submitted và in_progress (câu đã làm từ phiên trước)
    examData.questions.forEach((q) => {
      if ((q as any).userAnswer !== undefined) {
        initial[q.id] = (q as any).userAnswer;
      }
    });
    return initial;
  });

  const [questionResults, setQuestionResults] = useState<
    Record<string, "correct" | "wrong">
  >(() => {
    const initial: Record<string, "correct" | "wrong"> = {};
    // Init cho cả submitted và in_progress (câu đã được chấm từ phiên trước)
    // Không check status, chỉ cần question có isCorrect thì là đã trả lời rồi
    examData.questions.forEach((q) => {
      if ((q as any).isCorrect !== undefined) {
        initial[q.id] = (q as any).isCorrect ? "correct" : "wrong";
      }
    });
    return initial;
  });

  // Theo đúng nghiệp vụ Backend (student-exam-attempts.service.ts):
  // isInitialExam: Chỉ khi examType === "exam" VÀ là lượt đầu tiên (attemptNumber === 1 hoặc attemptPhase === "initial")
  // Bất kỳ bài thi nào là "practice" HOẶC là lượt làm lại (attemptNumber > 1, remedial) đều thuộc luồng immediate feedback (chấm và khóa từng câu).
  const isInitialExam =
    examData.examType === "exam" &&
    (examData.attemptNumber === 1 || examData.attemptPhase === "initial");

  // Track which questions have been answered and locked.
  // Trong lượt thi đầu của bài kiểm tra (isInitialExam), học sinh KHÔNG bị khóa câu hỏi và được đổi/sửa đáp án tự do.
  const [lockedQuestions, setLockedQuestions] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (!isInitialExam) {
      examData.questions.forEach((q) => {
        if ((q as any).answeredAt || (q as any).userAnswer !== undefined) {
          initial[q.id] = true;
        }
      });
    }
    return initial;
  });

  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(() => {
    if (examData.expiresAt) {
      const expiresMs = new Date(examData.expiresAt).getTime();
      const nowMs = Date.now();
      const diffSec = Math.floor((expiresMs - nowMs) / 1000);
      return Math.max(0, diffSec);
    }
    return examData.timeLimit || 0;
  });
  const [showFeedback, setShowFeedback] = useState(() => examData.status === "submitted");
  const [isCorrect, setIsCorrect] = useState(false);
  const [isExamComplete, setIsExamComplete] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(() => examData.status === "submitted");
  const [submitResult, setSubmitResult] = useState<{
    score?: string;
    maxScore?: string;
    percentage?: string;
    displayResult?: string;
  } | null>(() => {
    if (examData.status === "submitted") {
      return {
        score: examData.score,
        maxScore: examData.maxScore,
        percentage: examData.percentage,
      };
    }
    return null;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftState, setDraftState] = useState<DraftSaveState | null>(null);
  const draftSaverRef = useRef<ReturnType<typeof createAttemptDraftSaver> | null>(null);
  const finishRef = useRef<() => Promise<void>>(async () => {});
  const submittingRef = useRef(false);
  const draftAllowedRef = useRef(false);
  draftAllowedRef.current = isInitialExam && !isReviewMode && !isExamComplete && examData.status !== "submitted"
    && (!examData.expiresAt || Date.now() < new Date(examData.expiresAt).getTime())
    && (!(examData.timeLimit > 0) || timeRemaining > 0);

  useEffect(() => {
    if (!isInitialExam || examData.status === "submitted") return;
    let mounted = true;
    const saver = createAttemptDraftSaver(async (questionId, answer) => {
      if (!draftAllowedRef.current || (examData.expiresAt && Date.now() >= new Date(examData.expiresAt).getTime())) return;
      await studentLearningService.attempts.saveAnswer(examData.id, questionId, { answer });
    }, () => {}, 600, state => { if (mounted) setDraftState(state); });
    draftSaverRef.current = saver;
    return () => {
      mounted = false;
      if (draftAllowedRef.current) void saver.flush().catch(() => {});
      saver.dispose();
      if (draftSaverRef.current === saver) draftSaverRef.current = null;
    };
  }, [examData.id, examData.status, isInitialExam]);

  const [correctAnswers, setCorrectAnswers] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    examData.questions.forEach((q) => {
      if (q.correctAnswer !== undefined) {
        initial[q.id] = q.correctAnswer;
      }
    });
    return initial;
  });

  const [explanations, setExplanations] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    examData.questions.forEach((q) => {
      if (q.explanation) {
        initial[q.id] = q.explanation;
      }
    });
    return initial;
  });

  const [explanationMediaMap, setExplanationMediaMap] = useState<Record<string, any[]>>(() => {
    const initial: Record<string, any[]> = {};
    examData.questions.forEach((q) => {
      if (Array.isArray(q.explanationMedia) && q.explanationMedia.length > 0) {
        initial[q.id] = q.explanationMedia;
      }
    });
    return initial;
  });

  // Backend startAttempt filters practice questions automatically.
  // activeQuestions are directly examData.questions returned from BE.
  const activeQuestions = examData.questions;

  // Current mastered count in this attempt
  const currentMasteredCount = useMemo(() => {
    let count = 0;
    examData.questions.forEach((q) => {
      if (questionResults[q.id] === "correct" || (q as any).isCorrect === true) {
        count++;
      }
    });
    return count;
  }, [examData.questions, questionResults]);

  const isCurrentMastered100 =
    submitResult
      ? Boolean((submitResult as any)?.mastered) || (currentMasteredCount === examData.questions.length && examData.questions.length > 0)
      : examData.questions.length === 0 ||
      (currentMasteredCount === examData.questions.length && examData.questions.length > 0) ||
      Boolean(examData.mastered);

  const isPracticeCompleted100 =
    !isInitialExam &&
    (isExamComplete || examData.status === "submitted") &&
    !isReviewMode &&
    isCurrentMastered100;

  const isExamType = examData.examType === "exam";

  const currentScoreDisplay = useMemo(() => {
    return formatStudentExamScoreDisplay({
      isExamType,
      score: submitResult?.score ?? examData.score,
      maxScore: submitResult?.maxScore ?? examData.maxScore ?? examData.questions.length,
      percentage: submitResult?.percentage ?? examData.percentage,
    });
  }, [isExamType, submitResult, examData]);

  const totalQuestions = activeQuestions.length;
  const safeIndex = currentIndex >= totalQuestions ? 0 : currentIndex;
  const rawQuestion = activeQuestions[safeIndex] || examData.questions[0];

  const currentQuestion = useMemo(() => {
    if (!rawQuestion) return rawQuestion;
    const mediaList =
      explanationMediaMap[rawQuestion.id] ||
      rawQuestion.explanationMedia ||
      [];
    const audioObj = mediaList.find((m: any) => m.type === "audio");
    return {
      ...rawQuestion,
      correctAnswer: correctAnswers[rawQuestion.id] !== undefined ? correctAnswers[rawQuestion.id] : rawQuestion.correctAnswer,
      explanation: explanations[rawQuestion.id] !== undefined ? explanations[rawQuestion.id] : rawQuestion.explanation,
      explanationMedia: mediaList,
      explanationAudio: audioObj?.url || rawQuestion.explanationAudio,
    };
  }, [rawQuestion, correctAnswers, explanations, explanationMediaMap]);

  const progressPercent = totalQuestions > 0 ? (currentMasteredCount / totalQuestions) * 100 : 100;

  // Timer logic
  useEffect(() => {
    if (isReviewMode || isExamComplete) return;
    if (examData.timeLimit <= 0 && !examData.expiresAt) return;

    if (timeRemaining <= 0) {
      void finishRef.current();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (examData.expiresAt) {
          const diffSec = Math.floor((new Date(examData.expiresAt).getTime() - Date.now()) / 1000);
          if (diffSec <= 0) {
            clearInterval(timer);
            void finishRef.current();
            return 0;
          }
          return diffSec;
        }
        if (prev <= 1) {
          clearInterval(timer);
          void finishRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, isReviewMode, isExamComplete, examData.expiresAt, examData.timeLimit]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    // Trong chế độ Xem lại đáp án (isReviewMode), LUÔN hiển thị feedback
    if (isReviewMode) {
      setShowFeedback(true);
      const status = questionResults[currentQuestion.id];
      const userAns = userAnswers[currentQuestion.id];
      const isCorr = status
        ? status === "correct"
        : ((currentQuestion as any).isCorrect !== undefined
          ? Boolean((currentQuestion as any).isCorrect)
          : checkIsCorrect(currentQuestion, userAns));
      setIsCorrect(isCorr);
      return;
    }

    // Trong đề thi lượt đầu (isInitialExam), không hiện feedback trong khi làm bài
    if (isInitialExam) {
      setShowFeedback(false);
      return;
    }

    const status = questionResults[currentQuestion.id];
    if (status) {
      setShowFeedback(true);
      setIsCorrect(status === "correct");
    } else if (lockedQuestions[currentQuestion.id] && (currentQuestion as any).isCorrect !== undefined) {
      const isCorr = Boolean((currentQuestion as any).isCorrect);
      setQuestionResults((prev) => ({ ...prev, [currentQuestion.id]: isCorr ? "correct" : "wrong" }));
      setIsCorrect(isCorr);
      setShowFeedback(true);
    } else {
      setShowFeedback(false);
    }
  }, [currentQuestion, questionResults, lockedQuestions, userAnswers, isInitialExam, isReviewMode]);

  const handleAnswerChange = (answer: AnswerValue) => {
    if (isReviewMode || isExamComplete || isSubmitting || examData.status === "submitted") return;
    if (isInitialExam && !draftAllowedRef.current) return;
    if (!isInitialExam && lockedQuestions[currentQuestion.id]) return;
    setUserAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: answer,
    }));
    if (isInitialExam) draftSaverRef.current?.schedule(currentQuestion.id, toBackendAnswer(currentQuestion, answer));
  };

  const handleSubmit = useCallback(async () => {
    if (isInitialExam) return;
    if (isSubmittingAnswer) return;
    if (lockedQuestions[currentQuestion.id]) {
      const existingResult = questionResults[currentQuestion.id];
      if (existingResult) {
        setIsCorrect(existingResult === "correct");
        setShowFeedback(true);
      }
      return;
    }

    const answer = userAnswers[currentQuestion.id];
    if (!isAnswerProvided(answer)) return;

    const backendPayload = toBackendAnswer(currentQuestion, answer);

    try {
      setIsSubmittingAnswer(true);
      console.log(`[ExamContainer Debug] Submitting answer for question ${currentQuestion.id}:`, {
        attemptId: examData.id,
        questionId: currentQuestion.id,
        backendPayload,
      });

      const result = await studentLearningService.attempts.submitAnswer(
        examData.id,
        currentQuestion.id,
        { answer: backendPayload },
      );

      console.log(`[ExamContainer Debug] BE submitAnswer result for ${currentQuestion.id}:`, result);

      const calculatedIsCorrect = result.isCorrect ?? false;
      const status = calculatedIsCorrect ? "correct" : "wrong";

      const parsedCorrectAnswer = parseBackendAnswer(currentQuestion.type, result.correctAnswer);
      const backendExplanation =
        (result.feedback as any)?.explanation ||
        (result.question as any)?.feedback?.explanation ||
        (result.question as any)?.explanation;
      const rawExplMedia =
        (result.feedback as any)?.explanationMedia ||
        (result.question as any)?.feedback?.explanationMedia ||
        (result.question as any)?.media?.filter((m: any) => m.role === "explanation_image" || m.role === "explanation_audio");

      if (parsedCorrectAnswer !== undefined) {
        setCorrectAnswers((prev) => ({ ...prev, [currentQuestion.id]: parsedCorrectAnswer }));
      }
      if (backendExplanation) {
        setExplanations((prev) => ({ ...prev, [currentQuestion.id]: backendExplanation }));
      }
      if (rawExplMedia && Array.isArray(rawExplMedia) && rawExplMedia.length > 0) {
        const normalized = normalizeExplanationMediaList(rawExplMedia);
        setExplanationMediaMap((prev) => ({ ...prev, [currentQuestion.id]: normalized }));
      }

      setQuestionResults((prev) => ({ ...prev, [currentQuestion.id]: status }));
      setLockedQuestions((prev) => ({ ...prev, [currentQuestion.id]: true }));
      setIsCorrect(calculatedIsCorrect);
      setShowFeedback(true);
    } catch (err: any) {
      const statusCode = err?.statusCode ?? err?.body?.statusCode ?? err?.response?.status;
      const is409 = statusCode === 409 || (typeof err?.message === "string" && (err.message.includes("trùng") || err.message.includes("ràng buộc") || err.message.includes("lock") || err.message.includes("already") || err.message.includes("đã được trả lời")));

      if (is409) {
        // Ưu tiên kiểm tra kết quả chấm chính xác từ Backend bằng cách re-fetch attempt
        try {
          const freshAttempt = (await studentLearningService.attempts.get(examData.id)) as any;
          const freshAns = freshAttempt?.answers?.find((a: any) => a.questionId === currentQuestion.id);
          if (freshAns && (freshAns.answeredAt != null || freshAns.isCorrect !== undefined)) {
            setLockedQuestions((prev) => ({ ...prev, [currentQuestion.id]: true }));
            const status: "correct" | "wrong" = freshAns.isCorrect ? "correct" : "wrong";
            const parsedCorr = parseBackendAnswer(currentQuestion.type, freshAns.correctAnswer);
            if (parsedCorr !== undefined) {
              setCorrectAnswers((prev) => ({ ...prev, [currentQuestion.id]: parsedCorr }));
            }
            const expl = freshAns.feedback?.explanation || freshAns.question?.feedback?.explanation || freshAns.question?.explanation;
            if (expl) {
              setExplanations((prev) => ({ ...prev, [currentQuestion.id]: expl }));
            }
            const rawFreshExplMedia =
              freshAns.feedback?.explanationMedia ||
              freshAns.question?.feedback?.explanationMedia ||
              freshAns.question?.media?.filter((m: any) => m.role === "explanation_image" || m.role === "explanation_audio");
            if (rawFreshExplMedia && Array.isArray(rawFreshExplMedia) && rawFreshExplMedia.length > 0) {
              const normalized = normalizeExplanationMediaList(rawFreshExplMedia);
              setExplanationMediaMap((prev) => ({ ...prev, [currentQuestion.id]: normalized }));
            }
            setQuestionResults((prev) => ({ ...prev, [currentQuestion.id]: status }));
            setIsCorrect(Boolean(freshAns.isCorrect));
            setShowFeedback(true);
            return;
          }
        } catch (fErr) {
          console.warn("Failed to refetch fresh attempt answer on 409", fErr);
        }
      }

      Modal.error({
        title: "Không thể nộp câu trả lời",
        content: err instanceof Error ? err.message : "Đã có lỗi xảy ra khi nộp câu trả lời lên hệ thống. Vui lòng thử lại.",
      });
    } finally {
      setIsSubmittingAnswer(false);
    }
  }, [currentQuestion, userAnswers, isSubmittingAnswer, lockedQuestions, questionResults, examData.id, isInitialExam]);

  const handleSelectQuestion = async (idx: number) => {
    if (idx === currentIndex) return;
    if (isSubmittingAnswer) return;
    if (isReviewMode) {
      setCurrentIndex(idx);
      return;
    }

    if (isInitialExam) {
      try { await draftSaverRef.current?.flush(); } catch { /* Retained for retry; navigation remains available. */ }
    }

    setShowFeedback(false);
    setCurrentIndex(idx);
  };

  const handleNext = async () => {
    if (isReviewMode) {
      if (currentIndex < totalQuestions - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        // Nếu đã hoàn thành 100%, thoát xem đáp án về màn hình chúc mừng / kết quả
        if (isCurrentMastered100) {
          setIsReviewMode(false);
          setIsExamComplete(true);
        } else {
          // Nếu chưa đạt 100%, tự động tạo lượt làm lại các câu sai để học sinh làm tiếp tới khi đúng hết
          handleRetryNewAttempt();
        }
      }
      return;
    }

    if (isInitialExam) {
      try { await draftSaverRef.current?.flush(); } catch { /* Final submission still carries local answers. */ }
    }

    setShowFeedback(false);
    if (currentIndex < totalQuestions - 1 && currentMasteredCount < totalQuestions) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      await handleFinish();
    }
  };

  const isAnswerProvided = (answer: AnswerValue | undefined) => {
    if (answer === undefined || answer === null) return false;
    if (Array.isArray(answer)) return answer.length > 0;
    if (typeof answer === "object") return Object.keys(answer).length > 0;
    return String(answer).trim().length > 0;
  };

  const toBackendAnswer = (question: typeof currentQuestion, answer: AnswerValue | undefined) => {
    if (!isAnswerProvided(answer)) return {};

    switch (question.type) {
      case "multiple_choice":
      case "audio_choice":
      case "image_choice":
      case "audio_image_choice":
      case "true_false":
      case "reading_comprehension":
      case "multiple-choice":
      case "listening":
      case "true-false": {
        const options: any[] = question.options || [];
        const ansStr = String(answer);
        const selectedOpt = options.find((o: any) => {
          return String(o.id) === ansStr || String(o.label) === ansStr || String(o.content) === ansStr;
        });

        const selectedId = selectedOpt?.id ? String(selectedOpt.id) : ansStr;

        const idsArray = Array.isArray(answer)
          ? answer.map((a) => {
            const opt = options.find((o: any) => String(o.id) === String(a) || String(o.label) === String(a) || String(o.content) === String(a));
            return opt?.id ? String(opt.id) : String(a);
          })
          : [selectedId];

        const payload = {
          selectedOptionIds: idsArray,
          selectedOptionId: selectedId,
          optionId: selectedId,
          value: selectedId,
          text: selectedOpt?.content || ansStr,
        };

        console.log(`[ExamContainer Debug] toBackendAnswer (${question.type}):`, {
          questionId: question.id,
          userAnswer: answer,
          selectedId,
          idsArray,
          payload,
        });

        return payload;
      }
      case "word_ordering":
      case "word-ordering": {
        const tokens = Array.isArray(answer) ? answer : [String(answer)];
        const payload = {
          tokens: tokens,
          words: tokens,
          text: tokens.join(" "),
          value: tokens,
        };
        console.log(`[ExamContainer Debug] toBackendAnswer (${question.type}):`, { questionId: question.id, userAnswer: answer, payload });
        return payload;
      }
      case "sentence_rewrite":
      case "hint_rewrite":
      case "fill-in-the-blank": {
        const textStr = String(answer ?? "").trim();
        const payload = {
          text: textStr,
          value: textStr,
          answer: textStr,
        };
        console.log(`[ExamContainer Debug] toBackendAnswer (${question.type}):`, { questionId: question.id, userAnswer: answer, payload });
        return payload;
      }
      case "error_correction": {
        const textStr = String(answer ?? "").trim();
        const payload = {
          correctedSentence: textStr,
          text: textStr,
          value: textStr,
        };
        console.log(`[ExamContainer Debug] toBackendAnswer (${question.type}):`, { questionId: question.id, userAnswer: answer, payload });
        return payload;
      }
      case "matching": {
        const pairs =
          answer && typeof answer === "object" && !Array.isArray(answer)
            ? Object.entries(answer).map(([leftItemId, rightItemId]) => ({
              leftItemId: String(leftItemId),
              rightItemId: String(rightItemId),
            }))
            : [];
        const payload = {
          pairs: pairs,
          matches: pairs,
        };
        console.log(`[ExamContainer Debug] toBackendAnswer (${question.type}):`, { questionId: question.id, userAnswer: answer, payload });
        return payload;
      }
      case "audio_fill_blanks":
      case "audio-fill-blanks": {
        let blanksList: Array<{ id: string; value: string }> = [];
        if (answer && typeof answer === "object") {
          if (Array.isArray((answer as any).blanks)) {
            blanksList = (answer as any).blanks;
          } else {
            blanksList = Object.entries(answer as Record<string, string>).map(([id, value]) => ({
              id,
              value: String(value ?? "").trim(),
            }));
          }
        }
        const payload = {
          blanks: blanksList,
        };
        console.log(`[ExamContainer Debug] toBackendAnswer (${question.type}):`, { questionId: question.id, userAnswer: answer, payload });
        return payload;
      }
      default: {
        const payload = answer ?? {};
        console.log(`[ExamContainer Debug] toBackendAnswer (default:${question.type}):`, { questionId: question.id, userAnswer: answer, payload });
        return payload;
      }
    }
  };

  const handleFinish = async () => {
    if (submittingRef.current || isExamComplete || examData.status === "submitted") return;
    submittingRef.current = true;

    try {
      setIsSubmitting(true);

      const newResults: Record<string, "correct" | "wrong"> = {};
      const newCorrects: Record<string, any> = {};
      const newExplanations: Record<string, string> = {};

      const formattedAnswersPayload = examData.questions
        .map((q) => {
          const userAns = userAnswers[q.id];
          if (!Object.prototype.hasOwnProperty.call(userAnswers, q.id)) return null;
          return {
            questionId: q.id,
            answer: toBackendAnswer(q, userAns),
          };
        })
        .filter(Boolean) as { questionId: string; answer: any }[];

      console.log(`[ExamContainer Debug] handleFinish starting (isInitialExam: ${isInitialExam}):`, formattedAnswersPayload);

      let result: any = null;

      if (isInitialExam) {
        // The final payload already contains the latest edits and clears. A slow
        // draft request must not delay submission past the server deadline.
        // Cho lượt thi kiểm tra lần đầu, gọi submitAttempt duy nhất 1 lần với full answers payload
        try {
          result = await studentLearningService.attempts.submit(examData.id, {
            answers: formattedAnswersPayload,
          });
          console.log(`[ExamContainer Debug] BE submit attempt response:`, result);
        } catch (error: any) {
          console.error(`[ExamContainer Debug] BE submit attempt error:`, error);
          const statusCode = error?.statusCode ?? error?.body?.statusCode ?? error?.response?.status;
          const is409 = statusCode === 409 || (typeof error?.message === "string" && (error.message.includes("trùng") || error.message.includes("ràng buộc") || error.message.includes("submitted")));
          if (!is409) throw error;
        }
      } else {
        // Cho lượt ôn tập hoặc làm lại (attempt > 1), submit các câu chưa được gửi
        // Tuân thủ thứ tự orderIndex của Backend (ensureSequentialAnswer)
        for (const q of examData.questions) {
          const ans = userAnswers[q.id];
          if (isAnswerProvided(ans) && !lockedQuestions[q.id]) {
            try {
              const backendPayload = toBackendAnswer(q, ans);
              const res = await studentLearningService.attempts.submitAnswer(
                examData.id,
                q.id,
                { answer: backendPayload }
              );
              setLockedQuestions((prev) => ({ ...prev, [q.id]: true }));
              if (res && res.isCorrect !== undefined && res.isCorrect !== null) {
                newResults[q.id] = res.isCorrect ? "correct" : "wrong";
              }
            } catch (submitErr: any) {
              // Bỏ qua lỗi 409 nếu câu đã nộp hoặc attempt đã finalized
            }
          }
        }

        try {
          result = await studentLearningService.attempts.submit(examData.id, { answers: [] });
        } catch (err: any) {
          // Bỏ qua 409 nếu Backend đã tự động finalize khi submit câu cuối cùng
        }
      }

      // Re-fetch attempt detail từ backend để lấy kết quả chính xác 100%
      const mergedResults: Record<string, "correct" | "wrong"> = { ...questionResults, ...newResults };

      try {
        const freshAttempt = (await studentLearningService.attempts.get(examData.id)) as any;
        console.log(`[ExamContainer Debug] BE freshAttempt response:`, freshAttempt);

        const rawScore = freshAttempt?.score ?? result?.score;
        const rawMaxScore = freshAttempt?.maxScore ?? result?.maxScore;
        const rawPercentage = freshAttempt?.percentage ?? result?.percentage;

        const newExplanationMedia: Record<string, any[]> = {};

        if (freshAttempt?.answers && Array.isArray(freshAttempt.answers)) {
          freshAttempt.answers.forEach((ans: any) => {
            if (ans.isCorrect !== undefined && ans.isCorrect !== null) {
              mergedResults[ans.questionId] = ans.isCorrect ? "correct" : "wrong";
            }
            let parsedCorr = parseBackendAnswer(ans.questionType, ans.correctAnswer);
            if (parsedCorr === undefined) {
              const qInExam = examData.questions.find((q) => q.id === ans.questionId);
              if (qInExam && qInExam.correctAnswer !== undefined) {
                parsedCorr = qInExam.correctAnswer;
              }
            }
            if (parsedCorr !== undefined) {
              newCorrects[ans.questionId] = parsedCorr;
            }
            const expl = ans.feedback?.explanation || ans.question?.feedback?.explanation || ans.question?.explanation;
            if (expl) {
              newExplanations[ans.questionId] = expl;
            }
            const rawAnsExplMedia =
              ans.feedback?.explanationMedia ||
              ans.question?.feedback?.explanationMedia ||
              ans.question?.media?.filter((m: any) => m.role === "explanation_image" || m.role === "explanation_audio");
            if (rawAnsExplMedia && Array.isArray(rawAnsExplMedia) && rawAnsExplMedia.length > 0) {
              newExplanationMedia[ans.questionId] = normalizeExplanationMediaList(rawAnsExplMedia);
            }
          });

          setQuestionResults({ ...mergedResults });
          setCorrectAnswers((prev) => ({ ...prev, ...newCorrects }));
          setExplanations((prev) => ({ ...prev, ...newExplanations }));
          setExplanationMediaMap((prev) => ({ ...prev, ...newExplanationMedia }));
        }

        const finalScoreStr = rawScore !== undefined && rawScore !== null ? String(rawScore) : "0.00";
        const finalMaxScoreStr = rawMaxScore !== undefined && rawMaxScore !== null ? String(rawMaxScore) : String(examData.questions.length);
        const finalPercentageStr = rawPercentage !== undefined && rawPercentage !== null ? String(rawPercentage) : "0.00";

        const isMastered = freshAttempt?.mastered ?? (Number(finalScoreStr) >= Number(finalMaxScoreStr));
        const remCount = freshAttempt?.remainingQuestionCount ?? Math.max(0, Number(finalMaxScoreStr) - Number(finalScoreStr));

        result = {
          ...result,
          ...freshAttempt,
          score: finalScoreStr,
          maxScore: finalMaxScoreStr,
          percentage: finalPercentageStr,
          displayResult: freshAttempt?.displayResult || `${finalScoreStr} / ${finalMaxScoreStr}`,
          mastered: isMastered,
          remainingQuestionCount: remCount,
          cumulativeCorrectCount: Number(finalScoreStr),
          totalQuestions: Number(finalMaxScoreStr),
        };
      } catch (e) {
        console.warn("Failed to fetch fresh attempt result", e);
      }

      if (result?.status !== "submitted") {
        throw new Error(
          (result as any)?.message ||
          "Hệ thống chưa ghi nhận hoàn thành bài thi. Vui lòng kiểm tra lại kết nối và thử nộp lại."
        );
      }

      setSubmitResult(result);
      setIsExamComplete(true);
      setIsReviewMode(false);
      setShowFeedback(false);
    } catch (error: any) {
      Modal.error({
        title: "Không thể nộp bài",
        content: error instanceof Error ? error.message : "Vui lòng thử lại sau.",
      });
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };
  finishRef.current = handleFinish;

  // Tự động nộp bài lên backend nếu đề ôn tập/làm lại đã hoàn thành 100% câu hỏi nhưng attempt vẫn ở trạng thái in_progress
  useEffect(() => {
    if (
      !isReviewMode &&
      !isInitialExam &&
      examData.status === "in_progress" &&
      !isExamComplete &&
      !isSubmitting &&
      (examData.questions.length === 0 || (currentMasteredCount === examData.questions.length && examData.questions.length > 0))
    ) {
      const allInitiallyCorrect =
        examData.questions.length === 0 ||
        examData.questions.every((q) => (q as any).isCorrect === true || questionResults[q.id] === "correct");

      // Nếu tất cả câu hỏi đều đã được làm đúng (resume attempt đã hoàn thành hoặc đề rỗng)
      if (allInitiallyCorrect) {
        handleFinish();
      }
    }
  }, [
    isReviewMode,
    isInitialExam,
    examData.status,
    isExamComplete,
    isSubmitting,
    examData.questions,
    currentMasteredCount,
    questionResults,
  ]);

  const getQuestionStatus = (question: { id: string }) => {
    const answer = userAnswers[question.id];
    if ((!isInitialExam || isReviewMode) && questionResults[question.id]) {
      return questionResults[question.id];
    }
    if (!isAnswerProvided(answer)) {
      return null;
    }
    return "selected";
  };

  const totalCorrect = Object.values(questionResults).filter(
    (status) => status === "correct",
  ).length;
  const totalWrong = Object.values(questionResults).filter(
    (status) => status === "wrong",
  ).length;
  const totalAnswered = Object.keys(userAnswers).filter((key) => {
    const answer = userAnswers[key];
    return isAnswerProvided(answer);
  }).length;
  const totalUnanswered = totalQuestions - totalAnswered;

  const shouldShowFeedback = !isInitialExam || isReviewMode ? showFeedback : false;

  const handleReview = async () => {
    try {
      const freshAttempt = (await studentLearningService.attempts.get(examData.id)) as any;
      if (freshAttempt) {
        if (freshAttempt.score !== undefined || freshAttempt.percentage !== undefined) {
          setSubmitResult((prev) => ({
            ...prev,
            ...freshAttempt,
            score: freshAttempt.score != null ? String(freshAttempt.score) : prev?.score,
            maxScore: freshAttempt.maxScore != null ? String(freshAttempt.maxScore) : prev?.maxScore,
            percentage: freshAttempt.percentage != null ? String(freshAttempt.percentage) : prev?.percentage,
            displayResult: freshAttempt.displayResult || prev?.displayResult,
          }));
        }
      }
      if (freshAttempt?.answers) {
        const newResults: Record<string, "correct" | "wrong"> = {};
        const newCorrects: Record<string, any> = {};
        const newExplanations: Record<string, string> = {};
        const newAnswers: Record<string, any> = {};

        freshAttempt.answers.forEach((ans: any) => {
          if (ans.isCorrect !== undefined && ans.isCorrect !== null) {
            newResults[ans.questionId] = ans.isCorrect ? "correct" : "wrong";
          }
          const rawUserAns = ans.answer ?? ans.userAnswer;
          if (rawUserAns !== undefined && rawUserAns !== null) {
            const parsedUser = parseBackendAnswer(ans.questionType, rawUserAns);
            newAnswers[ans.questionId] = parsedUser !== undefined ? parsedUser : rawUserAns;
          }
          let parsedCorr = parseBackendAnswer(ans.questionType, ans.correctAnswer);
          if (parsedCorr === undefined) {
            const qInExam = examData.questions.find((q) => q.id === ans.questionId);
            if (qInExam && qInExam.correctAnswer !== undefined) {
              parsedCorr = qInExam.correctAnswer;
            }
          }
          if (parsedCorr !== undefined) {
            newCorrects[ans.questionId] = parsedCorr;
          }
          const expl = ans.feedback?.explanation || ans.question?.feedback?.explanation || ans.question?.explanation;
          if (expl) {
            newExplanations[ans.questionId] = expl;
          }
        });

        if (Object.keys(newAnswers).length > 0) {
          setUserAnswers((prev) => ({ ...newAnswers, ...prev }));
        }
        setQuestionResults((prev) => ({ ...prev, ...newResults }));
        setCorrectAnswers((prev) => ({ ...prev, ...newCorrects }));
        setExplanations((prev) => ({ ...prev, ...newExplanations }));
      }
    } catch (e) {
      console.warn("Failed to fetch fresh attempt for review", e);
    }

    setIsReviewMode(true);
    setShowFeedback(true);
    setCurrentIndex(0);
  };

  const handleRetryWrong = () => {
    const resetResults = { ...questionResults };
    Object.keys(resetResults).forEach((key) => {
      if (resetResults[key] === "wrong") {
        delete resetResults[key];
      }
    });
    setQuestionResults(resetResults);
    setIsExamComplete(false);
    setIsReviewMode(false);
    setShowFeedback(false);

    const firstWrongIndex = examData.questions.findIndex(
      (q) => questionResults[q.id] === "wrong",
    );
    if (firstWrongIndex >= 0) {
      setCurrentIndex(firstWrongIndex);
    }
  };

  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetryNewAttempt = async (forceRestart = false) => {
    if (isRetrying) return;
    try {
      setIsRetrying(true);
      let attemptResult: any = null;
      const targetExamId = examData.examId || (examData as any).exam?.id || examData.id;
      const shouldRestart = forceRestart;

      const isTeacherAssigned =
        examData.source === "teacher_assigned" ||
        (!examData.source && !!examData.assignmentStudentId);

      const isCurriculum =
        examData.source === "self_study" ||
        (!examData.source && (!!(examData as any).curriculumId || !!(examData as any).curriculumAssignmentStudentId));

      console.log("[handleRetryNewAttempt] Start with forceRestart:", forceRestart, "shouldRestart:", shouldRestart);
      if (isTeacherAssigned) {
        if (!examData.assignmentStudentId || !targetExamId) {
          throw new Error("Thông tin bài giao không hợp lệ.");
        }
        attemptResult = await studentLearningService.examAssignments.startAttempt(
          examData.assignmentStudentId,
          targetExamId,
          shouldRestart ? { restart: true } : undefined
        );
        console.log("[handleRetryNewAttempt] teacherAssigned attemptResult:", attemptResult);
      } else if (isCurriculum) {
        let curriculumId = (examData as any).curriculumId;
        if (!curriculumId && (examData as any).curriculumAssignmentStudentId) {
          try {
            const currList = await studentLearningService.curriculums.list({ page: 1, limit: 1, enrollmentId: (examData as any).curriculumAssignmentStudentId });
            const list = Array.isArray(currList) ? currList : (currList as any)?.data ?? [];
            const matched = list.find((c: any) =>
              c.enrollmentId === (examData as any).curriculumAssignmentStudentId ||
              (c as any).id === (examData as any).curriculumAssignmentStudentId ||
              c.curriculumId === (examData as any).curriculumAssignmentStudentId
            );
            if (matched) {
              curriculumId = matched.curriculumId || (matched as any).id;
            }
          } catch (cErr) {
            console.warn("Failed to resolve curriculumId in handleRetryNewAttempt:", cErr);
          }
        }
        if (!curriculumId || !targetExamId) {
          throw new Error("Thông tin lộ trình học không hợp lệ.");
        }
        attemptResult = await studentLearningService.curriculums.startAttempt(
          curriculumId,
          targetExamId,
          shouldRestart ? { restart: true } : undefined
        );
        console.log("[handleRetryNewAttempt] curriculum attemptResult:", attemptResult);
      } else {
        throw new Error("Nguồn bài thi không hỗ trợ làm lại.");
      }

      const attemptId = attemptResult?.id;
      if (!attemptId) {
        if ((attemptResult as any)?.mastered) {
          Modal.success({
            title: "Hoàn thành bài thi",
            content: "Bạn đã hoàn thành 100% bài thi này!",
          });
          return;
        }
        throw new Error("Không thể tạo lượt làm bài mới.");
      }

      navigate(`/exam/${attemptId}`, { replace: true });
      window.location.reload();
    } catch (err: any) {
      const statusCode = err?.statusCode ?? err?.body?.statusCode ?? err?.response?.status;
      const is409 = statusCode === 409 || (typeof err?.message === "string" && (err.message.includes("409") || err.message.includes("submitted") || err.message.includes("đã nộp")));
      if (is409) {
        Modal.warning({
          title: "Không thể tạo lượt làm mới",
          content: "Đề kiểm tra này đã được nộp và không cho phép làm lại.",
        });
      } else {
        Modal.error({
          title: "Không thể bắt đầu làm lại",
          content: err instanceof Error ? err.message : "Vui lòng thử lại sau.",
        });
      }
    } finally {
      setIsRetrying(false);
    }
  };

  const handleResetExam = () => {
    setUserAnswers({});
    setQuestionResults({});
    setTimeRemaining(examData.timeLimit);
    setShowFeedback(false);
    setIsCorrect(false);
    setIsExamComplete(false);
    setIsReviewMode(false);
    setCurrentIndex(0);
  };

  const handleBackClick = () => {
    if (isReviewMode) {
      setIsReviewMode(false);
      setIsExamComplete(true);
      return;
    }
    Modal.confirm({
      title: "Quay lại khóa học",
      content:
        "Bạn chắc chắn muốn quay lại? Tiến độ làm bài sẽ không được lưu.",
      style: {
        top: 200,
      },
      okText: "Quay lại",
      okType: "danger",
      cancelText: "Tiếp tục",
      onOk() {
        navigate(-1);
      },
    });
  };

  const targetAttemptId = examData.attemptId || examData.id || attemptIdParam;

  const fallbackReportAttempts = useCallback(async () => {
    if (!targetAttemptId) return;
    try {
      const singleRes: any = await studentLearningService.attempts.get(targetAttemptId);
      const item = singleRes?.data || singleRes;
      if (item && (item.id || item.attemptNumber)) {
        setReportAttempts([
          {
            ...item,
            attemptNumber: item.attemptNumber ?? 1,
            percentage: item.percentage ?? examData.percentage,
            score: item.score ?? examData.score,
            maxScore: item.maxScore ?? examData.maxScore,
            status: item.status || "submitted",
          },
        ]);
        if (item.student) {
          setReportStudent(item.student);
        }
        return;
      }
    } catch (e) {
      console.warn("Failed to get single attempt fallback", e);
    }

    setReportAttempts([
      {
        id: targetAttemptId,
        attemptNumber: examData.attemptNumber || 1,
        status: "submitted",
        isRedo: (examData as any).isRedo || (examData as any).is_redo || ((examData.attemptNumber ?? 1) > 1),
        percentage: submitResult?.percentage ?? examData.percentage ?? (isPracticeCompleted100 ? 100 : 0),
        attemptPercentage: (submitResult as any)?.attemptPercentage ?? examData.attemptPercentage ?? submitResult?.percentage ?? examData.percentage,
        attemptQuestionCount: (submitResult as any)?.attemptQuestionCount ?? examData.attemptQuestionCount ?? examData.questions.length,
        attemptCorrectCount: (submitResult as any)?.attemptCorrectCount ?? examData.attemptCorrectCount ?? currentMasteredCount,
        score: submitResult?.score ?? examData.score,
        maxScore: submitResult?.maxScore ?? examData.maxScore ?? examData.questions.length,
        submittedAt: new Date().toISOString(),
      },
    ]);
  }, [targetAttemptId, examData, submitResult, isPracticeCompleted100, currentMasteredCount]);

  useEffect(() => {
    if ((isPracticeCompleted100 || isExamComplete) && !isReviewMode && targetAttemptId) {
      setIsReportLoading(true);
      studentLearningService.attempts
        .getReport(targetAttemptId, 1, 50)
        .then((res: any) => {
          const reportData = res?.data || res;
          if (reportData && Array.isArray(reportData.attempts) && reportData.attempts.length > 0) {
            setReportAttempts(reportData.attempts);
            if (reportData.student) {
              setReportStudent(reportData.student);
            }
          } else {
            fallbackReportAttempts();
          }
        })
        .catch(() => {
          fallbackReportAttempts();
        })
        .finally(() => {
          setIsReportLoading(false);
        });
    }
  }, [isPracticeCompleted100, isExamComplete, isReviewMode, targetAttemptId, fallbackReportAttempts]);



  if ((isPracticeCompleted100 || isExamComplete) && !isReviewMode) {
    const isMastered = Boolean(
      (submitResult as any)?.mastered ||
      (currentMasteredCount === examData.questions.length && examData.questions.length > 0) ||
      examData.mastered ||
      isPracticeCompleted100
    );
    const remainingCount =
      (submitResult as any)?.remainingQuestionCount ??
      Math.max(0, examData.questions.length - currentMasteredCount);
    const isExamType = examData.examType === "exam";
    const displayStudent = reportStudent || examData.student;

    const resultIcon = isMastered ? (
      <Trophy className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-600 stroke-[2]" />
    ) : isExamType ? (
      <ClipboardList className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-600 stroke-[2]" />
    ) : (
      <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 text-amber-600 stroke-[2]" />
    );

    const iconBg = isMastered
      ? "bg-emerald-50 border-emerald-100 text-emerald-600"
      : isExamType
        ? "bg-indigo-50 border-indigo-100 text-indigo-600"
        : "bg-amber-50 border-amber-100 text-amber-600";

    const titleText = isMastered
      ? "Hoàn thành 100% Đề Ôn Tập!"
      : isExamType
        ? "Kết quả bài kiểm tra"
        : "Kết quả bài ôn tập";

    const stats = [
      {
        label: isExamType ? "Điểm số" : "Tiến độ đề",
        value: isExamType
          ? `${currentScoreDisplay.primaryText} / 10 đ`
          : isMastered
            ? "100%"
            : `${formatPercentage(submitResult?.percentage ?? examData.percentage)}%`,
        icon: Target,
        iconColor: "text-emerald-600",
        iconBg: "bg-emerald-50 border border-emerald-100",
      },
      {
        label: "Kết quả lượt này",
        value: `${formatPercentage(
          (submitResult as any)?.attemptPercentage ??
          examData.attemptPercentage ??
          submitResult?.percentage ??
          examData.percentage
        )}%`,
        sub: (examData.attemptQuestionCount || (submitResult as any)?.attemptQuestionCount)
          ? `(${(submitResult as any)?.attemptCorrectCount ?? examData.attemptCorrectCount ?? 0}/${(submitResult as any)?.attemptQuestionCount ?? examData.attemptQuestionCount
          } câu)`
          : undefined,
        icon: CheckCircle2,
        iconColor: "text-blue-600",
        iconBg: "bg-blue-50 border border-blue-100",
      },
      {
        label: isExamType ? "Số câu làm đúng" : "Số câu thành thạo",
        value: `${formatScore(
          submitResult?.score ?? examData.score ?? currentMasteredCount
        )} / ${formatScore(
          submitResult?.maxScore ?? examData.maxScore ?? examData.questions.length
        )} câu`,
        icon: Award,
        iconColor: "text-indigo-600",
        iconBg: "bg-indigo-50 border border-indigo-100",
      },
      {
        label: "Lượt làm bài",
        value: `Lần ${examData.attemptNumber || (submitResult as any)?.attemptNumber || 1}`,
        sub: Boolean((examData as any).isRedo || (examData as any).is_redo || ((examData.attemptNumber ?? 1) > 1))
          ? "(Làm lại)"
          : undefined,
        icon: RotateCcw,
        iconColor: "text-amber-600",
        iconBg: "bg-amber-50 border border-amber-100",
      },
    ];

    const displayAttempts =
      reportAttempts.length > 0
        ? reportAttempts
        : [
          {
            id: targetAttemptId,
            attemptNumber: examData.attemptNumber || 1,
            status: "submitted",
            isRedo:
              (examData as any).isRedo ||
              (examData as any).is_redo ||
              ((examData.attemptNumber ?? 1) > 1),
            percentage:
              submitResult?.percentage ?? examData.percentage ?? (isMastered ? 100 : 0),
            attemptPercentage:
              (submitResult as any)?.attemptPercentage ??
              examData.attemptPercentage ??
              submitResult?.percentage ??
              examData.percentage,
            attemptQuestionCount:
              (submitResult as any)?.attemptQuestionCount ??
              examData.attemptQuestionCount ??
              examData.questions.length,
            attemptCorrectCount:
              (submitResult as any)?.attemptCorrectCount ??
              examData.attemptCorrectCount ??
              currentMasteredCount,
            score: submitResult?.score ?? examData.score,
            maxScore:
              submitResult?.maxScore ?? examData.maxScore ?? examData.questions.length,
            submittedAt: new Date().toISOString(),
          },
        ];

    const sortedAttempts = [...displayAttempts].sort(
      (a, b) => (a.attemptNumber || 0) - (b.attemptNumber || 0)
    );

    return (
      <div
        className="min-h-screen flex flex-col bg-slate-100/70 font-sans"
        style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
      >
        {/* Full Page Top Header */}
        <header className="h-13 sm:h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 sm:p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition shrink-0"
              title="Quay lại bài học"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
            </button>
            <img src={logoImg} alt="Logo" className="h-7 sm:h-9 object-contain shrink-0" />
            <div className="min-w-0">
              <h1 className="text-xs sm:text-base text-slate-900 font-bold truncate m-0">
                {isExamType ? "Đề kiểm tra" : "Đề ôn tập"}:{" "}
                <span className="text-slate-900 font-bold">{examData.title || "—"}</span>
              </h1>
            </div>
          </div>

          {displayStudent?.fullName && (
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 shrink-0">
              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />
              <span>
                <span className="hidden sm:inline">Học sinh: </span>
                <span className="text-slate-900 font-semibold">{displayStudent.fullName}</span>
                {displayStudent.code && (
                  <span className="text-slate-500 ml-1 hidden md:inline">({displayStudent.code})</span>
                )}
              </span>
            </div>
          )}
        </header>

        {/* Full Page Main Area */}
        <main className="flex-1 w-full p-3 sm:p-5 lg:p-7 flex flex-col items-center justify-start overflow-y-auto pb-28 sm:pb-24 min-h-0">
          {/* Result Card Container - To full phần container, chuyên nghiệp và rộng rãi */}
          <div className="w-full max-w-7xl bg-white rounded-2xl shadow-sm border border-slate-200/90 p-4 sm:p-6 lg:p-7 flex flex-col justify-between">
            {/* Top Card Row - Chỉ giữ tiêu đề Phiếu kết quả học tập, không lặp lại tên đề & học sinh vì đã có trên header */}
            <div className="pb-2.5 sm:pb-3 border-b border-slate-100 flex items-center justify-between shrink-0">
              <span className="text-xs sm:text-sm text-slate-500 font-semibold uppercase tracking-wider">
                Phiếu kết quả học tập
              </span>
            </div>

            {/* 2-Column Dashboard on Desktop / 1-Column on Mobile */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-7 pt-3 sm:pt-4">
              {/* Left Column: Result Header & 4 Stats Cards */}
              <div className="lg:col-span-5 flex flex-col gap-3 sm:gap-3.5 pr-0 lg:pr-6 lg:border-r lg:border-slate-100">
                {/* Result Header Banner - Tinh tế hiện đại, icon nổi bật */}
                <div className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-3.5 sm:p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200/80 shadow-2xs">
                      <Trophy className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm sm:text-base font-bold text-slate-900 m-0">
                        {titleText}
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5 leading-snug m-0 font-normal">
                        {isMastered
                          ? "Bạn đã hoàn thành chính xác toàn bộ câu hỏi trong đề."
                          : isExamType
                            ? "Điểm kiểm tra lượt đầu đã ghi nhận. Hãy ôn lại câu sai để nâng cao kết quả."
                            : "Lượt làm bài đã ghi nhận. Hãy ôn lại các câu sai để đạt 100%."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4 Stats Cards - Bổ sung icon màu sắc tinh tế, nội dung hiển thị flex trên 1 dòng */}
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
                  {stats.map((s, idx) => {
                    const IconComp = s.icon;
                    return (
                      <div
                        key={idx}
                        className="p-3 sm:p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs hover:border-slate-300 transition flex flex-col justify-between min-h-[86px] sm:min-h-[92px]"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-xs text-slate-500 font-medium leading-tight truncate">
                            {s.label}
                          </span>
                          <div className={`w-6 h-6 rounded-lg ${s.iconBg} flex items-center justify-center shrink-0`}>
                            <IconComp className={`w-3.5 h-3.5 ${s.iconColor}`} />
                          </div>
                        </div>

                        <div className="flex items-baseline gap-1.5 flex-wrap mt-1.5">
                          <span className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
                            {s.value}
                          </span>
                          {s.sub && (
                            <span className="text-xs font-normal text-slate-500 whitespace-nowrap">
                              {s.sub}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Inline Attempt History Table */}
              <div className="lg:col-span-7 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 m-0">
                      Báo cáo lịch sử các lượt làm bài
                    </h3>
                  </div>
                  <span className="text-xs text-slate-600 font-medium bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                    {isReportLoading ? "Đang tải..." : `Tổng cộng: ${sortedAttempts.length} lượt`}
                  </span>
                </div>

                <div className="flex-1 overflow-x-auto rounded-xl border border-slate-200 max-h-[260px] sm:max-h-[320px] lg:max-h-[380px]">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 text-slate-600 font-semibold text-xs border-b border-slate-200 sticky top-0 z-10 whitespace-nowrap">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Lần</th>
                        <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Kết quả lượt</th>
                        <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Tiến độ đề</th>
                        {isExamType && <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Điểm</th>}
                        <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Thời gian</th>
                        <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {sortedAttempts.map((att, idx) => {
                        const isLast = idx === sortedAttempts.length - 1;
                        const pct =
                          att.attemptPercentage != null ? att.attemptPercentage : att.percentage;
                        const pctNum = pct != null ? Math.round(parseFloat(String(pct))) : null;
                        const progNum =
                          att.percentage != null ? Math.round(parseFloat(String(att.percentage))) : null;

                        return (
                          <tr key={att.id || idx} className={`transition ${isLast ? "bg-emerald-50/25" : "hover:bg-slate-50/50"}`}>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
                                <span className="font-semibold text-slate-900 text-xs sm:text-sm">
                                  #{att.attemptNumber || idx + 1}
                                </span>
                                {(att.isRedo || (att.attemptNumber && att.attemptNumber > 1)) && (
                                  <span className="text-[11px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/90 font-medium whitespace-nowrap">
                                    Làm lại
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-900 font-medium text-xs sm:text-sm whitespace-nowrap">
                              <div className="inline-flex items-baseline gap-1 whitespace-nowrap">
                                <span className="font-semibold text-slate-900">
                                  {pctNum != null ? `${pctNum}%` : "—"}
                                </span>
                                {att.attemptQuestionCount ? (
                                  <span className="text-slate-500 text-xs font-normal whitespace-nowrap">
                                    ({att.attemptCorrectCount ?? 0}/{att.attemptQuestionCount})
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {progNum != null ? (
                                <div className="w-20 sm:w-28 flex items-center gap-2">
                                  <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                    <div
                                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                      style={{ width: `${Math.min(100, Math.max(0, progNum))}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-medium text-slate-700 tabular-nums">
                                    {progNum}%
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400 font-normal">—</span>
                              )}
                            </td>
                            {isExamType && (
                              <td className="py-2.5 px-3 text-slate-900 font-medium whitespace-nowrap">
                                {formatScore(att.score)}{" "}
                                {att.maxScore && att.maxScore !== "—"
                                  ? `/ ${formatScore(att.maxScore)}`
                                  : ""}
                              </td>
                            )}
                            <td className="py-2.5 px-3 text-slate-600 text-xs whitespace-nowrap font-normal">
                              {formatDateTime(
                                att.submittedAt || att.completedAt || att.startedAt || att.createdAt
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs text-emerald-700 bg-emerald-50 font-medium border border-emerald-200 whitespace-nowrap">
                                Đã nộp
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Bottom Action Bar - 3 buttons cùng hiển thị 100% trên 1 hàng ngang, không bị che, không bị cắt chữ, font normal */}
        <footer className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 sm:py-3 sm:px-6 flex items-center justify-center shadow-xs safe-bottom">
          <div className="w-full max-w-lg mx-auto grid grid-cols-3 gap-2">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 font-normal text-xs sm:text-sm active:scale-[0.98] transition text-center whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5 stroke-[2] shrink-0 text-slate-700" />
              <span>Quay lại</span>
            </button>

            <button
              onClick={handleReview}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 font-normal text-xs sm:text-sm active:scale-[0.98] transition text-center whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5 stroke-[2] shrink-0 text-slate-700" />
              <span>Xem đáp án</span>
            </button>

            {isMastered ? (
              <button
                onClick={() => handleRetryNewAttempt(true)}
                disabled={isRetrying}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg bg-slate-900 hover:bg-black text-white font-normal text-xs sm:text-sm active:scale-[0.98] transition disabled:opacity-50 text-center whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5 stroke-[2] shrink-0 text-white" />
                <span>{isRetrying ? "Đang tạo..." : "Ôn tập lại"}</span>
              </button>
            ) : (
              <button
                onClick={() => handleRetryNewAttempt(false)}
                disabled={isRetrying}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg bg-slate-900 hover:bg-black text-white font-normal text-xs sm:text-sm active:scale-[0.98] transition disabled:opacity-50 text-center whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5 stroke-[2] shrink-0 text-white" />
                <span>
                  {isRetrying
                    ? "Đang tạo..."
                    : remainingCount > 0
                      ? `Làm lại (${remainingCount})`
                      : "Làm lại"}
                </span>
              </button>
            )}
          </div>
        </footer>

        <AttemptHistoryModal
          open={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          attemptId={targetAttemptId}
          assignmentStudentId={examData.assignmentStudentId}
          examId={examData.id}
          title={examData.title}
        />
      </div>
    );
  }

  return (
    <div className="text-slate-800 flex flex-col h-screen font-sans bg-slate-50 transition-colors">
      <header className="h-12 sm:h-14 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between z-10 shrink-0 transition-colors">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <button
            onClick={handleBackClick}
            className="p-1 sm:p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition shrink-0"
            title="Quay lại"
          >
            <ArrowLeftOutlined className="text-xs sm:text-base" />
          </button>
          <img
            src={logoImg}
            alt="Logo"
            className="h-7 sm:h-9 md:h-11 object-contain shrink-0"
          />
          <h1 className="font-bold text-xs sm:text-sm md:text-base truncate max-w-[120px] sm:max-w-xs md:max-w-md">
            {examData.title}
          </h1>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3 md:gap-4 shrink-0">
          {examData.student?.fullName && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>{examData.student.fullName}</span>
              {examData.student.code && <span className="text-slate-400 font-normal">({examData.student.code})</span>}
            </div>
          )}
          <button
            onClick={() => setHistoryModalOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition"
            title="Lịch sử làm bài"
          >
            <History className="w-3.5 h-3.5 text-indigo-600" />
            <span>Lịch sử</span>
          </button>
          {isReviewMode ? (
            <div className="flex items-center gap-2 bg-emerald-50 px-2 sm:px-4 py-1 sm:py-2 rounded-full border border-emerald-200">
              <span className="text-xs sm:text-sm font-bold text-emerald-700">
                {isExamType
                  ? `Điểm: ${currentScoreDisplay.primaryText} / 10 đ`
                  : `Ôn tập: ${formatScore(submitResult?.score ?? examData.score)}/${formatScore(submitResult?.maxScore ?? examData.maxScore ?? examData.questions.length)}`}
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-100 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-slate-200">
                <ClockCircleOutlined className="text-emerald-600 text-xs sm:text-base" />
                <span className="font-mono font-bold text-emerald-700 text-xs sm:text-sm">
                  {formatTime(timeRemaining)}
                </span>
              </div>
              <button
                onClick={handleFinish}
                disabled={isSubmitting}
                className="px-2.5 sm:px-4 py-1 sm:py-1.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-[11px] sm:text-xs font-bold hover:bg-rose-100 transition-colors shadow-2xs"
              >
                {isSubmitting ? "ĐANG NỘP..." : "NỘP BÀI"}
              </button>
            </>
          )}
        </div>
      </header>

      {isInitialExam && !isReviewMode && !isExamComplete && draftState && (
        <div role="status" className={`px-4 py-1 text-xs ${draftState === "error" ? "text-rose-700 bg-rose-50" : "text-slate-500 bg-white"}`}>
          {draftState === "saving" ? "Đang lưu đáp án…" : draftState === "saved" ? "Đã lưu đáp án" : "Chưa lưu được đáp án. Kiểm tra kết nối và thử lại."}
          {draftState === "error" && <Button size="small" type="link" disabled={!draftAllowedRef.current || isSubmitting} onClick={() => { void draftSaverRef.current?.flush().catch(() => {}); }}>Thử lưu lại</Button>}
        </div>
      )}

      {/* ── Slim top bar + Inline Question Panel cho Mobile / Tablet (< lg) ── */}
      <div className="lg:hidden flex flex-col shrink-0 bg-white border-b border-slate-200 z-10">
        <div className="px-3 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden max-w-[140px]">
              <div
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-bold text-slate-600 shrink-0 tabular-nums">
              {!isInitialExam && !isReviewMode
                ? `${currentMasteredCount}/${examData.questions.length}`
                : `${currentIndex + 1}/${totalQuestions}`}
            </span>
          </div>
          <button
            onClick={() => setNavPanelOpen((prev) => !prev)}
            className="flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-full transition-colors shrink-0"
            aria-label={navPanelOpen ? "Ẩn" : "Danh sách câu"}
          >
            <span>{navPanelOpen ? "Ẩn" : "Danh sách câu"}</span>
            {navPanelOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Inline collapsible question navigator — compact mode */}
        <div
          className="overflow-hidden transition-all duration-300"
          style={{
            maxHeight: navPanelOpen ? "32vh" : "0px",
            opacity: navPanelOpen ? 1 : 0,
          }}
        >
          <div className="overflow-y-auto" style={{ maxHeight: "32vh" }}>
            <QuestionNavigator
              isInitialExam={isInitialExam}
              isReviewMode={isReviewMode}
              currentMasteredCount={currentMasteredCount}
              currentIndex={currentIndex}
              totalQuestions={totalQuestions}
              examData={examData}
              progressPercent={progressPercent}
              activeQuestions={activeQuestions}
              userAnswers={userAnswers}
              getQuestionStatus={getQuestionStatus}
              onSelectQuestion={(idx) => {
                handleSelectQuestion(idx);
                setNavPanelOpen(false);
              }}
              compact={true}
            />
          </div>
        </div>
      </div>

      <main className="flex-1 flex overflow-hidden min-h-0">
        {/* ── Aside Desktop (≥ lg) ── */}
        <aside className="hidden lg:flex w-72 bg-white border-r border-slate-200 flex-col shrink-0 transition-colors">
          <QuestionNavigator
            isInitialExam={isInitialExam}
            isReviewMode={isReviewMode}
            currentMasteredCount={currentMasteredCount}
            currentIndex={currentIndex}
            totalQuestions={totalQuestions}
            examData={examData}
            progressPercent={progressPercent}
            activeQuestions={activeQuestions}
            userAnswers={userAnswers}
            getQuestionStatus={getQuestionStatus}
            onSelectQuestion={handleSelectQuestion}
          />
        </aside>

        {/* ── Section chứa card câu hỏi: mobile = scroll bên trong section, desktop = cố định viewport ── */}
        <section className="flex-1 bg-slate-50 flex flex-col items-center overflow-y-auto min-h-0 p-2.5 sm:p-4 lg:p-8 pt-6 sm:pt-7 lg:pt-9 pb-10 sm:pb-12 lg:pb-8 lg:overflow-hidden">
          <div
            className={`w-full ${
              currentQuestion.passage ||
              (currentQuestion.media &&
                (Array.isArray(currentQuestion.media)
                  ? currentQuestion.media.some((m) => m.type === "image")
                  : currentQuestion.media.type === "image"))
                ? "max-w-6xl"
                : "max-w-3xl"
            } bg-white rounded-2xl shadow-md border border-slate-200/80 relative flex flex-col lg:flex-1 lg:h-full lg:max-h-full transition-all duration-300`}
          >
            {/* Badge câu hỏi - hiển thị nổi bật trên đỉnh card với z-30, không bị cắt bởi overflow-hidden */}
            <div className="absolute -top-3.5 left-4 sm:left-6 bg-emerald-600 text-white px-4 py-1 sm:py-1.5 rounded-full text-xs font-bold uppercase tracking-wider z-30 shadow-md select-none pointer-events-none">
              CÂU HỎI {currentIndex + 1}
            </div>

            <div className="w-full h-full rounded-2xl flex flex-col flex-1 lg:overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQuestion.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col w-full lg:flex-1 lg:h-full lg:overflow-hidden"
                >
                  <QuestionCard
                    question={currentQuestion}
                    currentAnswer={userAnswers[currentQuestion.id]}
                    onAnswerChange={handleAnswerChange}
                    onSubmit={!isInitialExam ? handleSubmit : handleFinish}
                    isCorrect={isReviewMode ? (questionResults[currentQuestion.id] === "correct" || (currentQuestion as any).isCorrect) : isCorrect}
                    showFeedback={shouldShowFeedback}
                    onNext={handleNext}
                    isLastQuestion={isReviewMode ? currentIndex === totalQuestions - 1 : (currentIndex === totalQuestions - 1 || (!isInitialExam && currentMasteredCount === totalQuestions))}
                    isReviewMode={isReviewMode}
                    isPracticeMode={!isInitialExam}
                    isMastered={isCurrentMastered100}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </section>
      </main>
      <AttemptHistoryModal
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        attemptId={examData.attemptId || attemptIdParam}
        examId={examData.id}
        title={examData.title}
      />
    </div>
  );
};
export default ExamContainer;
