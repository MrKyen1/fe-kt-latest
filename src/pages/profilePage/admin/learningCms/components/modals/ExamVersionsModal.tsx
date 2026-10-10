import { PagedCollection } from "../../../../../../components/PagedCollection";
import Table from "../../../../../../components/Table";
import { useServerPagination } from "../../../../../../hooks/useServerPagination";
import { useAuth } from "../../../../../../contexts/AuthContext";
import { useState } from "react";
import { Button, Modal, Tag, Spin, message, Pagination } from "antd";
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

const ExamVersionQuestionsList = ({ examId, versionId, versionNumber }: { examId: string; versionId: string; versionNumber: number }) => {
  const page = useServerPagination(`/learning/exams/${examId}/versions/${versionId}/questions`, {}, 5);
  return <div className="p-4 space-y-3">
    <div>Snapshot phiên bản v{versionNumber}: {page.total} câu hỏi</div>

    <PagedCollection loading={page.loading} hasData={page.data.length > 0} variant="list" footer={<Pagination {...page.pagination} size="small" />}><div className="space-y-3">
      {page.error ? <div>{page.error.message}</div> : page.data.map((question, index) => <ExamVersionQuestionCard key={question.id} question={question}
        index={(page.pagination.current - 1) * page.pagination.pageSize + index} />)}
    </div></PagedCollection>
  </div>;
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
  const versionPage = useServerPagination(`/learning/exams/${viewingExam?.id}/versions`, {}, 5, open && !!viewingExam);
  const [versionDetails, setVersionDetails] = useState<Record<string, ExamVersionDetail>>({});
  const [loadingVersionIds, setLoadingVersionIds] = useState<Record<string, boolean>>({});
  const { hasPermission } = useAuth();
  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);

  const handleExpand = (expanded: boolean, record: ExamVersion) => {
    setExpandedRowKeys(previous => expanded ? [...previous, record.id] : previous.filter(key => key !== record.id));
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
      versionPage.reload();
      onLoadAllData();
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? "Tạo phiên bản mới thất bại");
    }
  };

  const renderExpandedVersion = (record: ExamVersion) => viewingExam ?
    <ExamVersionQuestionsList examId={viewingExam.id} versionId={record.id} versionNumber={record.versionNumber} /> : null;

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
          dataSource={versionPage.data} loading={versionPage.loading}
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
