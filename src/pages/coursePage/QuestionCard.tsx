import React, { useMemo } from "react";
import { Input, Modal, Form, Select, Checkbox, Button, message, Space } from "antd";
import { Check, RotateCcw, AlertTriangle } from "lucide-react";
import { ExamOption, ExamQuestion } from "../../types";
import { MatchingQuestion } from "./MatchingQuestion";
import { tokenStorage } from "../../services/tokenStorage";
import { learningCmsService } from "../../services/learningCmsService";
import { AppImage } from "../../components/AppImagePreview";
import { useAuth } from "../../contexts/AuthContext";

const CHOICE_TYPES = ["multiple_choice", "audio_choice", "image_choice", "reading_comprehension", "multiple-choice", "listening"];

interface QuestionCardProps {
  question: ExamQuestion;
  currentAnswer?: string | string[] | Record<string, string>;
  onAnswerChange: (answer: string | string[] | Record<string, string>) => void;
  onSubmit: () => void;
  isCorrect?: boolean;
  showFeedback: boolean;
  onNext?: () => void;
  isLastQuestion?: boolean;
  isReviewMode?: boolean;
  isPracticeMode?: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  currentAnswer,
  onAnswerChange,
  onSubmit,
  isCorrect,
  showFeedback,
  onNext,
  isLastQuestion,
  isReviewMode,
  isPracticeMode = true,
}) => {
  const [regradeModalOpen, setRegradeModalOpen] = React.useState(false);
  const [regradeLoading, setRegradeLoading] = React.useState(false);
  const [regradeForm] = Form.useForm();
  const { hasPermission } = useAuth();

  React.useEffect(() => {
    if (regradeModalOpen) {
      let initialValues: any = {};
      if (CHOICE_TYPES.includes(question.type)) {
        const currentVal = question.correctAnswer;
        initialValues = {
          selectedOptionIds: Array.isArray(currentVal) ? currentVal : (currentVal ? [currentVal] : []),
        };
      } else if (question.type === "word_ordering" || question.type === "word-ordering") {
        initialValues = {
          tokens: Array.isArray(question.correctAnswer) ? question.correctAnswer.join(" ") : String(question.correctAnswer || ""),
        };
      } else if (question.type === "sentence_rewrite" || question.type === "hint_rewrite" || question.type === "fill-in-the-blank") {
        initialValues = {
          acceptedAnswers: Array.isArray(question.correctAnswer) ? question.correctAnswer.join("\n") : String(question.correctAnswer || ""),
        };
      } else if (question.type === "error_correction") {
        initialValues = {
          correctedSentence: String(question.correctAnswer || ""),
        };
      } else if (question.type === "matching") {
        const currentPairs = question.correctAnswer || {};
        initialValues = {
          matchingPairs: currentPairs,
        };
      }
      regradeForm.setFieldsValue(initialValues);
    }
  }, [regradeModalOpen, question, regradeForm]);

  const handleRegradeSubmit = async (values: any) => {
    try {
      setRegradeLoading(true);
      let correctAnswer: any = {};
      if (CHOICE_TYPES.includes(question.type)) {
        correctAnswer = { selectedOptionIds: values.selectedOptionIds };
      } else if (question.type === "word_ordering" || question.type === "word-ordering") {
        correctAnswer = {
          tokens: values.tokens.split(" ").filter(Boolean),
          caseSensitive: question.sourceSentence ? false : true, // safe default
          allowPunctuationVariants: true,
        };
      } else if (question.type === "sentence_rewrite" || question.type === "hint_rewrite" || question.type === "fill-in-the-blank") {
        correctAnswer = {
          acceptedAnswers: values.acceptedAnswers.split("\n").map((s: string) => s.trim()).filter(Boolean),
          gradingMode: "normalized",
        };
      } else if (question.type === "error_correction") {
        correctAnswer = { correctedSentence: values.correctedSentence };
      } else if (question.type === "matching") {
        const pairsArray = Object.entries(values.matchingPairs || {}).map(([left, right]) => ({
          leftItemId: left,
          rightItemId: right,
        }));
        correctAnswer = { pairs: pairsArray };
      }

      const res = await learningCmsService.questionVersions.regrade(
        question.questionVersionId!,
        correctAnswer
      );
      message.success(`Chấm lại thành công! Số câu trả lời được chấm lại: ${res.regradedAnswers}, số lượt làm bị ảnh hưởng: ${res.affectedAttempts}`);
      setRegradeModalOpen(false);
      window.location.reload();
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || "Chấm lại thất bại";
      message.error(errMsg);
    } finally {
      setRegradeLoading(false);
    }
  };

  const orderedWords = useMemo(() => {
    return Array.isArray(currentAnswer) ? currentAnswer : [];
  }, [currentAnswer]);

  const mediaItems = useMemo(() => {
    if (!question.media) return [];

    return Array.isArray(question.media) ? question.media : [question.media];
  }, [question.media]);

  const imageMedia = mediaItems.filter((m) => m.type === "image");

  const audioMedia = mediaItems.filter((m) => m.type === "audio");

  const hasSplitLayout = Boolean(question.passage) || imageMedia.length > 0;

  // =========================
  // Helpers
  // =========================

  const checkOptionIsCorrect = (
    option: string | ExamOption,
    correctAnswer: any
  ): boolean => {
    const norm = (s: any) => String(s ?? "").toLowerCase().trim();

    if (correctAnswer !== undefined && correctAnswer !== null && correctAnswer !== "") {
      if (typeof option === "string") {
        return norm(option) === norm(correctAnswer);
      }

      const optId = norm(option.id);
      const optLabel = norm(option.label);
      const optContent = norm(option.content);

      const matches = (val: any): boolean => {
        const v = norm(val);
        if (!v) return false;
        return v === optId || v === optLabel || v === optContent;
      };

      if (matches(correctAnswer)) return true;

      if (Array.isArray(correctAnswer)) {
        return correctAnswer.some(matches);
      }

      if (typeof correctAnswer === "object" && correctAnswer !== null) {
        if (Array.isArray((correctAnswer as any).selectedOptionIds)) {
          return (correctAnswer as any).selectedOptionIds.some(matches);
        }
        if ((correctAnswer as any).text) {
          return matches((correctAnswer as any).text);
        }
      }

      return false;
    }

    // Fallback: check if option object itself has isCorrect === true
    if (typeof option !== "string" && ((option as any).isCorrect === true || String((option as any).isCorrect) === "true")) {
      return true;
    }

    return false;
  };

  const getOptionValue = (option: string | ExamOption) =>
    typeof option === "string" ? option : option.id || option.content;

  const getOptionLabel = (option: string | ExamOption) =>
    typeof option === "string"
      ? option
      : [option.label, option.content].filter(Boolean).join(". ");

  const formatCorrectAnswer = (
    answer?: string | string[] | Record<string, string>,
  ) => {
    let targetAnswer = answer;
    if (targetAnswer === undefined || targetAnswer === null || targetAnswer === "") {
      const correctOpt = question.options?.find((o: any) => o && (o.isCorrect === true || String(o.isCorrect) === "true"));
      if (correctOpt) {
        if (typeof correctOpt === "string") return correctOpt;
        return [correctOpt.label, correctOpt.content].filter(Boolean).join(". ");
      }
      return "";
    }

    if (question.options && question.options.length > 0) {
      const norm = (s: any) => String(s ?? "").toLowerCase().trim();
      const ansStr = norm(targetAnswer);

      // 1. Match by option ID, label, or content
      let matchedOpt = question.options.find((o: any) => {
        const val = typeof o === "string" ? { content: o } : o;
        return (
          norm(val.id) === ansStr ||
          norm(val.label) === ansStr ||
          norm(val.content) === ansStr
        );
      });

      // 2. Fallback to option with isCorrect === true
      if (!matchedOpt) {
        matchedOpt = question.options.find((o: any) => {
          const val = typeof o === "string" ? { content: o } : o;
          return val.isCorrect === true || String(val.isCorrect) === "true";
        });
      }

      if (matchedOpt) {
        if (typeof matchedOpt === "string") return matchedOpt;
        return [matchedOpt.label, matchedOpt.content].filter(Boolean).join(". ");
      }
    }

    if (Array.isArray(targetAnswer)) {
      return targetAnswer.join(" ");
    }

    if (typeof targetAnswer === "object" && targetAnswer !== null) {
      return Object.entries(targetAnswer)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ");
    }

    return String(targetAnswer);
  };

  const isAnswerEmpty = () => {
    if (!currentAnswer) return true;

    if (typeof currentAnswer === "string") {
      return currentAnswer.trim() === "";
    }

    if (Array.isArray(currentAnswer)) {
      return currentAnswer.length === 0;
    }

    if (typeof currentAnswer === "object" && currentAnswer !== null) {
      return Object.keys(currentAnswer).length === 0;
    }

    return true;
  };

  // =========================
  // Word Ordering
  // =========================

  const addWord = (word: string) => {
    if (showFeedback) return;

    const newWords = [...orderedWords, word];
    onAnswerChange(newWords);
  };

  const removeWord = (indexToRemove: number) => {
    if (showFeedback) return;

    const newWords = orderedWords.filter((_, index) => index !== indexToRemove);

    onAnswerChange(newWords);
  };

  // =========================
  // Media
  // =========================

  const renderInlineMedia = () => {
    const inlineItems = hasSplitLayout ? audioMedia : mediaItems;

    if (inlineItems.length === 0) return null;

    return (
      <div className="mt-4 flex flex-col gap-4 bg-slate-100 dark:bg-slate-800/50 p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-600">
        {inlineItems.map((media, index) => (
          <div
            key={`${media.url}-${index}`}
            className="w-full flex justify-center"
          >
            {media.type === "audio" ? (
              <audio controls className="w-full h-10">
                <source src={media.url} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            ) : (
              <img
                src={media.url}
                alt={`Question Media ${index + 1}`}
                className="max-h-[400px] rounded-lg shadow-sm w-auto object-contain"
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  // =========================
  // Input Area
  // =========================

  const renderInputArea = () => {
    switch (question.type) {
      case "multiple_choice":
      case "audio_choice":
      case "image_choice":
      case "reading_comprehension":
      case "multiple-choice":
      case "listening":
      case "true-false":
        return (
          <div className="grid grid-cols-1 gap-3 mb-6">
            {question.options?.map((option, index) => {
              const optionValue = getOptionValue(option);
              const optionLabel = getOptionLabel(option);
              const isSelected = currentAnswer === optionValue;
              const isThisOptionCorrect = checkOptionIsCorrect(option, question.correctAnswer) || (showFeedback && isSelected && isCorrect === true);

              let containerClass =
                "flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-colors ";

              let inputClass = "w-4 h-4 focus:ring-2 ";

              let textClass = "ml-4 text-sm ";

              if (showFeedback && isThisOptionCorrect) {
                containerClass += "border-emerald-500 bg-emerald-50 border-2";
                textClass += "font-bold text-emerald-700";
              } else if (showFeedback && isSelected && !isThisOptionCorrect) {
                containerClass += "border-rose-400 bg-rose-50 border-2";
                textClass += "font-bold text-rose-700";
              } else if (isSelected) {
                containerClass += "border-indigo-500 bg-indigo-50/60 border-2";
                textClass += "font-bold text-indigo-700";
              } else {
                containerClass += "border-slate-200 bg-white hover:bg-slate-50";
                textClass += "font-medium text-slate-700";
              }

              return (
                <label key={`${optionValue}-${index}`} className={containerClass}>
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name={`q-${question.id}`}
                      value={optionValue}
                      checked={isSelected}
                      disabled={showFeedback}
                      onChange={(e) => onAnswerChange(e.target.value)}
                      className={inputClass}
                    />

                    <span className={textClass}>{optionLabel}</span>
                  </div>
                  {showFeedback && isThisOptionCorrect && (
                    <Check size={18} className="text-emerald-600 font-bold ml-2 shrink-0" />
                  )}
                </label>
              );
            })}
          </div>
        );

      case "sentence_rewrite":
      case "hint_rewrite":
      case "error_correction":
      case "fill-in-the-blank":
        return (
          <div className="mb-6">
            <Input.TextArea
              autoSize={{
                minRows: 2,
                maxRows: 6,
              }}
              placeholder="Nhập câu trả lời..."
              value={(currentAnswer as string) || ""}
              disabled={showFeedback}
              onChange={(e) => onAnswerChange(e.target.value)}
              className={`rounded-xl text-[16px] py-4 px-5 shadow-sm leading-relaxed ${
                showFeedback
                  ? isCorrect
                    ? "border-2 border-emerald-400 bg-emerald-50 text-emerald-700 font-bold"
                    : "border-2 border-rose-400 bg-rose-50 text-rose-700 font-bold"
                  : "border-slate-200 hover:border-emerald-400"
              }`}
            />
          </div>
        );

      case "word_ordering":
      case "word-ordering":
        return (
          <div className="space-y-4 mb-6">
            {/* Selected */}
            <div
              className={`min-h-[60px] p-4 rounded-xl border flex flex-wrap gap-2 items-start ${
                showFeedback
                  ? isCorrect
                    ? "border-emerald-400 bg-emerald-50"
                    : "border-rose-400 bg-rose-50"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              {orderedWords.length === 0 && (
                <span className="text-slate-400 italic text-sm">
                  Chọn các từ bên dưới...
                </span>
              )}

              {orderedWords.map((word, index) => (
                <button
                  type="button"
                  key={`${word}-${index}`}
                  disabled={showFeedback}
                  onClick={() => removeWord(index)}
                  className="px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-emerald-700 transition-colors"
                >
                  {word}
                </button>
              ))}
            </div>

            {/* Options */}
            <div className="flex flex-wrap gap-2">
              {question.options?.map((option, index) => {
                const word = getOptionValue(option);
                const isSelected = orderedWords.includes(word);

                return (
                  <button
                    type="button"
                    key={`${word}-${index}`}
                    disabled={isSelected || showFeedback}
                    onClick={() => addWord(word)}
                    className={`
                      px-3 py-1.5 text-sm font-medium rounded-md transition-all
                      ${
                        isSelected
                          ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                          : "bg-white text-slate-700 border border-slate-200 hover:border-emerald-400 hover:text-emerald-600 shadow-sm hover:shadow"
                      }
                    `}
                  >
                    {word}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case "matching":
        const matchingValue =
          currentAnswer &&
          typeof currentAnswer === "object" &&
          !Array.isArray(currentAnswer)
            ? currentAnswer
            : {};

        return (
          <MatchingQuestion
            question={question}
            value={matchingValue}
            onChange={(val) => onAnswerChange(val)}
            showFeedback={showFeedback}
            correctAnswer={question.correctAnswer as Record<string, string> | undefined}
          />
        );

      default:
        return <div>Unsupported question type</div>;
    }
  };

  // =========================
  // Header
  // =========================

  const renderQuestionHeader = () => (
    <div className="mb-6 shrink-0">
      <div className="text-[11px] text-emerald-700 font-bold mb-3 uppercase tracking-widest bg-emerald-50 inline-block px-3 py-1 rounded-full border border-emerald-100">
        {question.type.replace(/-/g, " ").replace(/_/g, " ")}
      </div>

      <h2 className="text-[16px] md:text-[17px] font-bold leading-relaxed text-slate-800 dark:text-slate-100">
        {question.questionContent}
      </h2>

      {question.incorrectSentence && (
        <div className="mt-3 p-4 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded-xl text-[15px] text-slate-700 dark:text-slate-300 font-medium">
          <span className="text-rose-600 dark:text-rose-400 font-bold block text-xs uppercase tracking-wider mb-1">Câu gốc cần sửa lỗi:</span>
          {question.incorrectSentence}
        </div>
      )}

      {question.sourceSentence && (
        <div className="mt-3 p-4 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-xl text-[15px] text-slate-700 dark:text-slate-300 font-medium">
          <span className="text-indigo-600 dark:text-indigo-400 font-bold block text-xs uppercase tracking-wider mb-1">Câu gốc cần viết lại:</span>
          {question.sourceSentence}
          {question.hintWord && (
            <span className="block mt-2 pt-2 border-t border-indigo-100/50 dark:border-indigo-900/50 text-xs text-slate-500 dark:text-slate-400">
              Gợi ý sử dụng từ: <strong className="text-indigo-600 dark:text-indigo-400 bg-indigo-100/50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded font-mono">{question.hintWord}</strong>
            </span>
          )}
        </div>
      )}

      {renderInlineMedia()}
    </div>
  );

  // =========================
  // Feedback
  // =========================

  const renderFeedbackBox = () => {
    if (!showFeedback) return null;
    const hasManagePerm = hasPermission(["learning.manage", "learning.write"], { mode: "any" });
    const correctAnsText = formatCorrectAnswer(question.correctAnswer);

    return (
      <div
        className={`mt-2 mb-6 p-5 rounded-2xl border-l-4 shadow-sm flex justify-between items-start gap-4 ${
          isCorrect
            ? "bg-emerald-50 border-emerald-400"
            : "bg-rose-50 border-rose-400"
        }`}
      >
        <div className="flex-1">
          <p
            className={`text-sm font-bold ${
              isCorrect ? "text-emerald-800" : "text-rose-800"
            }`}
          >
            {isCorrect ? "Tuyệt vời! Chính xác!" : "Giải thích chi tiết:"}
          </p>

          <div
            className={`text-[13px] mt-1.5 leading-relaxed ${
              isCorrect ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {!isCorrect && correctAnsText && (
              <div className="mb-2 text-[14px] flex items-center gap-2">
                <strong className="text-slate-700">Đáp án đúng:</strong>
                <span className="bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-lg text-emerald-900 font-bold font-mono">
                  {correctAnsText}
                </span>
              </div>
            )}

            <p>{question.explanation || (isCorrect ? "" : "Chưa có giải thích chi tiết cho câu hỏi này.")}</p>
          </div>
        </div>
        {isReviewMode && hasManagePerm && question.questionVersionId && (
          <Button
            type="dashed"
            danger
            size="small"
            icon={<RotateCcw size={13} />}
            onClick={() => setRegradeModalOpen(true)}
            className="flex-shrink-0 font-semibold border-rose-300 hover:border-rose-500 rounded-lg text-xs"
          >
            Chấm lại (Hotfix)
          </Button>
        )}
      </div>
    );
  };

  // =========================
  // Main Content
  // =========================

  const renderQuestionContent = () => (
    <div className="flex flex-col h-full w-full max-w-3xl mx-auto">
      {renderQuestionHeader()}

      <div className="flex-1 pb-4 overflow-x-hidden">{renderInputArea()}</div>

      {renderFeedbackBox()}
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-white/50 dark:bg-slate-800/10">
      <div className="flex-1 overflow-hidden p-6 md:p-8 flex flex-col lg:flex-row gap-6 lg:gap-10">
        {hasSplitLayout ? (
          <>
            {/* Left */}
            <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-6">
              {!question.passage && renderQuestionHeader()}

              {question.passage && (
                <div className="bg-emerald-50/50 p-5 md:p-6 rounded-2xl border border-emerald-100 shadow-inner">
                  <h3 className="text-sm font-bold text-emerald-800 mb-3 uppercase tracking-wider">
                    Đọc đoạn văn sau
                  </h3>

                  <p className="text-[15px] md:text-base leading-relaxed text-slate-700 whitespace-pre-wrap">
                    {question.passage}
                  </p>
                </div>
              )}

              {imageMedia.length > 0 && (
                <div className="bg-slate-50 p-2 md:p-4 rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center gap-4">
                  {imageMedia.map((media, index) => (
                    <div key={`${media.url}-${index}`} className="rounded-xl overflow-hidden shadow-sm">
                      <AppImage
                        src={media.url}
                        alt={`Context Media ${index + 1}`}
                        className="max-w-full rounded-xl object-contain"
                        maskText="Phóng to ảnh"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right */}
            <div className="flex-1 overflow-y-auto lg:pl-6 lg:border-l border-slate-200 pr-2 pt-2">
              {!question.passage ? (
                <div className="flex flex-col h-full w-full max-w-3xl mx-auto">
                  <div className="flex-1 pb-4 overflow-x-hidden pt-2">
                    <h3 className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-wider">
                      Chọn đáp án của bạn:
                    </h3>

                    {renderInputArea()}
                  </div>

                  {renderFeedbackBox()}
                </div>
              ) : (
                renderQuestionContent()
              )}
            </div>
          </>
        ) : (
          <div className="w-full h-full overflow-y-auto flex flex-col mx-auto max-w-3xl pr-2 pt-2">
            {renderQuestionContent()}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto px-6 py-4 md:px-8 md:py-5 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0 z-10 w-full">
        <div />

        {!showFeedback ? (
          isPracticeMode ? (
            <button
              onClick={onSubmit}
              disabled={isAnswerEmpty()}
              className="px-8 py-3 rounded-xl font-bold bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:shadow-none"
            >
              Nộp câu trả lời
            </button>
          ) : (
            <button
              onClick={isLastQuestion ? onSubmit : onNext}
              className="px-8 py-3 rounded-xl font-bold bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 flex items-center gap-2 transition-all group"
            >
              {isLastQuestion ? "NỘP BÀI THI" : "Câu tiếp theo"}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 transform group-hover:translate-x-1 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </button>
          )
        ) : (
          <button
            onClick={onNext}
            className="px-8 py-3 rounded-xl font-bold bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 flex items-center gap-2 transition-all group"
          >
            {isLastQuestion ? (isReviewMode ? "Thoát xem đáp án" : "Hoàn thành bài thi") : "Câu tiếp theo"}

            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 transform group-hover:translate-x-1 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </button>
        )}
      </div>

      <Modal
        title={
          <div className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <RotateCcw size={18} className="text-rose-500" />
            <span>Chấm lại Câu hỏi (Hotfix)</span>
          </div>
        }
        open={regradeModalOpen}
        onCancel={() => setRegradeModalOpen(false)}
        onOk={() => regradeForm.submit()}
        confirmLoading={regradeLoading}
        okText="Cập nhật & Chấm lại"
        cancelText="Hủy bỏ"
        className="rounded-2xl"
        destroyOnClose
      >
        <div className="py-2 space-y-4">
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 text-xs leading-relaxed flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Lưu ý:</strong> Thao tác này sẽ cập nhật đáp án đúng của <strong>phiên bản câu hỏi hiện tại</strong> và <strong>chấm lại ngay lập tức</strong> tất cả câu trả lời của học sinh trỏ tới phiên bản này.
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
            <span className="font-semibold block mb-1">Đề bài:</span>
            <div dangerouslySetInnerHTML={{ __html: question.questionContent }} className="font-medium text-slate-700 whitespace-pre-wrap" />
          </div>
          <Form form={regradeForm} layout="vertical" onFinish={handleRegradeSubmit}>
            {CHOICE_TYPES.includes(question.type) && question.options && (
              <Form.Item
                name="selectedOptionIds"
                label="Chọn các đáp án đúng"
                rules={[{ required: true, message: "Chọn ít nhất 1 đáp án đúng!" }]}
              >
                <Checkbox.Group className="flex flex-col gap-2">
                  {question.options.map((opt: any) => {
                    const id = opt.id || opt.content;
                    const label = opt.label || "";
                    const content = opt.content || opt;
                    return (
                      <Checkbox key={id} value={id}>
                        <span className="font-bold mr-1">{label}.</span> {content}
                      </Checkbox>
                    );
                  })}
                </Checkbox.Group>
              </Form.Item>
            )}

            {(question.type === "word_ordering" || question.type === "word-ordering") && (
              <Form.Item
                name="tokens"
                label="Mảng các từ (Tokens) - Phân cách bằng khoảng trắng"
                rules={[{ required: true, message: "Vui lòng nhập các từ!" }]}
              >
                <Input placeholder="ví dụ: She goes to school every day" className="rounded-xl" />
              </Form.Item>
            )}

            {(question.type === "sentence_rewrite" || question.type === "hint_rewrite" || question.type === "fill-in-the-blank") && (
              <Form.Item
                name="acceptedAnswers"
                label="Các đáp án được chấp nhận (Mỗi đáp án 1 dòng)"
                rules={[{ required: true, message: "Vui lòng nhập đáp án đúng!" }]}
              >
                <Input.TextArea rows={4} placeholder="Nhập các đáp án, xuống dòng cho mỗi đáp án khác nhau" className="rounded-xl" />
              </Form.Item>
            )}

            {question.type === "error_correction" && (
              <Form.Item
                name="correctedSentence"
                label="Câu chính xác sau khi sửa"
                rules={[{ required: true, message: "Vui lòng nhập câu đúng!" }]}
              >
                <Input placeholder="Nhập câu chính xác" className="rounded-xl" />
              </Form.Item>
            )}

            {question.type === "matching" && question.leftItems && question.rightItems && (
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-700 text-xs mb-2">Ghép các cặp:</h3>
                {question.leftItems.map((left: any) => {
                  const leftId = left.id || left;
                  const leftText = left.text || left;
                  return (
                    <Form.Item
                      key={leftId}
                      name={["matchingPairs", leftId]}
                      label={<span>Mục bên trái: <strong>{leftText}</strong></span>}
                      rules={[{ required: true, message: "Chọn mục ghép đôi phù hợp!" }]}
                    >
                      <Select placeholder="Chọn mục bên phải..." className="rounded-xl">
                        {(question.rightItems ?? []).map((right: any) => {
                          const rightId = right.id || right;
                          const rightText = right.text || right;
                          return (
                            <Select.Option key={rightId} value={rightId}>
                              {rightText}
                            </Select.Option>
                          );
                        })}
                      </Select>
                    </Form.Item>
                  );
                })}
              </div>
            )}
          </Form>
        </div>
      </Modal>
    </div>
  );
};
