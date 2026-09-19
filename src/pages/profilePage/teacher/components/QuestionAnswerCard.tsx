import React from "react";
import { Tag } from "antd";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";

const QUESTION_TYPE_LABELS: Record<string, string> = {
  single_choice: "Trắc nghiệm đơn",
  multiple_choice: "Trắc nghiệm nhiều đáp án",
  audio_choice: "Trắc nghiệm âm thanh",
  image_choice: "Trắc nghiệm hình ảnh",
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
  const prompt = ans.questionSnapshot?.prompt || ans.question?.prompt || `Câu hỏi ${qNumber}`;
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

  // -------- A) Multiple/Single Choice --------
  const renderChoiceOptions = () => {
    if (options.length === 0) return null;
    return (
      <div className="grid grid-cols-1 gap-2 mt-3">
        {options.map((opt: any, optIdx: number) => {
          const letter = String.fromCharCode(65 + optIdx);
          const optId = opt.id;
          const optContent = opt.content || opt.text || opt.title || `Lựa chọn ${letter}`;
          const isStudentPick =
            studentAns === optId ||
            studentAns === letter ||
            studentAns === optIdx ||
            studentAns === optContent ||
            (typeof studentAns === "string" && studentAns.toUpperCase() === letter);
          const isCorrOpt =
            opt.isCorrect === true ||
            correctAns === optId ||
            correctAns === letter ||
            correctAns === optIdx ||
            correctAns === optContent ||
            (typeof correctAns === "string" && correctAns.toUpperCase() === letter);

          let bg = "bg-white border-slate-200 text-slate-700";
          let icon = (
            <span className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0">
              {letter}
            </span>
          );

          if (isCorrOpt && isStudentPick) {
            bg = "bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold";
            icon = (
              <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                {letter}
              </span>
            );
          } else if (isCorrOpt) {
            bg = "bg-emerald-50/70 border-emerald-200 text-emerald-800 font-semibold";
            icon = (
              <span className="w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                {letter}
              </span>
            );
          } else if (isStudentPick) {
            bg = "bg-rose-50 border-rose-300 text-rose-800";
            icon = (
              <span className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                {letter}
              </span>
            );
          }

          return (
            <div
              key={optId || optIdx}
              className={`flex items-center gap-3 p-2.5 rounded-xl border ${bg} transition-all`}
            >
              {icon}
              <span className="flex-1 text-xs sm:text-sm">{optContent}</span>
              <div className="flex gap-1.5 shrink-0">
                {isStudentPick && !isCorrOpt && (
                  <span className="text-[11px] font-medium text-rose-600 bg-rose-100/80 px-2 py-0.5 rounded-full">
                    ✗ Học sinh chọn
                  </span>
                )}
                {isStudentPick && isCorrOpt && (
                  <span className="text-[11px] font-medium text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                    ✓ Học sinh chọn
                  </span>
                )}
                {isCorrOpt && !isStudentPick && (
                  <span className="text-[11px] font-medium text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
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

    // 1. Search in options
    const opt = options.find((o: any) => o.id === itemId || o.key === itemId);
    if (opt) return opt.content || opt.text || opt.label || opt.title || itemId;

    // 2. Search in questionSnapshot/question detail
    const qSnapshot = ans.questionSnapshot || ans.question || {};
    const detail = qSnapshot.detail || {};

    // Check detail.leftItems & detail.rightItems
    const leftItems: any[] = qSnapshot.leftItems || detail.leftItems || [];
    const rightItems: any[] = qSnapshot.rightItems || detail.rightItems || [];
    const fLeft = leftItems.find((l: any) => (l?.id || l) === itemId);
    if (fLeft) return fLeft.text || fLeft.content || (typeof fLeft === "string" ? fLeft : itemId);
    const fRight = rightItems.find((r: any) => (r?.id || r) === itemId);
    if (fRight) return fRight.text || fRight.content || (typeof fRight === "string" ? fRight : itemId);

    // Check pairs in detail
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

    // 3. Check correctAns pairs
    if (correctAns && typeof correctAns === "object") {
      const corrPairs: any[] =
        correctAns.pairs || correctAns.matches || (Array.isArray(correctAns) ? correctAns : []);
      const cp = corrPairs.find((p: any) => p.leftItemId === itemId || p.rightItemId === itemId);
      if (cp) {
        if (cp.leftItemId === itemId && cp.leftText) return cp.leftText;
        if (cp.rightItemId === itemId && cp.rightText) return cp.rightText;
      }
    }

    // If itemId does not match UUID regex, it is already human-readable text!
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

    // build lookup: leftItemId -> rightItemId from correct
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
              {/* Left Item */}
              <div className="font-semibold text-slate-800 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs">
                {leftText}
              </div>

              <span className="text-slate-400 font-bold px-1">➔</span>

              {/* Student Selected Right Item */}
              <div
                className={`font-semibold px-3 py-1.5 rounded-lg shadow-2xs ${
                  pairCorrect
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : "bg-rose-100 text-rose-800 border border-rose-300"
                }`}
              >
                {rightText}
              </div>

              {/* Correct counterpart if student answered wrongly */}
              {!pairCorrect && correctRight && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 ml-1">
                  <span>(Đáp án đúng:</span>
                  <span className="font-semibold text-emerald-700 bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded">
                    {correctRightText}
                  </span>
                  <span>)</span>
                </div>
              )}

              {/* Status Icon */}
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

  // -------- C) Text Answer (sentence_rewrite, fill_in, short_answer) --------
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

  // -------- D) Generic Fallback --------
  const renderGeneric = () => (
    <div className="mt-3 space-y-2 text-xs">
      <div className="flex items-start gap-2">
        <span className="text-slate-500 shrink-0 font-medium">Học sinh:</span>
        <span
          className={`font-semibold break-all ${
            isCorrect ? "text-emerald-700" : "text-rose-600"
          }`}
        >
          {typeof studentAns === "object"
            ? JSON.stringify(studentAns, null, 2)
            : String(studentAns ?? "—")}
        </span>
      </div>
      {correctAns != null && (
        <div className="flex items-start gap-2">
          <span className="text-slate-500 shrink-0 font-medium">Đáp án:</span>
          <span className="font-semibold text-emerald-700 break-all">
            {typeof correctAns === "object" ? JSON.stringify(correctAns, null, 2) : String(correctAns)}
          </span>
        </div>
      )}
    </div>
  );

  const isChoiceType = ["single_choice", "multiple_choice", "audio_choice", "image_choice"].includes(
    questionType,
  );
  const isMatchingType = questionType === "matching";
  const isTextType = ["sentence_rewrite", "fill_in", "short_answer", "essay"].includes(questionType);

  return (
    <div className={`rounded-2xl border p-4 transition-all shadow-2xs ${cardBorderBg}`}>
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full ${
              isCorrect
                ? "bg-emerald-100 text-emerald-800"
                : "bg-rose-100 text-rose-800"
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
          {ans.score != null ? `${ans.score} / ${ans.maxScore} điểm` : isCorrect ? "Đúng" : "Sai"}
        </span>
      </div>

      {/* Prompt */}
      <div className="text-sm text-slate-800 font-semibold mb-1 pl-0.5 leading-relaxed">
        {prompt}
      </div>

      {/* Answer rendering based on type */}
      {isChoiceType && options.length > 0
        ? renderChoiceOptions()
        : isMatchingType
        ? renderMatching()
        : isTextType
        ? renderTextAnswer()
        : options.length > 0
        ? renderChoiceOptions()
        : renderGeneric()}
    </div>
  );
}
