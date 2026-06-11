import React, { useMemo } from "react";
import { Input } from "antd";
import { ExamOption, ExamQuestion } from "../../types";
import { MatchingQuestion } from "./MatchingQuestion";

interface QuestionCardProps {
  question: ExamQuestion;
  currentAnswer?: string | string[] | Record<string, string>;
  onAnswerChange: (answer: string | string[] | Record<string, string>) => void;
  onSubmit: () => void;
  isCorrect?: boolean;
  showFeedback: boolean;
  onNext?: () => void;
  isLastQuestion?: boolean;
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
}) => {
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

  const getOptionValue = (option: string | ExamOption) =>
    typeof option === "string" ? option : option.id || option.content;

  const getOptionLabel = (option: string | ExamOption) =>
    typeof option === "string"
      ? option
      : [option.label, option.content].filter(Boolean).join(". ");

  const formatCorrectAnswer = (
    answer?: string | string[] | Record<string, string>,
  ) => {
    if (answer === undefined) return "";

    if (Array.isArray(answer)) {
      return answer.join(" ");
    }

    if (typeof answer === "object" && answer !== null) {
      return Object.entries(answer)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ");
    }

    return String(answer);
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

              let containerClass =
                "flex items-center p-4 border rounded-xl cursor-pointer transition-colors ";

              let inputClass = "w-4 h-4 focus:ring-2 ";

              let textClass = "ml-4 text-sm ";

              if (showFeedback && question.correctAnswer === optionValue) {
                containerClass += "border-emerald-400 bg-emerald-50 border-2";

                textClass += "font-bold text-emerald-700";
              } else if (showFeedback && isSelected && !isCorrect) {
                containerClass += "border-rose-400 bg-rose-50 border-2";

                textClass += "font-bold text-rose-700";
              } else if (isSelected) {
                containerClass += "border-emerald-400 bg-emerald-50 border-2";

                textClass += "font-bold text-emerald-700";
              } else {
                containerClass += "border-slate-200 bg-white hover:bg-slate-50";

                textClass += "font-medium text-slate-700";
              }

              return (
                <label key={`${optionValue}-${index}`} className={containerClass}>
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

      {renderInlineMedia()}
    </div>
  );

  // =========================
  // Feedback
  // =========================

  const renderFeedbackBox = () => {
    if (!showFeedback) return null;

    return (
      <div
        className={`mt-2 mb-6 p-5 rounded-2xl border-l-4 shadow-sm flex gap-4 ${
          isCorrect
            ? "bg-emerald-50 border-emerald-400"
            : "bg-rose-50 border-rose-400"
        }`}
      >
        <div>
          <p
            className={`text-sm font-bold ${
              isCorrect ? "text-emerald-800" : "text-rose-800"
            }`}
          >
            {isCorrect ? "Tuyệt vời! Chính xác!" : "Giải thích chi tiết:"}
          </p>

          <p
            className={`text-[13px] mt-1.5 leading-relaxed ${
              isCorrect ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {!isCorrect && question.correctAnswer !== undefined && (
              <span className="block mb-2 text-[14px]">
                <strong>Đáp án đúng:</strong>

                <span className="bg-rose-100 px-2 py-0.5 rounded ml-2 text-rose-900 font-mono">
                  {formatCorrectAnswer(question.correctAnswer)}
                </span>
              </span>
            )}

            {question.explanation}
          </p>
        </div>
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
                    <img
                      key={`${media.url}-${index}`}
                      src={media.url}
                      alt={`Context Media ${index + 1}`}
                      className="max-w-full rounded-lg shadow-sm object-contain"
                    />
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
          <button
            onClick={onSubmit}
            disabled={isAnswerEmpty()}
            className="px-8 py-3 rounded-xl font-bold bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:shadow-none"
          >
            Nộp câu trả lời
          </button>
        ) : (
          <button
            onClick={onNext}
            className="px-8 py-3 rounded-xl font-bold bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 flex items-center gap-2 transition-all group"
          >
            {isLastQuestion ? "Hoàn thành bài thi" : "Câu tiếp theo"}

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
    </div>
  );
};
