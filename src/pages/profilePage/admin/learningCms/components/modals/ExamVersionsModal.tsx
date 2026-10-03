import { useAuth } from "../../../../../../contexts/AuthContext";
import { useState } from "react";
import { Button, Modal, Table, Tag, Spin, message, Pagination } from "antd";
import { PlusOutlined, DownOutlined, RightOutlined } from "@ant-design/icons";
import { History, AlertTriangle, HelpCircle } from "lucide-react";
import { learningCmsService } from "../../../../../../services/learningCmsService";
import { ExamVersion, ExamVersionDetail } from "../../../../../../types/backend";
import { ExamVersionQuestionCard } from "./ExamVersionQuestionCard";

// ── Types ────────────────────────────────────────────────────

interface Exam {
  id: string;
  title: string;
  status?: string;
  updatedAt?: string;
  hasUnpublishedChanges?: boolean;
}

interface Props {
  open:           boolean;
  viewingExam:    Exam | null;
  examVersions:   ExamVersion[];
  onCancel:       () => void;
  onRefresh:      (updatedExam: Exam, versions: ExamVersion[]) => void;
  onLoadAllData:  () => void;
}

// ── Inner Component for Paginated Question List ─────────────

const ExamVersionQuestionsList: React.FC<{
  detail: ExamVersionDetail;
  versionNumber: number;
}> = ({ detail, versionNumber }) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);

  const questions = detail.questions || [];

  if (questions.length === 0) {
    return (
      <div className="py-8 px-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 text-center text-slate-400 text-xs">
        Phiên bản v{versionNumber} không có câu hỏi nào được lưu trong snapshot.
      </div>
    );
  }

  const paginatedQuestions = questions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="py-4 px-4 sm:px-5 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-4">
      {/* ── LIST HEADER WITH PAGINATION ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/70 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <HelpCircle size={15} />
          </div>
          <div>
            <div className="font-bold text-slate-800 text-xs sm:text-sm">
              Snapshot câu hỏi phiên bản v{versionNumber}
            </div>
            <div className="text-[11px] text-slate-400">
              Tổng số {questions.length} câu hỏi • Thời điểm lưu: {detail.createdAt ? new Date(detail.createdAt).toLocaleString("vi-VN") : "—"}
            </div>
          </div>
        </div>

        {/* Top Pagination controls */}
        {questions.length > 5 && (
          <div className="flex items-center gap-2 shrink-0">
            <Pagination
              size="small"
              current={currentPage}
              pageSize={pageSize}
              total={questions.length}
              onChange={(p, ps) => {
                setCurrentPage(p);
                if (ps && ps !== pageSize) setPageSize(ps);
              }}
              showSizeChanger={questions.length > 10}
              pageSizeOptions={["5", "10", "20"]}
              className="text-xs"
            />
          </div>
        )}
      </div>

      {/* ── QUESTIONS LIST (CARD STYLE LIKE EXAM) ── */}
      <div className="space-y-3.5 max-h-[520px] overflow-y-auto pr-1">
        {paginatedQuestions.map((q, idx) => {
          const globalIdx = (currentPage - 1) * pageSize + idx;
          return (
            <ExamVersionQuestionCard
              key={q.id || globalIdx}
              question={q}
              index={globalIdx}
            />
          );
        })}
      </div>

      {/* ── BOTTOM PAGINATION ── */}
      {questions.length > 5 && (
        <div className="flex items-center justify-between border-t border-slate-200/60 pt-3 text-xs text-slate-400">
          <span>
            Đang xem câu {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, questions.length)} / {questions.length} câu
          </span>
          <Pagination
            size="small"
            current={currentPage}
            pageSize={pageSize}
            total={questions.length}
            onChange={(p) => setCurrentPage(p)}
          />
        </div>
      )}
    </div>
  );
};

// ── Main Modal Component ─────────────────────────────────────

export default function ExamVersionsModal({
  open,
  viewingExam,
  examVersions,
  onCancel,
  onRefresh,
  onLoadAllData,
}: Props) {
  const [versionDetails, setVersionDetails] = useState<Record<string, ExamVersionDetail>>({});
  const [loadingVersionIds, setLoadingVersionIds] = useState<Record<string, boolean>>({});
  const { hasPermission } = useAuth();
  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);

  const handleExpand = async (expanded: boolean, record: ExamVersion) => {
    if (expanded) {
      setExpandedRowKeys((prev) => [...prev, record.id]);
      if (!versionDetails[record.id] && !loadingVersionIds[record.id] && viewingExam) {
        setLoadingVersionIds((prev) => ({ ...prev, [record.id]: true }));
        try {
          const detail = await learningCmsService.exams.getVersion(viewingExam.id, record.id);
          setVersionDetails((prev) => ({ ...prev, [record.id]: detail }));
        } catch (err: any) {
          message.error(err?.response?.data?.message || `Không thể tải câu hỏi của phiên bản v${record.versionNumber}`);
        } finally {
          setLoadingVersionIds((prev) => ({ ...prev, [record.id]: false }));
        }
      }
    } else {
      setExpandedRowKeys((prev) => prev.filter((k) => k !== record.id));
    }
  };

  const handleUpgrade = async () => {
    if (!viewingExam) return;
    try {
      await learningCmsService.exams.updateStatus(viewingExam.id, {
        status: "published",
        expectedUpdatedAt: viewingExam.updatedAt,
      });
      message.success("Xuất bản phiên bản mới thành công!");

      const [versions, updated] = await Promise.all([
        learningCmsService.exams.listVersions(viewingExam.id),
        learningCmsService.exams.get(viewingExam.id),
      ]);
      onRefresh(updated, versions ?? []);
      onLoadAllData();
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? "Tạo phiên bản mới thất bại");
    }
  };

  const renderExpandedVersion = (record: ExamVersion) => {
    const isLoading = loadingVersionIds[record.id];
    const detail = versionDetails[record.id];

    if (isLoading) {
      return (
        <div className="py-8 px-4 bg-slate-50/80 rounded-2xl border border-slate-200/60 flex items-center justify-center gap-3 text-slate-500 text-xs">
          <Spin size="small" />
          <span>Đang tải snapshot câu hỏi của phiên bản v{record.versionNumber}...</span>
        </div>
      );
    }

    if (!detail) {
      return null;
    }

    return (
      <ExamVersionQuestionsList
        detail={detail}
        versionNumber={record.versionNumber}
      />
    );
  };

  const columns = [
    {
      title: "Phiên bản",
      dataIndex: "versionNumber",
      key: "versionNumber",
      width: 140,
      render: (num: number, r: ExamVersion) => (
        <span className="font-bold text-indigo-600 inline-flex items-center gap-1.5">
          v{num}
          {r.isCurrent && (
            <Tag color="success" className="border-none rounded-full px-2 text-[10px] font-bold">
              Hiện hành
            </Tag>
          )}
        </span>
      ),
    },
    {
      title: "Số câu hỏi",
      dataIndex: "questionCount",
      key: "questionCount",
      width: 120,
      render: (cnt: number) => (
        <span className="font-semibold text-slate-700">{cnt ?? 0} câu</span>
      ),
    },
    {
      title: "Thời gian",
      dataIndex: "timeLimitSeconds",
      key: "timeLimitSeconds",
      width: 140,
      render: (sec: number) => (sec ? `${Math.round(sec / 60)} phút` : "Không giới hạn"),
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => (date ? new Date(date).toLocaleString("vi-VN") : "—"),
    },
    {
      title: "Xem câu hỏi",
      key: "expandAction",
      width: 130,
      align: "right" as const,
      render: (_: any, r: ExamVersion) => {
        const isExpanded = expandedRowKeys.includes(r.id);
        return (
          <Button
            type="text"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleExpand(!isExpanded, r);
            }}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold p-0 h-auto"
          >
            {isExpanded ? (
              <span className="inline-flex items-center gap-1">
                Thu gọn <DownOutlined className="text-[10px]" />
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                Xem câu hỏi <RightOutlined className="text-[10px]" />
              </span>
            )}
          </Button>
        );
      },
    },
  ];

  return (
    <Modal
      title={
        <div className="font-bold text-slate-800 text-lg flex items-center gap-2">
          <History size={18} className="text-indigo-600" />
          <span>Lịch sử phiên bản — {viewingExam?.title}</span>
        </div>
      }
      open={open}
      onCancel={() => {
        setExpandedRowKeys([]);
        onCancel();
      }}
      footer={null}
      centered
      maskClosable={false}
      width={900}
      styles={{
        body: {
          maxHeight: "82vh",
          overflowY: "auto",
          overflowX: "hidden",
          paddingRight: "8px",
        },
      }}
      className="rounded-2xl"
      destroyOnHidden
    >
      <div className="py-2 space-y-4 font-sans">
        {/* Unpublished-changes banner */}
        {viewingExam?.hasUnpublishedChanges && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3.5 text-xs flex justify-between items-center gap-3 shadow-sm">
            <div className="leading-relaxed flex items-start gap-1.5">
              <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Có thay đổi chưa xuất bản:</strong>{" "}
                Nhấn nút bên phải để lưu phiên bản mới của đề thi này ngay lập tức.
              </div>
            </div>
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              disabled={!hasPermission("learning.publish")}
              onClick={handleUpgrade}
              className="font-semibold text-xs flex-shrink-0"
            >
              Tạo phiên bản mới (Upgrade)
            </Button>
          </div>
        )}

        <Table
          dataSource={examVersions}
          rowKey="id"
          pagination={false}
          size="small"
          className="border border-slate-100 rounded-xl overflow-hidden shadow-sm"
          columns={columns}
          expandable={{
            expandedRowRender: renderExpandedVersion,
            expandedRowKeys,
            onExpand: handleExpand,
          }}
        />
      </div>
    </Modal>
  );
}
