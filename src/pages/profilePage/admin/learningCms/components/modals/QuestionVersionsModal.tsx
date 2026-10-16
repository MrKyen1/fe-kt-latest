import { useState } from "react";
import { useCmsHeaderFilters, type CmsFilters } from "../../../../../../components/CmsHeaderFilters";
import Table from "../../../../../../components/Table";
import { useServerPagination } from "../../../../../../hooks/useServerPagination";
import { Alert, Empty, Modal, Tag, Tooltip } from "antd";
import { History, Info, Check } from "lucide-react";
import { QUESTION_TYPE_COLORS, QUESTION_TYPE_LABELS } from "../../constants";
import { resolveMediaUrl } from "../../../../../../services/apiClient";
import { normalizeLineBreaks } from "../../../../../../utils/textFormatters";
import { AppImage } from "../../../../../../components/AppImagePreview";

// ── Types ────────────────────────────────────────────────────

export interface QuestionVersionOption {
  id: string;
  label?: string | null;
  content?: string;
  media?: {
    id?: string;
    url?: string;
    type?: string;
  };
  orderIndex?: number;
}

export interface QuestionVersion {
  id: string;
  versionNumber: number;
  questionType:  string;
  createdAt:     string;
  questionSnapshot?: {
    prompt?: string;
    instruction?: string;
    explanation?: string;
    options?: QuestionVersionOption[];
    detail?: Record<string, any>;
    media?: any[];
    feedback?: Record<string, any>;
  };
  correctAnswer?: Record<string, any>;
  feedback?: Record<string, any>;
  contentHash?: string;
}

interface Question {
  id: string;
  prompt?: string;
}

interface Props {
  open:             boolean;
  viewingQuestion:  Question | null;
  questionVersions: QuestionVersion[];
  onCancel:         () => void;
}

// ── Helpers ──────────────────────────────────────────────────

function extractVersionExplanationMedia(r: QuestionVersion): Array<{ url: string; type: "image" | "audio" }> {
  // Chỉ lấy đúng danh sách media giải thích thực tế của câu hỏi từ backend
  // Thứ tự ưu tiên (tránh lấy lặp lại từ nhiều trường cùng chứa 1 media):
  const rawList: any[] =
    Array.isArray(r.feedback?.explanationMedia) && r.feedback.explanationMedia.length > 0
      ? r.feedback.explanationMedia
      : Array.isArray(r.questionSnapshot?.feedback?.explanationMedia) && r.questionSnapshot.feedback.explanationMedia.length > 0
        ? r.questionSnapshot.feedback.explanationMedia
        : Array.isArray(r.questionSnapshot?.media)
          ? r.questionSnapshot.media.filter((m: any) => m.role === "explanation_image" || m.role === "explanation_audio")
          : [];

  const seenUrls = new Set<string>();
  const result: Array<{ url: string; type: "image" | "audio" }> = [];

  for (const item of rawList) {
    const m = item?.media || item;
    const rawUrl = m?.url || (typeof m === "string" ? m : null);
    if (!rawUrl) continue;
    const url = resolveMediaUrl(rawUrl);
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);

    const isAudio =
      m?.type === "audio" ||
      item?.role === "explanation_audio" ||
      /\.(mp3|wav|ogg|m4a)$/i.test(url);

    result.push({
      url,
      type: isAudio ? "audio" : "image",
    });
  }

  return result;
}

function renderExplanation(r: QuestionVersion) {
  const explanationText = (
    r.feedback?.explanation ||
    r.questionSnapshot?.explanation ||
    ""
  ).trim();
  const mediaList = extractVersionExplanationMedia(r);

  if (!explanationText && mediaList.length === 0) {
    return <span className="text-slate-400 italic text-xs">Không có</span>;
  }

  const tooltipContent = (
    <div className="space-y-1.5 text-xs max-w-sm">
      {explanationText && (
        <div className="font-medium whitespace-pre-line leading-relaxed">
          {explanationText}
        </div>
      )}
      {mediaList.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {mediaList.map((m, idx) =>
            m.type === "audio" ? (
              <audio key={idx} controls src={m.url} className="h-6 w-36" />
            ) : (
              <img
                key={idx}
                src={m.url}
                alt="Giải thích"
                className="max-h-28 max-w-[240px] rounded object-contain bg-white border border-slate-200"
              />
            )
          )}
        </div>
      )}
    </div>
  );

  return (
    <Tooltip title={tooltipContent} placement="topLeft">
      <div className="inline-flex flex-col gap-1 max-w-full cursor-default">
        {explanationText && (
          <div className="text-xs text-indigo-700 bg-indigo-50/80 border border-indigo-100 rounded-md px-2 py-0.5 line-clamp-2 font-medium max-w-[200px]">
            {explanationText}
          </div>
        )}
        {mediaList.length > 0 && (
          <div className="flex flex-wrap gap-1 items-center">
            {mediaList.map((m, idx) =>
              m.type === "audio" ? (
                <audio key={idx} controls src={m.url} className="h-5 w-24 shrink-0" />
              ) : (
                <div key={idx} className="w-5 h-5 rounded overflow-hidden border border-indigo-200 bg-white shrink-0">
                  <AppImage src={m.url} alt="Ảnh giải thích" className="w-full h-full object-cover" preview={false} />
                </div>
              )
            )}
            <span className="text-[10px] text-indigo-600 font-semibold">[Ảnh giải thích]</span>
          </div>
        )}
      </div>
    </Tooltip>
  );
}

function renderCorrectAnswer(r: QuestionVersion) {
  const correctAnswer = r.correctAnswer;
  const snapshot = r.questionSnapshot;
  const options = snapshot?.options ?? [];

  if (!correctAnswer || Object.keys(correctAnswer).length === 0) {
    return <span className="text-slate-400 italic text-xs">Không có đáp án</span>;
  }

  // 1. Trắc nghiệm (Multiple Choice / Choice types)
  const selectedOptionIds: string[] = Array.isArray(correctAnswer.selectedOptionIds)
    ? correctAnswer.selectedOptionIds.map(String)
    : correctAnswer.selectedOptionId
      ? [String(correctAnswer.selectedOptionId)]
      : Array.isArray(correctAnswer.correctOptionIds)
        ? correctAnswer.correctOptionIds.map(String)
        : [];

  if (selectedOptionIds.length > 0) {
    const matched = options.filter((opt) => selectedOptionIds.includes(String(opt.id)));
    if (matched.length > 0) {
      return (
        <div className="flex flex-wrap gap-1.5 items-center max-w-full">
          {matched.map((opt, idx) => {
            const label = opt.label ?? (opt.orderIndex !== undefined ? String.fromCharCode(65 + opt.orderIndex) : String.fromCharCode(65 + idx));
            const imgUrl = opt.media?.url ? resolveMediaUrl(opt.media.url) : null;
            const textContent = opt.content ? normalizeLineBreaks(opt.content).trim() : "";
            const isAudio = opt.media?.type === "audio" || /\.(mp3|wav|ogg|m4a)$/i.test(opt.media?.url || "");

            return (
              <Tooltip
                key={opt.id || idx}
                title={
                  <div className="space-y-1 text-xs">
                    <div className="font-bold">Đáp án {label}{textContent ? `: ${textContent}` : ""}</div>
                    {imgUrl && !isAudio && (
                      <img src={imgUrl} alt={`Đáp án ${label}`} className="max-w-[200px] max-h-[140px] rounded object-contain bg-white" />
                    )}
                  </div>
                }
              >
                <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-2.5 py-1 text-xs max-w-full shadow-2xs">
                  <span className="font-bold text-emerald-900 shrink-0">{label}.</span>
                  {imgUrl && (
                    isAudio ? (
                      <audio controls src={imgUrl} className="h-5 w-24 shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded overflow-hidden border border-emerald-300 bg-white shrink-0">
                        <AppImage
                          src={imgUrl}
                          alt={`Đáp án ${label}`}
                          className="w-full h-full object-cover"
                          preview={false}
                        />
                      </div>
                    )
                  )}
                  {textContent ? (
                    <span className="max-w-[160px] truncate font-medium">
                      {textContent}
                    </span>
                  ) : (
                    imgUrl ? <span className="text-[10px] text-emerald-700 font-medium">[Hình ảnh]</span> : null
                  )}
                </div>
              </Tooltip>
            );
          })}
        </div>
      );
    }
  }

  // 2. Audio fill blanks
  if (Array.isArray(correctAnswer.blanks) && correctAnswer.blanks.length > 0) {
    return (
      <div className="flex flex-wrap gap-1 items-center max-w-full">
        {correctAnswer.blanks.map((b: any, bIdx: number) => {
          const accepted = Array.isArray(b.acceptedAnswers)
            ? b.acceptedAnswers.join(" / ")
            : String(b.acceptedAnswers || b.value || "");
          return (
            <Tooltip key={b.id || bIdx} title={`Ô trống ${bIdx + 1}: ${accepted}`}>
              <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded px-1.5 py-0.5 text-xs font-mono">
                <span className="font-bold">({bIdx + 1})</span>
                <span className="max-w-[120px] truncate">{accepted}</span>
              </span>
            </Tooltip>
          );
        })}
      </div>
    );
  }

  // 3. Word ordering
  const tokens = Array.isArray(correctAnswer.tokens)
    ? correctAnswer.tokens
    : Array.isArray(correctAnswer.words)
      ? correctAnswer.words
      : null;
  if (tokens && tokens.length > 0) {
    const sentence = tokens.join(" ");
    return (
      <Tooltip title={sentence}>
        <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-2.5 py-1 text-xs max-w-full truncate">
          <Check size={12} className="text-emerald-600 shrink-0" />
          <span className="font-medium truncate max-w-[240px]">{sentence}</span>
        </div>
      </Tooltip>
    );
  }

  // 4. Sentence rewrite / Hint rewrite
  if (Array.isArray(correctAnswer.acceptedAnswers) && correctAnswer.acceptedAnswers.length > 0) {
    const text = correctAnswer.acceptedAnswers.join(" / ");
    return (
      <Tooltip title={text}>
        <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-2.5 py-1 text-xs max-w-full truncate">
          <Check size={12} className="text-emerald-600 shrink-0" />
          <span className="font-medium truncate max-w-[240px]">{text}</span>
        </div>
      </Tooltip>
    );
  }

  // 5. Error correction
  if (correctAnswer.correctedSentence) {
    const text = String(correctAnswer.correctedSentence);
    return (
      <Tooltip title={text}>
        <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-2.5 py-1 text-xs max-w-full truncate">
          <Check size={12} className="text-emerald-600 shrink-0" />
          <span className="font-medium truncate max-w-[240px]">{text}</span>
        </div>
      </Tooltip>
    );
  }

  // 6. Matching pairs
  if (Array.isArray(correctAnswer.pairs) && correctAnswer.pairs.length > 0) {
    return (
      <div className="flex flex-col gap-1 max-w-full">
        {correctAnswer.pairs.map((p: any, idx: number) => {
          const pairText = `${p.leftText || p.leftItemId || `Item ${idx + 1}`} → ${p.rightText || p.rightItemId || ""}`;
          return (
            <Tooltip key={idx} title={pairText}>
              <span className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded px-1.5 py-0.5 truncate max-w-[240px]">
                {pairText}
              </span>
            </Tooltip>
          );
        })}
      </div>
    );
  }

  // 7. Text or Value string
  if (correctAnswer.text || correctAnswer.value || correctAnswer.answer) {
    const val = String(correctAnswer.text ?? correctAnswer.value ?? correctAnswer.answer);
    return (
      <Tooltip title={val}>
        <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-2.5 py-1 text-xs max-w-full truncate">
          <Check size={12} className="text-emerald-600 shrink-0" />
          <span className="font-medium truncate max-w-[240px]">{val}</span>
        </div>
      </Tooltip>
    );
  }

  // 8. Fallback formatted
  const rawStr = JSON.stringify(correctAnswer);
  return (
    <Tooltip title={rawStr}>
      <div className="text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded max-w-xs truncate">
        {rawStr}
      </div>
    </Tooltip>
  );
}

// ── Columns ──────────────────────────────────────────────────

const COLUMNS = [
  {
    title: "Phiên bản",
    dataIndex: "versionNumber",
    key: "versionNumber",
    width: 85,
    align: "center" as const,
    render: (num: number) => (
      <Tag color="indigo" className="font-bold text-xs px-2.5 py-0.5 rounded-full border-none">
        v{num}
      </Tag>
    ),
  },
  {
    title: "Loại câu hỏi",
    dataIndex: "questionType",
    key: "questionType",
    width: 150,
    render: (type: string) => (
      <Tag color={QUESTION_TYPE_COLORS[type] ?? "default"} className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
        {QUESTION_TYPE_LABELS[type] ?? type}
      </Tag>
    ),
  },
  {
    title: "Nội dung đề bài snapshot",
    key: "prompt",
    minWidth: 200,
    render: (_: unknown, r: QuestionVersion) => {
      const promptText = r.questionSnapshot?.prompt ?? "Không có nội dung";
      return (
        <Tooltip title={promptText} placement="topLeft">
          <div
            className="text-xs text-slate-700 line-clamp-2 font-medium cursor-default leading-relaxed max-w-xs"
            dangerouslySetInnerHTML={{ __html: promptText }}
          />
        </Tooltip>
      );
    },
  },
  {
    title: "Đáp án đúng",
    key: "correctAnswer",
    minWidth: 200,
    render: (_: unknown, r: QuestionVersion) => renderCorrectAnswer(r),
  },
  {
    title: "Giải thích",
    key: "explanation",
    minWidth: 200,
    render: (_: unknown, r: QuestionVersion) => renderExplanation(r),
  },
  {
    title: "Ngày cắt phiên bản",
    dataIndex: "createdAt",
    key: "createdAt",
    width: 160,
    render: (date: string) => (
      <span className="text-xs text-slate-500 font-mono">
        {date ? new Date(date).toLocaleString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }) : "—"}
      </span>
    ),
  },
];

// ── Component ────────────────────────────────────────────────

/**
 * Question version history modal — read-only table with architecture explanation.
 */
export default function QuestionVersionsModal({
  open,
  viewingQuestion,
  questionVersions,
  onCancel,
}: Props) {
  const promptPreview = viewingQuestion?.prompt
    ? viewingQuestion.prompt.length > 30
      ? viewingQuestion.prompt.substring(0, 30) + "..."
      : viewingQuestion.prompt
    : "";

  const [versionFilters, setVersionFilters] = useState<{ id?: string; filters: CmsFilters }>({ filters: {} });
  const appliedVersionFilters = versionFilters.id === viewingQuestion?.id ? versionFilters.filters : {};
  const applyVersionFilters = (patch: CmsFilters) => setVersionFilters({ id: viewingQuestion?.id, filters: { ...appliedVersionFilters, ...patch } });
  const versionQuery = Object.fromEntries(Object.entries(appliedVersionFilters).filter(([, value]) => value.length > 0));
  const versionPage = useServerPagination(`/learning/questions/${viewingQuestion?.id}/versions`, versionQuery, 5, open && !!viewingQuestion);
  const headerColumns = useCmsHeaderFilters(COLUMNS, "question-versions", { filters: appliedVersionFilters, apply: applyVersionFilters });
  return (
    <Modal
      title={
        <div className="font-bold text-slate-800 text-lg flex items-center gap-2">
          <History size={18} className="text-indigo-600" />
          <span>Lịch sử phiên bản câu hỏi — {promptPreview}</span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      centered
      maskClosable={false}
      width={1040}
      styles={{
        body: {
          maxHeight: "74vh",
          overflowY: "auto",
          overflowX: "hidden",
          paddingRight: "8px",
        },
      }}
      className="rounded-2xl"
      destroyOnHidden
    >
      <div className="py-2 space-y-3 font-sans">
        {/* Architecture Note */}
        <Alert
          type="info"
          showIcon
          icon={<Info size={16} className="text-blue-500 mt-0.5" />}
          className="rounded-xl border-blue-100 bg-blue-50/70 text-xs text-slate-600"
          title={
            <span>
              <strong>Cơ chế Versioning:</strong> Phiên bản câu hỏi được tự động cắt bất biến và lưu trữ trong bảng <code className="bg-white/80 px-1 py-0.5 rounded border border-blue-200 text-blue-700">question_versions</code> mỗi khi một Đề thi chứa câu hỏi này được <strong>Xuất bản (Publish)</strong>.
            </span>
          }
        />

        <Table
          dataSource={versionPage.data} loading={versionPage.loading}
          rowKey="id"
          pagination={versionPage.pagination}
          size="small"
          className="border border-slate-100 rounded-xl overflow-hidden shadow-sm"
          columns={headerColumns}
          scroll={{ x: 960 }}
          locale={{
            emptyText: (
              <div className="py-6 text-center">
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <div className="space-y-1 text-slate-500 text-xs">
                      <p className="font-semibold text-slate-700">Chưa có phiên bản xuất bản nào</p>
                      <p>
                        Câu hỏi này chưa được đưa vào đề thi nào đã phát hành, hoặc Backend đang xử lý liên kết phiên bản.
                      </p>
                    </div>
                  }
                />
              </div>
            ),
          }}
        />
      </div>
    </Modal>
  );
}
