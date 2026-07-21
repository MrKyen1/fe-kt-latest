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
  ArrowRightOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

import { studentLearningService } from "../../../services/studentLearningService";

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
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
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
  assignmentStudentId, examId, title, open, onClose,
}: { assignmentStudentId: string | null; examId?: string | null; title?: string; open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !assignmentStudentId) return;
    setLoading(true);
    studentLearningService.examAssignments
      .attempts(assignmentStudentId)
      .then((res: any) => {
        const arr = Array.isArray(res) ? res : res?.data ?? [];
        const filtered = examId ? arr.filter((x: any) => x.examId === examId) : arr;
        setAttempts(filtered);
      })
      .catch(() => message.error("Không thể tải lịch sử làm bài"))
      .finally(() => setLoading(false));
  }, [open, assignmentStudentId, examId]);

  const columns = [
    { title: "Lần", dataIndex: "attemptNumber", width: 60, render: (n: number) => <span className="font-bold text-indigo-600">#{n}</span> },
    {
      title: "Trạng thái", dataIndex: "status",
      render: (status: string) => status === "submitted"
        ? <Tag color="success" className="rounded-full border-none text-xs font-semibold">✓ Đã nộp</Tag>
        : <Tag color="processing" className="rounded-full border-none text-xs font-semibold">Đang làm</Tag>,
    },
    {
      title: "Điểm",
      render: (_: any, r: any) => r.status === "submitted"
        ? <span className="font-bold" style={{ color: percentColor(r.percentage) }}>{r.score ?? "—"} / {r.maxScore ?? "—"}</span>
        : <span className="text-slate-400">—</span>,
    },
    {
      title: "Phần trăm",
      render: (_: any, r: any) => r.status === "submitted" && r.percentage
        ? <Progress percent={Math.round(parseFloat(r.percentage))} size="small" strokeColor={percentColor(r.percentage)} format={(p) => `${p}%`} />
        : <span className="text-slate-400">—</span>,
    },
    { title: "Thời gian làm", render: (_: any, r: any) => <span className="text-sm text-slate-500">{formatTime(r.durationSeconds)}</span> },
    { title: "Ngày nộp", render: (_: any, r: any) => <span className="text-xs text-slate-400">{formatDate(r.submittedAt)}</span> },
    {
      title: "Chi tiết", align: "right" as const,
      render: (_: any, r: any) => (
        <Button type="link" size="small" icon={<ArrowRightOutlined />}
          onClick={() => { onClose(); navigate(`/exam/${r.id}`); }}
          className="text-indigo-600 font-medium">
          {r.status === "submitted" ? "Xem đáp án" : "Tiếp tục"}
        </Button>
      ),
    },
  ];

  return (
    <Modal open={open} onCancel={onClose} footer={null}
      title={<div className="flex items-center gap-2 text-indigo-700 font-bold"><HistoryOutlined /><span>Lịch sử làm bài: {title || "Bài thi"}</span></div>}
      width={800}
    >
      {loading ? (
        <div className="flex justify-center py-10"><Spin size="large" /></div>
      ) : attempts.length === 0 ? (
        <Empty description="Chưa có lần làm bài nào" />
      ) : (
        <Table dataSource={attempts} columns={columns} rowKey="id" pagination={false} size="small" className="rounded-xl overflow-hidden" />
      )}
    </Modal>
  );
}

// ==================== MAIN COMPONENT ====================
export default function StudentMyExams() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("exam-assignments");
  const [loading, setLoading] = useState(false);

  // ---- Exam assignments (bài thi được giao) ----
  const [examAssignments, setExamAssignments] = useState<any[]>([]);

  // ---- Curriculum assignments (giáo trình) ----
  // Mỗi item: { curriculumId, enrollmentId, curriculum, accessType, progressPercentage, exams[] }
  const [curriculumItems, setCurriculumItems] = useState<any[]>([]);

  // ---- Starting exam ----
  const [startingId, setStartingId] = useState<string | null>(null);

  // ---- History modal ----
  const [historyAssignmentStudentId, setHistoryAssignmentStudentId] = useState<string | null>(null);
  const [historyExamId, setHistoryExamId] = useState<string | null>(null);
  const [historyTitle, setHistoryTitle] = useState<string | undefined>(undefined);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      setLoading(true);

      const [examRes, curriculumRes] = await Promise.allSettled([
        studentLearningService.examAssignments.list({ page: 1, limit: 100 }),
        studentLearningService.curriculums.list({ page: 1, limit: 100 }),
      ]);

      // --- Exam assignments ---
      if (examRes.status === "fulfilled" && examRes.value?.data) {
        const summaryList = examRes.value.data as any[];

        // Fetch detail for each exam assignment to get progress and details
        const enriched = await Promise.allSettled(
          summaryList.map(async (item: any) => {
            try {
              const detail = await studentLearningService.examAssignments.get(item.id);
              return { ...item, ...detail };
            } catch {
              return item;
            }
          })
        );

        setExamAssignments(
          enriched.map((r) => {
            if (r.status !== "fulfilled" || !r.value) return null;
            const row = r.value;
            const exams: any[] = row.exams || [];
            const exam = row.exam || row.assignment?.exam;
            const resolvedExams = exams.length > 0 ? exams : (exam ? [{
              examId: exam.id,
              exam,
              attemptsCount: row.summary?.attemptsCount ?? 0,
              bestPercentage: row.summary?.bestPercentage,
              status: (row.summary?.attemptsCount ?? 0) > 0 ? "in_progress" : "assigned"
            }] : []);

            const completedCount = resolvedExams.filter((ep: any) => {
              const attemptsCount = ep.attemptsCount ?? 0;
              const bestPct = ep.bestPercentage;
              const isCompleted = ep.status === "completed" || parseFloat(bestPct ?? "0") >= 100 || attemptsCount > 0;
              return isCompleted;
            }).length;
            const totalExamsCount = resolvedExams.length;
            const progressPercentage = totalExamsCount > 0 ? ((completedCount / totalExamsCount) * 100).toFixed(2) : "100.00";

            return {
              ...row,
              completedExamsCount: completedCount,
              totalExamsCount,
              progressPercentage,
            };
          }).filter(Boolean)
        );
      } else {
        setExamAssignments([]);
      }

      // --- Curriculum assignments ---
      // Backend returns: { curriculumId, enrollmentId, curriculum, accessType, ... }
      // We then fetch detail for each to get the exam list
      if (curriculumRes.status === "fulfilled" && curriculumRes.value?.data) {
        const summaryList = curriculumRes.value.data as any[];

        // Fetch detail for each curriculum to get exam progress
        const enriched = await Promise.allSettled(
          summaryList.map(async (item: any) => {
            const cId = item.curriculumId;
            if (!cId) return item;
            try {
              const detail = await studentLearningService.curriculums.get(cId);
              return { ...item, ...detail };
            } catch {
              return item;
            }
          })
        );

        setCurriculumItems(
          enriched.map((r) => {
            if (r.status !== "fulfilled" || !r.value) return null;
            const item = r.value;
            const exams: any[] = item.exams ?? [];
            const requiredExams = exams.filter((ep: any) => ep.isRequired ?? ep.curriculumExam?.isRequired ?? true);
            const completedCount = requiredExams.filter((ep: any) => {
              const isCompleted = ep.status === "completed" || ep.completedAt != null || (ep.attemptsCount ?? 0) > 0;
              return isCompleted;
            }).length;
            const totalRequired = requiredExams.length;
            const progressPercentage = totalRequired > 0 ? ((completedCount / totalRequired) * 100).toFixed(2) : "100.00";

            return {
              ...item,
              completedExamsCount: completedCount,
              totalRequiredExamsCount: totalRequired,
              progressPercentage,
            };
          }).filter(Boolean)
        );
      } else {
        setCurriculumItems([]);
      }
    } catch {
      message.error("Tải dữ liệu thất bại");
    } finally {
      setLoading(false);
    }
  };

  // ---- Start exam assignment attempt ----
  const handleStartExam = async (assignmentStudentId: string, examId: string) => {
    try {
      setStartingId(`${assignmentStudentId}:${examId}`);
      const attempt = await studentLearningService.examAssignments.startAttempt(assignmentStudentId, examId);
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
  const handleStartCurriculumExam = async (curriculumId: string, examId: string) => {
    const key = `${curriculumId}:${examId}`;
    try {
      setStartingId(key);
      const attempt = await studentLearningService.curriculums.startAttempt(curriculumId, examId);
      const attemptId = (attempt as any)?.id;
      if (!attemptId) throw new Error("Backend không trả về attemptId.");
      navigate(`/exam/${attemptId}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Không thể bắt đầu bài thi.");
    } finally {
      setStartingId(null);
    }
  };

  // ==================== EXAM ASSIGNMENTS RENDER ====================
  const renderExamAssignments = () => {
    if (examAssignments.length === 0) {
      return (
        <div className="py-16 text-center">
          <Empty description={
            <span className="text-slate-400">Chưa có bài thi nào được giao.<br />Liên hệ giáo viên để được phân công.</span>
          } />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {examAssignments.map((row: any) => {
          const assignmentStudentId = row.id; // student-level assignment record
          const cls = row.class || row.assignment?.class;

          // Get list of exams in this assignment
          const exams: any[] = row.exams || [];

          // If no exams array (e.g. legacy/pre-enriched fallback), fallback to single exam
          const exam = row.exam || row.assignment?.exam;
          const resolvedExams = exams.length > 0 ? exams : (exam ? [{
            examId: exam.id,
            exam,
            attemptsCount: row.summary?.attemptsCount ?? 0,
            bestPercentage: row.summary?.bestPercentage,
            status: (row.summary?.attemptsCount ?? 0) > 0 ? "in_progress" : "assigned"
          }] : []);

          const title = row.assignment?.title || "Bài thi được giao";
          const progressPct = parseFloat(row.progressPercentage ?? "0");
          const completedCount = row.completedExamsCount ?? 0;
          const totalExamsCount = row.totalExamsCount ?? resolvedExams.length;

          return (
            <Card key={row.id}
              className="rounded-2xl border border-slate-100 hover:border-indigo-200 transition-colors overflow-hidden"
              style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
              bodyStyle={{ padding: 0 }}
            >
              {/* Header */}
              <div className="px-6 py-5 bg-slate-50 border-b border-slate-100">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                      <FileTextOutlined style={{ color: "white", fontSize: 20 }} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 text-base mb-1">{title}</div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                        {cls && <Tag color="blue" className="rounded-full border-none text-xs">{cls.name}</Tag>}
                        <span className="text-xs text-slate-400">
                          Đã hoàn thành {completedCount}/{totalExamsCount} bài
                        </span>
                      </div>
                    </div>
                  </div>
                  {totalExamsCount > 0 && (
                    <div className="text-center">
                      <div className="text-xs text-indigo-600 font-medium">Tiến độ</div>
                      <div className="text-lg font-bold text-indigo-700">{Math.round(progressPct)}%</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Exam list */}
              {resolvedExams.length > 0 && (
                <div className="p-4 space-y-2">
                  {resolvedExams.map((ep: any, idx: number) => {
                    const currentExam = ep.exam;
                    const examId = ep.examId || currentExam?.id;
                    const examTitle = currentExam?.title || currentExam?.code || `Bài thi ${idx + 1}`;
                    const attemptsCount = ep.attemptsCount ?? 0;

                    // Find the best attempt in the assignment's attempts list (if populated)
                    const attemptsList = row.attempts || [];
                    const examAttempts = attemptsList.filter((att: any) => att.examId === examId && att.status === "submitted");
                    const bestAttempt = examAttempts.reduce((best: any, current: any) => {
                      return (!best || parseFloat(current.percentage) > parseFloat(best.percentage)) ? current : best;
                    }, null);

                    const bestPct = ep.bestPercentage || bestAttempt?.percentage;
                    const bestScore = bestAttempt?.score;

                    const maxAttempts = ep.maxAttempts ?? row.maxAttempts ?? row.assignment?.maxAttempts;
                    const isCompleted = ep.status === "completed" || parseFloat(bestPct ?? "0") >= 100 || attemptsCount > 0;
                    const isStarting = startingId === `${assignmentStudentId}:${examId}`;
                    const isExhausted = maxAttempts && attemptsCount >= maxAttempts;

                    return (
                      <div key={examId || idx}
                        className={`flex items-center justify-between gap-3 p-3 rounded-xl transition-colors ${isCompleted
                          ? "bg-emerald-50/50 border border-emerald-100"
                          : "bg-slate-50/50 border border-slate-100 hover:bg-slate-100/50"}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${isCompleted
                            ? "bg-emerald-500 text-white"
                            : "bg-white border border-slate-200 text-slate-600"}`}>
                            {isCompleted ? <CheckCircleOutlined /> : idx + 1}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800 text-sm">{examTitle}</div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {currentExam?.timeLimitSeconds ? (
                                <span className="text-slate-500 text-xs flex items-center gap-1">
                                  <ClockCircleOutlined /> {Math.ceil(currentExam.timeLimitSeconds / 60)} phút
                                </span>
                              ) : null}
                              {maxAttempts ? (
                                <Tag color="orange" className="rounded-full border-none text-[10px] px-2 m-0">Tối đa {maxAttempts} lần</Tag>
                              ) : (
                                <Tag color="blue" className="rounded-full border-none text-[10px] px-2 m-0">♾ Không giới hạn</Tag>
                              )}
                              {attemptsCount > 0 && (
                                <span className="text-slate-400 text-xs">{attemptsCount} lần đã làm</span>
                              )}
                              {bestPct && (
                                <span className="text-xs font-semibold" style={{ color: percentColor(bestPct) }}>
                                  Tốt nhất: {bestScore !== undefined ? `${bestScore}` : ""} ({parseFloat(bestPct).toFixed(1)}%)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {attemptsCount > 0 && (
                            <Tooltip title="Xem lịch sử làm bài">
                              <Button size="small" icon={<HistoryOutlined />}
                                onClick={() => {
                                  setHistoryAssignmentStudentId(assignmentStudentId);
                                  setHistoryExamId(examId);
                                  setHistoryTitle(examTitle);
                                }}
                                className="rounded-lg border-slate-200 text-slate-600 hover:indigo-600 text-xs h-8 px-2"
                              />
                            </Tooltip>
                          )}
                          <Tooltip title={isExhausted ? "Đã hết lượt làm bài" : undefined}>
                            <Button size="small"
                              type={isCompleted ? "default" : "primary"}
                              icon={isCompleted ? <ReloadOutlined /> : <PlayCircleOutlined />}
                              loading={isStarting}
                              disabled={isExhausted}
                              onClick={() => handleStartExam(assignmentStudentId, examId)}
                              className={`rounded-lg font-semibold text-xs h-8 px-3 ${isCompleted
                                ? "border-emerald-200 text-emerald-600 hover:border-emerald-400"
                                : "shadow-sm shadow-indigo-500/20"}`}
                            >
                              {isExhausted ? "Hết lượt" : isCompleted ? "Làm lại" : "Làm bài"}
                            </Button>
                          </Tooltip>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    );
  };

  // ==================== CURRICULUMS RENDER ====================
  const renderCurriculums = () => {
    if (curriculumItems.length === 0) {
      return (
        <div className="py-16 text-center">
          <Empty description={
            <span className="text-slate-400">Chưa có lộ trình học nào.<br />Bạn sẽ thấy giáo trình khi được giao trực tiếp hoặc khi lớp của bạn được gắn giáo trình.</span>
          } />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {curriculumItems.map((item: any) => {
          const curriculumId = item.curriculumId;
          const curriculum = item.curriculum;
          const title = curriculum?.title || curriculum?.code || "Lộ trình học";
          const accessType = item.accessType; // 'class' | 'direct'
          const progressPct = parseFloat(item.progressPercentage ?? "0");
          const completedCount = item.completedExamsCount ?? 0;
          const totalRequired = item.totalRequiredExamsCount ?? 0;
          const exams: any[] = item.exams ?? [];
          const maxAttempts = item.maxAttempts;

          return (
            <Card key={curriculumId}
              className="rounded-2xl border border-slate-100 hover:border-purple-200 transition-colors overflow-hidden"
              style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
              bodyStyle={{ padding: 0 }}
            >
              {/* Header */}
              <div className="px-6 py-5" style={{ background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)" }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <BookOutlined style={{ color: "rgba(255,255,255,0.8)", fontSize: 16 }} />
                      <span className="text-white/70 text-sm font-medium">Lộ trình học</span>
                      {accessType === "class"
                        ? <Tag color="cyan" className="rounded-full border-none text-xs m-0">Qua lớp</Tag>
                        : <Tag color="gold" className="rounded-full border-none text-xs m-0">Trực tiếp</Tag>}
                    </div>
                    <div className="text-white font-bold text-xl">{title}</div>
                    <div className="text-white/60 text-sm mt-1 flex items-center gap-3">
                      {curriculum?.code && <span className="font-mono">{curriculum.code}</span>}
                      {maxAttempts
                        ? <span>Tối đa {maxAttempts} lần/bài</span>
                        : <span>♾ Không giới hạn</span>}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full border-4 border-white/30 flex items-center justify-center"
                      style={{ background: "rgba(255,255,255,0.15)" }}>
                      <span className="text-white font-black text-lg">{Math.round(progressPct)}%</span>
                    </div>
                    <div className="text-white/70 text-xs mt-1">Hoàn thành</div>
                  </div>
                </div>
                <div className="mt-4">
                  <Progress percent={Math.round(progressPct)} showInfo={false}
                    strokeColor="rgba(255,255,255,0.9)" trailColor="rgba(255,255,255,0.2)"
                    size={{ height: 6 }} />
                  <div className="text-white/60 text-xs mt-1">
                    {completedCount}/{totalRequired} bài bắt buộc đã hoàn thành
                  </div>
                </div>
              </div>

              {/* Exam list */}
              {exams.length > 0 && (
                <div className="p-4 space-y-2">
                  {exams
                    .sort((a: any, b: any) => (a.orderIndex ?? a.curriculumExam?.orderIndex ?? 0) - (b.orderIndex ?? b.curriculumExam?.orderIndex ?? 0))
                    .map((ep: any, idx: number) => {
                      const exam = ep.exam;
                      const examId = ep.examId || exam?.id;
                      const examTitle = exam?.title || exam?.code || `Bài thi ${idx + 1}`;
                      const isRequired = ep.isRequired ?? ep.curriculumExam?.isRequired ?? true;
                      const attemptsCount = ep.attemptsCount ?? 0;
                      const isCompleted = ep.status === "completed" || ep.completedAt != null || attemptsCount > 0;
                      const bestScore = ep.bestScore;
                      const bestPct = ep.bestPercentage;
                      const startKey = `${curriculumId}:${examId}`;
                      const isStarting = startingId === startKey;
                      const isExhausted = maxAttempts && attemptsCount >= maxAttempts;

                      return (
                        <div key={examId || idx}
                          className={`flex items-center justify-between gap-3 p-3 rounded-xl transition-colors ${isCompleted
                            ? "bg-emerald-50 border border-emerald-100"
                            : "bg-slate-50 border border-slate-100 hover:bg-slate-100"}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${isCompleted
                              ? "bg-emerald-500 text-white"
                              : "bg-white border border-slate-200 text-slate-600"}`}>
                              {isCompleted ? <CheckCircleOutlined /> : idx + 1}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-800 text-sm">{examTitle}</div>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {isRequired
                                  ? <Tag color="red" className="rounded-full border-none text-[10px] px-2 m-0">Bắt buộc</Tag>
                                  : <Tag color="default" className="rounded-full border-none text-[10px] px-2 m-0">Tuỳ chọn</Tag>}
                                {attemptsCount > 0 && (
                                  <span className="text-slate-400 text-xs">{attemptsCount} lần đã làm</span>
                                )}
                                {bestScore && (
                                  <span className="text-xs font-medium" style={{ color: percentColor(bestPct) }}>
                                    Tốt nhất: {bestScore} ({parseFloat(bestPct ?? "0").toFixed(1)}%)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {attemptsCount > 0 && item.enrollmentId && (
                              <Tooltip title="Xem lịch sử làm bài">
                                <Button size="small" icon={<HistoryOutlined />}
                                  onClick={() => {
                                    setHistoryAssignmentStudentId(item.enrollmentId);
                                    setHistoryExamId(examId);
                                    setHistoryTitle(examTitle);
                                  }}
                                  className="rounded-lg border-slate-200 text-slate-600 hover:indigo-600 text-xs h-8 px-2"
                                />
                              </Tooltip>
                            )}
                            <Tooltip title={isExhausted ? "Đã hết lượt làm bài" : undefined}>
                              <Button size="small"
                                type={isCompleted ? "default" : "primary"}
                                icon={isCompleted ? <ReloadOutlined /> : <PlayCircleOutlined />}
                                loading={isStarting}
                                disabled={isExhausted}
                                onClick={() => handleStartCurriculumExam(curriculumId, examId)}
                                className={`rounded-lg font-semibold text-xs h-8 px-3 ${isCompleted
                                  ? "border-emerald-200 text-emerald-600 hover:border-emerald-400"
                                  : "shadow-sm shadow-indigo-500/20"}`}
                              >
                                {isExhausted ? "Hết lượt" : isCompleted ? "Làm lại" : "Làm bài"}
                              </Button>
                            </Tooltip>
                          </div>
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
        token: { borderRadius: 12, colorPrimary: "#4f46e5", fontFamily: "Inter, system-ui, -apple-system, sans-serif" },
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
                  Bài thi được giao và lộ trình học từ giáo viên / lớp học
                </Text>
              </div>
              <Button icon={<ReloadOutlined />} onClick={loadAll}
                className="rounded-xl border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-600">
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
                    title={<span className="text-purple-600 text-xs font-semibold">Lộ trình học</span>}
                    value={curriculumItems.length}
                    valueStyle={{ color: "#7c3aed", fontSize: 28, fontWeight: 700 }}
                  />
                </Card>
              </Col>
              <Col xs={12} md={6}>
                <Card className="rounded-2xl border-slate-100 bg-emerald-50 text-center" bodyStyle={{ padding: "16px 12px" }}>
                  <Statistic
                    title={<span className="text-emerald-600 text-xs font-semibold">Tổng lượt làm</span>}
                    value={examAssignments.reduce((sum: number, r: any) => sum + (r.attempts?.length ?? r.summary?.attemptsCount ?? 0), 0)}
                    valueStyle={{ color: "#10b981", fontSize: 28, fontWeight: 700 }}
                  />
                </Card>
              </Col>
              <Col xs={12} md={6}>
                <Card className="rounded-2xl border-slate-100 bg-amber-50 text-center" bodyStyle={{ padding: "16px 12px" }}>
                  <Statistic
                    title={<span className="text-amber-600 text-xs font-semibold">Giáo trình hoàn thành</span>}
                    value={curriculumItems.filter((r: any) => parseFloat(r.progressPercentage ?? "0") >= 100).length}
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
                      <Badge count={examAssignments.length} style={{ backgroundColor: "#4f46e5" }} />
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
                      <Badge count={curriculumItems.length} style={{ backgroundColor: "#7c3aed" }} />
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
        assignmentStudentId={historyAssignmentStudentId}
        examId={historyExamId}
        title={historyTitle}
        open={!!historyAssignmentStudentId}
        onClose={() => { setHistoryAssignmentStudentId(null); setHistoryExamId(null); setHistoryTitle(undefined); }}
      />
    </ConfigProvider>
  );
}
