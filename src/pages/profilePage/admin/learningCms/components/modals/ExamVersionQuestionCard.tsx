import React from "react";
import { Tag, Image } from "antd";
import { CheckCircle2, Lightbulb, BookOpen, Volume2, ArrowRight } from "lucide-react";
import { ExamVersionQuestionDetail } from "../../../../../../types/backend";
import { QUESTION_TYPE_COLORS, QUESTION_TYPE_LABELS } from "../../constants";
import { resolveMediaUrl } from "../../../../../../services/apiClient";
import { shuffleTokensWithSeed } from "../../../../../../utils/shuffleTokens";

interface Props {
  question: ExamVersionQuestionDetail;
  index: number;
}

const isUuid = (val?: string) =>
  !val ||
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val).trim()) ||
  /^[0-9a-f]{24}$/i.test(String(val).trim());

export const ExamVersionQuestionCard: React.FC<Props> = ({ question: q, index }) => {
  const snapshot = q.snapshot || {};
  const detail = snapshot.detail || {};
  const questionType = q.type || snapshot.type || "multiple_choice";

  // Prompt / Đề bài
  const prompt = snapshot.prompt || "Không có tiêu đề câu hỏi";

  // Passage (Đoạn văn đọc hiểu nếu có)
  const passage = snapshot.passage || detail.passage;

  // Media ở cấp độ câu hỏi (bao gồm prompt_audio, prompt_image, v.v.)
  const mediaList: any[] = (() => {
    const m = snapshot.media || detail.media || (q as any).media;
    if (m && Array.isArray(m) && m.length > 0) return m;
    if (m && !Array.isArray(m)) return [m];

    // Fallbacks cho các trường hợp lưu trực tiếp url trong snapshot/detail
    const fallbackList: any[] = [];
    const audio = snapshot.audioUrl || detail.audioUrl || snapshot.audio || detail.audio;
    if (audio) {
      fallbackList.push({
        role: "prompt_audio",
        media: typeof audio === "object" ? audio : { url: audio, type: "audio" },
      });
    }
    const image = snapshot.imageUrl || detail.imageUrl || snapshot.image || detail.image;
    if (image) {
      fallbackList.push({
        role: "prompt_image",
        media: typeof image === "object" ? image : { url: image, type: "image" },
      });
    }
    return fallbackList;
  })();

  // Giải thích / Feedback
  const explanation =
    q.feedback?.explanation ||
    snapshot.explanation ||
    snapshot.feedback?.explanation ||
    detail.explanation;
  const hasExplanation = Boolean(
    explanation &&
      String(explanation).trim().length > 0 &&
      String(explanation).trim() !== "null"
  );

  // Options trắc nghiệm
  const options: any[] = snapshot.options || detail.options || [];

  // Parse Correct Answer an toàn
  const parseCorrect = (raw: any) => {
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
  const correctAns = parseCorrect(q.correctAnswer);

  // Trích xuất danh sách ID / giá trị đáp án đúng cho câu hỏi trắc nghiệm
  const getCorrectOptionIds = (): string[] => {
    const ids: string[] = [];
    if (!correctAns) return ids;

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
      if (
        correctAns.value &&
        (typeof correctAns.value === "string" || typeof correctAns.value === "number")
      ) {
        ids.push(String(correctAns.value));
      }
      if (correctAns.key && typeof correctAns.key === "string") {
        ids.push(String(correctAns.key));
      }
      if (correctAns.text && typeof correctAns.text === "string") {
        ids.push(correctAns.text);
      }
    }
    return ids;
  };

  // Helper render media file (Ảnh / Âm thanh / Video)
  const renderMediaItem = (m: any, idx: number) => {
    if (!m) return null;
    // Hỗ trợ cả trường hợp lồng m.media.url và m.url
    const rawUrl =
      m?.media?.url ||
      m?.url ||
      m?.mediaUrl ||
      m?.fileUrl ||
      (typeof m === "string" ? m : null);

    if (!rawUrl) return null;
    const resolved = resolveMediaUrl(rawUrl);

    const mime = String(
      m?.media?.mimeType ||
      m?.mimeType ||
      m?.media?.type ||
      m?.type ||
      m?.role ||
      ""
    ).toLowerCase();

    const isAudio =
      mime.includes("audio") ||
      m?.role === "prompt_audio" ||
      Boolean(rawUrl.match(/\.(mp3|wav|ogg|m4a|aac)$/i));

    const isVideo =
      mime.includes("video") ||
      m?.role === "prompt_video" ||
      Boolean(rawUrl.match(/\.(mp4|webm|mov|mkv)$/i));

    if (isAudio) {
      return (
        <div
          key={idx}
          className="flex items-center gap-3 bg-slate-50 border border-slate-200/90 rounded-xl p-3 w-full max-w-lg shadow-2xs"
        >
          <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
            <Volume2 size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
              <span>File âm thanh câu hỏi</span>
              {m?.media?.altText && (
                <span className="text-slate-400 font-normal truncate max-w-[200px]">
                  ({m.media.altText})
                </span>
              )}
            </div>
            <audio controls src={resolved} className="h-8 w-full outline-hidden" preload="metadata" />
          </div>
        </div>
      );
    }

    if (isVideo) {
      return (
        <video
          key={idx}
          controls
          src={resolved}
          className="max-h-52 rounded-xl border border-slate-200 shadow-2xs"
        />
      );
    }

    // Default: Image
    return (
      <div
        key={idx}
        className="rounded-xl overflow-hidden border border-slate-200/90 bg-slate-50 p-1.5 inline-block shadow-2xs"
      >
        <Image
          src={resolved}
          alt={m?.media?.altText || m?.altText || "Hình ảnh câu hỏi"}
          className="max-h-56 max-w-full rounded-lg object-contain"
          placeholder
        />
      </div>
    );
  };

  // 1. RENDER CHOICE OPTIONS (Trắc nghiệm đơn / nhiều đáp án / nghe chọn / ảnh chọn)
  const renderChoiceOptions = () => {
    if (options.length === 0) return null;
    const correctIds = getCorrectOptionIds();

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 items-stretch">
        {options.map((opt: any, optIdx: number) => {
          const letter = String.fromCharCode(65 + optIdx);
          const optId = String(opt.id ?? "");
          const optLabel = String(opt.label || letter);
          const rawContent = opt.content || opt.text || opt.title;

          // Hỗ trợ cả opt.media?.url và opt.image
          const optMediaUrl =
            (typeof opt.media === "string" ? opt.media : opt.media?.url) ||
            opt.image ||
            opt.imageUrl ||
            opt.mediaUrl ||
            null;

          const isContentUuid = rawContent ? isUuid(rawContent) || rawContent === optId : false;
          const optContent = isContentUuid ? "" : rawContent || "";

          const isCorrOpt =
            opt.isCorrect === true ||
            String(opt.isCorrect) === "true" ||
            correctIds.includes(optId) ||
            correctIds.includes(optLabel) ||
            correctIds.includes(optLabel.toLowerCase()) ||
            (optContent && correctIds.includes(optContent)) ||
            correctIds.includes(String(optIdx));

          let cardStyle = "bg-white border-slate-200 text-slate-700 hover:border-slate-300";
          let badgeStyle = "bg-slate-100 text-slate-600 border-slate-200";

          if (isCorrOpt) {
            cardStyle =
              "bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-2xs ring-1 ring-emerald-200/60";
            badgeStyle = "bg-emerald-500 text-white border-emerald-600";
          }

          return (
            <div
              key={optId || optIdx}
              className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${cardStyle} transition-all min-h-[52px] h-full`}
            >
              {/* Vế trái: Badge chữ cái + Nội dung phương án + Media */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Badge chữ cái A, B, C */}
                <div
                  className={`w-6 h-6 rounded-lg border flex items-center justify-center text-xs font-bold shrink-0 ${badgeStyle}`}
                >
                  {letter}
                </div>

                {/* Nội dung phương án */}
                <div className="flex-1 min-w-0 py-0.5">
                  {optContent && (
                    <div className="text-sm font-medium leading-snug break-words text-slate-800">
                      {optContent}
                    </div>
                  )}
                  {optMediaUrl && (
                    <div className={optContent ? "mt-1.5" : ""}>
                      {optMediaUrl.match(/\.(mp3|wav|ogg|m4a)$/i) ? (
                        <audio controls src={resolveMediaUrl(optMediaUrl)} className="h-7 w-44" />
                      ) : (
                        <Image
                          src={resolveMediaUrl(optMediaUrl)}
                          alt={`Option ${letter}`}
                          className="max-h-24 max-w-full rounded-lg object-contain border border-slate-200"
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Vế phải: Nhãn đáp án đúng luôn được căn giữa theo chiều dọc */}
              {isCorrOpt && (
                <div className="shrink-0 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-100/90 border border-emerald-300 px-2.5 py-1 rounded-full whitespace-nowrap self-center">
                  <CheckCircle2 size={13} className="text-emerald-700 shrink-0" />
                  <span>Đáp án đúng</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // 2. RENDER WORD ORDERING (Sắp xếp từ)
  const renderWordOrdering = () => {
    // 1. Lấy danh sách từ gợi ý ban đầu
    const rawTokens: any[] =
      detail.tokens ||
      snapshot.tokens ||
      detail.words ||
      snapshot.words ||
      detail.scrambledWords ||
      (options.length > 0 ? options.map((o: any) => o.content || o.text || o) : []);

    const tokens: string[] = Array.isArray(rawTokens)
      ? rawTokens
          .map((t) => (typeof t === "object" ? t.content || t.text || t.value || "" : String(t)))
          .filter(Boolean)
      : [];

    // 2. Lấy đáp án sắp xếp đúng
    let orderedTokens: string[] = [];
    let completeSentence = "";

    if (correctAns) {
      if (Array.isArray(correctAns.tokens)) {
        orderedTokens = correctAns.tokens.map((t: any) => String(t));
      } else if (Array.isArray(correctAns.words)) {
        orderedTokens = correctAns.words.map((t: any) => String(t));
      } else if (Array.isArray(correctAns.correctTokens)) {
        orderedTokens = correctAns.correctTokens.map((t: any) => String(t));
      } else if (Array.isArray(correctAns)) {
        orderedTokens = correctAns.map((t: any) => String(t));
      } else if (typeof correctAns.sentence === "string") {
        completeSentence = correctAns.sentence;
      } else if (typeof correctAns.text === "string") {
        completeSentence = correctAns.text;
      } else if (typeof correctAns === "string") {
        completeSentence = correctAns;
      }
    }

    if (orderedTokens.length === 0 && detail.correctTokens) {
      if (Array.isArray(detail.correctTokens)) {
        orderedTokens = detail.correctTokens.map((t: any) => String(t));
      } else if (typeof detail.correctTokens === "string") {
        completeSentence = detail.correctTokens;
      }
    }

    if (orderedTokens.length === 0 && detail.sentence) {
      completeSentence = detail.sentence;
    }

    if (!completeSentence && orderedTokens.length > 0) {
      completeSentence = orderedTokens.join(" ");
    }

    // Đảm bảo danh sách từ gợi ý được xáo trộn, không trùng thứ tự với đáp án
    const scrambledTokens = shuffleTokensWithSeed(tokens, (q as any).questionVersionId || (q as any).id || String(index));

    return (
      <div className="space-y-3 pt-1 text-xs">
        {/* Danh sách từ cần sắp xếp */}
        {scrambledTokens.length > 0 && (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
            <span className="font-semibold text-slate-500 block text-[11px] uppercase tracking-wide">
              Các từ / Cụm từ cần sắp xếp:
            </span>
            <div className="flex flex-wrap gap-2">
              {scrambledTokens.map((word, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-800 font-semibold rounded-lg text-xs shadow-2xs select-none"
                >
                  {word}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Đáp án sắp xếp đúng */}
        <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 space-y-2.5">
          <div className="flex items-center gap-1.5 text-emerald-800 font-semibold text-xs">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>Thứ tự sắp xếp chính xác:</span>
          </div>

          {orderedTokens.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {orderedTokens.map((word, idx) => (
                <React.Fragment key={idx}>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-emerald-300 rounded-lg text-xs font-semibold text-emerald-900 shadow-2xs">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] flex items-center justify-center font-mono font-bold">
                      {idx + 1}
                    </span>
                    <span>{word}</span>
                  </span>
                  {idx < orderedTokens.length - 1 && (
                    <ArrowRight size={12} className="text-emerald-500 shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>
          ) : completeSentence ? (
            <div className="bg-white border border-emerald-300 font-semibold px-3 py-2 rounded-lg text-emerald-900 text-sm shadow-2xs">
              {completeSentence}
            </div>
          ) : (
            <span className="italic text-slate-400">Xem cấu hình câu hỏi</span>
          )}

          {completeSentence && orderedTokens.length > 0 && (
            <div className="pt-1 border-t border-emerald-200/60 text-[11px] text-emerald-800 flex items-center gap-1.5">
              <span className="font-semibold text-emerald-900">Câu hoàn chỉnh:</span>
              <span className="font-medium italic">"{completeSentence}"</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 3. RENDER MATCHING (Ghép đôi trực quan Cột A -> Cột B)
  const renderMatching = () => {
    const leftItems: any[] = snapshot.leftItems || detail.leftItems || [];
    const rightItems: any[] = snapshot.rightItems || detail.rightItems || [];

    // Lấy danh sách cặp ghép từ correctAnswer hoặc detail.pairs
    const correctPairs: any[] =
      (correctAns && typeof correctAns === "object" && (correctAns.pairs || correctAns.matches)) ||
      detail.pairs ||
      snapshot.pairs ||
      [];

    const resolveItemContent = (item: any) => {
      if (!item) return <span className="text-slate-400 italic">Trống</span>;
      const text = item.text || item.content || (typeof item === "string" && !isUuid(item) ? item : "");
      const mediaUrl = item.media?.url || item.mediaUrl || item.image;

      return (
        <div className="flex items-center gap-2">
          {mediaUrl && (
            <Image
              src={resolveMediaUrl(mediaUrl)}
              alt="Item media"
              className="w-10 h-10 object-cover rounded border border-slate-200 shrink-0"
            />
          )}
          {text && <span className="font-medium text-slate-800 text-xs">{text}</span>}
          {!text && !mediaUrl && <span className="text-slate-400 italic text-xs">Mục ghép</span>}
        </div>
      );
    };

    if (correctPairs.length === 0) {
      // Fallback nếu không có cấu trúc pairs: Hiển thị 2 cột A và B
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2">
            <span className="font-bold text-slate-600 uppercase text-[11px] tracking-wide block border-b pb-1">
              Cột A
            </span>
            {leftItems.map((item: any, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                  {i + 1}
                </span>
                {resolveItemContent(item)}
              </div>
            ))}
          </div>
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2">
            <span className="font-bold text-slate-600 uppercase text-[11px] tracking-wide block border-b pb-1">
              Cột B
            </span>
            {rightItems.map((item: any, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                  {String.fromCharCode(65 + i)}
                </span>
                {resolveItemContent(item)}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="pt-2 space-y-2">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Các cặp ghép đúng:
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {correctPairs.map((p: any, i: number) => {
            const leftId = p.leftItemId || p.leftId;
            const rightId = p.rightItemId || p.rightId;

            const leftItem = leftItems.find((l: any) => (l?.id || l) === leftId) || { text: p.leftText };
            const rightItem = rightItems.find((r: any) => (r?.id || r) === rightId) || { text: p.rightText };

            return (
              <div
                key={i}
                className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60"
              >
                <div className="flex-1 min-w-0">{resolveItemContent(leftItem)}</div>
                <div className="shrink-0 flex items-center justify-center text-emerald-600 px-1">
                  <ArrowRight size={14} />
                </div>
                <div className="flex-1 min-w-0 text-right flex justify-end">
                  {resolveItemContent(rightItem)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 4. RENDER SENTENCE REWRITE / FILL IN / ERROR CORRECTION
  const renderTextBasedAnswer = () => {
    const sourceSentence = detail.sourceSentence || snapshot.sourceSentence;
    const acceptedAnswers =
      correctAns?.acceptedAnswers || detail.acceptedAnswers;
    const singleAnswer =
      typeof correctAns === "string"
        ? correctAns
        : correctAns?.text ||
          correctAns?.value ||
          correctAns?.answer ||
          correctAns?.correctSentence ||
          detail.correctSentence;

    return (
      <div className="space-y-2 pt-1 text-xs">
        {sourceSentence && (
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
            <span className="font-semibold text-slate-500 block mb-0.5 text-[11px] uppercase tracking-wide">
              Câu gốc / Ngữ cảnh:
            </span>
            <div className="font-medium text-sm text-slate-800">{sourceSentence}</div>
          </div>
        )}

        <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 flex flex-wrap items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span className="font-semibold text-emerald-800">Đáp án chính xác:</span>
          {Array.isArray(acceptedAnswers) ? (
            <div className="flex flex-wrap gap-1.5">
              {acceptedAnswers.map((ans: string, i: number) => (
                <span
                  key={i}
                  className="bg-white border border-emerald-300 font-semibold px-2.5 py-0.5 rounded-md text-emerald-900 font-mono text-xs shadow-2xs"
                >
                  {ans}
                </span>
              ))}
            </div>
          ) : singleAnswer && !isUuid(singleAnswer) ? (
            <span className="bg-white border border-emerald-300 font-semibold px-2.5 py-0.5 rounded-md text-emerald-900 font-mono text-xs shadow-2xs">
              {String(singleAnswer)}
            </span>
          ) : (
            <span className="italic text-slate-400">Xem cấu hình câu hỏi</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3.5 text-xs transition-all hover:border-slate-300">
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800 bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg text-xs">
            Câu {q.orderIndex !== undefined ? q.orderIndex + 1 : index + 1}
          </span>
          <Tag
            color={QUESTION_TYPE_COLORS[questionType] || "default"}
            className="m-0 border-none rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
          >
            {QUESTION_TYPE_LABELS[questionType] || questionType}
          </Tag>
          <span className="text-[11px] text-slate-400 font-mono">
            (v{q.versionNumber})
          </span>
        </div>
      </div>

      {/* ── PASSAGE (NẾU CÓ) ── */}
      {passage && (
        <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/80 text-slate-700 space-y-1.5">
          <div className="flex items-center gap-1.5 text-amber-800 font-semibold text-xs">
            <BookOpen size={14} />
            <span>Đoạn văn đọc hiểu:</span>
          </div>
          <div className="leading-relaxed whitespace-pre-line text-xs pl-5 text-slate-700 max-h-48 overflow-y-auto pr-1">
            {typeof passage === "string" ? passage : passage.content || passage.text}
          </div>
        </div>
      )}

      {/* ── ĐỀ BÀI (PROMPT) ── */}
      <div className="text-sm font-semibold text-slate-900 leading-relaxed pl-0.5 whitespace-pre-line">
        {prompt}
      </div>

      {/* ── MEDIA CÂU HỎI (AUDIO / IMAGE / VIDEO) ── */}
      {mediaList.length > 0 && (
        <div className="flex flex-wrap gap-2.5 pt-1">
          {mediaList.map((m, idx) => renderMediaItem(m, idx))}
        </div>
      )}

      {/* ── PHƯƠNG ÁN / ĐÁP ÁN THEO TỪNG LOẠI CÂU HỎI ── */}
      {questionType === "matching" ? (
        renderMatching()
      ) : questionType === "word_ordering" ? (
        renderWordOrdering()
      ) : options.length > 0 ? (
        renderChoiceOptions()
      ) : (
        renderTextBasedAnswer()
      )}

      {/* ── GIẢI THÍCH (CHỈ HIỂN THỊ KHI CÓ GIẢI THÍCH) ── */}
      {hasExplanation && (
        <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-amber-900 text-xs flex items-start gap-2 mt-2">
          <Lightbulb size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-amber-800">Giải thích chi tiết:</span>
            <div className="text-amber-900 leading-relaxed">{String(explanation)}</div>
          </div>
        </div>
      )}
    </div>
  );
};
