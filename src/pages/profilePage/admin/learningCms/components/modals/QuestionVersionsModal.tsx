import { Alert, Empty, Modal, Table, Tag } from "antd";
import { History, Info } from "lucide-react";
import { QUESTION_TYPE_COLORS, QUESTION_TYPE_LABELS } from "../../constants";

// ── Types ────────────────────────────────────────────────────

export interface QuestionVersion {
  id: string;
  versionNumber: number;
  questionType:  string;
  createdAt:     string;
  questionSnapshot?: { prompt?: string };
  correctAnswer?: Record<string, any>;
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

function renderCorrectAnswer(correctAnswer?: Record<string, any>) {
  if (!correctAnswer || Object.keys(correctAnswer).length === 0) {
    return <span className="text-slate-400 italic text-xs">Không có</span>;
  }
  if (Array.isArray(correctAnswer.acceptedAnswers)) {
    return (
      <div className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded inline-block max-w-xs truncate" title={correctAnswer.acceptedAnswers.join(", ")}>
        {correctAnswer.acceptedAnswers.join(", ")}
      </div>
    );
  }
  if (correctAnswer.text || correctAnswer.value || correctAnswer.answer) {
    const val = String(correctAnswer.text ?? correctAnswer.value ?? correctAnswer.answer);
    return (
      <div className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded inline-block max-w-xs truncate" title={val}>
        {val}
      </div>
    );
  }
  return (
    <div
      className="text-xs font-mono text-slate-600 bg-slate-50 px-2 py-0.5 rounded max-w-xs truncate"
      title={JSON.stringify(correctAnswer)}
    >
      {JSON.stringify(correctAnswer)}
    </div>
  );
}

// ── Columns ──────────────────────────────────────────────────

const COLUMNS = [
  {
    title: "Phiên bản",
    dataIndex: "versionNumber",
    key: "versionNumber",
    width: 95,
    render: (num: number) => (
      <Tag color="indigo" className="font-bold text-xs px-2 py-0.5 rounded-full border-none">
        v{num}
      </Tag>
    ),
  },
  {
    title: "Loại câu hỏi",
    dataIndex: "questionType",
    key: "questionType",
    width: 130,
    render: (type: string) => (
      <Tag color={QUESTION_TYPE_COLORS[type] ?? "default"} className="rounded-full px-2 text-[11px] font-semibold">
        {QUESTION_TYPE_LABELS[type] ?? type}
      </Tag>
    ),
  },
  {
    title: "Nội dung đề bài snapshot",
    key: "prompt",
    render: (_: unknown, r: QuestionVersion) => (
      <div
        className="text-xs text-slate-700 max-w-sm truncate font-medium"
        title={r.questionSnapshot?.prompt}
      >
        {r.questionSnapshot?.prompt ?? "Không có nội dung"}
      </div>
    ),
  },
  {
    title: "Đáp án đúng",
    key: "correctAnswer",
    render: (_: unknown, r: QuestionVersion) => renderCorrectAnswer(r.correctAnswer),
  },
  {
    title: "Ngày cắt phiên bản",
    dataIndex: "createdAt",
    key: "createdAt",
    width: 160,
    render: (date: string) => (
      <span className="text-xs text-slate-500">
        {date ? new Date(date).toLocaleString("vi-VN") : "—"}
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
      width={850}
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
          dataSource={questionVersions}
          rowKey="id"
          pagination={{ pageSize: 5 }}
          size="small"
          className="border border-slate-100 rounded-xl overflow-hidden shadow-sm"
          columns={COLUMNS}
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
