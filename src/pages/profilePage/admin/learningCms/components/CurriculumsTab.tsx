import { useMemo } from "react";
import { Button, Space, Table, Tag, Tooltip } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { Can } from "../../../../../components/Can";
import { AppImage } from "../../../../../components/AppImagePreview";

// ── Types ────────────────────────────────────────────────────

interface CurriculumExam {
  examId: string;
  isRequired: boolean;
  orderIndex?: number;
  exam?: {
    id?: string;
    title?: string;
    examType?: string;
  };
}

interface Level {
  id: string;
  name: string;
}

interface Curriculum {
  id: string;
  code?: string;
  title: string;
  description?: string;
  image?: string | null;
  status: string;
  level?: Level;
  exams?: CurriculumExam[];
}

interface Props {
  curriculums: Curriculum[];
  exams?: Array<{ id: string; examType?: string; title?: string }>;
  onCreateClick: () => void;
  onEditClick: (record: Curriculum) => void;
  onDeleteClick: (record: Curriculum) => void;
  onToggleStatus: (record: Curriculum) => void;
  onConfigExams: (record: Curriculum) => void;
}

// ── Columns ──────────────────────────────────────────────────

function buildColumns(
  onEdit: (c: Curriculum) => void,
  onDelete: (c: Curriculum) => void,
  onToggle: (c: Curriculum) => void,
  onConfigExams: (c: Curriculum) => void,
  examsMap: Map<string, any>,
) {
  return [
    {
      title: "Giáo trình",
      dataIndex: "title",
      render: (val: string, record: Curriculum) => (
        <div className="flex items-center gap-3">
          {record.image ? (
            <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center">
              <AppImage
                src={record.image}
                alt={val}
                className="w-12 h-12 object-cover"
                rootClassName="w-full h-full flex items-center justify-center"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 shrink-0 flex items-center justify-center font-bold text-xs border border-purple-100">
              {record.code ? record.code.slice(0, 4).toUpperCase() : "CURR"}
            </div>
          )}
          <div>
            <div className="font-bold text-slate-800">{val}</div>
            <div className="text-xs text-slate-400 font-mono mt-0.5">
              {record.code}
              {record.level && ` • Level: ${record.level.name}`}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Đề thi",
      align: "center" as const,
      width: 120,
      render: (_: unknown, record: Curriculum) => {
        const examList = record.exams ?? [];
        const count = examList.length;

        const examCount = examList.filter((item) => {
          const type = item.exam?.examType ?? examsMap.get(item.examId)?.examType ?? "practice";
          return type === "exam";
        }).length;

        const practiceCount = examList.filter((item) => {
          const type = item.exam?.examType ?? examsMap.get(item.examId)?.examType ?? "practice";
          return type === "practice";
        }).length;

        if (count === 0) {
          return (
            <Tooltip title="Chưa có đề thi trong giáo trình">
              <span className="text-slate-400 font-semibold text-base cursor-default">0</span>
            </Tooltip>
          );
        }

        return (
          <Tooltip
            title={
              <div className="py-1 px-0.5 space-y-1 text-xs">
                <div className="font-semibold text-slate-100 border-b border-slate-600 pb-1 flex items-center justify-between gap-3">
                  <span>Tổng cộng:</span>
                  <span className="font-bold">{count} đề</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-300">Đề thi:</span>
                  <span className="font-bold text-amber-400">{examCount}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-300">Đề ôn tập:</span>
                  <span className="font-bold text-emerald-400">{practiceCount}</span>
                </div>
              </div>
            }
          >
            <div className="inline-flex items-center justify-center cursor-pointer group">
              <span className="font-bold text-sm text-slate-700 group-hover:text-purple-600 transition-colors">
                {count}
              </span>
            </div>
          </Tooltip>
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
          <Can perform="learning.write">
            <Button
              type="dashed"
              size="small"
              onClick={() => onConfigExams(record)}
              className="text-xs font-semibold border-purple-200 text-purple-600 rounded-lg hover:border-purple-500"
            >
              Cấu hình đề thi
            </Button>
          </Can>
          <Can perform="learning.publish">
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
 * Curriculum management tab — table with actions for
 * exam configuration, status toggle, edit, and delete.
 */
export default function CurriculumsTab({
  curriculums,
  exams = [],
  onCreateClick,
  onEditClick,
  onDeleteClick,
  onToggleStatus,
  onConfigExams,
}: Props) {
  const publishedCount = curriculums.filter((c) => c.status === "published").length;
  const examsMap = useMemo(() => new Map(exams.map((e) => [e.id, e])), [exams]);

  const columns = useMemo(
    () =>
      buildColumns(
        onEditClick,
        onDeleteClick,
        onToggleStatus,
        onConfigExams,
        examsMap,
      ),
    [onEditClick, onDeleteClick, onToggleStatus, onConfigExams, examsMap],
  );

  return (
    <div className="space-y-4 pt-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <span className="text-slate-500">
          Giáo trình đào tạo —{" "}
          <strong>{publishedCount}/{curriculums.length}</strong> đang phát hành
        </span>
        <Can perform="learning.write">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onCreateClick}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-sm font-semibold"
          >
            Tạo giáo trình mới
          </Button>
        </Can>
      </div>

      <Table rowKey="id" dataSource={curriculums} columns={columns} />
    </div>
  );
}
