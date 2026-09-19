import { Popover, Tag } from "antd";
import type { TooltipPlacement } from "antd/es/tooltip";
import { Check } from "lucide-react";
import { QUESTION_TYPE_COLORS, QUESTION_TYPE_LABELS } from "../constants";

// ── Types ────────────────────────────────────────────────────

interface TaxonomyItem {
  id: string;
  name: string;
}

interface QuestionOption {
  label?: string;
  content: string;
  isCorrect: boolean;
}

interface QuestionDetail {
  correctTokens?: string | string[];
  acceptedAnswers?: string | string[];
  correctSentence?: string;
  correctAnswer?: string | string[];
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
  detail?: QuestionDetail;
}

interface Props {
  question: Question;
  skills: TaxonomyItem[];
  levels: TaxonomyItem[];
  topics: TaxonomyItem[];
  tags:   TaxonomyItem[];
}

// ── Helper ───────────────────────────────────────────────────

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
  return null;
}

// ── Component ────────────────────────────────────────────────

/**
 * Displays a compact preview of a question's content, metadata,
 * and answer(s).  Used inside Ant Design <Popover> on hover.
 */
export default function QuestionPopoverContent({ question, skills, levels, topics, tags }: Props) {
  if (!question) return null;

  const skill = skills.find((s) => s.id === (question.skillId ?? (question as any).skill?.id));
  const level = levels.find((l) => l.id === (question.difficultyLevelId ?? (question as any).levelId ?? (question as any).difficultyLevel?.id ?? (question as any).level?.id));
  const topic = topics.find((t) => t.id === (question.topicId ?? (question as any).topic?.id));

  const qTagIds = [
    ...(question.tagIds ?? []),
    ...(Array.isArray((question as any).tags)
      ? (question as any).tags.map((t: any) => (typeof t === "string" ? t : t?.id))
      : []),
  ].filter(Boolean);

  const qTags = Array.from(new Set(qTagIds))
    .map((tid) => tags.find((t) => t.id === tid))
    .filter(Boolean) as TaxonomyItem[];

  const correctAnswer = getCorrectAnswerText(question);

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
          className="font-semibold text-slate-800 leading-snug"
          dangerouslySetInnerHTML={{ __html: question.prompt ?? "(Không có đề bài)" }}
        />
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
                className={`flex items-start gap-1.5 px-2 py-1 rounded-md text-[11px] leading-snug ${
                  opt.isCorrect
                    ? "bg-emerald-50 border border-emerald-200 font-semibold text-emerald-700"
                    : "bg-slate-50 border border-slate-100 text-slate-600"
                }`}
              >
                <span className={`shrink-0 font-bold ${opt.isCorrect ? "text-emerald-600" : "text-slate-500"}`}>
                  {opt.label ?? String.fromCharCode(65 + idx)}.
                </span>
                <span className="flex-1">{opt.content}</span>
                {opt.isCorrect && <Check size={12} className="shrink-0 text-emerald-600" />}
              </div>
            ))}
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
            <span>{correctAnswer}</span>
          </div>
        </div>
      )}

      {/* ── Giải thích ──────────────────────────────────── */}
      {question.explanation && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
            Giải thích
          </div>
          <div className="bg-indigo-50 border border-indigo-100 rounded-md px-2 py-1.5 text-[11px] text-indigo-700 leading-relaxed">
            {question.explanation}
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
  if (!question) return <>{children}</>;

  return (
    <Popover
      content={
        <QuestionPopoverContent
          question={question}
          skills={skills}
          levels={levels}
          topics={topics}
          tags={tags}
        />
      }
      title={title}
      trigger="hover"
      placement={placement}
      mouseEnterDelay={mouseEnterDelay}
      overlayStyle={overlayStyle}
    >
      {children}
    </Popover>
  );
}

