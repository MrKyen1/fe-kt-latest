import { Typography, Row, Col, Spin, Alert, Empty, message, Tag, Button, Modal, Table, Progress, Tooltip } from "antd";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  FileText,
  PlayCircle,
  Lock,
  CheckCircle2,
  History,
  RotateCcw,
} from "lucide-react";
import { HistoryOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { learningCmsService } from "../../services/learningCmsService";
import { studentLearningService } from "../../services/studentLearningService";
import { useAuth } from "../../contexts/AuthContext";
import { Curriculum, Exam } from "../../types/backend";

const { Title, Text } = Typography;

const formatMinutes = (sec: number) => (sec ? `${Math.ceil(sec / 60)} phút` : "Không giới hạn");

type ExamEntry = {
  examId: string;
  orderIndex: number;
  isRequired: boolean;
  availableFrom?: string;
  availableUntil?: string;
  exam?: Exam;
};

type StudentCurriculumRow = {
  curriculumId?: string;
  enrollmentId?: string | null;
  curriculum?: { id: string };
  // legacy shape fallback
  id?: string;
  assignmentStudentId?: string;
  assignment?: { curriculum?: { id: string } };
};

export default function CurriculumExams() {
  const { curriculumId } = useParams<{ curriculumId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingExamId, setStartingExamId] = useState<string | null>(null);
  // Map from examId -> question count (loaded separately via exam GET)
  const [examQuestionCounts, setExamQuestionCounts] = useState<Record<string, number>>({});

  // Student assignment ID for this curriculum (needed to start attempt)
  const [studentAssignmentId, setStudentAssignmentId] = useState<string | null>(null);

  // ---- History modal ----
  const [historyAssignmentStudentId, setHistoryAssignmentStudentId] = useState<string | null>(null);
  const [historyExamId, setHistoryExamId] = useState<string | null>(null);
  const [historyTitle, setHistoryTitle] = useState<string | undefined>(undefined);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const isStudent = user?.role === "student";

  useEffect(() => {
    if (!curriculumId) return;
    let active = true;

    async function load() {
      try {
        setIsLoading(true);

        let cur;
        if (isStudent) {
          try {
            const cmsCur = await learningCmsService.curriculums.get(curriculumId!);
            const detail = await studentLearningService.curriculums.get(curriculumId!);
            cur = {
              ...cmsCur,
              ...detail,
              exams: detail.exams || []
            };
            if (active) {
              setStudentAssignmentId(detail.enrollmentId || null);
            }
          } catch {
            cur = await learningCmsService.curriculums.get(curriculumId!);
          }
        } else {
          cur = await learningCmsService.curriculums.get(curriculumId!);
        }

        if (active) setCurriculum(cur);

        // Load each exam's detail to get the accurate question count.
        // The curriculum GET endpoint does NOT include examQuestions in the nested exam
        // object — only the dedicated exam GET returns the `questions` array.
        const examMappings = cur.exams ?? [];
        if (examMappings.length > 0) {
          const counts: Record<string, number> = {};
          await Promise.all(
            examMappings.map(async (mapping) => {
              const eid = (mapping as any).examId ?? mapping.exam?.id;
              if (!eid) return;
              try {
                const examDetail = await learningCmsService.exams.get(eid);
                // Backend mapExam() returns field named `questions` = examQuestions array
                const qArr =
                  (examDetail as any).questions ??
                  (examDetail as any).examQuestions ??
                  [];
                counts[eid] = Array.isArray(qArr) ? qArr.length : 0;
              } catch {
                counts[eid] = 0;
              }
            }),
          );
          if (active) setExamQuestionCounts(counts);
        }

        if (active) setError(null);
      } catch (err) {
        if (active)
          setError(err instanceof Error ? err.message : "Không thể tải giáo trình.");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [curriculumId, isStudent]);

  const handleStartExam = async (examId: string) => {
    if (!isStudent) {
      message.info("Chỉ học sinh mới có thể làm bài thi. Bạn đang xem ở chế độ preview.");
      return;
    }
    if (!studentAssignmentId) {
      message.warning(
        "Bạn chưa được giao giáo trình này. Vui lòng liên hệ giáo viên để được phân công.",
      );
      return;
    }
    try {
      setStartingExamId(examId);
      // studentAssignmentId is now the curriculumId (used by /student/curriculums/:curriculumId/exams/:examId/attempts)
      const attempt = await studentLearningService.curriculums.startAttempt(
        studentAssignmentId!,
        examId,
      );
      const attemptId = (attempt as any)?.id;
      if (!attemptId) throw new Error("Backend không trả về attemptId.");
      navigate(`/exam/${attemptId}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Không thể bắt đầu bài thi.");
    } finally {
      setStartingExamId(null);
    }
  };

  const percentColor = (pct?: string | number) => {
    const n = parseFloat(String(pct ?? "0"));
    if (n >= 80) return "#10b981";
    if (n >= 50) return "#f59e0b";
    return "#ef4444";
  };

  const exams: ExamEntry[] = (curriculum?.exams ?? []).map((entry: any) => {
    const isRequired = entry.isRequired ?? entry.curriculumExam?.isRequired ?? false;
    const orderIndex = entry.orderIndex ?? entry.curriculumExam?.orderIndex ?? 0;
    return { ...entry, isRequired, orderIndex };
  }).sort(
    (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0),
  );

  const canDoExam = isStudent && !!studentAssignmentId;

  return (
    <div className="w-full bg-slate-50 py-16 px-6 md:px-16 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate("/courses/published-curriculums")}
          className="mb-8 flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-medium transition-colors group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          Quay lại danh sách giáo trình
        </button>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spin size="large" />
          </div>
        ) : error ? (
          <Alert type="error" showIcon message={error} />
        ) : !curriculum ? null : (
          <>
            {/* Header */}
            <div className="bg-white rounded-3xl border border-slate-100 p-8 mb-10 shadow-sm">
              <div className="flex items-start gap-5">
                <div className="bg-indigo-100 p-4 rounded-2xl text-indigo-600 shrink-0">
                  <BookOpen size={36} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-sm font-mono text-slate-400">{curriculum.code}</span>
                    <Tag color="green" className="rounded-full px-3">
                      Published
                    </Tag>
                    {curriculum.level && (
                      <Tag color="blue" className="rounded-full px-3">
                        {curriculum.level.name}
                      </Tag>
                    )}
                  </div>
                  <Title level={1} className="!text-3xl !font-bold !text-slate-800 !mb-3 !mt-0">
                    {curriculum.title}
                  </Title>
                  {curriculum.description && (
                    <Text className="text-slate-500 text-base">{curriculum.description}</Text>
                  )}

                  {/* Student assignment status */}
                  {isStudent && (
                    <div
                      className={`mt-4 flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl inline-flex w-fit ${
                        canDoExam
                          ? "bg-green-50 text-green-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {canDoExam ? (
                        <>
                          <CheckCircle2 size={16} />
                          Bạn đã được giao giáo trình này — sẵn sàng làm bài!
                        </>
                      ) : (
                        <>
                          <Lock size={16} />
                          Chưa được giao giáo trình — liên hệ giáo viên để được phân công.
                        </>
                      )}
                    </div>
                  )}

                  {!isStudent && (
                    <div className="mt-4 flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl inline-flex w-fit bg-slate-50 text-slate-500">
                      <Lock size={16} />
                      Bạn đang xem ở chế độ preview — chỉ học sinh mới có thể làm bài thi.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Exam list */}
            <div className="mb-6 flex items-center gap-3">
              <div className="bg-indigo-100 p-2.5 rounded-xl text-indigo-600">
                <FileText size={20} />
              </div>
              <Title level={2} className="!text-2xl !font-bold !text-slate-800 !m-0">
                Danh sách bài thi ({exams.length})
              </Title>
            </div>

            {exams.length === 0 ? (
              <div className="bg-white p-16 rounded-3xl shadow-sm border border-slate-100 text-center">
                <Empty description="Giáo trình này chưa có bài thi nào." />
              </div>
            ) : (
              <Row gutter={[0, 16]}>
                {exams.map((entry, idx) => {
                  const exam = entry.exam;
                  const eid = (entry as any).examId ?? exam?.id ?? "";
                  // Use counts loaded via exam GET (curriculum GET does not include examQuestions)
                  const qCount = examQuestionCounts[eid] ?? exam?.examQuestions?.length ?? exam?.questions?.length ?? 0;
                  const isStarting = startingExamId === (exam?.id ?? entry.examId);

                  return (
                    <Col xs={24} key={entry.examId}>
                      <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.06 }}
                        className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group hover:border-indigo-200 transition-colors"
                        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
                      >
                        <div className="flex items-start gap-5">
                          <div className="bg-indigo-50 rounded-xl p-3 text-indigo-600 shrink-0 font-bold text-lg w-12 h-12 flex items-center justify-center">
                            {idx + 1}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-indigo-700 transition-colors">
                              {exam?.title ?? exam?.code ?? `Bài thi ${idx + 1}`}
                            </h3>
                            <div className="flex flex-wrap items-center gap-4 text-slate-500 text-sm font-medium">
                              <div className="flex items-center gap-1.5">
                                <Clock size={15} className="text-indigo-400" />
                                <span>{formatMinutes(exam?.timeLimitSeconds ?? 0)}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <FileText size={15} className="text-indigo-400" />
                                <span>{qCount} câu hỏi</span>
                              </div>
                              {entry.isRequired && (
                                <Tag color="red" className="rounded-full">
                                  Bắt buộc
                                </Tag>
                              )}
                              {isStudent && ((entry as any).attemptsCount ?? 0) > 0 && (
                                <span className="text-slate-400 text-xs">{(entry as any).attemptsCount} lần đã làm</span>
                              )}
                              {isStudent && (entry as any).bestPercentage != null && (
                                <span className="text-xs font-semibold" style={{ color: percentColor((entry as any).bestPercentage) }}>
                                  Tốt nhất: {(entry as any).bestScore !== null && (entry as any).bestScore !== undefined ? `${(entry as any).bestScore}` : ""} ({parseFloat((entry as any).bestPercentage).toFixed(1)}%)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                          {isStudent && ((entry as any).attemptsCount ?? 0) > 0 && (
                            <Tooltip title="Xem lịch sử làm bài">
                              <Button
                                size="large"
                                icon={<History size={18} />}
                                onClick={() => {
                                  setHistoryAssignmentStudentId(studentAssignmentId);
                                  setHistoryExamId(exam?.id ?? entry.examId);
                                  setHistoryTitle(exam?.title ?? exam?.code ?? `Bài thi`);
                                  setHistoryModalOpen(true);
                                }}
                                className="h-12 w-12 flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-400"
                              />
                            </Tooltip>
                          )}
                          <Button
                            type={isStudent && ((entry as any).attemptsCount ?? 0) > 0 ? "default" : "primary"}
                            size="large"
                            icon={isStudent && ((entry as any).attemptsCount ?? 0) > 0 ? <RotateCcw size={18} /> : <PlayCircle size={18} />}
                            loading={isStarting}
                            disabled={isStarting || (!canDoExam && isStudent) || (isStudent && curriculum?.maxAttempts && ((entry as any).attemptsCount ?? 0) >= curriculum.maxAttempts)}
                            className={`w-full md:w-auto h-12 px-8 text-base rounded-xl border-none font-semibold flex items-center gap-2 justify-center ${
                              isStudent && curriculum?.maxAttempts && ((entry as any).attemptsCount ?? 0) >= curriculum.maxAttempts
                                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                                : isStudent && ((entry as any).attemptsCount ?? 0) > 0
                                ? "bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-800"
                                : canDoExam || !isStudent
                                ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                                : "bg-slate-200 text-slate-400 cursor-not-allowed"
                            }`}
                            onClick={() => handleStartExam(exam?.id ?? entry.examId)}
                          >
                            {isStudent
                              ? isStudent && curriculum?.maxAttempts && ((entry as any).attemptsCount ?? 0) >= curriculum.maxAttempts
                                ? "Hết lượt"
                                : canDoExam
                                ? ((entry as any).attemptsCount ?? 0) > 0
                                  ? "Làm lại"
                                  : "Làm bài ngay"
                                : "Chưa được giao"
                              : "Xem trước (chỉ HS)"}
                          </Button>
                        </div>
                      </motion.div>
                    </Col>
                  );
                })}
              </Row>
            )}
          </>
        )}
      </div>

      <AttemptHistoryModal
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        assignmentStudentId={historyAssignmentStudentId}
        examId={historyExamId}
        title={historyTitle}
      />
    </div>
  );
}

// ==================== ATTEMPT HISTORY MODAL ====================
function AttemptHistoryModal({
  assignmentStudentId, examId, title, open, onClose,
}: { assignmentStudentId: string | null; examId?: string | null; title?: string; open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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
