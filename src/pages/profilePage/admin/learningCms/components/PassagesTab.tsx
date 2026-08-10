import { Button, Space, Table, Typography } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { PAGE_SIZE_PASSAGES } from "../constants";

const { Paragraph } = Typography;


// ── Types ────────────────────────────────────────────────────

interface Passage {
  id: string;
  title: string;
  content?: string;
  source?: string;
  level?: { name: string };
}

interface Props {
  passages: Passage[];
  onCreateClick: () => void;
  onEditClick:   (record: Passage) => void;
  onDeleteClick: (record: Passage) => void;
}

// ── Columns ──────────────────────────────────────────────────

function buildColumns(
  onEdit:   (r: Passage) => void,
  onDelete: (r: Passage) => void,
) {
  return [
    {
      title: "Tiêu đề",
      dataIndex: "title",
      render: (val: string, record: Passage) => (
        <div>
          <div className="font-semibold text-slate-800">{val}</div>
          <div className="text-xs text-slate-400">
            {record.source ? `📚 ${record.source}` : "—"} •{" "}
            {record.level ? `🎯 ${record.level.name}` : "Chưa chọn level"}
          </div>
        </div>
      ),
    },
    {
      title: "Xem trước nội dung",
      dataIndex: "content",
      render: (val: string) => (
        <Paragraph className="text-xs text-slate-500 max-w-lg mb-0 line-clamp-2">
          {val}
        </Paragraph>
      ),
    },
    {
      title: "Thao tác",
      align: "right" as const,
      render: (_: unknown, record: Passage) => (
        <Space size="small">
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
 * Reading passages management tab — list table with create,
 * edit, and delete actions.
 */
export default function PassagesTab({ passages, onCreateClick, onEditClick, onDeleteClick }: Props) {
  const columns = buildColumns(onEditClick, onDeleteClick);

  return (
    <div className="space-y-4 pt-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <span className="text-slate-500">
          Danh sách bài đọc cho phần Đọc hiểu ({passages.length} bài)
        </span>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onCreateClick}
          className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-sm font-semibold"
        >
          Tạo bài đọc mới
        </Button>
      </div>

      <Table
        rowKey="id"
        dataSource={passages}
        columns={columns}
        pagination={{ pageSize: PAGE_SIZE_PASSAGES }}
      />
    </div>
  );
}
