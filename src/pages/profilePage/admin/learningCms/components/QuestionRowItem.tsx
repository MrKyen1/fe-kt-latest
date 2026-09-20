import React from "react";
import { Tag } from "antd";
import type { TooltipPlacement } from "antd/es/tooltip";
import { QUESTION_TYPE_COLORS, QUESTION_TYPE_LABELS } from "../constants";
import { QuestionPopover } from "./QuestionPopoverContent";

interface TaxonomyItem {
  id: string;
  name: string;
}

export interface QuestionRowItemProps {
  index?: number;
  question: any;
  skills: TaxonomyItem[];
  levels: TaxonomyItem[];
  topics: TaxonomyItem[];
  tags: TaxonomyItem[];
  variant?: "purple" | "indigo" | "slate";
  placement?: TooltipPlacement;
  action?: React.ReactNode;
  tagExtra?: React.ReactNode;
  isMismatched?: boolean;
  className?: string;
}

/**
 * Shared horizontal row component displaying question index, prompt, and type tag on one line,
 * with integrated QuestionPopover tooltip on hover, and an optional action element (e.g. Add button).
 */
export default function QuestionRowItem({
  index,
  question,
  skills,
  levels,
  topics,
  tags,
  variant = "indigo",
  placement = "left",
  action,
  tagExtra,
  isMismatched = false,
  className = "",
}: QuestionRowItemProps) {
  const prompt = question?.prompt;
  const type = question?.type;

  const isPurple = variant === "purple";
  const borderClass = isMismatched
    ? "border-red-300 bg-red-50/40 hover:border-red-400"
    : isPurple
      ? "border-purple-100 hover:border-purple-300"
      : "border-slate-200 hover:border-indigo-300";
  const badgeClass = isMismatched
    ? "bg-red-100 text-red-700"
    : isPurple
      ? "bg-purple-100 text-purple-700"
      : "bg-indigo-100 text-indigo-700";

  return (
    <div
      className={`bg-white rounded-lg mb-1.5 border transition-colors p-1.5 px-2 flex items-center justify-between gap-2 ${borderClass} ${className}`}
    >
      <QuestionPopover
        question={question}
        skills={skills}
        levels={levels}
        topics={topics}
        tags={tags}
        placement={placement}
      >
        <div className="flex items-center justify-between gap-2 min-w-0 flex-1 cursor-pointer">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {index !== undefined && (
              <span
                className={`w-5 h-5 rounded-full ${badgeClass} text-[10px] font-bold flex items-center justify-center shrink-0`}
              >
                {index}
              </span>
            )}
            <div
              className="text-xs text-slate-800 line-clamp-1 flex-1 min-w-0 font-normal"
              dangerouslySetInnerHTML={{
                __html: prompt || `Câu hỏi #${question?.id}`,
              }}
            />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isMismatched && (
              <Tag color="error" className="text-[9px] border-none m-0 font-semibold">
                Khác môn
              </Tag>
            )}
            {tagExtra}
            {type && (
              <Tag
                color={QUESTION_TYPE_COLORS[type]}
                className="text-[9px] border-none m-0 shrink-0"
              >
                {QUESTION_TYPE_LABELS[type] ?? type}
              </Tag>
            )}
          </div>
        </div>
      </QuestionPopover>

      {action && <div className="shrink-0 flex items-center">{action}</div>}
    </div>
  );
}
