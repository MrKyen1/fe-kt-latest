import React, { useState } from "react";
import { Popover, Spin, Tag } from "antd";
import type { TooltipPlacement } from "antd/es/tooltip";
import { Check } from "lucide-react";
import { QUESTION_TYPE_COLORS, QUESTION_TYPE_LABELS } from "../constants";
import { learningCmsService } from "../../../../../services/learningCmsService";
import { resolveMediaUrl } from "../../../../../services/apiClient";
import { normalizeLineBreaks } from "../../../../../utils/textFormatters";

// ── Shared In-Memory Detail Cache ────────────────────────────
const questionDetailCache: Record<string, any> = {};

export function invalidateQuestionDetailCache(questionId?: string) {
  if (questionId) {
    delete questionDetailCache[questionId];
  } else {
    Object.keys(questionDetailCache).forEach((k) => delete questionDetailCache[k]);
  }
}

// ── Types ────────────────────────────────────────────────────

interface TaxonomyItem {
  id: string;
  name: string;
}

interface QuestionOption {
  label?: string;
  content: string;
  isCorrect: boolean;
  media?: {
    id?: string;
    url?: string;
    type?: string;
  };
}

interface MatchingPair {
  leftText?: string;
  rightText?: string;
  leftMedia?: {
    id?: string;
    url?: string;
    type?: string;
  };
}

interface QuestionDetail {
  correctTokens?: string | string[];
  acceptedAnswers?: string | string[];
  correctSentence?: string;
  correctAnswer?: string | string[];
  sourceSentence?: string;
  hintWord?: string;
  pairs?: MatchingPair[];
  passageText?: string;
  blanks?: Array<{ id: string; acceptedAnswers?: string | string[] }>;
  gradingMode?: string;
  [key: string]: any;
}

interface Question {
  id: string;
  type: string;
  prompt?: string;
  instruction?: string;
  explanation?: string;
  skillId?: string;
  difficultyLevelId?: string;
  topicId?: string;
  tagIds?: string[];
  options?: QuestionOption[];
  media?: any[];
  mediaIds?: any[];
  detail?: QuestionDetail;
}

interface Props {
  question: Question;
  skills: TaxonomyItem[];
  levels: TaxonomyItem[];
  topics: TaxonomyItem[];
  tags:   TaxonomyItem[];
  loadingDetail?: boolean;
}

// ── Helper ───────────────────────────────────────────────────

const MEDIA_QUESTION_TYPES = new Set([
  "image_choice",
  "audio_choice",
  "audio_image_choice",
]);

function extractPromptMedia(question: Question): Array<{ url: string; type: "image" | "audio" }> {
  const rawList: any[] = [];
  if (Array.isArray(question.media) && question.media.length > 0) {
    rawList.push(...question.media);
  } else if (Array.isArray(question.mediaIds) && question.mediaIds.length > 0) {
    rawList.push(...question.mediaIds);
  }

  const results: Array<{ url: string; type: "image" | "audio" }> = [];
  const seenUrls = new Set<string>();

  for (const item of rawList) {
    if (!item) continue;
    const role = item.role;
    if (role && (role === "explanation_audio" || role === "explanation_image")) {
      continue;
    }

    const asset = item.media ?? item;
    const url = asset?.url || asset?.previewUrl || asset?.path || (typeof asset === "string" ? asset : "");
    if (!url || seenUrls.has(url)) continue;
    seenUrls.add(url);

    const rawType = String(asset?.type || asset?.fileType || asset?.mimeType || role || "").toLowerCase();
    const lowerUrl = url.toLowerCase();
    const isAudio =
      rawType.includes("audio") ||
      lowerUrl.endsWith(".mp3") ||
      lowerUrl.endsWith(".wav") ||
      lowerUrl.endsWith(".ogg") ||
      lowerUrl.endsWith(".m4a");

    results.push({
      url,
      type: isAudio ? "audio" : "image",
    });
  }

  return results;
}

function getCorrectAnswerText(question: Question): string | null {
  const { type, detail } = question;
  if (!detail) return null;

  if (type === "word_ordering" && detail.correctTokens) {
    return Array.isArray(detail.correctTokens)
      ? detail.correctTokens.join(" ")
      : detail.correctTokens;
  }
  if ((type === "sentence_rewrite" || type === "hint_rewrite") && detail.acceptedAnswers) {
    return Array.isArray(detail.acceptedAnswers)
      ? detail.acceptedAnswers.join(" | ")
      : detail.acceptedAnswers;
  }
  if (type === "error_correction" && detail.correctSentence) {
    return detail.correctSentence;
  }
  if (type === "fill_blank" && detail.correctAnswer) {
    return Array.isArray(detail.correctAnswer)
      ? detail.correctAnswer.join(" | ")
      : detail.correctAnswer;
  }
  if (type === "audio_fill_blanks" && detail.blanks) {
    if (Array.isArray(detail.blanks)) {
      const items = detail.blanks
        .map((b: any, idx: number) => {
          const ans = Array.isArray(b.acceptedAnswers) ? b.acceptedAnswers.join(" / ") : (b.acceptedAnswers || b.value || "");
          return ans ? `(${idx + 1}) ${ans}` : "";
        })
        .filter(Boolean);
      return items.length > 0 ? items.join(" | ") : null;
    }
    return null;
  }
  return null;
}

// ── Component ────────────────────────────────────────────────

/**
 * Displays a compact preview of a question's content, metadata,
 * and answer(s). Used inside Ant Design <Popover> on hover.
 */
export default function QuestionPopoverContent({
  question,
  skills,
  levels,
  topics,
  tags,
  loadingDetail = false,
}: Props) {
  if (!question) return null;

  const skill = (question as any).skill || skills.find((s) => s.id === (question.skillId ?? (question as any).skill?.id));
  const level = (question as any).difficultyLevel || (question as any).level || levels.find(
    (l) =>
      l.id ===
      (question.difficultyLevelId ??
        (question as any).levelId ??
        (question as any).difficultyLevel?.id ??
        (question as any).level?.id)
  );
  const topic = (question as any).topic || topics.find((t) => t.id === (question.topicId ?? (question as any).topic?.id));

  const qTagIds = [
    ...(question.tagIds ?? []),
    ...(Array.isArray((question as any).tags)
      ? (question as any).tags.map((t: any) => (typeof t === "string" ? t : t?.tag?.id || t?.tagId || t?.id))
      : []),
  ].filter(Boolean);

  const relatedTags = new Map([...tags, ...((question as any).tags || []).map((item: any) => item.tag || item)]
    .filter((item: any) => item && typeof item === "object").map((item: any) => [item.id, item]));
  const qTags = Array.from(new Set(qTagIds))
    .map((tid) => relatedTags.get(tid))
    .filter(Boolean) as TaxonomyItem[];

  const promptMedia = extractPromptMedia(question);
  const correctAnswer = getCorrectAnswerText(question);
  const matchingPairs =
    question.type === "matching" && Array.isArray(question.detail?.pairs)
      ? question.detail!.pairs!
      : [];

  return (
    <div style={{ width: 340 }} className="text-xs font-sans">
      {/* ── Đề bài ─────────────────────────────────────── */}
      <div className="mb-2">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
          Đề bài
        </div>
        {question.instruction && (
          <div className="text-slate-500 italic text-[11px] mb-1 leading-relaxed">
            {question.instruction}
          </div>
        )}
        <div
          className="font-semibold text-slate-800 leading-snug whitespace-pre-line"
          dangerouslySetInnerHTML={{ __html: normalizeLineBreaks(question.prompt ?? "(Không có đề bài)") }}
        />

        {/* Câu bổ sung (nếu câu cũ có sourceSentence tách rời prompt) & Từ gợi ý */}
        {question.detail?.sourceSentence &&
          question.detail.sourceSentence.trim() !== (question.prompt ?? "").trim() &&
          !(question.prompt ?? "").includes(question.detail.sourceSentence.trim()) && (
            <div className="mt-1.5 px-2 py-1 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-700 font-semibold">
              {question.detail.sourceSentence}
            </div>
          )}
        {question.detail?.hintWord && (
          <div className="mt-1 text-[11px] text-indigo-600 font-medium">
            Từ gợi ý: <span className="font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">{question.detail.hintWord}</span>
          </div>
        )}

        {/* Media của đề bài (Hình ảnh / Audio) */}
        {promptMedia.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {promptMedia.map((m, idx) =>
              m.type === "audio" ? (
                <div key={idx} className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                  <audio
                    controls
                    preload="metadata"
                    src={resolveMediaUrl(m.url)}
                    className="w-full h-7"
                  />
                </div>
              ) : (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-200 bg-slate-50/70 p-1.5 flex justify-center"
                >
                  <img
                    src={resolveMediaUrl(m.url)}
                    alt="Hình ảnh đề bài"
                    className="max-h-36 w-auto rounded object-contain bg-white"
                  />
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* ── Metadata tags ──────────────────────────────── */}
      <div className="flex flex-wrap gap-1 mb-2 pb-2 border-b border-slate-100">
        <Tag
          color={QUESTION_TYPE_COLORS[question.type] ?? "default"}
          className="text-[10px] m-0 border-none"
        >
          {QUESTION_TYPE_LABELS[question.type] ?? question.type}
        </Tag>
        {skill && <Tag color="blue" className="text-[10px] m-0 border-none">{skill.name}</Tag>}
        {level && <Tag color="purple" className="text-[10px] m-0 border-none">{level.name}</Tag>}
        {topic && <Tag color="cyan" className="text-[10px] m-0 border-none">{topic.name}</Tag>}
        {qTags.map((t) => (
          <Tag key={t.id} color="gold" className="text-[10px] m-0 border-none">
            # {t.name}
          </Tag>
        ))}
      </div>

      {loadingDetail && (
        <div className="py-3 flex items-center justify-center gap-2 text-slate-400 text-[11px]">
          <Spin size="small" />
          <span>Đang tải chi tiết...</span>
        </div>
      )}

      {/* ── Đáp án (MCQ) ───────────────────────────────── */}
      {question.options && question.options.length > 0 && (
        <div className="mb-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
            Đáp án
          </div>
          <div className="space-y-1">
            {question.options.map((opt, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] leading-snug ${
                  opt.isCorrect
                    ? "bg-emerald-50 border border-emerald-200 font-semibold text-emerald-700"
                    : "bg-slate-50 border border-slate-100 text-slate-600"
                }`}
              >
                <span className={`shrink-0 font-bold ${opt.isCorrect ? "text-emerald-600" : "text-slate-500"}`}>
                  {opt.label ?? String.fromCharCode(65 + idx)}.
                </span>
                {opt.media?.url && (
                  <img
                    src={resolveMediaUrl(opt.media.url)}
                    alt={opt.content || "Option"}
                    className="w-9 h-9 rounded object-cover border border-slate-200 shrink-0 bg-white"
                  />
                )}
                {(!opt.media?.url || (opt.content && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(opt.content.trim()) && !/^[0-9a-f]{24}$/i.test(opt.content.trim()))) && (
                  <span className="flex-1 whitespace-pre-line">{normalizeLineBreaks(opt.content)}</span>
                )}
                {opt.isCorrect && <Check size={12} className="shrink-0 text-emerald-600" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Cặp ghép đôi (Matching) ────────────────────── */}
      {matchingPairs.length > 0 && (
        <div className="mb-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
            Các cặp ghép đúng
          </div>
          <div className="space-y-1">
            {matchingPairs.map((rawPair, idx) => {
              const pair = rawPair as any;
              const isUuid = (val?: string) => !val || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val).trim());
              const showLeftText = pair.leftText && (!pair.leftMedia?.url || !isUuid(pair.leftText));
              const showRightText = pair.rightText && (!pair.rightMedia?.url || !isUuid(pair.rightText));

              return (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 px-2 py-1 rounded-md text-[11px] bg-emerald-50/70 border border-emerald-200 text-slate-700"
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {pair.leftMedia?.url && (
                      pair.leftMedia.type === "audio" ? (
                        <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-semibold shrink-0">
                          Audio
                        </span>
                      ) : (
                        <img
                          src={resolveMediaUrl(pair.leftMedia.url)}
                          alt={showLeftText ? pair.leftText : "Left"}
                          className="w-7 h-7 rounded object-cover border border-slate-200 shrink-0 bg-white"
                        />
                      )
                    )}
                    {showLeftText && <span className="truncate font-medium whitespace-pre-line">{normalizeLineBreaks(pair.leftText)}</span>}
                  </div>
                  <span className="text-emerald-600 font-bold shrink-0">➔</span>
                  <div className="flex items-center justify-end gap-1.5 min-w-0 flex-1 text-right">
                    {pair.rightMedia?.url && (
                      pair.rightMedia.type === "audio" ? (
                        <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-semibold shrink-0">
                          Audio
                        </span>
                      ) : (
                        <img
                          src={resolveMediaUrl(pair.rightMedia.url)}
                          alt={showRightText ? pair.rightText : "Right"}
                          className="w-7 h-7 rounded object-cover border border-slate-200 shrink-0 bg-white"
                        />
                      )
                    )}
                    {showRightText && (
                      <span className="font-semibold text-emerald-800 truncate whitespace-pre-line">
                        {normalizeLineBreaks(pair.rightText)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Đoạn văn nghe & điền từ (audio_fill_blanks) ── */}
      {question.type === "audio_fill_blanks" && (question.detail as any)?.passageText && (
        <div className="mb-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
            Đoạn văn có chỗ trống
          </div>
          <div className="p-2 bg-slate-50 border border-slate-200 rounded-md text-[11px] text-slate-700 leading-relaxed font-mono whitespace-pre-wrap">
            {(question.detail as any).passageText}
          </div>
        </div>
      )}

      {/* ── Câu trả lời đúng (non-MCQ) ─────────────────── */}
      {correctAnswer && (
        <div className="mb-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
            Câu trả lời đúng
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1.5 text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
            <Check size={12} className="shrink-0" />
            <span className="whitespace-pre-line">{normalizeLineBreaks(correctAnswer)}</span>
          </div>
        </div>
      )}

      {/* ── Giải thích ──────────────────────────────────── */}
      {question.explanation && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
            Giải thích
          </div>
          <div className="bg-indigo-50 border border-indigo-100 rounded-md px-2 py-1.5 text-[11px] text-indigo-700 leading-relaxed whitespace-pre-line">
            {normalizeLineBreaks(question.explanation)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reusable Popover Wrapper ─────────────────────────────────

export interface QuestionPopoverProps {
  question?: any;
  skills: TaxonomyItem[];
  levels: TaxonomyItem[];
  topics: TaxonomyItem[];
  tags:   TaxonomyItem[];
  title?: React.ReactNode;
  placement?: TooltipPlacement;
  mouseEnterDelay?: number;
  overlayStyle?: React.CSSProperties;
  children: React.ReactNode;
}

export function QuestionPopover({
  question,
  skills,
  levels,
  topics,
  tags,
  title = <div className="font-bold text-slate-800 text-xs">Chi tiết câu hỏi</div>,
  placement = "left",
  mouseEnterDelay = 0.15,
  overlayStyle = { maxWidth: 380 },
  children,
}: QuestionPopoverProps) {
  const [fetchedDetail, setFetchedDetail] = useState<any>(() =>
    question?.id ? questionDetailCache[question.id] : undefined
  );
  const [loading, setLoading] = useState(false);

  if (!question) return <>{children}</>;

  const cached = question.id ? questionDetailCache[question.id] : undefined;
  const mergedQuestion = fetchedDetail
    ? { ...question, ...fetchedDetail }
    : cached
      ? { ...question, ...cached }
      : question;

  const hasAnswerDetails =
    (Array.isArray(mergedQuestion.options) && mergedQuestion.options.length > 0) ||
    Boolean(mergedQuestion.detail && Object.keys(mergedQuestion.detail).length > 0);

  const needsPromptMedia = MEDIA_QUESTION_TYPES.has(mergedQuestion.type);
  const hasPromptMedia = extractPromptMedia(mergedQuestion).length > 0;
  const hasOptionImages =
    mergedQuestion.type !== "audio_image_choice" ||
    (Array.isArray(mergedQuestion.options) &&
      mergedQuestion.options.some((o: any) => Boolean(o?.media?.url)));

  const hasFullDetails =
    Boolean(fetchedDetail || cached) ||
    (hasAnswerDetails && (!needsPromptMedia || hasPromptMedia) && hasOptionImages);

  const handleOpenChange = async (open: boolean) => {
    if (open && !hasFullDetails && question.id && !loading) {
      if (questionDetailCache[question.id]) {
        setFetchedDetail(questionDetailCache[question.id]);
        return;
      }
      try {
        setLoading(true);
        const full = await learningCmsService.questions.get(question.id);
        if (full) {
          questionDetailCache[question.id] = full;
          setFetchedDetail(full);
        }
      } catch {
        // Ignore error and show basic info
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Popover
      content={
        <QuestionPopoverContent
          question={mergedQuestion}
          skills={skills}
          levels={levels}
          topics={topics}
          tags={tags}
          loadingDetail={loading}
        />
      }
      title={title}
      trigger="hover"
      placement={placement}
      mouseEnterDelay={mouseEnterDelay}
      overlayStyle={overlayStyle}
      onOpenChange={handleOpenChange}
    >
      {children}
    </Popover>
  );
}
