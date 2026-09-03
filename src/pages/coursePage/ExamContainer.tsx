import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { QuestionCard } from "./QuestionCard";
import { ExamData } from "../../types";
import { ClockCircleOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import logoImg from "../../assets/logo/logo.png";
import { motion, AnimatePresence } from "framer-motion";
import { Modal } from "antd";
import { studentLearningService } from "../../services/studentLearningService";
import { parseBackendAnswer } from "./ExamDetail";

interface ExamContainerProps {
  examData: ExamData;
  isDarkMode?: boolean;
  toggleDarkMode?: () => void;
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
    case "reading_comprehension":
    case "multiple-choice":
    case "listening":
    case "true-false": {
      const options: any[] = question.options || [];

      // 1. Check if selected option object itself has isCorrect === true
      const ansOpt = options.find((o: any) => {
        const val = typeof o === "string" ? { content: o } : o;
        return (
          norm(val.id) === ansStr ||
          norm(val.label) === ansStr ||
          norm(val.content) === ansStr
        );
      });

      if (ansOpt && (ansOpt.isCorrect === true || String((ansOpt as any).isCorrect) === "true")) {
        return true;
      }

      // 2. Check if question.correctAnswer matches answer or ansOpt
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

      // 3. Fallback: match against any option in options list that has isCorrect: true
      const correctOpt = options.find((o: any) => o && (o.isCorrect === true || String(o.isCorrect) === "true"));
      if (correctOpt && ansOpt) {
        if (ansOpt === correctOpt || (ansOpt.id && ansOpt.id === correctOpt.id) || (ansOpt.content && norm(ansOpt.content) === norm(correctOpt.content))) {
          return true;
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

    default:
      return false;
  }
};

const ExamContainer: React.FC<ExamContainerProps> = ({
  examData,
  isDarkMode,
  toggleDarkMode,
}) => {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const [currentIndex, setCurrentIndex] = useState(0);
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

  const isPracticeMode = examData.examType !== "exam";
  const isInitialExam =
    !isPracticeMode &&
    (examData.attemptPhase === "initial" ||
      (examData as any).attemptNumber === 1 ||
      !(examData as any).attemptNumber);

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

  const isPracticeCompleted100 =
    isPracticeMode &&
    !isReviewMode &&
    (examData.questions.length === 0 || (currentMasteredCount === examData.questions.length && examData.questions.length > 0));

  const totalQuestions = activeQuestions.length;
  const safeIndex = currentIndex >= totalQuestions ? 0 : currentIndex;
  const rawQuestion = activeQuestions[safeIndex] || examData.questions[0];

  const currentQuestion = useMemo(() => {
    if (!rawQuestion) return rawQuestion;
    return {
      ...rawQuestion,
      correctAnswer: correctAnswers[rawQuestion.id] !== undefined ? correctAnswers[rawQuestion.id] : rawQuestion.correctAnswer,
      explanation: explanations[rawQuestion.id] !== undefined ? explanations[rawQuestion.id] : rawQuestion.explanation,
    };
  }, [rawQuestion, correctAnswers, explanations]);

  const progressPercent = totalQuestions > 0 ? (currentMasteredCount / totalQuestions) * 100 : 100;

  // Timer logic
  useEffect(() => {
    if (isReviewMode || isExamComplete) return;
    if (examData.timeLimit <= 0 && !examData.expiresAt) return;

    if (timeRemaining <= 0) {
      handleFinish();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (examData.expiresAt) {
          const diffSec = Math.floor((new Date(examData.expiresAt).getTime() - Date.now()) / 1000);
          if (diffSec <= 0) {
            clearInterval(timer);
            handleFinish();
            return 0;
          }
          return diffSec;
        }
        if (prev <= 1) {
          clearInterval(timer);
          handleFinish();
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
      const isCorr = status ? status === "correct" : checkIsCorrect(currentQuestion, userAns);
      setIsCorrect(isCorr);
      return;
    }

    // Trong đề thi (exam mode), không hiện feedback trong khi làm bài
    if (!isPracticeMode) {
      setShowFeedback(false);
      return;
    }

    const status = questionResults[currentQuestion.id];
    if (status) {
      setShowFeedback(true);
      setIsCorrect(status === "correct");
    } else if (lockedQuestions[currentQuestion.id]) {
      const userAns = userAnswers[currentQuestion.id];
      const isCorr = checkIsCorrect(currentQuestion, userAns);
      setQuestionResults((prev) => ({ ...prev, [currentQuestion.id]: isCorr ? "correct" : "wrong" }));
      setIsCorrect(isCorr);
      setShowFeedback(true);
    } else {
      setShowFeedback(false);
    }
  }, [currentQuestion, questionResults, lockedQuestions, userAnswers, isPracticeMode, isReviewMode]);

  const handleAnswerChange = (answer: AnswerValue) => {
    if (isReviewMode) return;
    if (!isInitialExam && lockedQuestions[currentQuestion.id]) return;
    setUserAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: answer,
    }));
  };

  /**
   * handleSubmit: Gọi API submit từng câu lên backend (Chỉ dùng cho Đề Ôn tập - practice mode).
   */
  const handleSubmit = useCallback(async () => {
    if (!isPracticeMode) return;
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

      if (parsedCorrectAnswer !== undefined) {
        setCorrectAnswers((prev) => ({ ...prev, [currentQuestion.id]: parsedCorrectAnswer }));
      }
      if (backendExplanation) {
        setExplanations((prev) => ({ ...prev, [currentQuestion.id]: backendExplanation }));
      }

      setQuestionResults((prev) => ({ ...prev, [currentQuestion.id]: status }));
      setLockedQuestions((prev) => ({ ...prev, [currentQuestion.id]: true }));
      setIsCorrect(calculatedIsCorrect);
      setShowFeedback(true);
    } catch (err: any) {
      const statusCode = err?.statusCode ?? err?.body?.statusCode ?? err?.response?.status;
      const is409 = statusCode === 409 || (typeof err?.message === "string" && (err.message.includes("trùng") || err.message.includes("ràng buộc") || err.message.includes("lock") || err.message.includes("already")));

      if (is409) {
        setLockedQuestions((prev) => ({ ...prev, [currentQuestion.id]: true }));
        const existingResult = questionResults[currentQuestion.id];
        if (existingResult) {
          setIsCorrect(existingResult === "correct");
          setShowFeedback(true);
          return;
        }

        // Ưu tiên lấy kết quả chấm chính xác từ Backend bằng cách re-fetch attempt
        try {
          const freshAttempt = (await studentLearningService.attempts.get(examData.id)) as any;
          const freshAns = freshAttempt?.answers?.find((a: any) => a.questionId === currentQuestion.id);
          if (freshAns && freshAns.isCorrect !== undefined && freshAns.isCorrect !== null) {
            const status: "correct" | "wrong" = freshAns.isCorrect ? "correct" : "wrong";
            const parsedCorr = parseBackendAnswer(currentQuestion.type, freshAns.correctAnswer);
            if (parsedCorr !== undefined) {
              setCorrectAnswers((prev) => ({ ...prev, [currentQuestion.id]: parsedCorr }));
            }
            setQuestionResults((prev) => ({ ...prev, [currentQuestion.id]: status }));
            setIsCorrect(freshAns.isCorrect);
            setShowFeedback(true);
            return;
          }
        } catch (fErr) {
          console.warn("Failed to refetch fresh attempt answer on 409", fErr);
        }

        const userAns = answer || userAnswers[currentQuestion.id];
        const calculated = checkIsCorrect(currentQuestion, userAns);
        setQuestionResults((prev) => ({ ...prev, [currentQuestion.id]: calculated ? "correct" : "wrong" }));
        setIsCorrect(calculated);
        setShowFeedback(true);
      } else {
        Modal.error({
          title: "Không thể submit câu trả lời",
          content: err instanceof Error ? err.message : "Vui lòng thử lại sau.",
        });
      }
    } finally {
      setIsSubmittingAnswer(false);
    }
  }, [currentQuestion, userAnswers, isSubmittingAnswer, lockedQuestions, questionResults, examData.id, isPracticeMode]);

  const handleSelectQuestion = async (idx: number) => {
    if (idx === currentIndex) return;
    if (isReviewMode) {
      setCurrentIndex(idx);
      return;
    }
    if (showFeedback && isPracticeMode) return;

    if (!isPracticeMode) {
      const currentAns = userAnswers[currentQuestion.id];
      if (isAnswerProvided(currentAns)) {
        try {
          const backendPayload = toBackendAnswer(currentQuestion, currentAns);
          if (isInitialExam) {
            await studentLearningService.attempts.saveAnswer(
              examData.id,
              currentQuestion.id,
              { answer: backendPayload }
            );
          } else {
            if (!lockedQuestions[currentQuestion.id]) {
              await studentLearningService.attempts.submitAnswer(
                examData.id,
                currentQuestion.id,
                { answer: backendPayload }
              );
              setLockedQuestions((prev) => ({ ...prev, [currentQuestion.id]: true }));
            }
          }
        } catch (err) {
          console.warn("Failed to auto-save answer on select question", err);
        }
      }
    }

    setShowFeedback(false);
    setCurrentIndex(idx);
  };

  const handleNext = async () => {
    if (isReviewMode) {
      if (currentIndex < totalQuestions - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        navigate(-1);
      }
      return;
    }

    // Trong đề kiểm tra (exam mode), lưu đáp án lên backend khi chuyển câu
    if (!isPracticeMode) {
      const currentAns = userAnswers[currentQuestion.id];
      if (isAnswerProvided(currentAns)) {
        try {
          const backendPayload = toBackendAnswer(currentQuestion, currentAns);
          if (isInitialExam) {
            // Lượt 1: Dùng saveAnswer (PUT) để học sinh vẫn có thể quay lại sửa đáp án
            await studentLearningService.attempts.saveAnswer(
              examData.id,
              currentQuestion.id,
              { answer: backendPayload }
            );
          } else {
            // Lượt ôn tập / remediation: submit và khóa từng câu
            if (!lockedQuestions[currentQuestion.id]) {
              await studentLearningService.attempts.submitAnswer(
                examData.id,
                currentQuestion.id,
                { answer: backendPayload }
              );
              setLockedQuestions((prev) => ({ ...prev, [currentQuestion.id]: true }));
            }
          }
        } catch (err) {
          console.warn("Failed to auto-save answer on next", err);
        }
      }
    }

    setShowFeedback(false);
    if (currentIndex < totalQuestions - 1) {
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
      default: {
        const payload = answer ?? {};
        console.log(`[ExamContainer Debug] toBackendAnswer (default:${question.type}):`, { questionId: question.id, userAnswer: answer, payload });
        return payload;
      }
    }
  };

  const handleFinish = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      const isInitialExam = !isPracticeMode && ((examData as any).attemptNumber === 1 || !(examData as any).attemptNumber);

      const newResults: Record<string, "correct" | "wrong"> = {};
      const newCorrects: Record<string, any> = {};
      const newExplanations: Record<string, string> = {};

      const formattedAnswersPayload = examData.questions
        .map((q) => {
          const userAns = userAnswers[q.id];
          if (!isAnswerProvided(userAns)) return null;
          return {
            questionId: q.id,
            answer: toBackendAnswer(q, userAns),
          };
        })
        .filter(Boolean) as { questionId: string; answer: any }[];

      console.log(`[ExamContainer Debug] handleFinish starting (isInitialExam: ${isInitialExam}):`, formattedAnswersPayload);

      let result: any = null;

      if (isInitialExam) {
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
        // Cho lượt ôn tập hoặc làm lại, submit các câu chưa được gửi
        const submitPromises = examData.questions.map(async (q) => {
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
              if (res) {
                if (res.isCorrect !== undefined && res.isCorrect !== null) {
                  newResults[q.id] = res.isCorrect ? "correct" : "wrong";
                }
              }
            } catch (submitErr: any) {
              // Bỏ qua lỗi 409 nếu câu đã nộp hoặc attempt đã finalized
            }
          }
        });
        await Promise.allSettled(submitPromises);

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
          });

          setQuestionResults({ ...mergedResults });
          setCorrectAnswers((prev) => ({ ...prev, ...newCorrects }));
          setExplanations((prev) => ({ ...prev, ...newExplanations }));
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
      setIsSubmitting(false);
    }
  };

  const getQuestionStatus = (question: typeof currentQuestion) => {
    const answer = userAnswers[question.id];
    if ((isPracticeMode || isReviewMode) && questionResults[question.id]) {
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

  const shouldShowFeedback = isPracticeMode || isReviewMode ? showFeedback : false;

  const handleReview = async () => {
    try {
      const freshAttempt = (await studentLearningService.attempts.get(examData.id)) as any;
      if (freshAttempt?.answers) {
        const newResults: Record<string, "correct" | "wrong"> = {};
        const newCorrects: Record<string, any> = {};
        const newExplanations: Record<string, string> = {};

        freshAttempt.answers.forEach((ans: any) => {
          if (ans.isCorrect !== undefined && ans.isCorrect !== null) {
            newResults[ans.questionId] = ans.isCorrect ? "correct" : "wrong";
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

        setQuestionResults((prev) => ({ ...prev, ...newResults }));
        setCorrectAnswers((prev) => ({ ...prev, ...newCorrects }));
        setExplanations((prev) => ({ ...prev, ...newExplanations }));
      }
    } catch (e) {
      console.warn("Failed to fetch fresh attempt for review", e);
    }

    setIsExamComplete(false);
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

  const handleRetryNewAttempt = async () => {
    if (isRetrying) return;
    try {
      setIsRetrying(true);
      let attemptResult: any = null;
      if (examData.source === "teacher_assigned") {
        if (!examData.assignmentStudentId || !examData.examId) {
          throw new Error("Thông tin lượt giao bài thi không hợp lệ.");
        }
        attemptResult = await studentLearningService.examAssignments.startAttempt(
          examData.assignmentStudentId,
          examData.examId
        );
      } else if (examData.source === "self_study") {
        const curriculumId = (examData as any).curriculumId;
        if (!curriculumId || !examData.examId) {
          throw new Error("Thông tin lộ trình học không hợp lệ.");
        }
        attemptResult = await studentLearningService.curriculums.startAttempt(
          curriculumId,
          examData.examId
        );
      } else {
        throw new Error("Nguồn bài thi không hỗ trợ làm lại.");
      }

      const attemptId = attemptResult?.id;
      if (!attemptId) {
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
      navigate(-1);
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

  if (isPracticeCompleted100 && !isReviewMode) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 md:p-10 flex items-center justify-center transition-colors">
        <div className="max-w-2xl w-full bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8 md:p-10 text-center border border-slate-200 dark:border-slate-700">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner">
            🏆
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 mb-3">
            Hoàn thành 100% Đề Ôn Tập!
          </h1>
          <p className="text-slate-600 dark:text-slate-300 mb-8 max-w-md mx-auto leading-relaxed">
            Tuyệt vời! Bạn đã trả lời chính xác toàn bộ <strong>{examData.questions.length} / {examData.questions.length}</strong> câu hỏi trong đề ôn tập này.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-8 text-left">
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <span className="text-xs uppercase font-bold text-emerald-700 dark:text-emerald-300 block mb-1">Số câu hoàn thành</span>
              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{examData.questions.length} / {examData.questions.length}</span>
            </div>
            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
              <span className="text-xs uppercase font-bold text-indigo-700 dark:text-indigo-300 block mb-1">Tỷ lệ chính xác</span>
              <span className="text-2xl font-black text-indigo-700 dark:text-indigo-300">100%</span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-200 transition"
            >
              Quay lại bài học
            </button>
            <button
              onClick={handleReview}
              className="px-6 py-3.5 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition"
            >
              Xem lại tất cả đáp án
            </button>
            <button
              onClick={handleResetExam}
              className="px-6 py-3.5 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition"
            >
              Ôn tập lại từ đầu
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isExamComplete && !isReviewMode) {
    return (
      <div className="min-h-screen bg-slate-50  p-6 md:p-10 transition-colors">
        <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700">
          <div className="p-8 md:p-10 text-center">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              Kết quả bài thi
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 mb-6">
              Backend đã chấm điểm{" "}
              {submitResult?.displayResult ? (
                <span className="font-black text-emerald-600 dark:text-emerald-400">
                  {submitResult.displayResult}
                </span>
              ) : (
                <>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">
                    {submitResult?.score ?? "-"}
                  </span>{" "}
                  trên tổng điểm{" "}
                  <span className="font-black text-slate-900 dark:text-slate-100">
                    {submitResult?.maxScore ?? "-"}
                  </span>{" "}
                  ({submitResult?.percentage ?? "-"}%).
                </>
              )}
            </p>
            <div className="grid grid-cols-2 gap-4 text-left mb-8">
              <div className="rounded-3xl bg-emerald-50 dark:bg-emerald-900/20 p-5 border border-emerald-100 dark:border-emerald-700">
                <p className="text-sm uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                  Điểm
                </p>
                <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                  {submitResult?.score ?? "-"}
                </p>
              </div>
              <div className="rounded-3xl bg-rose-50 dark:bg-rose-900/20 p-5 border border-rose-100 dark:border-rose-700">
                <p className="text-sm uppercase tracking-widest text-rose-700 dark:text-rose-300">
                  Tổng điểm
                </p>
                <p className="text-3xl font-bold text-rose-700 dark:text-rose-300">
                  {submitResult?.maxScore ?? "-"}
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 dark:bg-slate-800/80 p-5 border border-slate-200 dark:border-slate-700">
                <p className="text-sm uppercase tracking-widest text-slate-600 dark:text-slate-400">
                  Chưa làm
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {totalUnanswered}
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 dark:bg-slate-800/80 p-5 border border-slate-200 dark:border-slate-700">
                <p className="text-sm uppercase tracking-widest text-slate-600 dark:text-slate-400">
                  Tổng câu
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {totalQuestions}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="px-6 py-4 rounded-3xl bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-semibold hover:bg-slate-200 transition"
              >
                Quay lại
              </button>
              <button
                onClick={handleReview}
                className="px-6 py-4 rounded-3xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
              >
                Xem lại đáp án
              </button>
              {examData.examType !== "exam" && (
                <button
                  onClick={handleRetryNewAttempt}
                  disabled={isRetrying}
                  className="px-6 py-4 rounded-3xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {isRetrying
                    ? "Đang tạo lượt mới..."
                    : (submitResult as any)?.mastered
                    ? "Ôn tập lại bài này"
                    : (submitResult as any)?.remainingQuestionCount > 0
                    ? `Làm tiếp (còn ${(submitResult as any)?.remainingQuestionCount} câu chưa đúng)`
                    : "Làm tiếp / Làm lại"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-slate-800 dark:text-slate-200 flex flex-col h-screen overflow-hidden font-sans bg-slate-50 dark:bg-slate-900 transition-colors">
      <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 flex items-center justify-between z-10 shrink-0 transition-colors">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackClick}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition"
            title="Quay lại"
          >
            <ArrowLeftOutlined className="text-lg" />
          </button>
          <img
            src={logoImg}
            alt="Logo"
            className="h-14 object-contain"
          />
          <h1 className="font-bold text-xl">{examData.title}</h1>
        </div>
        <div className="flex items-center gap-4 md:gap-8">
          {toggleDarkMode && (
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              title="Toggle Dark Mode"
            >
              {isDarkMode ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              )}
            </button>
          )}
          {isReviewMode ? (
            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-2 rounded-full border border-emerald-200 dark:border-emerald-800">
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                Điểm: {examData.score} / {examData.maxScore} ({examData.percentage}%)
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700">
                <ClockCircleOutlined className="text-emerald-600 dark:text-emerald-400" />
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                  {formatTime(timeRemaining)}
                </span>
              </div>
              <button
                onClick={handleFinish}
                disabled={isSubmitting}
                className="px-4 py-1.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-md text-xs font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors"
              >
                {isSubmitting ? "ĐANG NỘP..." : "NỘP BÀI"}
              </button>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <aside className="w-72 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col shrink-0 transition-colors">
          <div className="p-5 flex-1 overflow-y-auto">
            <div className="mb-6">
              <div className="flex justify-between items-end mb-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {isPracticeMode && !isReviewMode ? "Tiến độ ôn tập" : "Tiến độ làm bài"}
                </span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {isPracticeMode && !isReviewMode
                    ? `${currentMasteredCount}/${examData.questions.length}`
                    : `${currentIndex + 1}/${totalQuestions}`}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 dark:bg-emerald-400 h-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>

            <div className="mb-4 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              {isPracticeMode && !isReviewMode ? "Câu hỏi cần ôn tập" : "Danh sách câu hỏi"}
            </div>
            <div className="grid grid-cols-5 gap-2">
              {activeQuestions.map((q, idx) => {
                const originalIdx = examData.questions.findIndex((item) => item.id === q.id);
                const questionNumber = originalIdx >= 0 ? originalIdx + 1 : idx + 1;
                const isCurrent = idx === currentIndex;
                const isSelected =
                  !!userAnswers[q.id] &&
                  (!Array.isArray(userAnswers[q.id]) ||
                    (userAnswers[q.id] as string[]).length > 0);
                const questionStatus = getQuestionStatus(q);

                let itemClass =
                  "w-9 h-9 flex items-center justify-center rounded-lg text-[13px] font-semibold border transition-all cursor-pointer";
                // =======================
                // CÂU HIỆN TẠI
                // =======================
                if (isCurrent) {
                  if (questionStatus === "correct") {
                    itemClass +=
                      " bg-emerald-500 text-white border-emerald-500 dark:bg-emerald-600 dark:border-emerald-600";
                  } else if (questionStatus === "wrong") {
                    itemClass +=
                      " bg-rose-500 text-white border-rose-500 dark:bg-rose-600 dark:border-rose-600";
                  } else if (isSelected) {
                    itemClass +=
                      " bg-blue-700 text-white border-blue-200 dark:bg-blue-600 dark:text-white dark:border-blue-700";
                  } else {
                    itemClass +=
                      " border-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400";
                  }
                }
                // =======================
                // KHÔNG PHẢI CÂU HIỆN TẠI
                // =======================
                else {
                  if (questionStatus === "correct") {
                    itemClass +=
                      " bg-emerald-500 text-white border-emerald-500 dark:bg-emerald-600 dark:border-emerald-600";
                  } else if (questionStatus === "wrong") {
                    itemClass +=
                      " bg-rose-500 text-white border-rose-500 dark:bg-rose-600 dark:border-rose-600";
                  } else if (isSelected) {
                    itemClass +=
                      " bg-blue-700 text-white border-blue-200 dark:bg-blue-600 dark:text-white dark:border-blue-700";
                  } else {
                    itemClass +=
                      " border-slate-200 text-slate-600 dark:border-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50";
                  }
                }
                return (
                  <div
                    key={q.id}
                    className={itemClass}
                    onClick={() => handleSelectQuestion(idx)}
                  >
                    {questionNumber}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <div className="text-[10px] text-slate-400 dark:text-slate-500 italic mb-2 text-center underline uppercase">
              Chú thích:
            </div>
            <div className="grid grid-cols-2 gap-3 text-[10px] dark:text-slate-400 ">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-slate-200   dark:bg-slate-700 border border-gray-300 dark:border-slate-600" />
                Chưa chọn
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500 dark:bg-blue-600" />
                Đã chọn
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 dark:bg-emerald-600" />
                Đúng
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500 dark:bg-rose-600" />
                Sai
              </div>
            </div>
          </div>
        </aside>

        <section className="flex-1 bg-slate-50 dark:bg-slate-900 p-6 md:p-8 pt-10 flex flex-col items-center justify-center overflow-hidden relative transition-colors">
          <div
            className={`w-full ${currentQuestion.passage || (currentQuestion.media && (Array.isArray(currentQuestion.media) ? currentQuestion.media.some((m) => m.type === "image") : currentQuestion.media.type === "image")) ? "max-w-6xl" : "max-w-3xl"} h-full bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-700/80 relative flex flex-col transition-all duration-500`}
          >
            <div className="absolute -top-3.5 left-6 bg-emerald-600 dark:bg-emerald-500 text-white px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider z-20 shadow-md">
              CÂU HỎI {currentIndex + 1}
            </div>

            <div className="flex-1 w-full h-full rounded-2xl overflow-hidden flex flex-col">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQuestion.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col flex-1 h-full w-full overflow-hidden"
                >
                  <QuestionCard
                    question={currentQuestion}
                    currentAnswer={userAnswers[currentQuestion.id]}
                    onAnswerChange={handleAnswerChange}
                    onSubmit={isPracticeMode ? handleSubmit : handleFinish}
                    isCorrect={isReviewMode ? (questionResults[currentQuestion.id] === "correct" || (currentQuestion as any).isCorrect) : isCorrect}
                    showFeedback={shouldShowFeedback}
                    onNext={handleNext}
                    isLastQuestion={currentIndex === totalQuestions - 1}
                    isReviewMode={isReviewMode}
                    isPracticeMode={isPracticeMode}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
export default ExamContainer;
