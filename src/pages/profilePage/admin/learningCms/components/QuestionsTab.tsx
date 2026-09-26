import { Button, Space, Table, Tag, Tooltip } from "antd";
import { Sparkles, Target } from "lucide-react";
import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
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
  onDuplicateClick:     (record: Question) => void;
  onDeleteClick:        (record: Question) => void;
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
  onDuplicate:    (r: Question) => void,
  onDelete:       (r: Question) => void,
  onViewVersions: (r: Question) => void,
) {
  return [
    {
      title: "Đề bài",
      dataIndex: "prompt",
      width: "50%",
      render: (val: string, record: Question) => (
        <div>
          <Tooltip
            title={
              <div
                className="max-h-64 overflow-y-auto p-1 text-xs leading-relaxed text-slate-100"
                dangerouslySetInnerHTML={{ __html: val }}
              />
            }
            placement="topLeft"
            overlayStyle={{ maxWidth: 520 }}
          >
            <div
              className="font-semibold text-slate-800 text-sm line-clamp-2 cursor-pointer hover:text-indigo-600 transition-colors"
              dangerouslySetInnerHTML={{ __html: val }}
            />
          </Tooltip>
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
      width: 190,
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
      width: 110,
      align: "center" as const,
      render: (val: string) => <StatusTag status={val} />,
    },
    {
      title: "Thao tác",
      width: 130,
      align: "right" as const,
      render: (_: unknown, record: Question) => (
        <Space size="small" wrap={false} className="whitespace-nowrap">
          <Can perform="learning.write">
            <Tooltip title="Nhân bản câu hỏi">
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined className="text-slate-400 hover:text-indigo-600" />}
                onClick={() => onDuplicate(record)}
              />
            </Tooltip>
            <Tooltip title="Chỉnh sửa câu hỏi">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined className="text-slate-400 hover:text-indigo-600" />}
                onClick={() => onEdit(record)}
              />
            </Tooltip>
          </Can>
          <Can perform="learning.delete">
            <Tooltip title="Xóa câu hỏi">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined className="text-slate-400 hover:text-rose-600" />}
                onClick={() => onDelete(record)}
              />
            </Tooltip>
          </Can>
        </Space>
      ),
    },
  ];
}

// ── Component ────────────────────────────────────────────────

/**
 * Question bank tab — table with per-row actions for edit,
 * duplicate, delete, and version history.
 */
export default function QuestionsTab({
  questions,
  skills,
  levels,
  onCreateClick,
  onEditClick,
  onDuplicateClick,
  onDeleteClick,
  onViewVersions,
}: Props) {
  const columns = buildColumns(
    skills,
    levels,
    onEditClick,
    onDuplicateClick,
    onDeleteClick,
    onViewVersions,
  );

  return (
    <div className="space-y-4 pt-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <span className="text-slate-500">
          Ngân hàng câu hỏi — Tổng cộng <strong>{questions.length}</strong> câu hỏi
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
        scroll={{ x: 800 }}
      />
    </div>
  );
}

export { StatusTag };
