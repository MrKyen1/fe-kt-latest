import { Button, Empty, Pagination, Space, Spin, Table, Tag, Tooltip } from "antd";
import { AlertTriangle, Clock } from "lucide-react";
import {
  BookOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  HistoryOutlined,
  PlusOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { Can } from "../../../../../components/Can";
import { useResponsive } from "../../../../../hooks/useResponsive";

// ── Types ────────────────────────────────────────────────────

interface ExamQuestion {
  questionId: string;
}

interface Exam {
  id: string;
  code?: string;
  title: string;
  description?: string;
  examType?: string;
  status: string;
  timeLimitSeconds?: number;
  hasUnpublishedChanges?: boolean;
  questions?: ExamQuestion[];
  questionCount?: number;
}

interface Props {
  exams: Exam[];
  loading?: boolean;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
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
        <Tooltip
          title={
            <div className="space-y-1.5 p-1 max-w-xs text-xs">
              <div className="font-bold text-slate-100 text-sm border-b border-slate-700/80 pb-1">{val}</div>
              {record.code && (
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="font-semibold text-slate-400">Mã đề:</span>
                  <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-[11px] text-indigo-300">{record.code}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="font-semibold text-slate-400">Thời gian:</span>
                <span className="flex items-center gap-1">
                  <Clock size={11} className="inline text-slate-400" />
                  {record.timeLimitSeconds
                    ? `${Math.round(record.timeLimitSeconds / 60)} phút`
                    : "Không giới hạn"}
                </span>
              </div>
              {record.description && (
                <div className="pt-1 border-t border-slate-700/60 text-slate-300 text-[11px] leading-relaxed">
                  <span className="font-semibold text-slate-400 block mb-0.5">Mô tả:</span>
                  {record.description}
                </div>
              )}
            </div>
          }
          placement="topLeft"
          overlayStyle={{ maxWidth: 360 }}
        >
          <div className="font-bold text-slate-800 text-sm hover:text-indigo-600 transition-colors cursor-pointer truncate max-w-md">
            {val}
          </div>
        </Tooltip>
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
        const count = record.questionCount ?? record.questions?.length ?? 0;
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
  loading = false,
  pagination,
  onCreateClick,
  onEditClick,
  onDeleteClick,
  onToggleStatus,
  onRepublish,
  onConfigQuestions,
  onViewVersions,
}: Props) {
  const { isMobile } = useResponsive();
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <span className="text-slate-500 text-sm">
          Quản lý đề thi —{" "}
          <strong>{publishedCount}/{exams.length}</strong> đang phát hành trên trang này (Tổng cộng <strong>{pagination.total}</strong> đề thi)
        </span>
        <Can perform="learning.write">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onCreateClick}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-sm font-semibold shrink-0 w-full sm:w-auto"
          >
            Tạo đề thi mới
          </Button>
        </Can>
      </div>

      {isMobile ? (
        /* Mobile Card View: cuộn dọc 1 chiều trực quan, không cần vuốt ngang */
        <div className="space-y-3">
          {loading ? (
            <div className="py-12 flex justify-center items-center bg-white rounded-2xl border border-slate-100 shadow-xs">
              <Spin />
            </div>
          ) : exams.length === 0 ? (
            <div className="py-10 bg-white rounded-2xl border border-slate-100 text-center shadow-xs">
              <Empty description={<span className="text-slate-400 text-xs">Chưa có đề thi nào</span>} />
            </div>
          ) : (
            exams.map((record) => {
              const questionCount = record.questionCount ?? record.questions?.length ?? 0;
              const isExam = record.examType === "exam";

              return (
                <div
                  key={record.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3"
                >
                  {/* Top: Title & Badges */}
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-slate-800 text-base flex-1 min-w-0">
                        {record.title}
                      </div>
                      <Tag
                        color={isExam ? "purple" : "blue"}
                        className="rounded-full px-2.5 py-0.5 border-none text-[10px] font-bold shrink-0 m-0"
                      >
                        {isExam ? "Đề kiểm tra" : "Đề ôn tập"}
                      </Tag>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400">
                      {record.code && (
                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px] text-slate-600 font-semibold">
                          {record.code}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} className="text-slate-400" />
                        {record.timeLimitSeconds
                          ? `${Math.round(record.timeLimitSeconds / 60)} phút`
                          : "Không giới hạn"}
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <BookOutlined className="text-slate-400 text-xs" />
                        <strong className="text-slate-700">{questionCount}</strong> câu hỏi
                      </span>
                    </div>
                  </div>

                  {/* Status Banner */}
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          record.status === "published"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            record.status === "published" ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                        {record.status === "published" ? "Đang phát hành" : "Bản nháp"}
                      </span>

                      {record.hasUnpublishedChanges && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          <AlertTriangle size={11} className="text-amber-800" />
                          Có thay đổi
                        </span>
                      )}
                    </div>

                    {record.hasUnpublishedChanges && (
                      <Can perform="learning.publish">
                        <Button
                          type="primary"
                          danger
                          size="small"
                          icon={<SendOutlined className="text-xs" />}
                          onClick={() => onRepublish(record)}
                          className="rounded-lg text-xs font-bold px-2.5 h-7"
                        >
                          Xuất bản mới
                        </Button>
                      </Can>
                    )}
                  </div>

                  {/* Actions bar */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Can perform="learning.write">
                        <Button
                          type="dashed"
                          size="middle"
                          icon={<BookOutlined />}
                          onClick={() => onConfigQuestions(record)}
                          className="text-xs font-semibold border-indigo-200 text-indigo-600 rounded-xl hover:border-indigo-500 h-9"
                        >
                          Cấu hình câu ({questionCount})
                        </Button>
                      </Can>
                    </div>

                    <div className="flex items-center gap-1">
                      <Can perform="learning.publish">
                        <Tooltip
                          title={
                            record.status === "published"
                              ? "Chuyển về Nháp"
                              : "Phát hành đề thi"
                          }
                        >
                          <Button
                            type="text"
                            size="middle"
                            icon={
                              record.status === "published"
                                ? <CloseCircleOutlined className="text-amber-500 text-base" />
                                : <CheckCircleOutlined className="text-emerald-500 text-base" />
                            }
                            onClick={() => onToggleStatus(record)}
                            className="w-9 h-9 flex items-center justify-center p-0 rounded-xl hover:bg-slate-100"
                          />
                        </Tooltip>
                      </Can>

                      <Tooltip title="Lịch sử phiên bản">
                        <Button
                          type="text"
                          size="middle"
                          icon={<HistoryOutlined className="text-slate-500 text-base" />}
                          onClick={() => onViewVersions(record)}
                          className="w-9 h-9 flex items-center justify-center p-0 rounded-xl hover:bg-slate-100"
                        />
                      </Tooltip>

                      <Can perform="learning.write">
                        <Tooltip title="Chỉnh sửa">
                          <Button
                            type="text"
                            size="middle"
                            icon={<EditOutlined className="text-slate-500 hover:text-indigo-600 text-base" />}
                            onClick={() => onEditClick(record)}
                            className="w-9 h-9 flex items-center justify-center p-0 rounded-xl hover:bg-slate-100"
                          />
                        </Tooltip>
                      </Can>

                      <Can perform="learning.delete">
                        <Tooltip title="Xóa">
                          <Button
                            type="text"
                            size="middle"
                            danger
                            icon={<DeleteOutlined className="text-rose-500 text-base" />}
                            onClick={() => onDeleteClick(record)}
                            className="w-9 h-9 flex items-center justify-center p-0 rounded-xl hover:bg-rose-50"
                          />
                        </Tooltip>
                      </Can>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {pagination.total > 0 && (
            <div className="pt-2 flex flex-col items-center justify-center gap-2">
              <span className="text-xs text-slate-400">
                Tổng cộng {pagination.total} đề thi
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
          )}
        </div>
      ) : (
        <Table
          rowKey="id"
          loading={loading}
          dataSource={exams}
          columns={columns}
          scroll={{ x: 900 }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onChange: pagination.onChange,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50", "100"],
            showTotal: (total) => `Tổng cộng ${total} đề thi`,
          }}
        />
      )}
    </div>
  );
}
