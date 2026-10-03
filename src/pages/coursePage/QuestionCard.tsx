import React, { useMemo } from "react";
import { Input, Modal, Form, Select, Checkbox, Button, message, Space } from "antd";
import { Check, RotateCcw, AlertTriangle } from "lucide-react";
import { ExamOption, ExamQuestion } from "../../types";
import { MatchingQuestion } from "./MatchingQuestion";
import { tokenStorage } from "../../services/tokenStorage";
import { learningCmsService } from "../../services/learningCmsService";
import { AppImage } from "../../components/AppImagePreview";
import { useAuth } from "../../contexts/AuthContext";
import { resolveMediaUrl } from "../../services/apiClient";
import { normalizeLineBreaks } from "../../utils/textFormatters";
import { shuffleTokensWithSeed } from "../../utils/shuffleTokens";

const CHOICE_TYPES = [
  "multiple_choice",
  "audio_choice",
  "image_choice",
  "audio_image_choice",
  "true_false",
  "reading_comprehension",
  "multiple-choice",
  "listening",
  "true-false",
];

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
  isMastered?: boolean;
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
  isMastered = false,
}) => {
  const [regradeModalOpen, setRegradeModalOpen] = React.useState(false);
  const [regradeLoading, setRegradeLoading] = React.useState(false);
  const [regradeForm] = Form.useForm();
  const { hasPermission, hasRole } = useAuth();

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

  const isWordOrdering = question.type === "word_ordering" || question.type === "word-ordering";

  // Đảm bảo các từ/token trong câu hỏi sắp xếp từ luôn được xáo trộn, không trùng thứ tự với đáp án
  const displayWordOptions = useMemo(() => {
    const rawOpts = question.options || [];
    if (!isWordOrdering || rawOpts.length <= 1) return rawOpts;

    const corrTokens: string[] = Array.isArray(question.correctAnswer)
      ? question.correctAnswer.map(String)
      : typeof question.correctAnswer === "string"
      ? question.correctAnswer.split(" ").filter(Boolean)
      : [];

    const isIdentical =
      corrTokens.length === rawOpts.length &&
      rawOpts.every((opt: any, idx: number) => {
        const w = typeof opt === "string" ? opt : opt?.id || opt?.content;
        return w === corrTokens[idx];
      });

    if (isIdentical) {
      return shuffleTokensWithSeed(rawOpts as string[], question.id || "word_ord");
    }
    return rawOpts;
  }, [isWordOrdering, question.id, question.options, question.correctAnswer]);

  // Lưu vết index của từng thẻ từ đã chọn để hỗ trợ câu có nhiều từ trùng nhau (VD: "an", "an")
  const [selectedWordIndices, setSelectedWordIndices] = React.useState<number[]>([]);

  React.useEffect(() => {
    setSelectedWordIndices((prev) => {
      const opts = displayWordOptions;
      if (orderedWords.length === 0) return [];
      // Kiểm tra xem mảng index hiện tại có còn khớp với orderedWords không
      if (
        prev.length === orderedWords.length &&
        prev.every((optIdx, i) => {
          const opt = opts[optIdx];
          const w = typeof opt === "string" ? opt : opt?.id || opt?.content;
          return w === orderedWords[i];
        })
      ) {
        return prev;
      }
      // Khôi phục danh sách index tương ứng theo thứ tự từng từ (dùng khi load lại câu đã trả lời)
      const used = new Set<number>();
      const reconstructed: number[] = [];
      for (const word of orderedWords) {
        const foundIdx = opts.findIndex((opt, idx) => {
          if (used.has(idx)) return false;
          const w = typeof opt === "string" ? opt : opt?.id || opt?.content;
          return w === word;
        });
        if (foundIdx !== -1) {
          used.add(foundIdx);
          reconstructed.push(foundIdx);
        }
      }
      return reconstructed;
    });
  }, [question.id, displayWordOptions, orderedWords]);

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

  const getOptionLabel = (option: string | ExamOption) => {
    const raw = typeof option === "string"
      ? option
      : [option.label, option.content].filter(Boolean).join(". ");
    return normalizeLineBreaks(raw);
  };

  const resolveItemText = (itemId: any): string => {
    if (itemId === undefined || itemId === null || itemId === "") return "";
    const isUuid = (val: any) =>
      !val ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val).trim()) ||
      /^[0-9a-f]{24}$/i.test(String(val).trim());

    if (typeof itemId !== "string") {
      const raw = itemId.text || itemId.content || itemId.label || itemId.prompt || itemId.title;
      if (raw && !isUuid(raw)) return raw;
      if (itemId.media) return "[Hình ảnh/Âm thanh]";
      return isUuid(itemId.id) ? "" : String(itemId.id || "");
    }

    const norm = (s: any) => String(s ?? "").trim();

    // 1. Search in leftItems
    const leftItems: any[] = (question.leftItems || (question as any).detail?.leftItems || []);
    const fLeft = leftItems.find((l: any) => norm(l?.id || l) === norm(itemId));
    if (fLeft) {
      const txt = fLeft.text || fLeft.content || fLeft.label || fLeft.prompt || (typeof fLeft === "string" ? fLeft : "");
      if (txt && !isUuid(txt)) return txt;
      if (fLeft.media) return "[Hình ảnh/Âm thanh]";
    }

    // 2. Search in rightItems
    const rightItems: any[] = (question.rightItems || (question as any).detail?.rightItems || []);
    const fRight = rightItems.find((r: any) => norm(r?.id || r) === norm(itemId));
    if (fRight) {
      const txt = fRight.text || fRight.content || fRight.label || fRight.prompt || (typeof fRight === "string" ? fRight : "");
      if (txt && !isUuid(txt)) return txt;
      if (fRight.media) return "[Hình ảnh/Âm thanh]";
    }

    // 3. Search in options
    const options: any[] = question.options || (question as any).detail?.options || [];
    const fOpt = options.find((o: any) => norm(o?.id || o?.key || o) === norm(itemId));
    if (fOpt) {
      const txt = fOpt.content || fOpt.text || fOpt.label || fOpt.title || (typeof fOpt === "string" ? fOpt : "");
      if (txt && !isUuid(txt)) return txt;
      if (fOpt.media || fOpt.imageUrl || fOpt.image) return "[Hình ảnh/Âm thanh]";
    }

    // 4. Search in pairs
    const pairs: any[] = (question as any).pairs || (question as any).detail?.pairs || (question as any).matchingPairs || [];
    const fPair = pairs.find(
      (p: any) => norm(p.leftItemId || p.leftId || p.id) === norm(itemId) || norm(p.rightItemId || p.rightId) === norm(itemId)
    );
    if (fPair) {
      if (norm(fPair.leftItemId || fPair.leftId || fPair.id) === norm(itemId)) {
        const txt = fPair.leftText || fPair.leftContent || fPair.text || "";
        if (txt && !isUuid(txt)) return txt;
        if (fPair.leftMedia) return "[Hình ảnh/Âm thanh]";
      }
      if (norm(fPair.rightItemId || fPair.rightId) === norm(itemId)) {
        const txt = fPair.rightText || fPair.rightContent || fPair.text || "";
        if (txt && !isUuid(txt)) return txt;
        if (fPair.rightMedia) return "[Hình ảnh/Âm thanh]";
      }
    }

    if (isUuid(itemId)) return "";
    return itemId;
  };

  const formatCorrectAnswer = (
    answer?: string | string[] | Record<string, string>,
  ) => {
    let targetAnswer = answer;
    const isUuid = (val: any) =>
      !val ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val).trim()) ||
      /^[0-9a-f]{24}$/i.test(String(val).trim());

    // Helper format 1 option
    const formatOption = (opt: any) => {
      if (typeof opt === "string") return opt;
      const content = opt.content && !isUuid(opt.content) ? opt.content : (opt.media ? "[Hình ảnh/Âm thanh]" : "");
      return [opt.label, content].filter(Boolean).join(". ") || opt.label || "";
    };

    // 1. If question has options and targetAnswer is empty/undefined, find all correct options
    if (targetAnswer === undefined || targetAnswer === null || targetAnswer === "") {
      const correctOpts = question.options?.filter((o: any) => o && (o.isCorrect === true || String(o.isCorrect) === "true")) || [];
      if (correctOpts.length > 0) {
        return correctOpts.map(formatOption).join(", ");
      }
      return "";
    }

    // 2. Array of answers (e.g. string[] of option IDs or multiple correct answers)
    if (Array.isArray(targetAnswer)) {
      if (question.options && question.options.length > 0 && targetAnswer.length > 0 && typeof targetAnswer[0] === "string") {
        const norm = (s: any) => String(s ?? "").toLowerCase().trim();
        const labels = targetAnswer.map((ans) => {
          const ansStr = norm(ans);
          const matchedOpt = question.options?.find((o: any) => {
            const val = typeof o === "string" ? { content: o } : o;
            return norm(val.id) === ansStr || norm(val.label) === ansStr || norm(val.content) === ansStr;
          });
          return matchedOpt ? formatOption(matchedOpt) : ans;
        });
        return labels.join(", ");
      }
      return targetAnswer.join(" ");
    }

    // 3. Object with selectedOptionIds (multiple choice payload)
    if (typeof targetAnswer === "object" && targetAnswer !== null && Array.isArray((targetAnswer as any).selectedOptionIds)) {
      const ids: string[] = (targetAnswer as any).selectedOptionIds;
      const labels = ids.map((id) => {
        const opt = question.options?.find((o: any) => o?.id === id || o?.key === id);
        return opt ? formatOption(opt) : id;
      });
      return labels.join(", ");
    }

    // 4. Object with correctOptionIds
    if (typeof targetAnswer === "object" && targetAnswer !== null && Array.isArray((targetAnswer as any).correctOptionIds)) {
      const ids: string[] = (targetAnswer as any).correctOptionIds;
      const labels = ids.map((id) => {
        const opt = question.options?.find((o: any) => o?.id === id || o?.key === id);
        return opt ? formatOption(opt) : id;
      });
      return labels.join(", ");
    }

    // 5. Choice types where options exist and targetAnswer is a single string
    if (question.options && question.options.length > 0 && typeof targetAnswer !== "object") {
      const norm = (s: any) => String(s ?? "").toLowerCase().trim();
      const ansStr = norm(targetAnswer);

      // Check if all correct options should be shown if targetAnswer matches only one but options has multiple
      const allCorrectOpts = question.options.filter((o: any) => {
        const val = typeof o === "string" ? { content: o } : o;
        return val.isCorrect === true || String(val.isCorrect) === "true";
      });

      if (allCorrectOpts.length > 1) {
        return allCorrectOpts.map(formatOption).join(", ");
      }

      // Match by option ID, label, or content
      let matchedOpt = question.options.find((o: any) => {
        const val = typeof o === "string" ? { content: o } : o;
        return (
          norm(val.id) === ansStr ||
          norm(val.label) === ansStr ||
          norm(val.content) === ansStr
        );
      });

      if (!matchedOpt && allCorrectOpts.length > 0) {
        matchedOpt = allCorrectOpts[0];
      }

      if (matchedOpt) {
        return formatOption(matchedOpt);
      }
    }

    // 3. Matching questions (or object with pairs / matches)
    const isMatching = question.type === "matching" || (question as any).type === "matching_pair";
    if (isMatching || (typeof targetAnswer === "object" && targetAnswer !== null)) {
      let pairsList: Array<[string, string]> = [];
      if (Array.isArray((targetAnswer as any).pairs)) {
        pairsList = (targetAnswer as any).pairs.map((p: any) => [p.leftItemId || p.leftId || p.left, p.rightItemId || p.rightId || p.right]);
      } else if (Array.isArray((targetAnswer as any).matches)) {
        pairsList = (targetAnswer as any).matches.map((p: any) => [p.leftItemId || p.leftId || p.left, p.rightItemId || p.rightId || p.right]);
      } else if (Array.isArray(targetAnswer)) {
        if (targetAnswer.length > 0 && typeof targetAnswer[0] === "object") {
          pairsList = targetAnswer.map((p: any) => [p.leftItemId || p.leftId || p.left || p[0], p.rightItemId || p.rightId || p.right || p[1]]);
        }
      } else if (typeof targetAnswer === "object" && targetAnswer !== null) {
        pairsList = Object.entries(targetAnswer);
      }

      if (pairsList.length > 0) {
        return pairsList
          .map(([left, right]) => {
            const lText = resolveItemText(left);
            const rText = resolveItemText(right);
            return `${lText} → ${rText}`;
          })
          .join(", ");
      }
    }

    // 4. Array of answers (e.g. word ordering, fill in blanks)
    if (Array.isArray(targetAnswer)) {
      return targetAnswer.join(" ");
    }

    // 5. Plain object fallback
    if (typeof targetAnswer === "object" && targetAnswer !== null) {
      return Object.entries(targetAnswer)
        .map(([key, value]) => `${resolveItemText(key)}: ${resolveItemText(value)}`)
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

  const addWord = (word: string, optionIndex: number) => {
    if (showFeedback) return;

    setSelectedWordIndices((prev) => [...prev, optionIndex]);
    const newWords = [...orderedWords, word];
    onAnswerChange(newWords);
  };

  const removeWord = (indexToRemove: number) => {
    if (showFeedback) return;

    setSelectedWordIndices((prev) => prev.filter((_, index) => index !== indexToRemove));
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
      <div className="mt-4 flex flex-col gap-4 bg-slate-100 p-4 rounded-xl border border-dashed border-slate-300">
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
      case "audio_image_choice":
      case "true_false":
      case "reading_comprehension":
      case "multiple-choice":
      case "listening":
      case "true-false": {
        // Tự động nhận diện động dựa trên kết quả trả về từ backend:
        // Nếu có nhiều hơn 1 đáp án đúng (từ question.options có isCorrect, hoặc question.correctAnswer là mảng/chứa nhiều ID)
        const correctCount = (question.options || []).filter((opt: any) =>
          checkOptionIsCorrect(opt, question.correctAnswer)
        ).length;

        const isMulti =
          correctCount > 1 ||
          (Array.isArray(question.correctAnswer) && question.correctAnswer.length > 1) ||
          (typeof question.correctAnswer === "object" && question.correctAnswer !== null && (
            (Array.isArray((question.correctAnswer as any).selectedOptionIds) && (question.correctAnswer as any).selectedOptionIds.length > 1) ||
            (Array.isArray((question.correctAnswer as any).correctOptionIds) && (question.correctAnswer as any).correctOptionIds.length > 1)
          ));

        const selectedAnswers: string[] = Array.isArray(currentAnswer)
          ? currentAnswer.map(String)
          : currentAnswer !== undefined && currentAnswer !== null && currentAnswer !== ""
          ? [String(currentAnswer)]
          : [];

        const handleOptionToggle = (optVal: string) => {
          if (isMulti) {
            const exists = selectedAnswers.includes(optVal);
            const nextAnswers = exists
              ? selectedAnswers.filter((id) => id !== optVal)
              : [...selectedAnswers, optVal];
            onAnswerChange(nextAnswers);
          } else {
            onAnswerChange(optVal);
          }
        };

        return (
          <div className="grid grid-cols-1 gap-3 mb-6">
            {question.options?.map((option, index) => {
              const optionValue = String(getOptionValue(option));
              const optionLabel = getOptionLabel(option);
              const isSelected = isMulti
                ? selectedAnswers.includes(optionValue)
                : (currentAnswer !== undefined && String(currentAnswer) === optionValue);
              const isThisOptionCorrect = checkOptionIsCorrect(option, question.correctAnswer) || (showFeedback && isSelected && isCorrect === true);

              let containerClass =
                "flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-colors ";

              let inputClass = isMulti
                ? "w-4 h-4 rounded-full text-emerald-600 focus:ring-emerald-500 cursor-pointer appearance-none border border-slate-300 checked:bg-emerald-500 checked:border-emerald-500 relative flex items-center justify-center "
                : "w-4 h-4 rounded-full text-emerald-600 focus:ring-emerald-500 cursor-pointer ";

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
                    <div className="relative flex items-center justify-center">
                      <input
                        type={isMulti ? "checkbox" : "radio"}
                        name={`q-${question.id}`}
                        value={optionValue}
                        checked={isSelected}
                        disabled={showFeedback}
                        onChange={() => handleOptionToggle(optionValue)}
                        className={`w-4 h-4 rounded-full cursor-pointer transition-all ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-500 ring-2 ring-emerald-200"
                            : "border border-slate-300 bg-white hover:border-emerald-400"
                        }`}
                        style={{ appearance: "none", WebkitAppearance: "none" }}
                      />
                      {isSelected && (
                        <div className="absolute w-1.5 h-1.5 bg-white rounded-full pointer-events-none" />
                      )}
                    </div>

                    <div className="flex-1 ml-4">
                      {optionLabel && <span className={`${textClass.trim()} whitespace-pre-line`}>{optionLabel}</span>}
                      {typeof option !== "string" && (option.media?.url || (option as any).imageUrl) && (
                        <div className="mt-2 max-w-[220px] max-h-[150px] rounded-lg overflow-hidden border border-slate-200 bg-white">
                          <AppImage
                            src={resolveMediaUrl(option.media?.url || (option as any).imageUrl)}
                            alt={optionLabel || "Option"}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  {showFeedback && isThisOptionCorrect && (
                    <Check size={18} className="text-emerald-600 font-bold ml-2 shrink-0" />
                  )}
                </label>
              );
            })}
          </div>
        );
      }

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
              {displayWordOptions?.map((option, index) => {
                const word = getOptionValue(option);
                const isSelected = selectedWordIndices.includes(index);

                return (
                  <button
                    type="button"
                    key={`${word}-${index}`}
                    disabled={isSelected || showFeedback}
                    onClick={() => addWord(word, index)}
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

  const renderQuestionHeader = () => {
    const promptText = normalizeLineBreaks(question.questionContent ?? "").trim();
    const extraIncorrect =
      question.incorrectSentence &&
      question.incorrectSentence.trim() !== promptText &&
      !promptText.includes(question.incorrectSentence.trim())
        ? normalizeLineBreaks(question.incorrectSentence.trim())
        : "";
    const extraSource =
      question.sourceSentence &&
      question.sourceSentence.trim() !== promptText &&
      !promptText.includes(question.sourceSentence.trim())
        ? normalizeLineBreaks(question.sourceSentence.trim())
        : "";

    return (
      <div className="mb-6 shrink-0">
        <h2 className="text-[16px] md:text-[17px] font-bold leading-relaxed text-slate-800 whitespace-pre-line">
          {normalizeLineBreaks(question.questionContent)}
        </h2>

        {extraIncorrect && (
          <div className="mt-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[15px] text-slate-800 font-medium whitespace-pre-line">
            {extraIncorrect}
          </div>
        )}

        {(extraSource || question.hintWord) && (
          <div className="mt-2.5 p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl text-[15px] text-slate-800 font-medium space-y-2">
            {extraSource && <div className="whitespace-pre-line">{extraSource}</div>}
            {question.hintWord && (
              <div className="text-xs text-slate-600">
                Gợi ý sử dụng từ:{" "}
                <strong className="text-indigo-600 bg-indigo-100/70 px-2 py-0.5 rounded font-mono">
                  {question.hintWord}
                </strong>
              </div>
            )}
          </div>
        )}

        {renderInlineMedia()}
      </div>
    );
  };

  // =========================
  // Feedback
  // =========================

  const renderFeedbackBox = () => {
    if (!showFeedback) return null;
    const hasManagePerm = hasRole("admin") && hasPermission("learning.manage");
    const correctAnsText = formatCorrectAnswer(question.correctAnswer);
    const normalizedExplanation = normalizeLineBreaks(question.explanation || "");
    const hasExplanation = Boolean(normalizedExplanation && normalizedExplanation.trim());

    return (
      <div
        className={`mt-2 mb-[5px] p-4 rounded-2xl border-l-4 shadow-sm flex justify-between items-start gap-4 ${
          isCorrect
            ? "bg-emerald-50 border-emerald-400"
            : "bg-rose-50 border-rose-400"
        }`}
      >
        <div className="flex-1">
          {(isCorrect || hasExplanation) && (
            <p
              className={`text-sm font-bold ${
                isCorrect ? "text-emerald-800" : "text-rose-800"
              }`}
            >
              {isCorrect ? "Tuyệt vời! Chính xác!" : "Giải thích chi tiết:"}
            </p>
          )}

          <div
            className={`text-[13px] ${isCorrect || hasExplanation ? "mt-1.5" : ""} leading-relaxed ${
              isCorrect ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {!isCorrect && correctAnsText && (
              <div className={`${hasExplanation ? "mb-2" : ""} text-[14px] flex flex-wrap items-center gap-2`}>
                <strong className="text-slate-700">Đáp án đúng:</strong>
                <span className="bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg text-emerald-900 font-bold font-mono inline-block max-w-full break-words leading-relaxed whitespace-pre-line">
                  {correctAnsText}
                </span>
              </div>
            )}

            {hasExplanation && <p className="whitespace-pre-line">{normalizedExplanation}</p>}
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

      <div className="flex-1 pb-2 overflow-x-hidden">{renderInputArea()}</div>

      {renderFeedbackBox()}
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-white/50">
      <div className="flex-1 overflow-hidden px-6 pt-6 pb-[5px] md:px-8 md:pt-8 md:pb-[5px] flex flex-col lg:flex-row gap-6 lg:gap-10">
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
                  <div className="flex-1 pb-2 overflow-x-hidden pt-2">
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
            className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg flex items-center gap-2 transition-all group ${
              isLastQuestion && isReviewMode && !isMastered
                ? "bg-amber-600 hover:bg-amber-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {isLastQuestion
              ? isReviewMode
                ? isMastered
                  ? "Hoàn thành & Xem kết quả"
                  : "Làm lại các câu sai →"
                : "Hoàn thành bài thi"
              : "Câu tiếp theo"}

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
                  const leftMedia = left.media;
                  const isUuid = (t?: string) => !t || t === leftId || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t.trim());
                  const leftText = leftMedia && isUuid(left.text) ? "" : (left.text || (leftMedia ? "" : left));
                  return (
                    <Form.Item
                      key={leftId}
                      name={["matchingPairs", leftId]}
                      label={
                        <div className="flex items-center gap-2">
                          <span>Mục bên trái:</span>
                          {leftMedia && (
                            leftMedia.type === "image" ? (
                              <AppImage
                                src={resolveMediaUrl(leftMedia.url)}
                                alt={leftText || "Ảnh"}
                                className="w-8 h-8 rounded object-cover border border-slate-200"
                              />
                            ) : (
                              // eslint-disable-next-line jsx-a11y/media-has-caption
                              <audio src={resolveMediaUrl(leftMedia.url)} controls className="h-6 max-w-[150px]" />
                            )
                          )}
                          {leftText && <strong>{leftText}</strong>}
                        </div>
                      }
                      rules={[{ required: true, message: "Chọn mục ghép đôi phù hợp!" }]}
                    >
                      <Select placeholder="Chọn mục bên phải..." className="rounded-xl">
                        {(question.rightItems ?? []).map((right: any) => {
                          const rightId = right.id || right;
                          const rightMedia = right.media;
                          const isRightUuid = (t?: string) =>
                            !t ||
                            t === rightId ||
                            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(t).trim()) ||
                            /^[0-9a-f]{24}$/i.test(String(t).trim());
                          const rawRightText = right.text || (typeof right === "string" ? right : "");
                          const rightLabel = rightMedia && isRightUuid(rawRightText) ? "Hình ảnh" : (rawRightText || (rightMedia ? "Hình ảnh" : rightId));
                          return (
                            <Select.Option key={rightId} value={rightId}>
                              <div className="flex items-center gap-2">
                                {rightMedia && rightMedia.type === "image" && (
                                  <img
                                    src={resolveMediaUrl(rightMedia.url)}
                                    alt="Ảnh"
                                    className="w-6 h-6 rounded object-cover border border-slate-200 shrink-0 inline-block mr-1"
                                  />
                                )}
                                <span>{rightLabel}</span>
                              </div>
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
