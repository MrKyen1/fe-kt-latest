import { PagedCollection } from "../../../../../components/PagedCollection";
import Table from "../../../../../components/Table";
import { Button, Empty, Pagination, Space, Spin, Typography } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { BookOpen, Target } from "lucide-react";
import { PAGE_SIZE_PASSAGES } from "../constants";
import { Can } from "../../../../../components/Can";
import { useResponsive } from "../../../../../hooks/useResponsive";

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
  loading?: boolean;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
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
          <div className="text-xs text-slate-400 flex items-center gap-1.5 flex-wrap mt-0.5">
            {record.source ? (
              <span className="inline-flex items-center gap-1">
                <BookOpen size={11} className="text-slate-400" />
                {record.source}
              </span>
            ) : "—"}
            <span>•</span>
            {record.level ? (
              <span className="inline-flex items-center gap-1">
                <Target size={11} className="text-slate-400" />
                {record.level.name}
              </span>
            ) : "Chưa chọn level"}
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
 * Reading passages management tab — list table with create,
 * edit, and delete actions.
 */
export default function PassagesTab({
  passages,
  loading = false,
  pagination,
  onCreateClick,
  onEditClick,
  onDeleteClick,
}: Props) {
  const { isMobile } = useResponsive();
  const columns = buildColumns(onEditClick, onDeleteClick);

  return (
    <div className="space-y-4 pt-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <span className="text-slate-500 text-sm">
          Danh sách bài đọc cho phần Đọc hiểu ({pagination.total} bài)
        </span>
        <Can perform="learning.write">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onCreateClick}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-sm font-semibold w-full sm:w-auto"
          >
            Tạo bài đọc mới
          </Button>
        </Can>
      </div>

      {isMobile ? <PagedCollection loading={loading} hasData={passages.length > 0} variant="list" footer={pagination.total > 0 && (
            <div className="pt-2 flex flex-col items-center justify-center gap-2">
              <span className="text-xs text-slate-400">
                Tổng cộng {pagination.total} bài đọc
              </span>
              <Pagination
                current={pagination.current}
                pageSize={pagination.pageSize}
                total={pagination.total}
                onChange={pagination.onChange}
                size="small"
                showSizeChanger={false}
              />
            </div>
          )}>{(
        /* Mobile Card View: cuộn dọc 1 chiều trực quan, không cần vuốt ngang */
        <div className="space-y-3">
          {passages.length === 0 ? (
            <div className="py-10 bg-white rounded-2xl border border-slate-100 text-center shadow-xs">
              <Empty description={<span className="text-slate-400 text-xs">Chưa có bài đọc nào</span>} />
            </div>
          ) : (
            passages.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3"
              >
                <div className="font-bold text-slate-800 text-base">
                  {item.title}
                </div>

                <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
                  {item.source ? (
                    <span className="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 text-slate-600">
                      <BookOpen size={12} className="text-indigo-500" />
                      {item.source}
                    </span>
                  ) : null}
                  {item.level ? (
                    <span className="inline-flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 text-indigo-700 font-medium">
                      <Target size={12} className="text-indigo-600" />
                      {item.level.name}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs italic">Chưa chọn level</span>
                  )}
                </div>

                {item.content && (
                  <div className="text-xs text-slate-600 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 line-clamp-3 leading-relaxed">
                    {item.content}
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                  <Can perform="learning.write">
                    <Button
                      type="default"
                      size="middle"
                      icon={<EditOutlined className="text-indigo-600" />}
                      onClick={() => onEditClick(item)}
                      className="rounded-xl font-semibold text-xs h-9 px-3.5 border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-300"
                    >
                      Chỉnh sửa
                    </Button>
                  </Can>
                  <Can perform="learning.delete">
                    <Button
                      danger
                      size="middle"
                      icon={<DeleteOutlined />}
                      onClick={() => onDeleteClick(item)}
                      className="rounded-xl font-semibold text-xs h-9 px-3.5"
                    >
                      Xóa
                    </Button>
                  </Can>
                </div>
              </div>
            ))
          )}


        </div>
      )}</PagedCollection> : (
        <Table
          rowKey="id"
          loading={loading}
          dataSource={passages}
          columns={columns}
          scroll={{ x: 700 }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onChange: pagination.onChange,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50", "100"],
            showTotal: (total) => `Tổng cộng ${total} bài đọc`,
          }}
        />
      )}
    </div>
  );
}
