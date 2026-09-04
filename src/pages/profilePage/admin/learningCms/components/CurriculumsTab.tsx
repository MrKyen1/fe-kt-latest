import { Button, Space, Table, Tag, Tooltip } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from "@ant-design/icons";

// ── Types ────────────────────────────────────────────────────

interface CurriculumExam {
  examId: string;
  isRequired: boolean;
}

interface Level {
  id: string;
  name: string;
}

interface Curriculum {
  id: string;
  code?: string;
  title: string;
  status: string;
  level?: Level;
  exams?: CurriculumExam[];
}

interface Props {
  curriculums: Curriculum[];
  onCreateClick:    () => void;
  onEditClick:      (record: Curriculum) => void;
  onDeleteClick:    (record: Curriculum) => void;
  onToggleStatus:   (record: Curriculum) => void;
  onConfigExams:    (record: Curriculum) => void;
}

// ── Columns ──────────────────────────────────────────────────

function buildColumns(
  onEdit:        (c: Curriculum) => void,
  onDelete:      (c: Curriculum) => void,
  onToggle:      (c: Curriculum) => void,
  onConfigExams: (c: Curriculum) => void,
) {
  return [
    {
      title: "Giáo trình",
      dataIndex: "title",
      render: (val: string, record: Curriculum) => (
        <div>
          <div className="font-bold text-slate-800">{val}</div>
          <div className="text-xs text-slate-400 font-mono mt-0.5">
            {record.code}
            {record.level && ` • Level: ${record.level.name}`}
          </div>
        </div>
      ),
    },
    {
      title: "Đề thi",
      render: (_: unknown, record: Curriculum) => {
        const count    = record.exams?.length ?? 0;
        const required = (record.exams ?? []).filter((e) => e.isRequired).length;
        return (
          <div className="text-center">
            <div className="font-bold text-lg text-slate-700">{count}</div>
            <div className="text-xs text-slate-400">{required} bắt buộc</div>
          </div>
        );
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (val: string) => (
        <Tag
          color={val === "published" ? "success" : "default"}
          className="rounded-full px-2.5 py-0.5 border-none text-xs font-semibold"
        >
          {val === "published" ? "Đang phát hành" : "Nháp"}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      align: "right" as const,
      render: (_: unknown, record: Curriculum) => (
        <Space size="small">
          <Button
            type="dashed"
            size="small"
            onClick={() => onConfigExams(record)}
            className="text-xs font-semibold border-purple-200 text-purple-600 rounded-lg hover:border-purple-500"
          >
            Cấu hình đề thi
          </Button>
          <Tooltip
            title={
              record.status === "published"
                ? "Chuyển về Nháp"
                : "Phát hành giáo trình (cần ít nhất 1 đề thi đã phát hành)"
            }
          >
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
 * Curriculum management tab — table with actions for
 * exam configuration, status toggle, edit, and delete.
 */
export default function CurriculumsTab({
  curriculums,
  onCreateClick,
  onEditClick,
  onDeleteClick,
  onToggleStatus,
  onConfigExams,
}: Props) {
  const publishedCount = curriculums.filter((c) => c.status === "published").length;

  const columns = buildColumns(
    onEditClick,
    onDeleteClick,
    onToggleStatus,
    onConfigExams,
  );

  return (
    <div className="space-y-4 pt-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <span className="text-slate-500">
          Giáo trình đào tạo —{" "}
          <strong>{publishedCount}/{curriculums.length}</strong> đang phát hành
        </span>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onCreateClick}
          className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-sm font-semibold"
        >
          Tạo giáo trình mới
        </Button>
      </div>

      <Table rowKey="id" dataSource={curriculums} columns={columns} />
    </div>
  );
}
