import React, { useMemo } from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragEndEvent,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
} from "@dnd-kit/core";
import { motion } from "framer-motion";
import { ExamQuestion, ExamMedia } from "../../types";
import { AppImage } from "../../components/AppImagePreview";

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

  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    touchAction: "none",
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...(!disabled ? listeners : {})}
      {...(!disabled ? attributes : {})}
      whileDrag={disabled ? undefined : { scale: 1.05 }}
      className={`px-3.5 sm:px-4 py-2 bg-white border rounded-xl shadow-xs text-xs sm:text-sm font-semibold text-slate-700 hover:shadow-md transition select-none ${
        disabled ? "cursor-not-allowed opacity-70" : "cursor-grab active:cursor-grabbing"
      }`}
    >
      {label}
    </motion.div>
  );
};

const isUuidOrId = (text?: string, id?: string) => {
  if (!text) return true;
  const trimmed = text.trim();
  if (id && (trimmed === id || trimmed === id.trim())) return true;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
};

const DropZone: React.FC<{
  id: string;
  label: string;
  media?: ExamMedia;
  matchedId?: string;
  matchedLabel?: string;
  isCorrect?: boolean;
  showFeedback?: boolean;
}> = ({ id, label, media, matchedId, matchedLabel, isCorrect, showFeedback }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  const displayLabel = media && isUuidOrId(label, id) ? "" : label;

  return (
    <div
      ref={setNodeRef}
      className={`p-3 rounded-2xl border min-h-[72px] flex items-center justify-between gap-3 transition ${
        showFeedback
          ? isCorrect
            ? "border-emerald-400 bg-emerald-50"
            : matchedId
              ? "border-rose-400 bg-rose-50"
              : "border-slate-200"
          : "border-slate-200"
      } ${isOver ? "ring-2 ring-emerald-500/60" : ""}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {media && (
          media.type === "image" ? (
            <div className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-white flex items-center justify-center">
              <AppImage
                src={media.url}
                alt={displayLabel || "Hình ảnh ghép đôi"}
                className="w-full h-full object-cover"
                maskText="Xem ảnh"
              />
            </div>
          ) : media.type === "audio" ? (
            <div className="shrink-0">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio src={media.url} controls className="h-7 max-w-[200px]" />
            </div>
          ) : null
        )}
        {displayLabel ? (
          <span className="font-medium text-slate-700 text-sm">{displayLabel}</span>
        ) : null}
      </div>

      <div className="flex items-center gap-3 min-w-[120px] justify-end shrink-0">
        {matchedId && matchedLabel ? (
          <DraggableItem id={matchedId} label={matchedLabel} disabled={showFeedback} />
        ) : (
          <span className="text-slate-400 text-sm">
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
        return { id: item, text: item, media: undefined };
      }
      const rawText = item.text || "";
      const text = item.media && isUuidOrId(rawText, item.id) ? "" : rawText;
      return { id: item.id, text, media: item.media };
    });
  }, [question.leftItems]);

  const rightItemsList = useMemo(() => {
    return (question.rightItems || []).map((item) => {
      if (typeof item === "string") {
        return { id: item, text: item };
      }
      const rawText = item.text || "";
      const text = (item as any).media && isUuidOrId(rawText, item.id) ? "" : rawText;
      return { id: item.id, text };
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

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 4,
    },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 150,
      tolerance: 5,
    },
  });
  const sensors = useSensors(pointerSensor, touchSensor);

  const usedValues = Object.values(value);

  return (
    <div className="flex flex-col gap-6">
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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
                  media={item.media}
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
              className={`space-y-3 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200 bg-slate-50 min-h-[160px] sm:min-h-[220px] transition ${
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
