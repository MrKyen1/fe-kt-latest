import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  Col,
  ConfigProvider,
  Empty,
  Modal,
  Row,
  Spin,
  Table,
  Tag,
  Tabs,
  Typography,
  message,
  Progress,
  Badge,
  Statistic,
  Tooltip,
} from "antd";

import {
  BookOutlined,
  FileTextOutlined,
  HistoryOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  ArrowRightOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

import { studentLearningService } from "../../../services/studentLearningService";
import { useAuth } from "../../../contexts/AuthContext";

const { Title, Text } = Typography;

// ==================== HELPERS ====================
const formatTime = (sec?: number) => {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}p ${s}s` : `${s}s`;
};

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

// ==================== ATTEMPT HISTORY MODAL ====================
function AttemptHistoryModal({
  assignmentId,
  title,
  open,
  onClose,
}: {
  assignmentId: string | null;
  title?: string;
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !assignmentId) return;
    setLoading(true);
    studentLearningService.examAssignments
      .attempts(assignmentId)
      .then((data: any) => {
        // attempts can be returned as array (unwrapData) or { data: [] } (unwrapList)
        const arr = Array.isArray(data) ? data : data?.data ?? [];
        setAttempts(arr);
      })
      .catch(() => message.error("Không thể tải lịch sử làm bài"))
      .finally(() => setLoading(false));
  }, [open, assignmentId]);

  const columns = [
    {
      title: "Lần",
      dataIndex: "attemptNumber",
      width: 60,
      render: (n: number) => (
        <span className="font-bold text-indigo-600">#{n}</span>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (status: string) =>
        status === "submitted" ? (
          <Tag color="success" className="rounded-full border-none text-xs font-semibold">
            ✓ Đã nộp
          </Tag>
        ) : (
          <Tag color="processing" className="rounded-full border-none text-xs font-semibold">
            Đang làm
          </Tag>
        ),
    },
    {
      title: "Điểm",
      render: (_: any, r: any) => (
        r.status === "submitted" ? (
          <span className="font-bold" style={{ color: percentColor(r.percentage) }}>
            {r.score ?? "—"} / {r.maxScore ?? "—"}
          </span>
        ) : <span className="text-slate-400">—</span>
      ),
    },
    {
      title: "Phần trăm",
      render: (_: any, r: any) =>
        r.status === "submitted" && r.percentage ? (
          <Progress
            percent={Math.round(parseFloat(r.percentage))}
            size="small"
            strokeColor={percentColor(r.percentage)}
            format={(p) => `${p}%`}
          />
        ) : <span className="text-slate-400">—</span>,
    },
    {
      title: "Thời gian làm",
      render: (_: any, r: any) => (
        <span className="text-sm text-slate-500">{formatTime(r.durationSeconds)}</span>
      ),
    },
    {
      title: "Ngày nộp",
      render: (_: any, r: any) => (
        <span className="text-xs text-slate-400">{formatDate(r.submittedAt)}</span>
      ),
    },
    {
      title: "Chi tiết",
      align: "right" as const,
      render: (_: any, r: any) => (
        <Button
          type="link"
          size="small"
          icon={<ArrowRightOutlined />}
          onClick={() => {
            onClose();
            navigate(`/exam/${r.id}`);
          }}
          className="text-indigo-600 font-medium"
        >
          {r.status === "submitted" ? "Xem đáp án" : "Tiếp tục"}
        </Button>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={
        <div className="flex items-center gap-2 text-indigo-700 font-bold">
          <HistoryOutlined />
          <span>Lịch sử làm bài: {title || "Bài thi"}</span>
        </div>
      }
      width={800}
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
          rowKey="id"
          pagination={false}
          size="small"
          className="rounded-xl overflow-hidden"
        />
      )}
    </Modal>
  );
}

// ==================== MAIN COMPONENT ====================
export default function StudentMyExams() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("exam-assignments");
  const [loading, setLoading] = useState(false);

  // ---- Exam assignments ----
  const [examAssignments, setExamAssignments] = useState<any[]>([]);

  // ---- Curriculum assignments ----
  const [curriculumAssignments, setCurriculumAssignments] = useState<any[]>([]);

  // ---- Starting exam ----
  const [startingId, setStartingId] = useState<string | null>(null);

  // ---- History modal ----
  const [historyAssignmentId, setHistoryAssignmentId] = useState<string | null>(null);
  const [historyTitle, setHistoryTitle] = useState<string | undefined>(undefined);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      
      const studentId = user?.studentProfile?.id;
      const userId = user?.id;
      const classIds = user?.studentProfile?.classIds || [];

      // Load local storage exam assignments
      const localExamsRaw = localStorage.getItem("mock_exam_assignments");
      const localExamsList = localExamsRaw ? JSON.parse(localExamsRaw) : [];
      const filteredLocalExams = localExamsList.filter((item: any) => {
        if (!item.isActive || item.status !== "active") return false;
        if (!classIds.includes(item.classId)) return false;
        if (item.studentIds && item.studentIds.length > 0) {
          return item.studentIds.includes(studentId) || (userId && item.studentIds.includes(userId));
        }
        return true;
      });

      // Enrich local exams with attempts
      const enrichedExams = await Promise.all(
        filteredLocalExams.map(async (item: any) => {
          let summary = { attemptsCount: 0, bestScore: null, bestPercentage: null };
          try {
            const attemptsRes = await studentLearningService.examAssignments.attempts(item.id);
            const attempts = Array.isArray(attemptsRes) ? attemptsRes : (attemptsRes as any)?.data ?? [];
            const submitted = attempts.filter((a: any) => a.status === "submitted");
            if (submitted.length > 0) {
              const best = submitted.reduce((max: any, curr: any) =>
                parseFloat(curr.percentage ?? "0") > parseFloat(max.percentage ?? "0") ? curr : max
              , submitted[0]);
              summary = {
                attemptsCount: submitted.length,
                bestScore: best.score,
                bestPercentage: best.percentage,
              };
            }
          } catch (e) {
            console.error("Failed to load attempts for assignment:", item.id, e);
          }
          return {
            id: item.id,
            assignmentId: item.id,
            studentId: studentId,
            status: "assigned",
            summary,
            assignment: {
              id: item.id,
              title: item.title,
              instructions: item.instructions,
              exam: item.exam,
              class: item.class
            }
          };
        })
      );

      // Load local storage curriculum assignments
      const localCurriculumsRaw = localStorage.getItem("mock_curriculum_assignments");
      const localCurriculumsList = localCurriculumsRaw ? JSON.parse(localCurriculumsRaw) : [];
      const filteredLocalCurriculums = localCurriculumsList.filter((item: any) => {
        if (!item.isActive || item.status !== "active") return false;
        if (!classIds.includes(item.classId)) return false;
        if (item.studentIds && item.studentIds.length > 0) {
          return item.studentIds.includes(studentId) || (userId && item.studentIds.includes(userId));
        }
        return true;
      });

      // Enrich local curriculums with progress
      const enrichedCurriculums = await Promise.all(
        filteredLocalCurriculums.map(async (item: any) => {
          const studentRecord = item.students?.find(
            (s: any) => s.studentId === studentId || (userId && s.studentId === userId)
          );
          const assignmentStudentId = studentRecord?.id;
          if (!assignmentStudentId) return null;

          try {
            const detail = await studentLearningService.curriculums.get(assignmentStudentId);
            return detail;
          } catch (e) {
            console.error("Failed to load curriculum progress details for:", assignmentStudentId, e);
            return {
              id: assignmentStudentId,
              assignmentStudentId,
              studentId: studentId,
              status: "assigned",
              examProgress: [],
              assignment: {
                id: item.id,
                title: item.title,
                instructions: item.instructions,
                curriculum: item.curriculum,
                class: item.class
              }
            };
          }
        })
      );

      const [examRes, curriculumRes] = await Promise.allSettled([
        studentLearningService.examAssignments.list({ page: 1, limit: 100 }),
        studentLearningService.curriculums.list({ page: 1, limit: 100 }),
      ]);

      if (examRes.status === "fulfilled" && examRes.value?.data) {
        setExamAssignments(examRes.value.data);
      } else {
        setExamAssignments(enrichedExams);
      }

      if (curriculumRes.status === "fulfilled" && curriculumRes.value?.data) {
        const list = curriculumRes.value.data;
        const enriched = await Promise.all(
          list.map(async (item: any) => {
            try {
              const detail = await studentLearningService.curriculums.get(item.id);
              return detail;
            } catch (e) {
              console.error("Failed to load curriculum progress details for:", item.id, e);
              return item;
            }
          })
        );
        setCurriculumAssignments(enriched);
      } else {
        setCurriculumAssignments(enrichedCurriculums.filter(Boolean));
      }
    } catch {
      message.error("Tải dữ liệu thất bại");
    } finally {
      setLoading(false);
    }
  };

  // ---- Start exam attempt ----
  const handleStartExam = async (assignmentId: string) => {
    try {
      setStartingId(assignmentId);
      const attempt = await studentLearningService.examAssignments.startAttempt(assignmentId);
      const attemptId = (attempt as any)?.id;
      if (!attemptId) throw new Error("Backend không trả về attemptId.");
      navigate(`/exam/${attemptId}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Không thể bắt đầu bài thi.");
    } finally {
      setStartingId(null);
    }
  };

  // ---- Start curriculum exam attempt ----
  const handleStartCurriculumExam = async (assignmentStudentId: string, examId: string) => {
    const key = `${assignmentStudentId}:${examId}`;
    try {
      setStartingId(key);
      const attempt = await studentLearningService.curriculums.startAttempt(
        assignmentStudentId,
        examId
      );
      const attemptId = (attempt as any)?.id;
      if (!attemptId) throw new Error("Backend không trả về attemptId.");
      navigate(`/exam/${attemptId}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Không thể bắt đầu bài thi.");
    } finally {
      setStartingId(null);
    }
  };

  // ==================== EXAM ASSIGNMENT RENDER ====================
  const renderExamAssignments = () => {
    if (examAssignments.length === 0) {
      return (
        <div className="py-16 text-center">
          <Empty
            description={
              <span className="text-slate-400">
                Chưa có bài thi nào được giao.
                <br />
                Liên hệ giáo viên để được phân công.
              </span>
            }
          />
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {examAssignments.map((row: any) => {
          const assignmentId = row.assignmentId || row.assignment?.id || row.id;
          const exam = row.exam || row.assignment?.exam;
          const title = row.assignment?.title || exam?.title || exam?.code || "Bài thi được giao";
          const cls = row.class || row.assignment?.class;
          const summary = row.summary ?? {};
          const attemptsCount = row.attemptsCount ?? summary.attemptsCount ?? 0;
          const bestScore = row.bestScore ?? summary.bestScore;
          const bestPct = row.bestPercentage ?? summary.bestPercentage;
          const isStarting = startingId === assignmentId;

          return (
            <Card
              key={row.id}
              className="rounded-2xl border border-slate-100 hover:border-indigo-200 transition-colors"
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
              bodyStyle={{ padding: "20px 24px" }}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
                  >
                    <FileTextOutlined style={{ color: "white", fontSize: 20 }} />
                  </div>

                  {/* Info */}
                  <div>
                    <div className="font-bold text-slate-800 text-base mb-1">{title}</div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                      {cls && (
                        <Tag color="blue" className="rounded-full border-none text-xs">
                          {cls.name}
                        </Tag>
                      )}
                      {exam?.timeLimitSeconds ? (
                        <span className="flex items-center gap-1">
                          <ClockCircleOutlined className="text-slate-400" />
                          {Math.ceil(exam.timeLimitSeconds / 60)} phút
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Stats & Actions */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Best score */}
                  {bestScore && (
                    <div className="text-center bg-emerald-50 rounded-xl px-4 py-2">
                      <div className="text-xs text-emerald-600 font-medium">Điểm tốt nhất</div>
                      <div
                        className="text-lg font-bold"
                        style={{ color: percentColor(bestPct) }}
                      >
                        {bestScore}
                        {bestPct ? (
                          <span className="text-xs font-normal text-slate-400 ml-1">
                            ({parseFloat(bestPct).toFixed(1)}%)
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {/* Attempts count */}
                  <div className="text-center bg-slate-50 rounded-xl px-4 py-2">
                    <div className="text-xs text-slate-500 font-medium">Lượt làm</div>
                    <div className="text-lg font-bold text-slate-700">{attemptsCount}</div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    {attemptsCount > 0 && (
                      <Tooltip title="Xem lịch sử làm bài">
                        <Button
                          icon={<HistoryOutlined />}
                          onClick={() => {
                            setHistoryAssignmentId(assignmentId);
                            setHistoryTitle(title);
                          }}
                          className="rounded-xl border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-600"
                        >
                          Lịch sử
                        </Button>
                      </Tooltip>
                    )}
                    <Button
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      loading={isStarting}
                      onClick={() => handleStartExam(assignmentId)}
                      className="rounded-xl font-semibold shadow-md shadow-indigo-500/20"
                    >
                      {attemptsCount > 0 ? "Làm lại" : "Làm bài"}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  // ==================== CURRICULUM RENDER ====================
  const renderCurriculums = () => {
    if (curriculumAssignments.length === 0) {
      return (
        <div className="py-16 text-center">
          <Empty
            description={
              <span className="text-slate-400">
                Chưa có lộ trình học nào được giao.
                <br />
                Liên hệ giáo viên để được phân công.
              </span>
            }
          />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {curriculumAssignments.map((row: any) => {
          const assignmentStudentId = row.assignmentStudentId || row.id;
          const curriculum = row.curriculum || row.assignment?.curriculum;
          const cls = row.class || row.assignment?.class;
          const title = row.assignment?.title || curriculum?.title || curriculum?.code || "Lộ trình học";
          const progress = (row.progress as any) ?? {};
          const examProgress: any[] = (row.examProgress as any[]) ?? [];

          const totalRequired = examProgress.filter((ep) => ep.isRequired !== false).length;
          const completedRequired = examProgress.filter(
            (ep) => ep.isRequired !== false && ep.isCompleted
          ).length;
          const overallPct =
            totalRequired > 0
              ? Math.round((completedRequired / totalRequired) * 100)
              : 0;

          const exams = curriculum?.exams ?? [];

          return (
            <Card
              key={row.id}
              className="rounded-2xl border border-slate-100 hover:border-purple-200 transition-colors overflow-hidden"
              style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
              bodyStyle={{ padding: 0 }}
            >
              {/* Header */}
              <div
                className="px-6 py-5"
                style={{ background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)" }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <BookOutlined style={{ color: "rgba(255,255,255,0.8)", fontSize: 16 }} />
                      <span className="text-white/70 text-sm font-medium">Lộ trình học</span>
                    </div>
                    <div className="text-white font-bold text-xl">{title}</div>
                    {cls && (
                      <div className="text-white/60 text-sm mt-1">Lớp: {cls.name}</div>
                    )}
                  </div>
                  <div className="text-center">
                    <div
                      className="w-16 h-16 rounded-full border-4 border-white/30 flex items-center justify-center"
                      style={{ background: "rgba(255,255,255,0.15)" }}
                    >
                      <span className="text-white font-black text-lg">{overallPct}%</span>
                    </div>
                    <div className="text-white/70 text-xs mt-1">Hoàn thành</div>
                  </div>
                </div>
                <div className="mt-4">
                  <Progress
                    percent={overallPct}
                    showInfo={false}
                    strokeColor="rgba(255,255,255,0.9)"
                    trailColor="rgba(255,255,255,0.2)"
                    size={{ height: 6 }}
                  />
                  <div className="text-white/60 text-xs mt-1">
                    {completedRequired}/{totalRequired} bài bắt buộc đã hoàn thành
                  </div>
                </div>
              </div>

              {/* Exam list */}
              {exams.length > 0 && (
                <div className="p-4 space-y-2">
                  {exams
                    .sort((a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
                    .map((mapping: any, idx: number) => {
                      const exam = mapping.exam;
                      const examId = mapping.examId || exam?.id;
                      const examTitle = exam?.title || exam?.code || `Bài thi ${idx + 1}`;
                      const isRequired = mapping.isRequired !== false;

                      // Find progress for this exam
                      const ep = examProgress.find(
                        (p: any) => p.examId === examId || p.exam?.id === examId
                      );
                      const isCompleted = ep?.isCompleted ?? false;
                      const startKey = `${assignmentStudentId}:${examId}`;
                      const isStarting = startingId === startKey;

                      return (
                        <div
                          key={examId || idx}
                          className={`flex items-center justify-between gap-3 p-3 rounded-xl transition-colors ${
                            isCompleted
                              ? "bg-emerald-50 border border-emerald-100"
                              : "bg-slate-50 border border-slate-100 hover:bg-slate-100"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                                isCompleted
                                  ? "bg-emerald-500 text-white"
                                  : "bg-white border border-slate-200 text-slate-600"
                              }`}
                            >
                              {isCompleted ? <CheckCircleOutlined /> : idx + 1}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-800 text-sm">{examTitle}</div>
                              <div className="flex items-center gap-2 mt-0.5">
                                {isRequired ? (
                                  <Tag color="red" className="rounded-full border-none text-[10px] px-2 m-0">
                                    Bắt buộc
                                  </Tag>
                                ) : (
                                  <Tag color="default" className="rounded-full border-none text-[10px] px-2 m-0">
                                    Tuỳ chọn
                                  </Tag>
                                )}
                                {isCompleted && (
                                  <span className="text-emerald-600 text-xs font-medium">Đã hoàn thành</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <Button
                            size="small"
                            type={isCompleted ? "default" : "primary"}
                            icon={isCompleted ? <ReloadOutlined /> : <PlayCircleOutlined />}
                            loading={isStarting}
                            onClick={() => handleStartCurriculumExam(assignmentStudentId, examId)}
                            className={`rounded-lg font-semibold text-xs h-8 px-3 ${
                              isCompleted
                                ? "border-emerald-200 text-emerald-600 hover:border-emerald-400"
                                : "shadow-sm shadow-indigo-500/20"
                            }`}
                          >
                            {isCompleted ? "Làm lại" : "Làm bài"}
                          </Button>
                        </div>
                      );
                    })}
                </div>
              )}

              {exams.length === 0 && (
                <div className="py-8 text-center text-slate-400 text-sm">
                  Lộ trình này chưa có bài thi nào.
                </div>
              )}
            </Card>
          );
        })}
      </div>
    );
  };

  // ==================== MAIN RENDER ====================
  return (
    <ConfigProvider
      theme={{
        token: {
          borderRadius: 12,
          colorPrimary: "#4f46e5",
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        },
      }}
    >
      <div className="min-h-screen bg-slate-50/50 py-6 px-4 sm:px-6">
        <Spin spinning={loading} size="large">
          <div className="max-w-[1100px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-100 p-6 rounded-3xl shadow-sm">
              <div>
                <Title level={2} className="!mb-0.5 !text-slate-800 font-extrabold tracking-tight">
                  📚 Bài học của tôi
                </Title>
                <Text className="text-slate-500 text-sm">
                  Xem bài thi được giao, lộ trình học và lịch sử làm bài
                </Text>
              </div>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadAll}
                className="rounded-xl border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-600"
              >
                Làm mới
              </Button>
            </div>

            {/* Summary stats */}
            <Row gutter={[16, 16]}>
              <Col xs={12} md={6}>
                <Card className="rounded-2xl border-slate-100 bg-indigo-50 text-center" bodyStyle={{ padding: "16px 12px" }}>
                  <Statistic
                    title={<span className="text-indigo-600 text-xs font-semibold">Bài thi được giao</span>}
                    value={examAssignments.length}
                    valueStyle={{ color: "#4f46e5", fontSize: 28, fontWeight: 700 }}
                  />
                </Card>
              </Col>
              <Col xs={12} md={6}>
                <Card className="rounded-2xl border-slate-100 bg-purple-50 text-center" bodyStyle={{ padding: "16px 12px" }}>
                  <Statistic
                    title={<span className="text-purple-600 text-xs font-semibold">Lộ trình được giao</span>}
                    value={curriculumAssignments.length}
                    valueStyle={{ color: "#7c3aed", fontSize: 28, fontWeight: 700 }}
                  />
                </Card>
              </Col>
              <Col xs={12} md={6}>
                <Card className="rounded-2xl border-slate-100 bg-emerald-50 text-center" bodyStyle={{ padding: "16px 12px" }}>
                  <Statistic
                    title={<span className="text-emerald-600 text-xs font-semibold">Tổng lượt làm</span>}
                    value={examAssignments.reduce(
                      (sum: number, r: any) => sum + (r.summary?.attemptsCount ?? 0),
                      0
                    )}
                    valueStyle={{ color: "#10b981", fontSize: 28, fontWeight: 700 }}
                  />
                </Card>
              </Col>
              <Col xs={12} md={6}>
                <Card className="rounded-2xl border-slate-100 bg-amber-50 text-center" bodyStyle={{ padding: "16px 12px" }}>
                  <Statistic
                    title={<span className="text-amber-600 text-xs font-semibold">Lộ trình hoàn thành</span>}
                    value={curriculumAssignments.filter((r: any) => {
                      const ep: any[] = r.examProgress ?? [];
                      const total = ep.filter((e) => e.isRequired !== false).length;
                      const done = ep.filter((e) => e.isRequired !== false && e.isCompleted).length;
                      return total > 0 && done >= total;
                    }).length}
                    valueStyle={{ color: "#f59e0b", fontSize: 28, fontWeight: 700 }}
                  />
                </Card>
              </Col>
            </Row>

            {/* Tabs */}
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              type="card"
              size="large"
              className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
              tabBarStyle={{ padding: "16px 16px 0", background: "white", marginBottom: 0 }}
              items={[
                {
                  key: "exam-assignments",
                  label: (
                    <span className="flex items-center gap-2 px-2">
                      <FileTextOutlined />
                      <span>Bài thi được giao</span>
                      <Badge
                        count={examAssignments.length}
                        style={{ backgroundColor: "#4f46e5" }}
                      />
                    </span>
                  ),
                  children: <div className="p-6">{renderExamAssignments()}</div>,
                },
                {
                  key: "curriculums",
                  label: (
                    <span className="flex items-center gap-2 px-2">
                      <BookOutlined />
                      <span>Lộ trình học</span>
                      <Badge
                        count={curriculumAssignments.length}
                        style={{ backgroundColor: "#7c3aed" }}
                      />
                    </span>
                  ),
                  children: <div className="p-6">{renderCurriculums()}</div>,
                },
              ]}
            />
          </div>
        </Spin>
      </div>

      {/* History Modal */}
      <AttemptHistoryModal
        assignmentId={historyAssignmentId}
        title={historyTitle}
        open={!!historyAssignmentId}
        onClose={() => {
          setHistoryAssignmentId(null);
          setHistoryTitle(undefined);
        }}
      />
    </ConfigProvider>
  );
}
