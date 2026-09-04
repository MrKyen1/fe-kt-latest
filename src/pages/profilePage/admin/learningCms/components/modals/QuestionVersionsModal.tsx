import { Modal, Table, Tag } from "antd";
import { History } from "lucide-react";
import { QUESTION_TYPE_COLORS, QUESTION_TYPE_LABELS } from "../../constants";

// ── Types ────────────────────────────────────────────────────

interface QuestionVersion {
  id: string;
  versionNumber: number;
  questionType:  string;
  createdAt:     string;
  questionSnapshot?: { prompt?: string };
  correctAnswer?: Record<string, any>;
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

// ── Columns ──────────────────────────────────────────────────

const COLUMNS = [
  {
    title: "Phiên bản",
    dataIndex: "versionNumber",
    key: "versionNumber",
    width: 100,
    render: (num: number) => (
      <span className="font-bold text-indigo-600">v{num}</span>
    ),
  },
  {
    title: "Loại câu hỏi",
    dataIndex: "questionType",
    key: "questionType",
    width: 130,
    render: (type: string) => (
      <Tag color={QUESTION_TYPE_COLORS[type] ?? "default"}>
        {QUESTION_TYPE_LABELS[type] ?? type}
      </Tag>
    ),
  },
  {
    title: "Nội dung đề bài",
    key: "prompt",
    render: (_: unknown, r: QuestionVersion) => (
      <div
        className="text-xs text-slate-700 max-w-sm truncate"
        title={r.questionSnapshot?.prompt}
      >
        {r.questionSnapshot?.prompt ?? "Không có nội dung"}
      </div>
    ),
  },
  {
    title: "Đáp án",
    key: "correctAnswer",
    render: (_: unknown, r: QuestionVersion) => (
      <div
        className="text-xs font-mono text-slate-500 max-w-xs truncate"
        title={JSON.stringify(r.correctAnswer ?? {})}
      >
        {JSON.stringify(r.correctAnswer ?? {})}
      </div>
    ),
  },
  {
    title: "Ngày tạo",
    dataIndex: "createdAt",
    key: "createdAt",
    width: 180,
    render: (date: string) => new Date(date).toLocaleString("vi-VN"),
  },
];

// ── Component ────────────────────────────────────────────────

/**
 * Question version history modal — read-only table.
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
      width={800}
      className="rounded-2xl"
      destroyOnClose
    >
      <div className="py-2 space-y-4 font-sans">
        <Table
          dataSource={questionVersions}
          rowKey="id"
          pagination={{ pageSize: 5 }}
          size="small"
          className="border border-slate-100 rounded-xl overflow-hidden shadow-sm"
          columns={COLUMNS}
        />
      </div>
    </Modal>
  );
}
