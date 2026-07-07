import { Typography, Row, Col, Button, Empty, Spin, Alert, message, Card, Progress, Tag, Tooltip, Modal, Table } from "antd";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import ExamCard from "./ExamCard";
import { studentLearningService } from "../../services/studentLearningService";
import { learningCmsService } from "../../services/learningCmsService";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  BookOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  HistoryOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

type ExamAssignmentRow = {
  id: string;
  assignmentId?: string;
  assignment?: {
    id: string;
    title?: string;
    instructions?: string;
    /** v2: mảng nhiều exam per assignment */
    exams?: Array<{ examId: string; exam?: AssignmentExam }>;
    /** legacy: single exam */
    exam?: AssignmentExam;
  };
  /** v2: exams[] trực tiếp trên row */
  exams?: Array<{
    examId: string;
    exam?: AssignmentExam;
    attemptsCount?: number;
    bestPercentage?: string | null;
    status?: string;
    maxAttempts?: number | null;
  }>;
  /** legacy: single exam */
  exam?: AssignmentExam;
  summary?: {
    attemptsCount?: number;
  };
};

type CurriculumRow = {
  curriculumId?: string;
  enrollmentId?: string | null;
  curriculum?: {
    id: string;
    title?: string;
    exams?: Array<{ exam?: AssignmentExam; examId?: string; id?: string }>;
  };
  // legacy shape fallback
  id?: string;
  assignmentStudentId?: string;
  assignment?: {
    curriculum?: {
      id: string;
      title?: string;
      exams?: Array<{ exam?: AssignmentExam; examId?: string; id?: string }>;
    };
  };
};

type AssignmentExam = {
  id: string;
  title?: string;
  code?: string;
  timeLimitSeconds?: number;
  questions?: unknown[];
  examQuestions?: unknown[];
};

type ExamListItem = {
  id: string;
  title: string;
  timeLimit: number;
  totalQuestions: number;
  start: () => Promise<unknown>;
};

function getQuestionCount(exam?: AssignmentExam) {
  return exam?.questions?.length ?? exam?.examQuestions?.length ?? 0;
}

function getExamTimeLimit(exam?: AssignmentExam) {
  return exam?.timeLimitSeconds ?? 0;
}

function getAttemptId(attempt: unknown) {
  if (attempt && typeof attempt === "object" && "id" in attempt) {
    return String((attempt as { id: string }).id);
  }
  return "";
}

function percentColor(pct?: string | number) {
  const n = parseFloat(String(pct ?? "0"));
  if (n >= 80) return "#10b981";
  if (n >= 50) return "#f59e0b";
  return "#ef4444";
}

/**
 * Flatten exam-assignment rows: mỗi row có thể chứa nhiều exam.
 * Với API v2, tạo 1 ExamListItem cho mỗi exam.
 */
function flattenExamAssignmentRows(rows: ExamAssignmentRow[]): ExamListItem[] {
  const items: ExamListItem[] = [];

  for (const row of rows) {
    const assignmentStudentId = row.id;
    const assignmentTitle = row.assignment?.title;

    // v2: exams[] array
    const examsArray = row.exams || row.assignment?.exams || [];

    if (examsArray.length > 0) {
      // Flatten: 1 card per exam
      for (const mapping of examsArray) {
        const exam = mapping.exam;
        const examId = mapping.examId || exam?.id;
        if (!examId) continue;
        items.push({
          id: `${assignmentStudentId}:${examId}`,
          title: assignmentTitle
            ? `${assignmentTitle} — ${exam?.title || exam?.code || examId}`
            : (exam?.title || exam?.code || `Bài thi ${examId}`),
          timeLimit: getExamTimeLimit(exam),
          totalQuestions: getQuestionCount(exam),
          start: () => studentLearningService.examAssignments.startAttempt(assignmentStudentId, examId),
        });
      }
    } else {
      // Legacy: single exam
      const exam = row.exam || row.assignment?.exam;
      const examId = exam?.id;
      if (!examId) continue;
      items.push({
        id: `${assignmentStudentId}:${examId}`,
        title: assignmentTitle || exam?.title || exam?.code || "Bài thi được giao",
        timeLimit: getExamTimeLimit(exam),
        totalQuestions: getQuestionCount(exam),
        start: () => studentLearningService.examAssignments.startAttempt(assignmentStudentId, examId),
      });
    }
  }

  return items;
}

export default function ExamList() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState<ExamListItem[]>([]);
  const [curriculums, setCurriculums] = useState<any[]>([]);
  const [selectedCurriculum, setSelectedCurriculum] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);

  // ---- History modal ----
  const [historyAssignmentStudentId, setHistoryAssignmentStudentId] = useState<string | null>(null);
  const [historyExamId, setHistoryExamId] = useState<string | null>(null);
  const [historyTitle, setHistoryTitle] = useState<string | undefined>(undefined);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const isCurriculum = courseId === "curriculums";
  const title = isCurriculum ? "Lộ trình học tập" : "Bài thi được giao";

  const loadData = async () => {
    try {
      setIsLoading(true);
      if (isCurriculum) {
        const response = await studentLearningService.curriculums.list({ page: 1, limit: 100 });
        const summaryList = response.data as any[];

        // Fetch detail for each curriculum to get exams list
        const enriched = await Promise.allSettled(
          summaryList.map(async (item: any) => {
            const cId = item.curriculumId;
            if (!cId) return item;
            try {
              const detail = await studentLearningService.curriculums.get(cId);
              const exams = detail.exams || [];

              // Load full exam details for each exam to get the question count
              const fullExams = await Promise.allSettled(
                exams.map(async (ep: any) => {
                  const examId = ep.examId || ep.exam?.id;
                  if (!examId) return ep;
                  try {
                    const fullExam = await learningCmsService.exams.get(examId);
                    return {
                      ...ep,
                      exam: {
                        ...ep.exam,
                        ...fullExam,
                      },
                    };
                  } catch {
                    return ep;
                  }
                })
              );
              detail.exams = fullExams
                .map((r: any) => (r.status === "fulfilled" ? r.value : null))
                .filter(Boolean);

              // Recalculate progress dynamically on frontend based on attemptsCount > 0
              const requiredExams = detail.exams.filter((ep: any) => ep.isRequired ?? ep.curriculumExam?.isRequired ?? true);
              const completedCount = requiredExams.filter((ep: any) => {
                const attemptsCount = ep.attemptsCount ?? 0;
                return ep.status === "completed" || ep.completedAt != null || attemptsCount > 0;
              }).length;
              const totalRequired = requiredExams.length;
              const progressPercentage = totalRequired > 0 ? ((completedCount / totalRequired) * 100).toFixed(2) : "100.00";

              return {
                ...item,
                ...detail,
                completedExamsCount: completedCount,
                totalRequiredExamsCount: totalRequired,
                progressPercentage,
              };
            } catch {
              return item;
            }
          })
        );

        const enrichedList = enriched
          .map((r) => (r.status === "fulfilled" ? r.value : null))
          .filter(Boolean);

        setCurriculums(enrichedList);
        setSelectedCurriculum((prev: any) => {
          if (!prev) return null;
          const fresh = enrichedList.find((c: any) => c.curriculumId === prev.curriculumId);
          return fresh || prev;
        });
      } else {
        const response = await studentLearningService.examAssignments.list({ page: 1, limit: 100 });
        const mapped = flattenExamAssignmentRows(response.data as ExamAssignmentRow[]);
        setItems(mapped);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách bài thi.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isCurriculum]);

  const handleStart = async (item: ExamListItem) => {
    try {
      setStartingId(item.id);
      const attempt = await item.start();
      const attemptId = getAttemptId(attempt);
      if (!attemptId) throw new Error("Backend khong tra attemptId.");
      navigate(`/exam/${attemptId}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Khong the bat dau bai thi.");
    } finally {
      setStartingId(null);
    }
  };

  const handleStartCurriculumExam = async (curriculumId: string, examId: string) => {
    try {
      setStartingId(examId);
      const attempt = await studentLearningService.curriculums.startAttempt(curriculumId, examId);
      const attemptId = getAttemptId(attempt);
      if (!attemptId) throw new Error("Backend không trả về attemptId.");
      navigate(`/exam/${attemptId}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Không thể bắt đầu bài thi.");
    } finally {
      setStartingId(null);
    }
  };

  // Helper function to format seconds to minutes
  const formatMinutes = (seconds?: number) => {
    if (!seconds) return "Không giới hạn";
    return `${Math.ceil(seconds / 60)} phút`;
  };

  return (
    <div className="w-full bg-slate-50 py-16 px-6 md:px-16 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <Button
          type="text"
          icon={<ArrowLeft size={20} />}
          className="mb-8 text-slate-500 hover:text-blue-600 flex items-center font-medium"
          onClick={() => {
            if (isCurriculum && selectedCurriculum) {
              setSelectedCurriculum(null);
            } else {
              navigate("/courses");
            }
          }}
        >
          {isCurriculum && selectedCurriculum ? "Quay lại lộ trình học tập" : "Quay lại khu vực học tập"}
        </Button>

        <div className="mb-12">
          <Title level={1} className="text-4xl font-bold text-slate-800 mb-4">
            {isCurriculum && selectedCurriculum ? selectedCurriculum.curriculum?.title : title}
          </Title>
          <div className="w-24 h-1 bg-blue-600 rounded-full mb-6" />
          <Text className="text-lg text-slate-600">
            {isCurriculum && selectedCurriculum
              ? selectedCurriculum.curriculum?.description || "Danh sách đề thi trong lộ trình học này."
              : "Danh sách này được lấy từ hệ thống theo tài khoản đang đăng nhập."}
          </Text>
        </div>

        {error && <Alert type="error" showIcon className="mb-8" message={error} />}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spin size="large" />
          </div>
        ) : isCurriculum && !selectedCurriculum ? (
          // CURRICULUMS LIST VIEW
          curriculums.length === 0 ? (
            <div className="bg-white p-16 rounded-3xl shadow-sm border border-slate-100 text-center">
              <Empty description="Chưa có lộ trình học tập nào được giao." />
            </div>
          ) : (
            <Row gutter={[24, 24]}>
              {curriculums.map((item, idx) => {
                const curriculum = item.curriculum;
                const title = curriculum?.title || curriculum?.code || "Lộ trình học";
                const progressPct = parseFloat(item.progressPercentage ?? "0");
                const completedCount = item.completedExamsCount ?? 0;
                const totalRequired = item.totalRequiredExamsCount ?? 0;

                return (
                  <Col xs={24} sm={12} key={item.curriculumId || idx}>
                    <Card
                      hoverable
                      className="rounded-3xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
                      onClick={() => setSelectedCurriculum(item)}
                      bodyStyle={{ padding: 24 }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
                          <BookOutlined style={{ color: "white", fontSize: 22 }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-800 text-xl truncate mb-1">
                            {title}
                          </h3>
                          <div className="text-slate-400 text-xs mb-4">
                            Mã lộ trình: <span className="font-mono">{curriculum?.code || "—"}</span>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                              <span>Tiến độ học tập</span>
                              <span className="text-purple-600 font-bold">{Math.round(progressPct)}%</span>
                            </div>
                            <Progress
                              percent={Math.round(progressPct)}
                              showInfo={false}
                              strokeColor="#7c3aed"
                              trailColor="#f3e8ff"
                              size={{ height: 8 }}
                            />
                            <div className="text-slate-400 text-xs mt-1">
                              Đã hoàn thành {completedCount}/{totalRequired} bài thi bắt buộc
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )
        ) : (
          // EXAMS LIST VIEW
          <>
            {isCurriculum && selectedCurriculum ? (
              selectedCurriculum.exams?.length === 0 ? (
                <div className="bg-white p-16 rounded-3xl shadow-sm border border-slate-100 text-center">
                  <Empty description="Lộ trình này chưa có bài thi nào." />
                </div>
              ) : (
                <Row gutter={[20, 20]}>
                  {selectedCurriculum.exams
                    .sort((a: any, b: any) => (a.orderIndex ?? a.curriculumExam?.orderIndex ?? 0) - (b.orderIndex ?? b.curriculumExam?.orderIndex ?? 0))
                    .map((ep: any, idx: number) => {
                      const exam = ep.exam;
                      const examId = ep.examId || exam?.id;
                      const examTitle = exam?.title || exam?.code || `Bài thi ${idx + 1}`;
                      const isRequired = ep.isRequired ?? ep.curriculumExam?.isRequired ?? true;
                      const attemptsCount = ep.attemptsCount ?? 0;
                      const bestScore = ep.bestScore;
                      const bestPct = ep.bestPercentage;
                      const isCompleted = ep.status === "completed" || ep.completedAt != null || attemptsCount > 0;
                      const maxAttempts = ep.maxAttempts ?? selectedCurriculum.maxAttempts;
                      const isExhausted = maxAttempts && attemptsCount >= maxAttempts;
                      const totalQuestions = getQuestionCount(exam);

                      return (
                        <Col xs={24} key={examId || idx}>
                          <div
                            className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-6 rounded-2xl transition-all duration-300 border ${isCompleted
                              ? "bg-emerald-50/50 border-emerald-100 shadow-sm"
                              : "bg-white border-slate-100 hover:border-slate-200 shadow-sm hover:shadow-md"
                              }`}
                          >
                            <div className="flex items-start gap-4">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold ${isCompleted
                                  ? "bg-emerald-500 text-white"
                                  : "bg-blue-50 text-blue-600"
                                  }`}
                              >
                                {isCompleted ? <CheckCircleOutlined style={{ fontSize: 18 }} /> : idx + 1}
                              </div>
                              <div>
                                <h3 className="font-bold text-slate-800 text-xl mb-2">{examTitle}</h3>
                                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500">
                                  {isRequired ? (
                                    <Tag color="red" className="rounded-full border-none px-2 m-0 text-[10px]">Bắt buộc</Tag>
                                  ) : (
                                    <Tag color="default" className="rounded-full border-none px-2 m-0 text-[10px]">Tùy chọn</Tag>
                                  )}

                                  <span className="flex items-center gap-1">
                                    <ClockCircleOutlined /> {formatMinutes(exam?.timeLimitSeconds)}
                                  </span>

                                  <span className="flex items-center gap-1">
                                    <FileTextOutlined /> {totalQuestions} câu hỏi
                                  </span>

                                  {attemptsCount > 0 && (
                                    <span className="text-slate-400">{attemptsCount} lần đã làm</span>
                                  )}

                                  {bestPct && (
                                    <span style={{ color: percentColor(bestPct) }}>
                                      Tốt nhất: {bestScore !== null && bestScore !== undefined ? `${bestScore}` : ""} ({parseFloat(bestPct).toFixed(1)}%)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 w-full md:w-auto font-bold h-12">
                              {attemptsCount > 0 && selectedCurriculum.enrollmentId && (
                                <Tooltip title="Xem lịch sử làm bài">
                                  <Button
                                    size="large"
                                    icon={<HistoryOutlined style={{ fontSize: 18 }} />}
                                    onClick={() => {
                                      setHistoryAssignmentStudentId(selectedCurriculum.enrollmentId);
                                      setHistoryExamId(examId);
                                      setHistoryTitle(examTitle);
                                      setHistoryModalOpen(true);
                                    }}
                                    className="h-12 w-12 flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-400"
                                  />
                                </Tooltip>
                              )}
                              <Button
                                type={isCompleted ? "default" : "primary"}
                                size="large"
                                icon={isCompleted ? <ReloadOutlined /> : <PlayCircleOutlined />}
                                disabled={isExhausted}
                                loading={startingId === examId}
                                onClick={() => handleStartCurriculumExam(selectedCurriculum.curriculumId, examId)}
                                className={`w-full md:w-auto font-bold h-12 px-6 rounded-xl border-none shadow-sm ${isCompleted
                                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-800"
                                  : "bg-blue-600 hover:bg-blue-500 text-white"
                                  }`}
                              >
                                {isExhausted ? "Hết lượt" : isCompleted ? "Làm lại" : "Làm bài ngay"}
                              </Button>
                            </div>
                          </div>
                        </Col>
                      );
                    })}
                </Row>
              )
            ) : (
              // Assigned exams (flattened list) rendering
              items.length === 0 ? (
                <div className="bg-white p-16 rounded-3xl shadow-sm border border-slate-100 text-center">
                  <Empty description="Chưa có bài thi nào được giao." />
                </div>
              ) : (
                <Row gutter={[24, 24]}>
                  {items.map((exam, idx) => (
                    <Col xs={24} key={exam.id}>
                      <ExamCard
                        exam={exam}
                        totalQuestions={exam.totalQuestions}
                        index={idx}
                        onStart={() => handleStart(exam)}
                        loading={startingId === exam.id}
                      />
                    </Col>
                  ))}
                </Row>
              )
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
