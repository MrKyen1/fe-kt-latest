import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { QuestionCard } from "./QuestionCard";
import { ExamData } from "../../types";
import { ClockCircleOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import { Modal } from "antd";
import { studentLearningService } from "../../services/studentLearningService";

interface ExamContainerProps {
  examData: ExamData;
  isDarkMode?: boolean;
  toggleDarkMode?: () => void;
}

type AnswerValue = string | string[] | Record<string, string>;

const checkIsCorrect = (question: any, answer: AnswerValue | undefined): boolean => {
  if (answer === undefined || answer === null) return false;
  const correct = question.correctAnswer;
  if (correct === undefined || correct === null) return false;

  const normalizeText = (text: any): string => {
    if (typeof text !== "string") return "";
    return text
      .toLowerCase()
      .trim()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
      .replace(/\s+/g, " ");
  };

  switch (question.type) {
    case "multiple_choice":
    case "audio_choice":
    case "image_choice":
    case "reading_comprehension":
    case "multiple-choice":
    case "listening":
    case "true-false": {
      return normalizeText(answer) === normalizeText(correct);
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
    if (examData.status === "submitted") {
      examData.questions.forEach((q) => {
        if ((q as any).userAnswer !== undefined) {
          initial[q.id] = (q as any).userAnswer;
        }
      });
    }
    return initial;
  });

  const [questionResults, setQuestionResults] = useState<
    Record<string, "correct" | "wrong">
  >(() => {
    const initial: Record<string, "correct" | "wrong"> = {};
    if (examData.status === "submitted") {
      examData.questions.forEach((q) => {
        if ((q as any).isCorrect !== undefined) {
          initial[q.id] = (q as any).isCorrect ? "correct" : "wrong";
        }
      });
    }
    return initial;
  });

  const [timeRemaining, setTimeRemaining] = useState(examData.timeLimit);
  const [showFeedback, setShowFeedback] = useState(() => examData.status === "submitted");
  const [isCorrect, setIsCorrect] = useState(false);
  const [isExamComplete, setIsExamComplete] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(() => examData.status === "submitted");
  const [submitResult, setSubmitResult] = useState<{
    score?: string;
    maxScore?: string;
    percentage?: string;
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

  const currentQuestion = examData.questions[currentIndex];
  const totalQuestions = examData.questions.length;
  const progressPercent = (currentIndex / totalQuestions) * 100;

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

  // Timer logic
  useEffect(() => {
    if (isReviewMode) return;
    if (timeRemaining <= 0) {
      handleFinish();
      return;
    }
    const timer = setInterval(() => {
      setTimeRemaining((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeRemaining, isReviewMode]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    const status = questionResults[currentQuestion.id];
    if (status) {
      setShowFeedback(true);
      setIsCorrect(status === "correct");
    } else {
      setShowFeedback(false);
    }
  }, [currentQuestion.id, questionResults]);

  const handleAnswerChange = (answer: AnswerValue) => {
    setUserAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: answer,
    }));
  };

  const handleSubmit = () => {
    const evaluatedIsCorrect = checkIsCorrect(currentQuestion, userAnswers[currentQuestion.id]);
    const status = evaluatedIsCorrect ? "correct" : "wrong";
    setQuestionResults((prev) => ({
      ...prev,
      [currentQuestion.id]: status,
    }));
  };

  const handleNext = () => {
    if (isReviewMode) {
      if (currentIndex < totalQuestions - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        navigate(-1);
      }
      return;
    }
    setShowFeedback(false);
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleFinish();
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
      case "true-false":
        return { selectedOptionIds: [String(answer)] };
      case "word_ordering":
      case "word-ordering":
        return { tokens: Array.isArray(answer) ? answer : [] };
      case "sentence_rewrite":
      case "hint_rewrite":
      case "fill-in-the-blank":
        return { text: String(answer ?? "") };
      case "error_correction":
        return { correctedSentence: String(answer ?? "") };
      case "matching":
        return {
          pairs:
            answer && typeof answer === "object" && !Array.isArray(answer)
              ? Object.entries(answer).map(([leftItemId, rightItemId]) => ({
                leftItemId,
                rightItemId,
              }))
              : [],
        };
      default:
        return answer ?? {};
    }
  };

  const handleFinish = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const result = (await studentLearningService.attempts.submit(examData.id, {
        answers: examData.questions.map((question) => ({
          questionId: question.id,
          answer: toBackendAnswer(question, userAnswers[question.id]),
        })),
      })) as { score?: string; maxScore?: string; percentage?: string };

      setSubmitResult(result);
      setIsExamComplete(true);
      setIsReviewMode(false);
      setShowFeedback(false);
    } catch (error) {
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
    if (questionResults[question.id]) {
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

  const shouldShowFeedback = showFeedback || isReviewMode;

  const handleReview = () => {
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
              <span className="font-black text-emerald-600 dark:text-emerald-400">
                {submitResult?.score ?? "-"}
              </span>{" "}
              trên tổng điểm{" "}
              <span className="font-black text-slate-900 dark:text-slate-100">
                {submitResult?.maxScore ?? "-"}
              </span>{" "}
              ({submitResult?.percentage ?? "-"}%).
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={() => navigate(-1)}
                className="px-6 py-4 rounded-3xl bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-semibold hover:bg-slate-200 transition"
              >
                Quay lại
              </button>
              <button
                onClick={handleResetExam}
                className="px-6 py-4 rounded-3xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
              >
                Làm lại attempt mới
              </button>
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
            src="/src/assets/logo/logo.png"
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
                  Tiến độ làm bài
                </span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {currentIndex + 1}/{totalQuestions}
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
              Danh sách câu hỏi
            </div>
            <div className="grid grid-cols-5 gap-2">
              {examData.questions.map((q, idx) => {
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
                    // 🟦 Câu hiện tại + chưa chấm + ĐÃ CHỌN
                    itemClass +=
                      " bg-blue-700 text-white border-blue-200 dark:bg-blue-600 dark:text-white dark:border-blue-700";
                  } else {
                    // 🔵 Câu hiện tại + chưa chấm + CHƯA CHỌN
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
                    onClick={() => (isReviewMode || !showFeedback) && setCurrentIndex(idx)}
                  >
                    {idx + 1}
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
                    onSubmit={handleSubmit}
                    isCorrect={isCorrect}
                    showFeedback={shouldShowFeedback}
                    onNext={handleNext}
                    isLastQuestion={currentIndex === totalQuestions - 1}
                    isReviewMode={isReviewMode}
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
