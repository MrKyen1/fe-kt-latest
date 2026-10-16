import Table from "./Table";
import { useServerPagination } from "../hooks/useServerPagination";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal, Spin, Empty, Tag, Progress, Button, message } from "antd";
import { History, User } from "lucide-react";
import { studentLearningService } from "../services/studentLearningService";
import { formatScore } from "../utils/studentExamUtils";

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
  const [studentInfo, setStudentInfo] = useState<{ id?: string; code?: string; fullName?: string } | null>(null);
  const [paginationMeta, setPaginationMeta] = useState<{ total: number; page: number; limit: number; totalPages: number } | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const resolvedId = attemptId || curriculumExamProgress?.lastAttemptId;
  const historyEnabled = open && !!assignmentStudentId && !resolvedId && !initialAttempts?.length;
  const historyPage = useServerPagination(`/learning/student/exam-assignments/${assignmentStudentId}/attempts`, {
    examId: examId || undefined, sortBy: "attemptNumber", sortOrder: "DESC",
  }, 10, historyEnabled);

  useEffect(() => {
    if (historyEnabled) {
      setAttempts(historyPage.data);
      setLoading(historyPage.loading);
    }
  }, [historyEnabled, historyPage.data, historyPage.loading]);

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
    if (assignmentStudentId && !resolvedAttemptId) return;

    // 3. If resolvedAttemptId is available, try getReport first, fallback to get()
    if (resolvedAttemptId) {
      setLoading(true);
      studentLearningService.attempts
        .getReport(resolvedAttemptId, currentPage, 10)
        .then((res: any) => {
          const reportData = res?.data || res;
          if (reportData && Array.isArray(reportData.attempts)) {
            setAttempts(reportData.attempts);
            if (reportData.student) {
              setStudentInfo(reportData.student);
            }
            if (reportData.meta) {
              setPaginationMeta(reportData.meta);
            }
          } else {
            // Fallback to single attempt get
            studentLearningService.attempts
              .get(resolvedAttemptId)
              .then((singleRes: any) => {
                const item = singleRes?.data || singleRes;
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
              .catch(() => fallbackToProgress());
          }
        })
        .catch(() => {
          studentLearningService.attempts
            .get(resolvedAttemptId)
            .then((res: any) => {
              const item = res?.data || res;
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
            .catch(() => fallbackToProgress());
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
  }, [open, assignmentStudentId, examId, attemptId, initialAttempts, curriculumExamProgress, currentPage]);

  const columns = [
    {
      title: "Lần",
      dataIndex: "attemptNumber",
      width: 80,
      render: (n: number, r: any) => (
        <div className="flex flex-col items-start gap-1">
          <span className="font-bold text-indigo-600">#{n}</span>
          {r.isRedo && (
            <Tag color="orange" className="text-[10px] px-1 py-0 rounded leading-tight m-0">
              Làm lại
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 95,
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
      title: "Kết quả lượt",
      width: 140,
      render: (_: any, r: any) => {
        if (r.status !== "submitted") return <span className="text-slate-400">—</span>;
        const pct = r.attemptPercentage != null ? r.attemptPercentage : r.percentage;
        return (
          <div>
            <span className="font-bold text-sm" style={{ color: percentColor(pct) }}>
              {pct != null ? `${Math.round(parseFloat(String(pct)))}%` : "—"}
            </span>
            {r.attemptQuestionCount ? (
              <span className="text-[11px] text-slate-500 ml-1.5 font-medium">
                ({r.attemptCorrectCount ?? 0}/{r.attemptQuestionCount} câu)
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      title: "Tiến độ đề",
      width: 110,
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
      title: "Điểm",
      width: 80,
      render: (_: any, r: any) =>
        r.status === "submitted" ? (
          <span className="font-bold text-slate-700">
            {formatScore(r.score)} {r.maxScore && r.maxScore !== "—" ? `/ ${formatScore(r.maxScore)}` : ""}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      title: "Ngày làm",
      render: (_: any, r: any) => (
        <span className="text-xs text-slate-500">
          {formatDate(r.submittedAt || r.startedAt || r.createdAt || r.updatedAt)}
        </span>
      ),
    },
    {
      title: "",
      width: 90,
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
            {r.status === "submitted" ? "Xem lại" : "Tiếp tục"}
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
      width={760}
      className="rounded-2xl overflow-hidden"
    >
      {studentInfo && (
        <div className="mb-3 px-3.5 py-2 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-between text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <User size={15} className="text-indigo-600" />
            <span>
              Học sinh: <strong className="text-slate-900">{studentInfo.fullName}</strong>
              {studentInfo.code && <span className="text-slate-500 ml-1">({studentInfo.code})</span>}
            </span>
          </div>
        </div>
      )}
      <Table
        loading={loading}
        dataSource={attempts}
        columns={columns}
        rowKey={(r) => r.id || r.attemptNumber || Math.random()}
        pagination={
          historyEnabled
            ? historyPage.pagination
            : paginationMeta && paginationMeta.total > 10
            ? {
                current: currentPage,
                pageSize: paginationMeta.limit || 10,
                total: paginationMeta.total,
                onChange: (page) => setCurrentPage(page),
              }
            : false
        }
        size="small"
        className="rounded-xl overflow-hidden"
      />
    </Modal>
  );
}

export default AttemptHistoryModal;
