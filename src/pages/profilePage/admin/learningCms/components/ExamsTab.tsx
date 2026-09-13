import { Button, Space, Table, Tag, Tooltip } from "antd";
import { AlertTriangle, Clock } from "lucide-react";
import {
  BookOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { Can } from "../../../../../components/Can";

// ── Types ────────────────────────────────────────────────────

interface ExamQuestion {
  questionId: string;
}

interface Exam {
  id: string;
  code?: string;
  title: string;
  examType?: string;
  status: string;
  timeLimitSeconds?: number;
  hasUnpublishedChanges?: boolean;
  questions?: ExamQuestion[];
}

interface Props {
  exams: Exam[];
  onCreateClick: () => void;
  onEditClick: (record: Exam) => void;
  onDeleteClick: (record: Exam) => void;
  onToggleStatus: (record: Exam) => void;
  onRepublish: (record: Exam) => void;
  onConfigQuestions: (record: Exam) => void;
  onViewVersions: (record: Exam) => void;
}

// ── Sub-renders ──────────────────────────────────────────────

function ExamStatusCell({ exam, onToggle, onRepublish }: {
  exam: Exam;
  onToggle: (e: Exam) => void;
  onRepublish: (e: Exam) => void;
}) {
  if (exam.status !== "published") {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200">
        Bản nháp
      </span>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-1 w-full">
      {/* Hàng 1: Trạng thái + Label Có thay đổi (Highlight vàng rực rỡ, không bị rớt dòng) */}
      <div className="flex items-center justify-center gap-1.5 flex-nowrap whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-xs shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
          Đang phát hành
        </span>

        {exam.hasUnpublishedChanges && (
          <Tooltip title="Đề thi đã bị thay đổi nội dung (câu hỏi/cấu hình) sau khi xuất bản. Cần xuất bản bản mới để cập nhật cho học sinh.">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-yellow-400 text-yellow-950 border border-yellow-500 shadow-sm cursor-help shrink-0">
              <AlertTriangle size={12} className="text-yellow-950 shrink-0" />
              Có thay đổi
            </span>
          </Tooltip>
        )}
      </div>

      {/* Hàng 2: Nút Xuất bản bản mới (Highlight đỏ nổi bật, căn giữa hoàn hảo) */}
      {exam.hasUnpublishedChanges && (
        <Can perform="learning.publish">
          <Tooltip title="Nhấn để lưu và phát hành phiên bản mới ngay lập tức">
            <Button
              type="primary"
              danger
              size="small"
              icon={<SendOutlined className="text-xs" />}
              onClick={() => onRepublish(exam)}
              className="rounded-full font-bold text-xs shadow-md shadow-rose-200 hover:shadow-rose-400 bg-rose-600 hover:bg-rose-700 border-none px-4 py-1 h-auto flex items-center gap-1.5 transition-all duration-200 transform hover:scale-105 active:scale-95 text-white whitespace-nowrap"
            >
              Xuất bản bản mới
            </Button>
          </Tooltip>
        </Can>
      )}
    </div>
  );
}

// ── Columns ──────────────────────────────────────────────────

function buildColumns(
  onEdit: (e: Exam) => void,
  onDelete: (e: Exam) => void,
  onToggle: (e: Exam) => void,
  onRepublish: (e: Exam) => void,
  onConfigQuestions: (e: Exam) => void,
  onViewVersions: (e: Exam) => void,
) {
  return [
    {
      title: "Đề thi",
      dataIndex: "title",
      render: (val: string, record: Exam) => (
        <div>
          <div className="font-bold text-slate-800">{val}</div>
          <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1">
            <span>{record.code} •</span>
            <Clock size={11} className="inline text-slate-400" />
            <span>
              {record.timeLimitSeconds
                ? `${Math.round(record.timeLimitSeconds / 60)} phút`
                : "Không giới hạn"}
            </span>
          </div>
        </div>
      ),
    },
    {
      title: "Loại đề",
      dataIndex: "examType",
      render: (val?: string) => (
        <Tag
          color={val === "exam" ? "purple" : "blue"}
          className="rounded-full px-2.5 py-0.5 border-none text-xs font-semibold"
        >
          {val === "exam" ? "Đề kiểm tra" : "Đề ôn tập"}
        </Tag>
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
      width: 220,
      align: "center" as const,
      render: (_: string, record: Exam) => (
        <ExamStatusCell exam={record} onToggle={onToggle} onRepublish={onRepublish} />
      ),
    },
    {
      title: "Thao tác",
      align: "right" as const,
      render: (_: unknown, record: Exam) => (
        <Space size="small">
          <Can perform="learning.write">
            <Button
              type="dashed"
              size="small"
              onClick={() => onConfigQuestions(record)}
              className="text-xs font-semibold border-indigo-200 text-indigo-600 rounded-lg hover:border-indigo-500"
            >
              Cấu hình câu hỏi
            </Button>
          </Can>
          <Button
            type="dashed"
            size="small"
            onClick={() => onViewVersions(record)}
            className="text-xs font-semibold border-amber-200 text-amber-600 rounded-lg hover:border-amber-500"
          >
            Lịch sử phiên bản
          </Button>
          <Can perform="learning.publish">
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
          </Can>
          <Can perform="learning.write">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined className="text-slate-400 hover:text-indigo-600" />}
              onClick={() => onEdit(record)}
            />
          </Can>
          <Can perform="learning.delete">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined className="text-slate-400 hover:text-rose-600" />}
              onClick={() => onDelete(record)}
            />
          </Can>
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
        <Can perform="learning.write">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onCreateClick}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-sm font-semibold"
          >
            Tạo đề thi mới
          </Button>
        </Can>
      </div>

      <Table rowKey="id" dataSource={exams} columns={columns} />
    </div>
  );
}
