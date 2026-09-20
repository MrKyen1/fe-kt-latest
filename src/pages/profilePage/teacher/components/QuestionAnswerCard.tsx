import React from "react";
import { Tag } from "antd";
import {
  CheckOutlined,
  CloseOutlined,
  BulbOutlined,
  BookOutlined,
} from "@ant-design/icons";
import { resolveMediaUrl } from "../../../../services/apiClient";
import { formatScore } from "../../../../utils/studentExamUtils";

const QUESTION_TYPE_LABELS: Record<string, string> = {
  single_choice: "Trắc nghiệm đơn",
  multiple_choice: "Trắc nghiệm nhiều đáp án",
  audio_choice: "Trắc nghiệm âm thanh",
  image_choice: "Trắc nghiệm hình ảnh",
  reading_comprehension: "Đọc hiểu",
  matching: "Ghép đôi",
  sentence_rewrite: "Viết lại câu",
  hint_rewrite: "Viết lại có gợi ý",
  word_ordering: "Sắp xếp từ",
  fill_in: "Điền vào chỗ trống",
  short_answer: "Trả lời ngắn",
  essay: "Tự luận",
  error_correction: "Sửa lỗi sai",
};

export function QuestionAnswerCard({ ans, idx }: { ans: any; idx: number }) {
  const qNumber = (ans.orderIndex ?? idx) + 1;
  const prompt = ans.prompt || ans.questionSnapshot?.prompt || ans.question?.prompt || `Câu hỏi ${qNumber}`;
  const isCorrect = ans.isCorrect;
  const questionType = ans.questionType || ans.questionSnapshot?.type || ans.question?.type || "";
  const options: any[] = ans.questionSnapshot?.options || ans.question?.options || [];

  // Parse studentAnswer & correctAnswer safely
  const parseAnswer = (raw: any) => {
    if (raw == null) return null;
    if (typeof raw === "object") return raw;
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    }
    return raw;
  };

  const studentAns = parseAnswer(ans.studentAnswer);
  const correctAns = parseAnswer(ans.correctAnswer);

  const cardBorderBg = isCorrect
    ? "border-emerald-200 bg-white"
    : "border-rose-200 bg-white";

  // Passage (Đoạn văn đọc hiểu)
  const passage =
    ans.questionSnapshot?.passage ||
    ans.questionSnapshot?.detail?.passage ||
    ans.question?.passage ||
    ans.question?.detail?.passage;

  // Media
  const mediaList: any[] = (() => {
    const m = ans.questionSnapshot?.media || ans.question?.media;
    if (!m) return [];
    if (Array.isArray(m)) return m;
    return [m];
  })();

  // Explanation
  const explanation =
    ans.feedback?.explanation ||
    ans.questionSnapshot?.explanation ||
    ans.questionSnapshot?.feedback?.explanation ||
    ans.question?.explanation ||
    ans.question?.feedback?.explanation;

  // -------- A) Choice Options (single, multiple, audio, image, reading) --------
  const getStudentSelectedIds = (): string[] => {
    const ids: string[] = [];
    if (ans.studentSelectedOptions && Array.isArray(ans.studentSelectedOptions)) {
      ans.studentSelectedOptions.forEach((o: any) => {
        if (o?.id) ids.push(String(o.id));
        if (o?.value) ids.push(String(o.value));
        if (o?.label) ids.push(String(o.label));
      });
    }
    if (studentAns) {
      if (typeof studentAns === "string" || typeof studentAns === "number") {
        ids.push(String(studentAns));
      } else if (Array.isArray(studentAns)) {
        studentAns.forEach((item: any) => {
          if (typeof item === "string" || typeof item === "number") ids.push(String(item));
          else if (item?.id) ids.push(String(item.id));
          else if (item?.value) ids.push(String(item.value));
        });
      } else if (typeof studentAns === "object") {
        if (studentAns.selectedOptionId) ids.push(String(studentAns.selectedOptionId));
        if (Array.isArray(studentAns.selectedOptionIds)) {
          studentAns.selectedOptionIds.forEach((id: any) => ids.push(String(id)));
        }
        if (studentAns.optionId) ids.push(String(studentAns.optionId));
        if (studentAns.value && (typeof studentAns.value === "string" || typeof studentAns.value === "number")) {
          ids.push(String(studentAns.value));
        }
        if (studentAns.text && typeof studentAns.text === "string") {
          ids.push(studentAns.text);
        }
      }
    }
    return ids;
  };

  const getCorrectOptionIds = (): string[] => {
    const ids: string[] = [];
    if (ans.correctOptions && Array.isArray(ans.correctOptions)) {
      ans.correctOptions.forEach((o: any) => {
        if (o?.id) ids.push(String(o.id));
        if (o?.value) ids.push(String(o.value));
        if (o?.label) ids.push(String(o.label));
      });
    }
    if (correctAns) {
      if (typeof correctAns === "string" || typeof correctAns === "number") {
        ids.push(String(correctAns));
      } else if (Array.isArray(correctAns)) {
        correctAns.forEach((item: any) => {
          if (typeof item === "string" || typeof item === "number") ids.push(String(item));
          else if (item?.id) ids.push(String(item.id));
          else if (item?.value) ids.push(String(item.value));
        });
      } else if (typeof correctAns === "object") {
        if (correctAns.selectedOptionId) ids.push(String(correctAns.selectedOptionId));
        if (correctAns.correctOptionId) ids.push(String(correctAns.correctOptionId));
        if (Array.isArray(correctAns.selectedOptionIds)) {
          correctAns.selectedOptionIds.forEach((id: any) => ids.push(String(id)));
        }
        if (Array.isArray(correctAns.correctOptionIds)) {
          correctAns.correctOptionIds.forEach((id: any) => ids.push(String(id)));
        }
        if (correctAns.optionId) ids.push(String(correctAns.optionId));
        if (correctAns.value && (typeof correctAns.value === "string" || typeof correctAns.value === "number")) {
          ids.push(String(correctAns.value));
        }
        if (correctAns.text && typeof correctAns.text === "string") {
          ids.push(correctAns.text);
        }
      }
    }
    return ids;
  };

  const renderChoiceOptions = () => {
    if (options.length === 0) return null;
    const studentIds = getStudentSelectedIds();
    const correctIds = getCorrectOptionIds();

    return (
      <div className="grid grid-cols-1 gap-2 mt-3">
        {options.map((opt: any, optIdx: number) => {
          const letter = String.fromCharCode(65 + optIdx);
          const optId = String(opt.id ?? "");
          const optLabel = String(opt.label || letter);
          const optContent = opt.content || opt.text || opt.title || `Lựa chọn ${letter}`;

          const isStudentPick =
            studentIds.includes(optId) ||
            studentIds.includes(optLabel) ||
            studentIds.includes(optLabel.toLowerCase()) ||
            studentIds.includes(optContent) ||
            studentIds.includes(String(optIdx));

          const isCorrOpt =
            opt.isCorrect === true ||
            String(opt.isCorrect) === "true" ||
            correctIds.includes(optId) ||
            correctIds.includes(optLabel) ||
            correctIds.includes(optLabel.toLowerCase()) ||
            correctIds.includes(optContent) ||
            correctIds.includes(String(optIdx));

          let bg = "bg-white border-slate-200 text-slate-700";
          let icon = (
            <span className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0">
              {optLabel}
            </span>
          );

          if (isCorrOpt && isStudentPick) {
            bg = "bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold";
            icon = (
              <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                {optLabel}
              </span>
            );
          } else if (isCorrOpt) {
            bg = "bg-emerald-50/70 border-emerald-200 text-emerald-800 font-semibold";
            icon = (
              <span className="w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                {optLabel}
              </span>
            );
          } else if (isStudentPick) {
            bg = "bg-rose-50 border-rose-300 text-rose-800 font-semibold";
            icon = (
              <span className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                {optLabel}
              </span>
            );
          }

          // Option media (image/audio)
          const optMediaUrl = opt.image || opt.imageUrl || opt.mediaUrl || (opt.media?.url ? opt.media.url : null);

          return (
            <div
              key={optId || optIdx}
              className={`flex items-start sm:items-center gap-3 p-2.5 rounded-xl border ${bg} transition-all`}
            >
              <div className="mt-0.5 sm:mt-0">{icon}</div>
              <div className="flex-1 min-w-0">
                <span className="text-xs sm:text-sm">{optContent}</span>
                {optMediaUrl && (
                  <div className="mt-1">
                    <img
                      src={resolveMediaUrl(optMediaUrl)}
                      alt={optContent}
                      className="max-h-24 rounded-lg border border-slate-200 object-contain bg-white"
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-1.5 shrink-0 self-start sm:self-center">
                {isStudentPick && !isCorrOpt && (
                  <span className="text-[11px] font-medium text-rose-600 bg-rose-100/90 px-2.5 py-0.5 rounded-full border border-rose-200">
                    ✗ Học sinh chọn
                  </span>
                )}
                {isStudentPick && isCorrOpt && (
                  <span className="text-[11px] font-medium text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-300">
                    ✓ Học sinh chọn (Đúng)
                  </span>
                )}
                {isCorrOpt && !isStudentPick && (
                  <span className="text-[11px] font-medium text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-300">
                    ✓ Đáp án đúng
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Helper to resolve human-readable text for matching items
  const resolveMatchingItemText = (itemId: string, fallbackPrefix = "") => {
    if (!itemId) return fallbackPrefix;
    const opt = options.find((o: any) => o.id === itemId || o.key === itemId);
    if (opt) return opt.content || opt.text || opt.label || opt.title || itemId;

    const qSnapshot = ans.questionSnapshot || ans.question || {};
    const detail = qSnapshot.detail || {};

    const leftItems: any[] = qSnapshot.leftItems || detail.leftItems || [];
    const rightItems: any[] = qSnapshot.rightItems || detail.rightItems || [];
    const fLeft = leftItems.find((l: any) => (l?.id || l) === itemId);
    if (fLeft) return fLeft.text || fLeft.content || (typeof fLeft === "string" ? fLeft : itemId);
    const fRight = rightItems.find((r: any) => (r?.id || r) === itemId);
    if (fRight) return fRight.text || fRight.content || (typeof fRight === "string" ? fRight : itemId);

    const pairs: any[] = detail.pairs || qSnapshot.pairs || [];
    const fPair = pairs.find(
      (p: any) =>
        p.leftItemId === itemId ||
        p.leftId === itemId ||
        p.id === itemId ||
        p.rightItemId === itemId ||
        p.rightId === itemId,
    );
    if (fPair) {
      if (fPair.leftItemId === itemId || fPair.leftId === itemId) {
        return fPair.leftText || fPair.text || itemId;
      }
      if (fPair.rightItemId === itemId || fPair.rightId === itemId) {
        return fPair.rightText || fPair.text || itemId;
      }
    }

    if (correctAns && typeof correctAns === "object") {
      const corrPairs: any[] =
        correctAns.pairs || correctAns.matches || (Array.isArray(correctAns) ? correctAns : []);
      const cp = corrPairs.find((p: any) => p.leftItemId === itemId || p.rightItemId === itemId);
      if (cp) {
        if (cp.leftItemId === itemId && cp.leftText) return cp.leftText;
        if (cp.rightItemId === itemId && cp.rightText) return cp.rightText;
      }
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itemId);
    if (!isUuid) return itemId;

    return fallbackPrefix || `Mục ${itemId.substring(0, 6)}`;
  };

  // -------- B) Matching (Ghép đôi) --------
  const renderMatching = () => {
    const studentPairs: any[] =
      typeof studentAns === "object" && studentAns?.pairs
        ? studentAns.pairs
        : typeof studentAns === "object" && studentAns?.matches
        ? studentAns.matches
        : [];
    const correctPairs: any[] =
      typeof correctAns === "object" && correctAns?.pairs
        ? correctAns.pairs
        : typeof correctAns === "object" && correctAns?.matches
        ? correctAns.matches
        : [];

    const correctMap: Record<string, string> = {};
    correctPairs.forEach((p: any) => {
      if (p.leftItemId) correctMap[p.leftItemId] = p.rightItemId;
    });

    if (studentPairs.length === 0 && correctPairs.length === 0) {
      return <div className="text-xs text-slate-400 mt-2">Không có dữ liệu ghép nối</div>;
    }

    const allPairs = studentPairs.length > 0 ? studentPairs : correctPairs;
    return (
      <div className="mt-3 space-y-2">
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
          Đáp án ghép nối
        </div>
        {allPairs.map((p: any, i: number) => {
          const studentRight = p.rightItemId;
          const correctRight = correctMap[p.leftItemId];
          const pairCorrect = studentRight === correctRight;

          const leftText = p.leftText || resolveMatchingItemText(p.leftItemId, `Vế ${i + 1}`);
          const rightText = p.rightText || resolveMatchingItemText(studentRight, "Chưa chọn");
          const correctRightText =
            p.correctRightText || resolveMatchingItemText(correctRight, "Đáp án đúng");

          return (
            <div
              key={i}
              className={`flex flex-wrap items-center gap-2 p-2.5 rounded-xl border text-xs transition-all ${
                pairCorrect
                  ? "bg-emerald-50/50 border-emerald-200"
                  : "bg-rose-50/50 border-rose-200"
              }`}
            >
              <div className="font-semibold text-slate-800 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs">
                {leftText}
              </div>
              <span className="text-slate-400 font-bold px-1">➔</span>
              <div
                className={`font-semibold px-3 py-1.5 rounded-lg shadow-2xs ${
                  pairCorrect
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : "bg-rose-100 text-rose-800 border border-rose-300"
                }`}
              >
                {rightText}
              </div>

              {!pairCorrect && correctRight && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 ml-1">
                  <span>(Đáp án đúng:</span>
                  <span className="font-semibold text-emerald-700 bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded">
                    {correctRightText}
                  </span>
                  <span>)</span>
                </div>
              )}

              <div className="ml-auto shrink-0">
                {pairCorrect ? (
                  <span className="flex items-center gap-1 text-emerald-600 font-medium">
                    <CheckOutlined /> Đúng
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-rose-500 font-medium">
                    <CloseOutlined /> Sai
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // -------- C) Error Correction (Sửa lỗi sai) --------
  const renderErrorCorrection = () => {
    const studentCorrected =
      studentAns?.correctedSentence ||
      studentAns?.correction ||
      studentAns?.text ||
      studentAns?.value ||
      (typeof studentAns === "string" ? studentAns : "—");
    const studentErrorPart = studentAns?.errorWord || studentAns?.errorPart || studentAns?.error;

    const correctCorrected =
      correctAns?.correctedSentence ||
      correctAns?.correction ||
      correctAns?.text ||
      correctAns?.answer ||
      (typeof correctAns === "string" ? correctAns : "—");
    const correctErrorPart = correctAns?.errorWord || correctAns?.errorPart || correctAns?.error;

    return (
      <div className="mt-3 space-y-2.5 text-xs sm:text-sm">
        {/* Student's answer */}
        <div
          className={`p-3 rounded-xl border ${
            isCorrect ? "bg-emerald-50/70 border-emerald-200" : "bg-rose-50/70 border-rose-200"
          }`}
        >
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Học sinh sửa lại:</span>
            {isCorrect ? (
              <span className="text-emerald-700 font-bold">✓ Đúng</span>
            ) : (
              <span className="text-rose-600 font-bold">✗ Chưa chính xác</span>
            )}
          </div>
          {studentErrorPart && (
            <div className="mb-1 text-slate-600 text-xs">
              Lỗi xác định: <span className="font-semibold text-rose-600 underline">{studentErrorPart}</span>
            </div>
          )}
          <div className={`font-semibold ${isCorrect ? "text-emerald-900" : "text-rose-900"}`}>
            {studentCorrected || "—"}
          </div>
        </div>

        {/* Correct answer */}
        {correctCorrected && correctCorrected !== "—" && (
          <div className="p-3 rounded-xl border bg-emerald-50/50 border-emerald-200">
            <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-1">
              Đáp án chính xác:
            </div>
            {correctErrorPart && (
              <div className="mb-1 text-slate-600 text-xs">
                Lỗi cần sửa: <span className="font-semibold text-emerald-700 underline">{correctErrorPart}</span>
              </div>
            )}
            <div className="font-semibold text-emerald-950">{correctCorrected}</div>
          </div>
        )}
      </div>
    );
  };

  // -------- D) Word Ordering (Sắp xếp từ) --------
  const renderWordOrdering = () => {
    const getSentence = (raw: any): string => {
      if (!raw) return "—";
      if (typeof raw === "string") return raw;
      if (raw.text && typeof raw.text === "string") return raw.text;
      if (Array.isArray(raw.tokens)) return raw.tokens.join(" ");
      if (Array.isArray(raw.words)) return raw.words.join(" ");
      if (Array.isArray(raw.value)) return raw.value.join(" ");
      if (Array.isArray(raw)) return raw.join(" ");
      return JSON.stringify(raw);
    };

    const studentSentence = getSentence(studentAns);
    const correctSentence = getSentence(correctAns);

    return (
      <div className="mt-3 space-y-2.5 text-xs sm:text-sm">
        {/* Student sentence */}
        <div
          className={`p-3 rounded-xl border ${
            isCorrect ? "bg-emerald-50/70 border-emerald-200" : "bg-rose-50/70 border-rose-200"
          }`}
        >
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Học sinh sắp xếp:</span>
            {isCorrect ? (
              <span className="text-emerald-700 font-bold">✓ Đúng</span>
            ) : (
              <span className="text-rose-600 font-bold">✗ Chưa chính xác</span>
            )}
          </div>
          <div className={`font-semibold text-sm ${isCorrect ? "text-emerald-900" : "text-rose-900"}`}>
            {studentSentence}
          </div>
        </div>

        {/* Correct sentence */}
        {correctSentence && correctSentence !== "—" && (
          <div className="p-3 rounded-xl border bg-emerald-50/50 border-emerald-200">
            <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-1.5">
              Đáp án chính xác:
            </div>
            <div className="font-semibold text-sm text-emerald-950">{correctSentence}</div>
          </div>
        )}
      </div>
    );
  };

  // -------- E) Text Answer (sentence_rewrite, fill_in, short_answer) --------
  const renderTextAnswer = () => {
    const studentText =
      typeof studentAns === "object"
        ? studentAns?.answer || studentAns?.text || studentAns?.value || JSON.stringify(studentAns)
        : String(studentAns ?? "Chưa trả lời");

    const acceptedAnswers: string[] =
      typeof correctAns === "object"
        ? correctAns?.acceptedAnswers || (correctAns?.answer ? [correctAns.answer] : [])
        : [String(correctAns || "")];
    if (typeof correctAns === "object" && correctAns?.acceptedAnswers) {
      acceptedAnswers.splice(0, acceptedAnswers.length, ...correctAns.acceptedAnswers);
    }

    return (
      <div className="mt-3 space-y-2.5">
        <div>
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Học sinh trả lời
          </div>
          <div
            className={`p-3 rounded-xl border text-sm font-medium ${
              isCorrect
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-rose-50 border-rose-200 text-rose-900"
            }`}
          >
            {studentText || "—"}
          </div>
        </div>
        {acceptedAnswers.length > 0 && acceptedAnswers[0] && (
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Đáp án được chấp nhận
            </div>
            <div className="flex flex-wrap gap-1.5">
              {acceptedAnswers.map((a, i) => (
                <span
                  key={i}
                  className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold px-3 py-1 rounded-xl"
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // -------- F) Generic Fallback --------
  const renderGeneric = () => (
    <div className="mt-3 space-y-2 text-xs">
      <div className="flex items-start gap-2">
        <span className="text-slate-500 shrink-0 font-medium">Học sinh:</span>
        <span className={`font-semibold break-all ${isCorrect ? "text-emerald-700" : "text-rose-600"}`}>
          {typeof studentAns === "object"
            ? studentAns?.text || studentAns?.value || JSON.stringify(studentAns, null, 2)
            : String(studentAns ?? "—")}
        </span>
      </div>
      {correctAns != null && (
        <div className="flex items-start gap-2">
          <span className="text-slate-500 shrink-0 font-medium">Đáp án:</span>
          <span className="font-semibold text-emerald-700 break-all">
            {typeof correctAns === "object"
              ? correctAns?.text || correctAns?.answer || JSON.stringify(correctAns, null, 2)
              : String(correctAns)}
          </span>
        </div>
      )}
    </div>
  );

  const isChoiceType = [
    "single_choice",
    "multiple_choice",
    "audio_choice",
    "image_choice",
    "reading_comprehension",
    "multiple-choice",
    "listening",
    "true-false",
  ].includes(questionType);

  const isMatchingType = questionType === "matching";
  const isErrorCorrectionType = questionType === "error_correction";
  const isWordOrderingType = questionType === "word_ordering";
  const isTextType = ["sentence_rewrite", "hint_rewrite", "fill_in", "short_answer", "essay"].includes(
    questionType,
  );

  return (
    <div className={`rounded-2xl border p-4 transition-all shadow-2xs ${cardBorderBg}`}>
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full ${
              isCorrect ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
            }`}
          >
            {isCorrect ? <CheckOutlined className="mr-1" /> : <CloseOutlined className="mr-1" />}
            Câu {qNumber}
          </span>
          {questionType && (
            <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
              {QUESTION_TYPE_LABELS[questionType] || questionType}
            </span>
          )}
        </div>
        <span
          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
            isCorrect
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-rose-50 text-rose-600 border border-rose-200"
          }`}
        >
          {ans.score != null
            ? `${formatScore(ans.score)} / ${formatScore(ans.maxScore)} điểm`
            : isCorrect
            ? "Đúng"
            : "Sai"}
        </span>
      </div>

      {/* Reading Passage if available */}
      {passage && (
        <div className="mb-3 p-3.5 bg-slate-50/90 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed max-h-56 overflow-y-auto">
          <div className="flex items-center gap-1.5 font-bold text-slate-700 mb-1.5 text-xs uppercase tracking-wider">
            <BookOutlined className="text-indigo-600" />
            <span>Đoạn văn đọc hiểu:</span>
          </div>
          <div className="whitespace-pre-line font-medium text-slate-800">
            {typeof passage === "string" ? passage : passage.content || passage.text}
          </div>
        </div>
      )}

      {/* Media elements if available */}
      {mediaList.length > 0 && (
        <div className="my-2.5 flex flex-wrap gap-3 items-center">
          {mediaList.map((mItem: any, mIdx: number) => {
            const mUrl = mItem?.url || mItem?.path || (typeof mItem === "string" ? mItem : null);
            const mType = mItem?.type || (mUrl && (mUrl.endsWith(".mp3") || mUrl.endsWith(".wav") || mUrl.endsWith(".ogg")) ? "audio" : "image");
            if (!mUrl) return null;

            if (mType === "audio") {
              return (
                <div key={mIdx} className="w-full max-w-md bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <audio controls src={resolveMediaUrl(mUrl)} className="w-full h-8" />
                </div>
              );
            }
            return (
              <img
                key={mIdx}
                src={resolveMediaUrl(mUrl)}
                alt="Đính kèm câu hỏi"
                className="max-h-48 rounded-xl border border-slate-200 object-contain bg-white"
              />
            );
          })}
        </div>
      )}

      {/* Prompt */}
      <div className="text-sm text-slate-800 font-semibold mb-1 pl-0.5 leading-relaxed">
        {prompt}
      </div>

      {/* Answer rendering based on question type */}
      {isChoiceType && options.length > 0
        ? renderChoiceOptions()
        : isMatchingType
        ? renderMatching()
        : isErrorCorrectionType
        ? renderErrorCorrection()
        : isWordOrderingType
        ? renderWordOrdering()
        : isTextType
        ? renderTextAnswer()
        : options.length > 0
        ? renderChoiceOptions()
        : renderGeneric()}

      {/* Detailed Explanation */}
      {explanation && (
        <div className="mt-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-xs sm:text-sm text-amber-950">
          <div className="flex items-center gap-1.5 font-bold text-amber-800 mb-1">
            <BulbOutlined />
            <span>Giải thích chi tiết:</span>
          </div>
          <div className="whitespace-pre-line text-slate-700 font-medium leading-relaxed pl-3.5 border-l-2 border-amber-300">
            {explanation}
          </div>
        </div>
      )}
    </div>
  );
}
