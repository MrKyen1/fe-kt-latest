import { Button, Space, Table, Tag, Tooltip } from "antd";
import {
  BookOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from "@ant-design/icons";

// ── Types ────────────────────────────────────────────────────

interface ExamQuestion {
  questionId: string;
}

interface Exam {
  id: string;
  code?: string;
  title: string;
  status: string;
  timeLimitSeconds?: number;
  hasUnpublishedChanges?: boolean;
  questions?: ExamQuestion[];
}

interface Props {
  exams: Exam[];
  onCreateClick:       () => void;
  onEditClick:         (record: Exam) => void;
  onDeleteClick:       (record: Exam) => void;
  onToggleStatus:      (record: Exam) => void;
  onRepublish:         (record: Exam) => void;
  onConfigQuestions:   (record: Exam) => void;
  onViewVersions:      (record: Exam) => void;
}

// ── Sub-renders ──────────────────────────────────────────────

function ExamStatusCell({ exam, onToggle, onRepublish }: {
  exam: Exam;
  onToggle:    (e: Exam) => void;
  onRepublish: (e: Exam) => void;
}) {
  return (
    <Space direction="vertical" size={2} align="center" className="w-full">
      <Tag
        color={exam.status === "published" ? "success" : "default"}
        className="rounded-full px-2.5 py-0.5 border-none text-xs font-semibold m-0"
      >
        {exam.status === "published" ? "✓ Đang phát hành" : "Nháp"}
      </Tag>

      {exam.status === "published" && exam.hasUnpublishedChanges && (
        <div className="flex flex-col items-center gap-1 mt-1.5">
          <Tooltip title="Đề thi đã bị thay đổi sau khi xuất bản. Hãy bấm nút bên dưới hoặc chuyển về nháp rồi xuất bản lại để cập nhật phiên bản mới.">
            <Tag color="warning" className="rounded-full px-2.5 py-0.5 border-none text-[10px] font-bold m-0">
              ⚠️ Có thay đổi
            </Tag>
          </Tooltip>
          <Button
            type="link"
            size="small"
            onClick={() => onRepublish(exam)}
            className="text-[10px] p-0 h-auto font-bold text-indigo-600 hover:text-indigo-800"
          >
            🚀 Xuất bản bản mới
          </Button>
        </div>
      )}
    </Space>
  );
}

// ── Columns ──────────────────────────────────────────────────

function buildColumns(
  onEdit:            (e: Exam) => void,
  onDelete:          (e: Exam) => void,
  onToggle:          (e: Exam) => void,
  onRepublish:       (e: Exam) => void,
  onConfigQuestions: (e: Exam) => void,
  onViewVersions:    (e: Exam) => void,
) {
  return [
    {
      title: "Đề thi",
      dataIndex: "title",
      render: (val: string, record: Exam) => (
        <div>
          <div className="font-bold text-slate-800">{val}</div>
          <div className="text-xs text-slate-400 font-mono mt-0.5">
            {record.code} • ⏱{" "}
            {record.timeLimitSeconds
              ? `${Math.round(record.timeLimitSeconds / 60)} phút`
              : "Không giới hạn"}
          </div>
        </div>
      ),
    },
    {
      title: "Câu hỏi",
      render: (_: unknown, record: Exam) => {
        const count = record.questions?.length ?? 0;
        return (
          <div className="text-center">
            <div className="font-bold text-lg text-slate-700">{count}</div>
            <div className="text-xs text-slate-400">câu</div>
          </div>
        );
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (_: string, record: Exam) => (
        <ExamStatusCell exam={record} onToggle={onToggle} onRepublish={onRepublish} />
      ),
    },
    {
      title: "Thao tác",
      align: "right" as const,
      render: (_: unknown, record: Exam) => (
        <Space size="small">
          <Button
            type="dashed"
            size="small"
            onClick={() => onConfigQuestions(record)}
            className="text-xs font-semibold border-indigo-200 text-indigo-600 rounded-lg hover:border-indigo-500"
          >
            Cấu hình câu hỏi
          </Button>
          <Button
            type="dashed"
            size="small"
            onClick={() => onViewVersions(record)}
            className="text-xs font-semibold border-amber-200 text-amber-600 rounded-lg hover:border-amber-500"
          >
            Lịch sử phiên bản
          </Button>
          <Tooltip title={record.status === "published" ? "Chuyển về Nháp" : "Duyệt & Phát hành"}>
            <Button
              type="text"
              size="small"
              icon={
                record.status === "published"
                  ? <CloseCircleOutlined className="text-orange-400" />
                  : <CheckCircleOutlined className="text-emerald-500" />
              }
              onClick={() => onToggle(record)}
            />
          </Tooltip>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined className="text-slate-400 hover:text-indigo-600" />}
            onClick={() => onEdit(record)}
          />
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined className="text-slate-400 hover:text-rose-600" />}
            onClick={() => onDelete(record)}
          />
        </Space>
      ),
    },
  ];
}

// ── Component ────────────────────────────────────────────────

/**
 * Exams management tab — table with per-row actions including
 * question configuration, version history, status toggle, edit, and delete.
 */
export default function ExamsTab({
  exams,
  onCreateClick,
  onEditClick,
  onDeleteClick,
  onToggleStatus,
  onRepublish,
  onConfigQuestions,
  onViewVersions,
}: Props) {
  const publishedCount = exams.filter((e) => e.status === "published").length;

  const columns = buildColumns(
    onEditClick,
    onDeleteClick,
    onToggleStatus,
    onRepublish,
    onConfigQuestions,
    onViewVersions,
  );

  return (
    <div className="space-y-4 pt-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <span className="text-slate-500">
          Quản lý đề thi —{" "}
          <strong>{publishedCount}/{exams.length}</strong> đang phát hành
        </span>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onCreateClick}
          className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-sm font-semibold"
        >
          Tạo đề thi mới
        </Button>
      </div>

      <Table rowKey="id" dataSource={exams} columns={columns} />
    </div>
  );
}
