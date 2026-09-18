import { Button, Modal, Table, Tag } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { History, AlertTriangle } from "lucide-react";
import { learningCmsService } from "../../../../../../services/learningCmsService";
import { message } from "antd";

// ── Types ────────────────────────────────────────────────────

interface ExamVersion {
  id: string;
  versionNumber: number;
  isCurrent?: boolean;
  questionCount?: number;
  timeLimitSeconds?: number;
  createdAt?: string;
}

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

// ── Columns ──────────────────────────────────────────────────

const COLUMNS = [
  {
    title: "Phiên bản",
    dataIndex: "versionNumber",
    key: "versionNumber",
    render: (num: number, r: ExamVersion) => (
      <span className="font-bold text-indigo-600">
        v{num}{" "}
        {r.isCurrent && (
          <Tag color="success" className="ml-2 border-none rounded-full px-2 text-[10px] font-bold">
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
    render: (cnt: number) => (
      <span className="font-semibold text-slate-700">{cnt ?? 0} câu</span>
    ),
  },
  {
    title: "Thời gian",
    dataIndex: "timeLimitSeconds",
    key: "timeLimitSeconds",
    render: (sec: number) => (sec ? `${Math.round(sec / 60)} phút` : "Không giới hạn"),
  },
  {
    title: "Ngày tạo",
    dataIndex: "createdAt",
    key: "createdAt",
    render: (date: string) => new Date(date).toLocaleString("vi-VN"),
  },
];

// ── Component ────────────────────────────────────────────────

/**
 * Exam version history modal.
 * Shows a table of published versions and, when there are unpublished
 * changes, provides a "Tạo phiên bản mới" button.
 */
export default function ExamVersionsModal({
  open,
  viewingExam,
  examVersions,
  onCancel,
  onRefresh,
  onLoadAllData,
}: Props) {
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

  return (
    <Modal
      title={
        <div className="font-bold text-slate-800 text-lg flex items-center gap-2">
          <History size={18} className="text-indigo-600" />
          <span>Lịch sử phiên bản — {viewingExam?.title}</span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      width={700}
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
          columns={COLUMNS}
        />
      </div>
    </Modal>
  );
}
