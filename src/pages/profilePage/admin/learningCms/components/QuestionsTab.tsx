import { Badge, Button, Space, Table, Tag, Tooltip } from "antd";
import { Sparkles, Target } from "lucide-react";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";
import { QUESTION_TYPE_COLORS, QUESTION_TYPE_LABELS, PAGE_SIZE_QUESTIONS } from "../constants";
import { Can } from "../../../../../components/Can";

// ── Types ────────────────────────────────────────────────────

interface TaxItem { id: string; name: string; }

interface Question {
  id: string;
  prompt?: string;
  type: string;
  status: string;
  skillId?: string;
  difficultyLevelId?: string;
}

interface Props {
  questions: Question[];
  skills:    TaxItem[];
  levels:    TaxItem[];
  onCreateClick:        () => void;
  onEditClick:          (record: Question) => void;
  onDeleteClick:        (record: Question) => void;
  onToggleStatus:       (record: Question) => void;
  onViewVersions:       (record: Question) => void;
}

// ── Helpers ──────────────────────────────────────────────────

function StatusTag({ status }: { status: string }) {
  if (status === "published")
    return <Tag color="success" className="rounded-full border-none text-xs font-semibold">Đã duyệt</Tag>;
  if (status === "archived")
    return <Tag color="default" className="rounded-full border-none text-xs font-semibold">Lưu trữ</Tag>;
  return <Tag color="warning" className="rounded-full border-none text-xs font-semibold">Nháp</Tag>;
}

// ── Columns ──────────────────────────────────────────────────

function buildColumns(
  skills:         TaxItem[],
  levels:         TaxItem[],
  onEdit:         (r: Question) => void,
  onDelete:       (r: Question) => void,
  onToggle:       (r: Question) => void,
  onViewVersions: (r: Question) => void,
) {
  return [
    {
      title: "Đề bài",
      dataIndex: "prompt",
      render: (val: string, record: Question) => (
        <div>
          <div
            className="font-semibold text-slate-800 text-sm line-clamp-2"
            dangerouslySetInnerHTML={{ __html: val }}
          />
          <Tag
            color={QUESTION_TYPE_COLORS[record.type] ?? "default"}
            className="rounded border-none text-[10px] mt-1.5 font-bold uppercase"
          >
            {QUESTION_TYPE_LABELS[record.type] ?? record.type}
          </Tag>
        </div>
      ),
    },
    {
      title: "Phân loại",
      render: (_: unknown, record: Question) => {
        const skill = skills.find((s) => s.id === record.skillId);
        const level = levels.find((l) => l.id === record.difficultyLevelId);
        return (
          <div className="text-xs text-slate-500 space-y-0.5">
            {skill && <div className="flex items-center gap-1"><Sparkles size={11} className="text-blue-500 shrink-0" /><span>{skill.name}</span></div>}
            {level && <div className="flex items-center gap-1"><Target size={11} className="text-purple-500 shrink-0" /><span>{level.name}</span></div>}
          </div>
        );
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (val: string) => <StatusTag status={val} />,
    },
    {
      title: "Thao tác",
      align: "right" as const,
      render: (_: unknown, record: Question) => (
        <Space size="small">
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
 * Question bank tab — table with per-row actions for edit,
 * delete, status toggle, and version history.
 */
export default function QuestionsTab({
  questions,
  skills,
  levels,
  onCreateClick,
  onEditClick,
  onDeleteClick,
  onToggleStatus,
  onViewVersions,
}: Props) {
  const publishedCount = questions.filter((q) => q.status === "published").length;

  const columns = buildColumns(
    skills,
    levels,
    onEditClick,
    onDeleteClick,
    onToggleStatus,
    onViewVersions,
  );

  return (
    <div className="space-y-4 pt-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <span className="text-slate-500">
          Ngân hàng câu hỏi —{" "}
          <strong>{publishedCount}/{questions.length}</strong> đã duyệt
        </span>
        <Can perform="learning.write">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onCreateClick}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-sm font-semibold"
          >
            Tạo câu hỏi mới
          </Button>
        </Can>
      </div>

      <Table
        rowKey="id"
        dataSource={questions}
        columns={columns}
        pagination={{ pageSize: PAGE_SIZE_QUESTIONS }}
      />
    </div>
  );
}

export { StatusTag };
