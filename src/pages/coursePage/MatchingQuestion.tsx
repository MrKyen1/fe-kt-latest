import React, { useMemo } from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragEndEvent,
} from "@dnd-kit/core";
import { motion } from "framer-motion";
import { ExamQuestion } from "../../types";

const UNASSIGNED_ZONE_ID = "choices";

type MatchingQuestionProps = {
  question: ExamQuestion;
  value?: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
  showFeedback?: boolean;
  correctAnswer?: Record<string, string>;
};

type DraggableItemProps = {
  id: string;
  label: string;
  disabled?: boolean;
};

const DraggableItem: React.FC<DraggableItemProps> = ({
  id,
  label,
  disabled = false,
}) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id,
  });

  const style = {
    transform: transform
      ? `translate(${transform.x}px, ${transform.y}px)`
      : undefined,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...(!disabled ? listeners : {})}
      {...(!disabled ? attributes : {})}
      whileDrag={disabled ? undefined : { scale: 1.05 }}
      className={`px-4 py-2 bg-white dark:bg-slate-700 border rounded-xl shadow-sm text-sm font-semibold text-slate-700 dark:text-slate-200 hover:shadow-md transition ${
        disabled ? "cursor-not-allowed opacity-70" : "cursor-grab"
      }`}
    >
      {label}
    </motion.div>
  );
};

const DropZone: React.FC<{
  id: string;
  label: string;
  matchedId?: string;
  matchedLabel?: string;
  isCorrect?: boolean;
  showFeedback?: boolean;
}> = ({ id, label, matchedId, matchedLabel, isCorrect, showFeedback }) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`p-3 rounded-2xl border min-h-[72px] flex items-center justify-between gap-3 transition ${
        showFeedback
          ? isCorrect
            ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20"
            : matchedId
              ? "border-rose-400 bg-rose-50 dark:bg-rose-900/20"
              : "border-slate-200"
          : "border-slate-200 dark:border-slate-600"
      } ${isOver ? "ring-2 ring-emerald-500/60" : ""}`}
    >
      <span className="font-medium text-slate-700 dark:text-slate-200">
        {label}
      </span>

      <div className="flex items-center gap-3 min-w-[120px] justify-end">
        {matchedId && matchedLabel ? (
          <DraggableItem id={matchedId} label={matchedLabel} disabled={showFeedback} />
        ) : (
          <span className="text-slate-400 dark:text-slate-500 text-sm">
            Thả đáp án vào đây
          </span>
        )}
      </div>
    </div>
  );
};

export const MatchingQuestion: React.FC<MatchingQuestionProps> = ({
  question,
  value = {},
  onChange,
  showFeedback,
  correctAnswer = {},
}) => {
  const leftItemsList = useMemo(() => {
    return (question.leftItems || []).map((item) => {
      if (typeof item === "string") {
        return { id: item, text: item };
      }
      return item as { id: string; text: string };
    });
  }, [question.leftItems]);

  const rightItemsList = useMemo(() => {
    return (question.rightItems || []).map((item) => {
      if (typeof item === "string") {
        return { id: item, text: item };
      }
      return item as { id: string; text: string };
    });
  }, [question.rightItems]);

  const { setNodeRef: setChoicesRef, isOver: isOverChoices } = useDroppable({
    id: UNASSIGNED_ZONE_ID,
  });

  const shuffledRight = useMemo(() => {
    return [...rightItemsList].sort(() => Math.random() - 0.5);
  }, [rightItemsList]);

  const handleDragEnd = (event: DragEndEvent) => {
    if (showFeedback) return;

    const { active, over } = event;
    if (!over) return;

    const draggedValue = active.id as string;
    const dropTargetId = over.id as string;

    if (dropTargetId === UNASSIGNED_ZONE_ID) {
      const updatedValue = Object.fromEntries(
        Object.entries(value).filter(([, answer]) => answer !== draggedValue),
      );
      onChange(updatedValue);
      return;
    }

    if (!leftItemsList.some((item) => item.id === dropTargetId)) return;

    const updatedValue = Object.fromEntries(
      Object.entries(value).filter(([, answer]) => answer !== draggedValue),
    );

    onChange({
      ...updatedValue,
      [dropTargetId]: draggedValue,
    });
  };

  const usedValues = Object.values(value);

  return (
    <div className="flex flex-col gap-6">
      <DndContext onDragEnd={handleDragEnd}>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-slate-500 uppercase">
              Match
            </h3>

            {leftItemsList.map((item) => {
              const matched = value[item.id];
              const matchedItem = rightItemsList.find((r) => r.id === matched);
              let isCorrect = false;
              if (correctAnswer) {
                if (correctAnswer[item.id] !== undefined) {
                  isCorrect = correctAnswer[item.id] === matched;
                } else if (correctAnswer[item.text] !== undefined) {
                  isCorrect = correctAnswer[item.text] === (matchedItem?.text || "");
                }
              }

              return (
                <DropZone
                  key={item.id}
                  id={item.id}
                  label={item.text}
                  matchedId={matched}
                  matchedLabel={matchedItem?.text}
                  isCorrect={isCorrect}
                  showFeedback={showFeedback}
                />
              );
            })}
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-slate-500 uppercase">
              Options
            </h3>

            <div
              ref={setChoicesRef}
              className={`space-y-3 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 min-h-[220px] transition ${
                isOverChoices ? "ring-2 ring-emerald-500/60" : ""
              }`}
            >
              {shuffledRight.map((item) => {
                if (usedValues.includes(item.id)) return null;

                return (
                  <DraggableItem
                    key={item.id}
                    id={item.id}
                    label={item.text}
                    disabled={showFeedback}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </DndContext>

      {!showFeedback && (
        <p className="text-xs text-slate-400 text-center">
          Kéo đáp án bên phải vào ô tương ứng bên trái. Kéo lại vào ô "Options"
          để bỏ chọn.
        </p>
      )}
    </div>
  );
};
