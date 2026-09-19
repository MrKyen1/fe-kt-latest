import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal, Spin, Empty, Table, Tag, Progress, Button, message } from "antd";
import { History } from "lucide-react";
import { studentLearningService } from "../services/studentLearningService";

const formatDate = (iso?: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const percentColor = (pct?: string | number) => {
  const n = parseFloat(String(pct ?? "0"));
  if (n >= 80) return "#10b981";
  if (n >= 50) return "#f59e0b";
  return "#ef4444";
};

export interface AttemptHistoryModalProps {
  assignmentStudentId?: string | null;
  examId?: string | null;
  title?: string;
  open: boolean;
  onClose: () => void;
  // Specific attempt ID or curriculum progress
  attemptId?: string | null;
  initialAttempts?: any[];
  curriculumExamProgress?: {
    attemptsCount?: number;
    bestScore?: string | null;
    bestPercentage?: string | null;
    lastAttemptId?: string | null;
    completedAt?: string | null;
    status?: string;
    maxScore?: string | number;
  };
}

export function AttemptHistoryModal({
  assignmentStudentId,
  examId,
  title,
  open,
  onClose,
  attemptId,
  initialAttempts,
  curriculumExamProgress,
}: AttemptHistoryModalProps) {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    // 1. If explicit initial attempts provided, use them
    if (initialAttempts && initialAttempts.length > 0) {
      setAttempts(initialAttempts);
      setLoading(false);
      return;
    }

    const resolvedAttemptId = attemptId || curriculumExamProgress?.lastAttemptId;

    const fallbackToProgress = () => {
      if (curriculumExamProgress?.lastAttemptId || (curriculumExamProgress?.attemptsCount ?? 0) > 0) {
        setAttempts([
          {
            id: curriculumExamProgress?.lastAttemptId || resolvedAttemptId || "last",
            attemptNumber: curriculumExamProgress?.attemptsCount || 1,
            status: curriculumExamProgress?.status === "in_progress" ? "in_progress" : "submitted",
            score: curriculumExamProgress?.bestScore ?? "—",
            maxScore: curriculumExamProgress?.maxScore ?? "—",
            percentage: curriculumExamProgress?.bestPercentage,
            createdAt: curriculumExamProgress?.completedAt,
          },
        ]);
      } else {
        setAttempts([]);
      }
    };

    // 2. If assignmentStudentId is provided AND no specific attemptId is targeted, fetch from examAssignments
    if (assignmentStudentId && !resolvedAttemptId) {
      setLoading(true);
      studentLearningService.examAssignments
        .attempts(assignmentStudentId)
        .then((res: any) => {
          const arr = Array.isArray(res) ? res : res?.data ?? [];
          const filtered = examId ? arr.filter((x: any) => x.examId === examId) : arr;
          setAttempts(filtered);
        })
        .catch(() => {
          if (curriculumExamProgress) {
            fallbackToProgress();
          } else {
            message.error("Không thể tải lịch sử làm bài");
          }
        })
        .finally(() => setLoading(false));
      return;
    }

    // 3. If resolvedAttemptId is available (e.g. from Curriculum progress)
    if (resolvedAttemptId) {
      setLoading(true);
      studentLearningService.attempts
        .get(resolvedAttemptId)
        .then((res: any) => {
          const item = (res as any)?.data || res;
          if (item && (item.id || item.attemptNumber)) {
            setAttempts([
              {
                ...item,
                attemptNumber: item.attemptNumber ?? curriculumExamProgress?.attemptsCount ?? 1,
                percentage: item.percentage ?? curriculumExamProgress?.bestPercentage,
                score: item.score ?? curriculumExamProgress?.bestScore,
              },
            ]);
          } else {
            fallbackToProgress();
          }
        })
        .catch(() => {
          fallbackToProgress();
        })
        .finally(() => setLoading(false));
      return;
    }

    // If neither, fallback to progress or empty
    if (curriculumExamProgress) {
      fallbackToProgress();
    } else {
      setAttempts([]);
    }
  }, [open, assignmentStudentId, examId, attemptId, initialAttempts, curriculumExamProgress]);

  const columns = [
    {
      title: "Lần",
      dataIndex: "attemptNumber",
      width: 60,
      render: (n: number) => <span className="font-bold text-indigo-600">#{n}</span>,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (status: string) =>
        status === "submitted" ? (
          <Tag color="success" className="rounded-full border-none text-xs font-semibold">
            Đã nộp
          </Tag>
        ) : (
          <Tag color="processing" className="rounded-full border-none text-xs font-semibold">
            Đang làm
          </Tag>
        ),
    },
    {
      title: "Điểm",
      render: (_: any, r: any) =>
        r.status === "submitted" ? (
          <span className="font-bold" style={{ color: percentColor(r.percentage) }}>
            {r.score ?? "—"} {r.maxScore && r.maxScore !== "—" ? `/ ${r.maxScore}` : ""}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      title: "Phần trăm",
      render: (_: any, r: any) =>
        r.status === "submitted" && r.percentage != null ? (
          <Progress
            percent={Math.round(parseFloat(String(r.percentage)))}
            size="small"
            strokeColor={percentColor(r.percentage)}
            format={(p) => `${p}%`}
          />
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      title: "Ngày làm",
      render: (_: any, r: any) => (
        <span className="text-xs text-slate-500">
          {formatDate(r.createdAt || r.submittedAt || r.updatedAt)}
        </span>
      ),
    },
    {
      title: "",
      width: 100,
      render: (_: any, r: any) =>
        r.id && r.id !== "last" ? (
          <Button
            size="small"
            type="link"
            onClick={() => {
              onClose();
              navigate(`/exam/${r.id}`);
            }}
            className="text-xs font-semibold p-0 text-indigo-600 hover:text-indigo-800"
          >
            {r.status === "submitted" ? "Xem bài làm" : "Tiếp tục làm"}
          </Button>
        ) : null,
    },
  ];

  return (
    <Modal
      title={
        <div className="font-bold text-base text-slate-800 flex items-center gap-1.5">
          <History size={18} className="text-indigo-600" />
          <span>Lịch sử làm bài: {title}</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={680}
      className="rounded-2xl overflow-hidden"
    >
      {loading ? (
        <div className="flex justify-center py-10">
          <Spin size="large" />
        </div>
      ) : attempts.length === 0 ? (
        <Empty description="Chưa có lần làm bài nào" />
      ) : (
        <Table
          dataSource={attempts}
          columns={columns}
          rowKey={(r) => r.id || r.attemptNumber || Math.random()}
          pagination={false}
          size="small"
          className="rounded-xl overflow-hidden"
        />
      )}
    </Modal>
  );
}

export default AttemptHistoryModal;
