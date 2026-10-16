import React, { useMemo, useCallback } from "react";
import { Input, Modal, Form, Select, Checkbox, Button, message, Space } from "antd";
import { Check, RotateCcw, AlertTriangle, X } from "lucide-react";
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

  const imageMedia = mediaItems.filter(
    (m) => m.type === "image" || /\.(png|jpe?g|gif|webp|svg)$/i.test(m.url || "")
  );

  const audioMedia = mediaItems.filter(
    (m) => m.type === "audio" || /\.(mp3|wav|ogg|m4a|aac)$/i.test(m.url || "")
  );

  const hasSplitLayout = Boolean(question.passage) || imageMedia.length > 0;

  const isAudioFillBlanks = question.type === "audio_fill_blanks" || (question as any).type === "audio-fill-blanks";
  const audioBlanksList: any[] = useMemo(() => {
    return question.detail?.blanks || (question as any).blanks || [];
  }, [question]);

  const userBlanksMap: Record<string, string> = useMemo(() => {
    if (!currentAnswer) return {};
    if (typeof currentAnswer === "object" && !Array.isArray(currentAnswer)) {
      if (Array.isArray((currentAnswer as any).blanks)) {
        const res: Record<string, string> = {};
        (currentAnswer as any).blanks.forEach((b: any, idx: number) => {
          const id = b?.id || `blank${idx + 1}`;
          res[id] = b.value ?? "";
        });
        return res;
      }
      return currentAnswer as Record<string, string>;
    }
    if (Array.isArray(currentAnswer)) {
      const res: Record<string, string> = {};
      currentAnswer.forEach((val: any, idx: number) => {
        res[`blank${idx + 1}`] = typeof val === "string" ? val : (val?.value || "");
      });
      return res;
    }
    return {};
  }, [currentAnswer]);

  const getAcceptedList = useCallback(
    (blankId: string, bIndex: number): string[] => {
      // 1. From audioBlanksList
      const bInfo = audioBlanksList.find((b: any) => b.id === blankId) || audioBlanksList[bIndex];
      if (bInfo) {
        if (Array.isArray(bInfo.acceptedAnswers) && bInfo.acceptedAnswers.length > 0) {
          return bInfo.acceptedAnswers.filter(Boolean).map(String);
        }
        if (typeof bInfo.acceptedAnswers === "string" && bInfo.acceptedAnswers.trim()) {
          return bInfo.acceptedAnswers
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean);
        }
        if (bInfo.value) {
          return [String(bInfo.value).trim()];
        }
      }
      // 2. From question.correctAnswer
      if (question.correctAnswer && typeof question.correctAnswer === "object") {
        const rawCorr =
          (question.correctAnswer as any)[blankId] ||
          (question.correctAnswer as any)[`blank${bIndex + 1}`] ||
          (question.correctAnswer as any)?.blanks?.find((b: any) => b.id === blankId)?.value ||
          (question.correctAnswer as any)?.blanks?.find((b: any) => b.id === blankId)?.acceptedAnswers ||
          Object.values(question.correctAnswer)[bIndex];

        if (Array.isArray(rawCorr) && rawCorr.length > 0) {
          return rawCorr.filter(Boolean).map(String);
        }
        if (typeof rawCorr === "string" && rawCorr.trim()) {
          return [rawCorr.trim()];
        }
      }
      // 3. From question.detail?.blanks
      const dBlank = (question.detail?.blanks || [])[bIndex];
      if (dBlank) {
        if (Array.isArray(dBlank.acceptedAnswers) && dBlank.acceptedAnswers.length > 0) {
          return dBlank.acceptedAnswers.filter(Boolean).map(String);
        }
        if (dBlank.acceptedAnswers) {
          return [String(dBlank.acceptedAnswers).trim()];
        }
      }
      return [];
    },
    [audioBlanksList, question.correctAnswer, question.detail]
  );

  const handleBlankChange = (blankId: string, value: string) => {
    if (showFeedback) return;
    const updated = {
      ...userBlanksMap,
      [blankId]: value,
    };
    onAnswerChange(updated);
  };

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

  const extractMediaImage = (item: any): string | undefined => {
    if (!item || typeof item !== "object") return undefined;
    const url = item.imageUrl || item.image || item.media?.url || (typeof item.media === "string" ? item.media : undefined);
    if (!url) return undefined;
    const type = item.media?.type || item.type;
    if (type === "audio" || /\.(mp3|wav|ogg|m4a|aac)$/i.test(url)) return undefined;
    return url;
  };

  const resolveItemInfo = (itemId: any): { text: string; imageUrl?: string } => {
    if (itemId === undefined || itemId === null || itemId === "") return { text: "" };
    const isUuid = (val: any) =>
      !val ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val).trim()) ||
      /^[0-9a-f]{24}$/i.test(String(val).trim());

    if (typeof itemId !== "string") {
      const raw = itemId.text || itemId.content || itemId.label || itemId.prompt || itemId.title;
      const text = raw && !isUuid(raw) ? String(raw) : (isUuid(itemId.id) ? "" : String(itemId.id || ""));
      const imageUrl = extractMediaImage(itemId);
      return { text, imageUrl };
    }

    const norm = (s: any) => String(s ?? "").trim();

    // 1. Search in leftItems
    const leftItems: any[] = (question.leftItems || (question as any).detail?.leftItems || []);
    const fLeft = leftItems.find((l: any) => norm(l?.id || l) === norm(itemId));
    if (fLeft) {
      const txt = fLeft.text || fLeft.content || fLeft.label || fLeft.prompt || (typeof fLeft === "string" ? fLeft : "");
      return {
        text: txt && !isUuid(txt) ? String(txt) : "",
        imageUrl: extractMediaImage(fLeft),
      };
    }

    // 2. Search in rightItems
    const rightItems: any[] = (question.rightItems || (question as any).detail?.rightItems || []);
    const fRight = rightItems.find((r: any) => norm(r?.id || r) === norm(itemId));
    if (fRight) {
      const txt = fRight.text || fRight.content || fRight.label || fRight.prompt || (typeof fRight === "string" ? fRight : "");
      return {
        text: txt && !isUuid(txt) ? String(txt) : "",
        imageUrl: extractMediaImage(fRight),
      };
    }

    // 3. Search in options
    const options: any[] = question.options || (question as any).detail?.options || [];
    const fOpt = options.find((o: any) => norm(o?.id || o?.key || o) === norm(itemId));
    if (fOpt) {
      const txt = fOpt.content || fOpt.text || fOpt.label || fOpt.title || (typeof fOpt === "string" ? fOpt : "");
      return {
        text: txt && !isUuid(txt) ? String(txt) : "",
        imageUrl: extractMediaImage(fOpt),
      };
    }

    // 4. Search in pairs
    const pairs: any[] = (question as any).pairs || (question as any).detail?.pairs || (question as any).matchingPairs || [];
    const fPair = pairs.find(
      (p: any) => norm(p.leftItemId || p.leftId || p.id) === norm(itemId) || norm(p.rightItemId || p.rightId) === norm(itemId)
    );
    if (fPair) {
      if (norm(fPair.leftItemId || fPair.leftId || fPair.id) === norm(itemId)) {
        const txt = fPair.leftText || fPair.leftContent || fPair.text || "";
        return {
          text: txt && !isUuid(txt) ? String(txt) : "",
          imageUrl: extractMediaImage(fPair.leftMedia || fPair),
        };
      }
      if (norm(fPair.rightItemId || fPair.rightId) === norm(itemId)) {
        const txt = fPair.rightText || fPair.rightContent || fPair.text || "";
        return {
          text: txt && !isUuid(txt) ? String(txt) : "",
          imageUrl: extractMediaImage(fPair.rightMedia || fPair),
        };
      }
    }

    return {
      text: isUuid(itemId) ? "" : itemId,
    };
  };

  const resolveItemText = (itemId: any): string => {
    return resolveItemInfo(itemId).text;
  };

  interface MatchingPairDetail {
    leftText: string;
    leftImage?: string;
    rightText: string;
    rightImage?: string;
  }

  interface CorrectAnswerDisplayData {
    text: string;
    images: string[];
    pairs?: MatchingPairDetail[];
  }

  const getCorrectAnswerData = (
    answer?: string | string[] | Record<string, string>,
  ): CorrectAnswerDisplayData => {
    let targetAnswer = answer;
    const isUuid = (val: any) =>
      !val ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val).trim()) ||
      /^[0-9a-f]{24}$/i.test(String(val).trim());

    // Helper format 1 option
    const formatOptionInfo = (opt: any): { text: string; imageUrl?: string } => {
      if (typeof opt === "string") return { text: opt };
      const content = opt.content && !isUuid(opt.content) ? opt.content : "";
      const text = [opt.label, content].filter(Boolean).join(". ") || opt.label || "";
      const imageUrl = extractMediaImage(opt);
      return { text, imageUrl };
    };

    // Helper gom text và images từ 1 danh sách option
    const buildOptionsResult = (opts: any[]): CorrectAnswerDisplayData => {
      const formatted = opts.map(formatOptionInfo);
      const text = formatted.map((f) => f.text).filter(Boolean).join(", ");
      const images = formatted.map((f) => f.imageUrl).filter(Boolean) as string[];
      return { text, images };
    };

    // 1. If question has options and targetAnswer is empty/undefined, find all correct options
    if (targetAnswer === undefined || targetAnswer === null || targetAnswer === "") {
      const correctOpts = question.options?.filter((o: any) => o && (o.isCorrect === true || String(o.isCorrect) === "true")) || [];
      if (correctOpts.length > 0) {
        return buildOptionsResult(correctOpts);
      }
      return { text: "", images: [] };
    }

    // 2. Array of answers (e.g. string[] of option IDs or multiple correct answers)
    if (Array.isArray(targetAnswer)) {
      if (question.options && question.options.length > 0 && targetAnswer.length > 0 && typeof targetAnswer[0] === "string") {
        const norm = (s: any) => String(s ?? "").toLowerCase().trim();
        const matchedOpts = targetAnswer.map((ans) => {
          const ansStr = norm(ans);
          const matched = question.options?.find((o: any) => {
            const val = typeof o === "string" ? { content: o } : o;
            return norm(val.id) === ansStr || norm(val.label) === ansStr || norm(val.content) === ansStr;
          });
          return matched || ans;
        });
        return buildOptionsResult(matchedOpts);
      }
      return { text: targetAnswer.join(" "), images: [] };
    }

    // 3. Object with selectedOptionIds (multiple choice payload)
    if (typeof targetAnswer === "object" && targetAnswer !== null && Array.isArray((targetAnswer as any).selectedOptionIds)) {
      const ids: string[] = (targetAnswer as any).selectedOptionIds;
      const matchedOpts = ids.map((id) => {
        const opt = question.options?.find((o: any) => o?.id === id || o?.key === id);
        return opt || id;
      });
      return buildOptionsResult(matchedOpts);
    }

    // 4. Object with correctOptionIds
    if (typeof targetAnswer === "object" && targetAnswer !== null && Array.isArray((targetAnswer as any).correctOptionIds)) {
      const ids: string[] = (targetAnswer as any).correctOptionIds;
      const matchedOpts = ids.map((id) => {
        const opt = question.options?.find((o: any) => o?.id === id || o?.key === id);
        return opt || id;
      });
      return buildOptionsResult(matchedOpts);
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
        return buildOptionsResult(allCorrectOpts);
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
        return buildOptionsResult([matchedOpt]);
      }
    }

    // 6. Audio fill blanks
    if (question.type === "audio_fill_blanks" || (question as any).type === "audio-fill-blanks") {
      const answersMap: Record<string, string> = {};

      const extractAnswerString = (raw: any): string => {
        if (!raw) return "";
        if (Array.isArray(raw)) return raw.filter(Boolean).map(String).join(" / ");
        if (typeof raw === "object") {
          if (Array.isArray(raw.acceptedAnswers)) return raw.acceptedAnswers.filter(Boolean).map(String).join(" / ");
          if (raw.acceptedAnswers) return String(raw.acceptedAnswers);
          if (raw.value) return String(raw.value);
          return "";
        }
        return String(raw).trim();
      };

      // 1. From targetAnswer
      if (targetAnswer && typeof targetAnswer === "object") {
        if (Array.isArray((targetAnswer as any).blanks)) {
          (targetAnswer as any).blanks.forEach((b: any, idx: number) => {
            const key = b?.id || `blank${idx + 1}`;
            const val = extractAnswerString(b.acceptedAnswers || b.value || b);
            if (val) answersMap[key] = val;
          });
        } else if (Array.isArray(targetAnswer)) {
          targetAnswer.forEach((b: any, idx: number) => {
            const key = b?.id || `blank${idx + 1}`;
            const val = extractAnswerString(b);
            if (val) answersMap[key] = val;
          });
        } else {
          Object.entries(targetAnswer).forEach(([k, v]) => {
            const val = extractAnswerString(v);
            if (val) answersMap[k] = val;
          });
        }
      }

      // 2. From question.correctAnswer
      if (question.correctAnswer && typeof question.correctAnswer === "object") {
        if (Array.isArray((question.correctAnswer as any).blanks)) {
          (question.correctAnswer as any).blanks.forEach((b: any, idx: number) => {
            const key = b?.id || `blank${idx + 1}`;
            if (!answersMap[key]) {
              const val = extractAnswerString(b.acceptedAnswers || b.value || b);
              if (val) answersMap[key] = val;
            }
          });
        } else {
          Object.entries(question.correctAnswer).forEach(([k, v]) => {
            if (!answersMap[k]) {
              const val = extractAnswerString(v);
              if (val) answersMap[k] = val;
            }
          });
        }
      }

      // 3. From audioBlanksList
      audioBlanksList.forEach((b: any, idx: number) => {
        const key = b?.id || `blank${idx + 1}`;
        if (!answersMap[key]) {
          const val = extractAnswerString(b.acceptedAnswers || b.value);
          if (val) answersMap[key] = val;
        }
      });

      // Format answers in ordered list
      if (audioBlanksList.length > 0) {
        const items = audioBlanksList
          .map((b: any, idx: number) => {
            const key = b?.id || `blank${idx + 1}`;
            const val = answersMap[key] || answersMap[`blank${idx + 1}`] || Object.values(answersMap)[idx];
            return val ? `(${idx + 1}) ${val}` : "";
          })
          .filter(Boolean);

        if (items.length > 0) {
          return { text: items.join("  |  "), images: [] };
        }
      }

      // Fallback: from answersMap entries
      const entries = Object.entries(answersMap).filter(([_, v]) => Boolean(v));
      if (entries.length > 0) {
        return { text: entries.map(([_, v], idx) => `(${idx + 1}) ${v}`).join("  |  "), images: [] };
      }

      if (typeof targetAnswer === "string" && targetAnswer.trim()) {
        return { text: targetAnswer, images: [] };
      }
      return { text: "", images: [] };
    }

    // 7. Matching questions (or object with pairs / matches)
    const isMatching = question.type === "matching" || (question as any).type === "matching_pair";
    if (isMatching || (typeof targetAnswer === "object" && targetAnswer !== null)) {
      let rawPairsList: Array<[any, any]> = [];
      if (Array.isArray((targetAnswer as any).pairs)) {
        rawPairsList = (targetAnswer as any).pairs.map((p: any) => [p.leftItemId || p.leftId || p.left, p.rightItemId || p.rightId || p.right]);
      } else if (Array.isArray((targetAnswer as any).matches)) {
        rawPairsList = (targetAnswer as any).matches.map((p: any) => [p.leftItemId || p.leftId || p.left, p.rightItemId || p.rightId || p.right]);
      } else if (Array.isArray(targetAnswer)) {
        if (targetAnswer.length > 0 && typeof targetAnswer[0] === "object") {
          rawPairsList = targetAnswer.map((p: any) => [p.leftItemId || p.leftId || p.left || p[0], p.rightItemId || p.rightId || p.right || p[1]]);
        }
      } else if (typeof targetAnswer === "object" && targetAnswer !== null) {
        rawPairsList = Object.entries(targetAnswer);
      }

      if (rawPairsList.length > 0) {
        const pairs: MatchingPairDetail[] = rawPairsList.map(([left, right]) => {
          const lInfo = resolveItemInfo(left);
          const rInfo = resolveItemInfo(right);
          return {
            leftText: lInfo.text,
            leftImage: lInfo.imageUrl,
            rightText: rInfo.text,
            rightImage: rInfo.imageUrl,
          };
        });

        const text = pairs
          .map((p) => `${p.leftText || "Ảnh"} → ${p.rightText || "Ảnh"}`)
          .join(", ");

        return { text, images: [], pairs };
      }
    }

    // 8. Array of answers (e.g. word ordering, fill in blanks)
    if (Array.isArray(targetAnswer)) {
      return { text: targetAnswer.join(" "), images: [] };
    }

    // 9. Plain object fallback
    if (typeof targetAnswer === "object" && targetAnswer !== null) {
      const text = Object.entries(targetAnswer)
        .map(([key, value]) => `${resolveItemInfo(key).text}: ${resolveItemInfo(value).text}`)
        .join(", ");
      return { text, images: [] };
    }

    return { text: String(targetAnswer || ""), images: [] };
  };

  const formatCorrectAnswer = (
    answer?: string | string[] | Record<string, string>,
  ): string => {
    return getCorrectAnswerData(answer).text;
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
      if (Array.isArray((currentAnswer as any).blanks)) {
        return (currentAnswer as any).blanks.every((b: any) => !b.value?.trim());
      }
      return Object.values(currentAnswer).every((val) => typeof val === "string" ? !val.trim() : !val);
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
        {inlineItems.map((media, index) => {
          const isAudio = media.type === "audio" || /\.(mp3|wav|ogg|m4a|aac)$/i.test(media.url || "");
          const url = resolveMediaUrl(media.url);
          return (
            <div
              key={`${media.url}-${index}`}
              className="w-full flex justify-center"
            >
              {isAudio ? (
                <audio controls className="w-full h-10" src={url}>
                  <source src={url} type="audio/mpeg" />
                  Trình duyệt không hỗ trợ audio.
                </audio>
              ) : (
                <AppImage
                  src={url}
                  alt={`Question Media ${index + 1}`}
                  className="max-h-[400px] rounded-lg shadow-sm w-auto object-contain"
                />
              )}
            </div>
          );
        })}
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
          <div className="grid grid-cols-1 gap-2 mb-4">
            {question.options?.map((option, index) => {
              const optionValue = String(getOptionValue(option));
              const optionLabel = getOptionLabel(option);
              const isSelected = isMulti
                ? selectedAnswers.includes(optionValue)
                : (currentAnswer !== undefined && String(currentAnswer) === optionValue);
              const isThisOptionCorrect = checkOptionIsCorrect(option, question.correctAnswer) || (showFeedback && isSelected && isCorrect === true);

              let containerClass =
                "flex items-center justify-between px-3.5 py-3 min-h-[46px] border rounded-xl cursor-pointer transition-all ";

              let textClass = "ml-3 text-[13px] sm:text-sm ";

              if (showFeedback && isThisOptionCorrect) {
                containerClass += "border-emerald-500 bg-emerald-50 border-2 shadow-xs ";
                textClass += "font-bold text-emerald-800";
              } else if (showFeedback && isSelected && !isThisOptionCorrect) {
                containerClass += "border-rose-400 bg-rose-50 border-2 shadow-xs ";
                textClass += "font-bold text-rose-800";
              } else if (isSelected) {
                containerClass += "border-indigo-600 bg-indigo-50/60 border-2 shadow-xs ";
                textClass += "font-bold text-indigo-950";
              } else {
                containerClass += "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 ";
                textClass += "font-normal text-slate-700";
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
                          showFeedback && isThisOptionCorrect
                            ? "border-emerald-500 bg-emerald-500 ring-2 ring-emerald-200"
                            : showFeedback && isSelected && !isThisOptionCorrect
                            ? "border-rose-500 bg-rose-500 ring-2 ring-rose-200"
                            : isSelected
                            ? "border-indigo-600 bg-indigo-600 ring-2 ring-indigo-200"
                            : "border border-slate-300 bg-white hover:border-indigo-400"
                        }`}
                        style={{ appearance: "none", WebkitAppearance: "none" }}
                      />
                      {isSelected && (
                        <div className="absolute w-1.5 h-1.5 bg-white rounded-full pointer-events-none" />
                      )}
                    </div>

                    <div className="flex-1 ml-3">
                      {optionLabel ? (
                        <span className={`${textClass.trim()} whitespace-pre-line`}>{optionLabel}</span>
                      ) : null}
                      {typeof option !== "string" &&
                        (option.media?.type === "image" ||
                          (option as any).imageUrl ||
                          (/\.(png|jpe?g|gif|webp|svg)$/i.test(option.media?.url || "") && option.media?.type !== "audio")) && (
                          <div className="mt-2 max-w-[200px] max-h-[130px] rounded-lg overflow-hidden border border-slate-200 bg-white">
                            <AppImage
                              src={resolveMediaUrl(option.media?.url || (option as any).imageUrl)}
                              alt={optionLabel || "Option"}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        )}
                      {typeof option !== "string" &&
                        (option.media?.type === "audio" ||
                          (option as any).audioUrl ||
                          /\.(mp3|wav|ogg|m4a|aac)$/i.test(option.media?.url || "")) && (
                          <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                            <audio
                              controls
                              src={resolveMediaUrl(option.media?.url || (option as any).audioUrl)}
                              className="h-8 max-w-[240px]"
                            />
                          </div>
                        )}
                    </div>
                  </div>
                  {showFeedback && isThisOptionCorrect && (
                    <Check size={16} className="text-emerald-600 ml-2 shrink-0" />
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
              className={`rounded-xl text-[16px] py-4 px-5 shadow-sm leading-relaxed ${showFeedback
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
              className={`min-h-[60px] p-4 rounded-xl border flex flex-wrap gap-2 items-start ${showFeedback
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
                      ${isSelected
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

      case "audio_fill_blanks": {
        const passageText =
          question.detail?.passageText ||
          (question as any).passageText ||
          question.passage ||
          "";

        const parts = passageText.split(/(\{\{[a-zA-Z0-9_]+\}\})/g);

        return (
          <div className="space-y-4 mb-6">
            <div className="bg-slate-50/70 border border-slate-200/90 p-6 md:p-8 rounded-2xl leading-[2.6] md:leading-[2.8] text-[16px] md:text-[17px] text-slate-800 shadow-xs">
              {parts.map((part: string, idx: number) => {
                const match = part.match(/^\{\{([a-zA-Z0-9_]+)\}\}$/);
                if (!match) {
                  return (
                    <span key={idx} className="whitespace-pre-wrap select-text">
                      {part}
                    </span>
                  );
                }
                const blankId = match[1];
                const blankIndex = audioBlanksList.findIndex((b: any) => b.id === blankId);
                const displayIndex = blankIndex >= 0 ? blankIndex + 1 : idx;
                const userVal = userBlanksMap[blankId] ?? userBlanksMap[`blank${displayIndex}`] ?? "";

                let blankStatus: "default" | "correct" | "wrong" = "default";
                const acceptedList = getAcceptedList(blankId, blankIndex >= 0 ? blankIndex : 0);

                if (showFeedback) {
                  if (acceptedList.length > 0) {
                    const normUser = userVal.trim().toLowerCase();
                    const isBlankCorrect = acceptedList.some(
                      (ans) => ans.trim().toLowerCase() === normUser
                    );
                    blankStatus = isBlankCorrect ? "correct" : "wrong";
                  } else {
                    blankStatus = isCorrect ? "correct" : "wrong";
                  }
                }

                // Check if next part starts with punctuation to adjust right margin
                const nextPart = parts[idx + 1] || "";
                const hasNextPunctuation = /^[.,!?:;)\]]/.test(nextPart.trim());

                return (
                  <span
                    key={idx}
                    className={`inline-flex items-center align-middle ${hasNextPunctuation ? "ml-1 mr-0.5" : "mx-1"
                      } my-1`}
                  >
                    {/* Badge số thứ tự ô trống */}
                    <span
                      className={`inline-flex items-center justify-center text-[11px] font-bold px-1.5 py-0.5 rounded-md mr-1 shrink-0 select-none transition-colors ${blankStatus === "correct"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : blankStatus === "wrong"
                          ? "bg-rose-100 text-rose-800 border border-rose-300"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                    >
                      {displayIndex}
                    </span>

                    {/* Khung nhập tự động giãn theo độ dài ký tự */}
                    <span className="inline-grid items-center align-middle relative">
                      {/* Ghost span để đo chiều dài văn bản và tự động đẩy rộng input */}
                      <span
                        aria-hidden="true"
                        className="invisible col-start-1 row-start-1 px-1.5 py-0.5 text-[14px] font-medium whitespace-pre select-none pointer-events-none"
                        style={{ minWidth: "36px", maxWidth: "320px" }}
                      >
                        {userVal || "..."}
                      </span>

                      {/* Input thật với min-w-0 & size={1} để không bị ép kích thước mặc định 150px của trình duyệt */}
                      <input
                        type="text"
                        size={1}
                        disabled={showFeedback}
                        value={userVal}
                        placeholder="..."
                        onChange={(e) => handleBlankChange(blankId, e.target.value)}
                        className={`col-start-1 row-start-1 w-full min-w-0 text-center text-[14px] font-medium px-1.5 py-0.5 h-7 rounded-md transition-all outline-none ${blankStatus === "correct"
                          ? "border-2 border-emerald-500 bg-emerald-50/90 text-emerald-900 font-bold"
                          : blankStatus === "wrong"
                            ? "border-2 border-rose-400 bg-rose-50/90 text-rose-800 font-bold line-through"
                            : "border border-slate-300 hover:border-indigo-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white text-slate-800 shadow-2xs"
                          }`}
                      />
                    </span>

                    {/* Hiển thị đáp án đúng kế bên khi làm sai */}
                    {showFeedback && blankStatus === "wrong" && acceptedList.length > 0 && (
                      <span
                        className="inline-flex items-center gap-1 ml-1.5 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-xs font-bold shadow-xs whitespace-nowrap"
                        title="Đáp án đúng"
                      >
                        <Check size={12} />
                        {acceptedList.join(" / ")}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        );
      }

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
      <div className="mb-2 sm:mb-3 shrink-0">
        <h2 className="text-[14px] sm:text-[15px] md:text-[16px] font-semibold leading-snug sm:leading-relaxed text-slate-900 whitespace-pre-line">
          {normalizeLineBreaks(question.questionContent)}
        </h2>

        {extraIncorrect && (
          <div className="mt-1.5 p-2.5 sm:p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-normal whitespace-pre-line">
            {extraIncorrect}
          </div>
        )}

        {(extraSource || question.hintWord) && (
          <div className="mt-1.5 p-2.5 sm:p-3 bg-slate-50/80 border border-slate-200 rounded-xl text-sm text-slate-800 font-normal space-y-1">
            {extraSource && <div className="whitespace-pre-line">{extraSource}</div>}
            {question.hintWord && (
              <div className="text-xs text-slate-600">
                Gợi ý sử dụng từ:{" "}
                <span className="text-slate-900 bg-slate-100 px-2 py-0.5 rounded font-mono border border-slate-200">
                  {question.hintWord}
                </span>
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
    const correctAnsData = getCorrectAnswerData(question.correctAnswer);
    const correctAnsText = correctAnsData.text;
    const normalizedExplanation = normalizeLineBreaks(question.explanation || "");
    const hasTextExplanation = Boolean(normalizedExplanation && normalizedExplanation.trim());

    const explanationMediaList: any[] = [];
    if (Array.isArray(question.explanationMedia)) {
      explanationMediaList.push(...question.explanationMedia);
    }
    // Fallback: check if question.feedback.explanationMedia exists
    if (explanationMediaList.length === 0 && Array.isArray((question as any).feedback?.explanationMedia)) {
      explanationMediaList.push(...(question as any).feedback.explanationMedia);
    }
    // Fallback: check if question.media contains explanation items
    if (explanationMediaList.length === 0 && Array.isArray(question.media)) {
      const explMediaFromMedia = question.media.filter(
        (m: any) => m.role === "explanation_image" || m.role === "explanation_audio"
      );
      if (explMediaFromMedia.length > 0) {
        explanationMediaList.push(...explMediaFromMedia);
      }
    }
    if (question.explanationAudio && !explanationMediaList.some((m) => (m?.url || m?.media?.url) === question.explanationAudio)) {
      explanationMediaList.push({ role: "explanation_audio", type: "audio", url: question.explanationAudio });
    }

    const explanationImages = explanationMediaList.filter(
      (m: any) =>
        m.role === "explanation_image" ||
        m.type === "image" ||
        (/\.(png|jpe?g|gif|webp|svg)$/i.test(m.url || m.media?.url || "") && m.type !== "audio")
    );
    const explanationAudios = explanationMediaList.filter(
      (m: any) =>
        m.role === "explanation_audio" ||
        m.type === "audio" ||
        /\.(mp3|wav|ogg|m4a|aac)$/i.test(m.url || m.media?.url || "")
    );
    const hasExplanation = hasTextExplanation || explanationImages.length > 0 || explanationAudios.length > 0;

    return (
      <div
        className={`mt-1.5 mb-[3px] p-2.5 sm:p-4 rounded-2xl border-l-4 shadow-xs flex justify-between items-start gap-3 ${
          isCorrect
            ? "bg-emerald-50 border-emerald-400"
            : "bg-rose-50 border-rose-400"
        }`}
      >
        <div className="flex-1">
          {(isCorrect || hasExplanation) && (
            <div>
              {isCorrect ? (
                <>
                  <p className="text-sm font-bold text-emerald-800">Tuyệt vời! Chính xác!</p>
                  {hasExplanation && (
                    <p className="text-xs font-semibold text-emerald-700 mt-1 mb-0.5">Giải thích chi tiết:</p>
                  )}
                </>
              ) : (
                <p className="text-sm font-bold text-rose-800">Giải thích chi tiết:</p>
              )}
            </div>
          )}

          <div
            className={`text-[12px] sm:text-[13px] ${isCorrect || hasExplanation ? "mt-1" : ""} leading-relaxed ${isCorrect ? "text-emerald-700" : "text-rose-700"
              }`}
          >
            {!isCorrect && (correctAnsText || (correctAnsData.images && correctAnsData.images.length > 0) || (correctAnsData.pairs && correctAnsData.pairs.length > 0)) && (
              <div className={`${hasExplanation ? "mb-2" : ""} text-[14px] flex flex-wrap items-start sm:items-center gap-2`}>
                <strong className="text-slate-700 shrink-0 self-center">Đáp án đúng:</strong>
                <div className="bg-emerald-100 border border-emerald-300 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-emerald-900 font-bold font-mono inline-flex flex-wrap items-center gap-2 max-w-full break-words leading-relaxed">
                  {correctAnsText && (
                    <span className="whitespace-pre-line">{correctAnsText}</span>
                  )}
                  {correctAnsData.images && correctAnsData.images.map((imgUrl, i) => (
                    <div key={i} className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden border border-emerald-400 bg-white inline-block shrink-0 shadow-xs">
                      <AppImage
                        src={resolveMediaUrl(imgUrl)}
                        alt={`Đáp án ảnh ${i + 1}`}
                        className="w-full h-full object-contain p-0.5"
                        maskText="Phóng to"
                      />
                    </div>
                  ))}
                  {correctAnsData.pairs && correctAnsData.pairs.length > 0 && (
                    <div className="flex flex-col gap-1.5 w-full pt-1">
                      {correctAnsData.pairs.map((p, pIdx) => (
                        <div key={pIdx} className="flex items-center gap-2 flex-wrap text-xs sm:text-sm font-semibold">
                          <span className="text-emerald-950">{p.leftText || "Vế trái"}</span>
                          {p.leftImage && (
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded border border-emerald-400 bg-white overflow-hidden shrink-0">
                              <AppImage src={resolveMediaUrl(p.leftImage)} alt="left" className="w-full h-full object-contain" />
                            </div>
                          )}
                          <span className="text-emerald-600 font-bold">→</span>
                          <span className="text-emerald-950">{p.rightText || "Vế phải"}</span>
                          {p.rightImage && (
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded border border-emerald-400 bg-white overflow-hidden shrink-0">
                              <AppImage src={resolveMediaUrl(p.rightImage)} alt="right" className="w-full h-full object-contain" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Chi tiết từng ô trống cho audio_fill_blanks */}
            {isAudioFillBlanks && audioBlanksList.length > 0 && (
              <div className="mt-3 pt-2.5 border-t border-slate-200/70 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Từng ô trống:</span>
                {audioBlanksList.map((b: any, bIdx: number) => {
                  const bId = b?.id || `blank${bIdx + 1}`;
                  const userVal = userBlanksMap[bId] ?? userBlanksMap[`blank${bIdx + 1}`] ?? "";
                  const accepted = getAcceptedList(bId, bIdx);
                  const isBlankCorr = accepted.length > 0
                    ? accepted.some((ans) => ans.trim().toLowerCase() === userVal.trim().toLowerCase())
                    : (isCorrect ?? false);

                  return (
                    <span
                      key={bId}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${isBlankCorr
                        ? "bg-emerald-100/90 border-emerald-300 text-emerald-900"
                        : "bg-rose-100/90 border-rose-300 text-rose-900"
                        }`}
                    >
                      <span className="font-bold">({bIdx + 1})</span>
                      {isBlankCorr ? (
                        <span className="flex items-center gap-1 font-bold text-emerald-800">
                          <Check size={12} /> {userVal || accepted[0]}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <span className="line-through text-rose-700 font-normal">{userVal || "Chưa điền"}</span>
                          <span className="text-slate-400 font-normal">→</span>
                          <span className="font-bold text-emerald-800">{accepted.join(" / ") || "(Thiếu đáp án)"}</span>
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            )}

            {hasTextExplanation && <p className="whitespace-pre-line mt-1.5">{normalizedExplanation}</p>}

            {/* Explanation Audio */}
            {explanationAudios.length > 0 && (
              <div className="mt-2.5 space-y-2">
                {explanationAudios.map((item: any, idx: number) => {
                  const audioUrl = resolveMediaUrl(item.url || item.media?.url);
                  return audioUrl ? (
                    <div key={idx} className="flex items-center gap-2">
                      <audio controls src={audioUrl} className="h-8 max-w-[280px]" />
                    </div>
                  ) : null;
                })}
              </div>
            )}

            {/* Explanation Images */}
            {explanationImages.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-2.5">
                {explanationImages.map((item: any, idx: number) => {
                  const imgUrl = resolveMediaUrl(item.url || item.media?.url);
                  return imgUrl ? (
                    <div key={idx} className="max-w-[260px] max-h-[180px] rounded-lg overflow-hidden border border-slate-200 bg-white shadow-2xs">
                      <AppImage
                        src={imgUrl}
                        alt="Hình ảnh giải thích"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : null;
                })}
              </div>
            )}
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
    // Mobile: layout tự nhiên (content flow), scroll toàn trang
    // Desktop (lg): cố định h-full, scroll nội dung bên trong card
    <div className="flex flex-col w-full lg:h-full lg:overflow-hidden bg-white/50 lg:min-h-0">
      {/* Nội dung câu hỏi: mobile = tự giãn để parent scroll, desktop = scroll bên trong */}
      <div className="px-3.5 pt-5 pb-3 sm:px-6 sm:pt-7 md:px-8 md:pt-8 md:pb-[5px] flex flex-col lg:flex-row gap-3 sm:gap-4 lg:gap-10 lg:flex-1 lg:overflow-y-auto lg:overflow-x-hidden lg:min-h-0">
        {hasSplitLayout ? (
          <>
            {/* Left */}
            <div className="flex-1 lg:overflow-y-auto pr-1 lg:pr-2 flex flex-col gap-3 sm:gap-4 lg:gap-6 min-h-0 shrink-0 lg:shrink">
              {!question.passage && renderQuestionHeader()}

              {question.passage && (
                <div className="bg-emerald-50/50 p-3.5 sm:p-5 md:p-6 rounded-2xl border border-emerald-100 shadow-inner">
                  <h3 className="text-xs sm:text-sm font-bold text-emerald-800 mb-2 sm:mb-3 uppercase tracking-wider">
                    Đọc đoạn văn sau
                  </h3>

                  <p className="text-sm sm:text-[15px] md:text-base leading-relaxed text-slate-700 whitespace-pre-wrap">
                    {question.passage}
                  </p>
                </div>
              )}

              {imageMedia.length > 0 && (
                <div className="bg-slate-50 p-2 sm:p-3 rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center gap-2">
                  {imageMedia.map((media, index) => (
                    <div key={`${media.url}-${index}`} className="rounded-xl overflow-hidden shadow-xs">
                      <AppImage
                        src={resolveMediaUrl(media.url)}
                        alt={`Context Media ${index + 1}`}
                        className="max-w-full rounded-xl object-contain max-h-[160px] sm:max-h-[240px] md:max-h-[380px]"
                        maskText="Phóng to ảnh"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right */}
            <div className="flex-1 lg:overflow-y-auto lg:pl-6 lg:border-l border-slate-200 pr-1 lg:pr-2 pt-1 lg:pt-2 min-h-0">
              {!question.passage ? (
                <div className="flex flex-col h-full w-full max-w-3xl mx-auto min-h-0">
                  <div className="flex-1 pb-2 overflow-x-hidden pt-1 sm:pt-2 min-h-0">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-500 mb-3 sm:mb-4 uppercase tracking-wider">
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
          <div className="w-full h-full lg:overflow-y-auto flex flex-col mx-auto max-w-3xl pr-1 lg:pr-2 pt-1 lg:pt-2 min-h-0">
            {renderQuestionContent()}
          </div>
        )}
      </div>

      {/* Footer - cố định ở cuối: desktop sticky bottom của card, mobile: xuất hiện tự nhiên sau nội dung */}
      <div className="mt-auto px-3.5 py-3 sm:px-6 sm:py-3.5 md:px-8 md:py-4 bg-slate-50/90 rounded-b-2xl border-t border-slate-200/90 flex justify-end items-center z-10 w-full shrink-0 safe-bottom">
        {!showFeedback ? (
          isPracticeMode ? (
            <button
              onClick={onSubmit}
              disabled={isAnswerEmpty()}
              className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 min-h-[46px] rounded-xl font-bold bg-indigo-600 text-white text-sm sm:text-base shadow-md sm:shadow-lg hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
            >
              Nộp câu trả lời
            </button>
          ) : (
            <button
              onClick={isLastQuestion ? onSubmit : onNext}
              className="w-full sm:w-auto px-5 sm:px-8 py-2.5 sm:py-3 min-h-[44px] rounded-xl font-bold bg-indigo-600 text-white text-sm sm:text-base shadow-md hover:bg-indigo-700 active:scale-[0.98] flex items-center justify-center gap-2 transition-all group"
            >
              <span>{isLastQuestion ? "NỘP BÀI THI" : "Câu tiếp theo"}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 sm:h-5 sm:w-5 transform group-hover:translate-x-1 transition-transform"
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
            className={`w-full sm:w-auto px-5 sm:px-8 py-2.5 sm:py-3 min-h-[44px] rounded-xl font-bold text-white text-sm sm:text-base shadow-md sm:shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all group ${
              isLastQuestion && isReviewMode && !isMastered
                ? "bg-amber-600 hover:bg-amber-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            <span>
              {isLastQuestion
                ? isReviewMode
                  ? isMastered
                    ? "Hoàn thành & Xem kết quả"
                    : "Làm lại các câu sai →"
                  : "Hoàn thành bài thi"
                : "Câu tiếp theo"}
            </span>

            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 transform group-hover:translate-x-1 transition-transform"
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
