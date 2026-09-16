import { useEffect, useState, useMemo } from "react";
import {
  Button,
  Card,
  Col,
  ConfigProvider,
  Divider,
  Empty,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tabs,
  Typography,
  message,
  Statistic,
  Tooltip,
  Progress,
  Alert,
  Segmented,
} from "antd";

import {
  BookOutlined,
  DeleteOutlined,
  FileTextOutlined,
  PlusOutlined,
  BarChartOutlined,
  CloseCircleOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  UserOutlined,
  ClockCircleOutlined,
  LinkOutlined,
  ReloadOutlined,
  InfinityOutlined,
  BankOutlined,
  SearchOutlined,
  FilterOutlined,
  GlobalOutlined,
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import { ClipboardList, Info, Building2, Filter } from "lucide-react";

import { teacherLearningService, ClassCurriculum } from "../../../services/teacherLearningService";
import { learningCmsService } from "../../../services/learningCmsService";
import { academicService } from "../../../services/academicService";
import { userService } from "../../../services/userService";
import { useAuth } from "../../../contexts/AuthContext";
import { Can } from "../../../components/Can";
import { getErrorMessage } from "../../../services/apiClient";
import { Center, Specialization } from "../../../types/backend";

const { Title, Text } = Typography;

// ==================== TYPES ====================
type AssignmentStatus = "active" | "cancelled";

interface ExamOption {
  id: string;
  title?: string;
  code?: string;
  status?: string;
  examType?: string;
  specializationId?: string;
}
interface CurriculumOption {
  id: string;
  title?: string;
  code?: string;
  status?: string;
  specializationId?: string;
}
interface ClassOption {
  id: string;
  name?: string;
  centerId?: string;
  specializationId?: string;
  specialization?: { id?: string; name?: string };
}
interface StudentOption {
  id: string;
  fullName?: string;
  code?: string;
  studentProfile?: { id?: string; classes?: { id: string; centerId?: string; class?: { centerId?: string } }[] };
}

// ==================== STATUS TAG ====================
const statusTag = (status: AssignmentStatus) => {
  if (status === "active")
    return <Tag color="success" className="rounded-full border-none text-xs font-semibold px-3">Đang hoạt động</Tag>;
  return <Tag color="default" className="rounded-full border-none text-xs font-semibold px-3">Đã huỷ</Tag>;
};

const maxAttemptsTag = (n?: number | null) => {
  if (n === 1) {
    return <Tag color="purple" className="rounded-full border-none text-xs font-semibold">Đề kiểm tra</Tag>;
  }
  return <Tag color="blue" className="rounded-full border-none text-xs font-semibold">Đề ôn tập</Tag>;
};

// ==================== HELPER FORMATTERS ====================
function formatDuration(seconds?: number | null) {
  if (seconds == null || isNaN(seconds) || seconds <= 0) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins === 0) return `${secs} giây`;
  return `${mins} phút ${secs > 0 ? `${secs}s` : ""}`;
}

function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// ==================== TEACHER ATTEMPT DETAIL MODAL ====================
function TeacherAttemptDetailModal({
  assignmentId,
  attemptId,
  studentName,
  attemptSummary,
  open,
  onClose,
}: {
  assignmentId: string | null;
  attemptId: string | null;
  studentName?: string;
  attemptSummary?: any;
  open: boolean;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !assignmentId || !attemptId) {
      setDetail(null);
      setErrorNotice(null);
      return;
    }
    setLoading(true);
    setErrorNotice(null);
    teacherLearningService.examAssignments
      .attemptDetail(assignmentId, attemptId)
      .then((res) => {
        setDetail(res);
      })
      .catch((err) => {
        const msg = getErrorMessage(err, "Chưa thể tải chi tiết từng câu hỏi");
        setErrorNotice(msg);
      })
      .finally(() => setLoading(false));
  }, [open, assignmentId, attemptId]);

  const activeData = detail || attemptSummary;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose} className="rounded-xl font-medium">
          Đóng
        </Button>,
      ]}
      title={
        <div className="flex items-center gap-2 text-indigo-700">
          <EyeOutlined />
          <span className="font-bold">Chi tiết bài làm: {studentName || "Học sinh"}</span>
        </div>
      }
      width={780}
      className="rounded-3xl overflow-hidden"
    >
      {loading && !activeData ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Spin size="large" />
          <span className="text-slate-400 text-sm mt-3">Đang tải chi tiết bài làm...</span>
        </div>
      ) : activeData ? (
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-2xl border border-indigo-100 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs text-indigo-500 font-semibold uppercase tracking-wider">Học sinh</div>
              <div className="text-base font-bold text-slate-800">
                {activeData.student?.user?.fullName || studentName || "Học sinh"}
              </div>
              {(activeData.student?.user?.code || activeData.code) && (
                <div className="text-xs text-slate-500 font-mono">
                  Mã: {activeData.student?.user?.code || activeData.code}
                </div>
              )}
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-xs text-slate-500">Điểm số</div>
                <div className="text-xl font-black text-indigo-600">
                  {activeData.score} / {activeData.maxScore}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500">Tỷ lệ đúng</div>
                <div className="text-xl font-black text-emerald-600">
                  {parseFloat(activeData.percentage || "0").toFixed(1)}%
                </div>
              </div>
              {activeData.displayResult && (
                <div className="text-center">
                  <div className="text-xs text-slate-500">Số câu đúng</div>
                  <div className="text-sm font-bold text-slate-700">
                    {activeData.displayResult}
                  </div>
                </div>
              )}
              <div className="text-center">
                <div className="text-xs text-slate-500">Thời lượng</div>
                <div className="text-sm font-semibold text-slate-700">
                  {formatDuration(activeData.durationSeconds)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500">Nộp lúc</div>
                <div className="text-xs font-semibold text-slate-600">
                  {formatDateTime(activeData.submittedAt || activeData.createdAt)}
                </div>
              </div>
            </div>
          </div>

          {/* Question Answers List if available */}
          {detail?.answers && detail.answers.length > 0 ? (
            <div className="space-y-4">
              <div className="text-sm font-bold text-slate-700 flex items-center justify-between">
                <span>Danh sách câu hỏi & câu trả lời</span>
                <span className="text-xs font-normal text-slate-400">
                  Tổng số {detail.answers.length} câu
                </span>
              </div>

              {detail.answers.map((ans: any, idx: number) => {
                const qNumber = (ans.orderIndex ?? idx) + 1;
                const prompt = ans.questionSnapshot?.prompt || `Câu hỏi ${qNumber}`;
                const isCorrect = ans.isCorrect;
                const options = ans.questionSnapshot?.options || [];

                return (
                  <div
                    key={ans.id || idx}
                    className={`p-4 rounded-2xl border transition-all ${
                      isCorrect
                        ? "border-emerald-200 bg-emerald-50/20"
                        : "border-rose-200 bg-rose-50/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Tag
                          color={isCorrect ? "success" : "error"}
                          className="font-bold rounded-full px-2.5"
                        >
                          {isCorrect ? <CheckOutlined className="mr-1" /> : <CloseOutlined className="mr-1" />}
                          Câu {qNumber}
                        </Tag>
                        <span className="text-xs text-slate-400 font-mono">
                          {ans.questionType || "Trắc nghiệm"}
                        </span>
                      </div>
                      <Tag
                        color={isCorrect ? "green" : "volcano"}
                        className="font-semibold text-xs border-none"
                      >
                        {ans.score != null ? `${ans.score} / ${ans.maxScore} điểm` : isCorrect ? "Đúng" : "Sai"}
                      </Tag>
                    </div>

                    <div className="text-sm text-slate-800 font-medium mb-3 pl-1">
                      {prompt}
                    </div>

                    {options.length > 0 && (
                      <div className="space-y-1.5 pl-2 mb-2 text-xs">
                        {options.map((opt: any, optIdx: number) => {
                          const isStudentSelected =
                            opt.id === ans.studentAnswer ||
                            opt.key === ans.studentAnswer ||
                            opt.content === ans.studentAnswer;
                          const isAnswerCorrect =
                            opt.isCorrect ||
                            opt.id === ans.correctAnswer ||
                            opt.key === ans.correctAnswer;

                          let bgClass = "bg-white border-slate-200 text-slate-700";
                          if (isAnswerCorrect) {
                            bgClass = "bg-emerald-100/60 border-emerald-300 text-emerald-800 font-semibold";
                          } else if (isStudentSelected && !isCorrect) {
                            bgClass = "bg-rose-100/60 border-rose-300 text-rose-800 line-through";
                          }

                          return (
                            <div
                              key={opt.id || optIdx}
                              className={`p-2 rounded-xl border flex items-center justify-between gap-2 ${bgClass}`}
                            >
                              <span>{opt.content || opt.text || opt.title || `Lựa chọn ${optIdx + 1}`}</span>
                              <div className="flex items-center gap-1.5">
                                {isStudentSelected && (
                                  <Tag color={isCorrect ? "green" : "red"} className="text-[10px] m-0">
                                    Học sinh chọn
                                  </Tag>
                                )}
                                {isAnswerCorrect && (
                                  <Tag color="green" className="text-[10px] m-0">
                                    Đáp án đúng
                                  </Tag>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {options.length === 0 && (
                      <div className="bg-white/80 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1">
                        <div>
                          <span className="text-slate-500">Học sinh trả lời: </span>
                          <span className={`font-semibold ${isCorrect ? "text-emerald-600" : "text-rose-600"}`}>
                            {typeof ans.studentAnswer === "object"
                              ? JSON.stringify(ans.studentAnswer)
                              : String(ans.studentAnswer ?? "Chưa trả lời")}
                          </span>
                        </div>
                        {ans.correctAnswer && (
                          <div>
                            <span className="text-slate-500">Đáp án chuẩn: </span>
                            <span className="font-semibold text-emerald-700">
                              {typeof ans.correctAnswer === "object"
                                ? JSON.stringify(ans.correctAnswer)
                                : String(ans.correctAnswer)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <Card className="rounded-2xl border-slate-100 bg-slate-50/70 p-4">
              <div className="flex items-start gap-3">
                <CheckCircleOutlined className="text-emerald-500 text-lg mt-0.5" />
                <div className="text-xs text-slate-600 space-y-1.5">
                  <div className="font-bold text-slate-800 text-sm">
                    Lượt làm bài đã được nộp và chấm điểm thành công
                  </div>
                  <div>
                    Kết quả ghi nhận: <strong className="text-indigo-600">{activeData.score} / {activeData.maxScore} điểm</strong> ({parseFloat(activeData.percentage || "0").toFixed(1)}%).
                    {activeData.displayResult && (
                      <span className="ml-1 text-slate-500">
                        (Đúng {activeData.displayResult} câu).
                      </span>
                    )}
                  </div>
                  <div className="text-slate-500 pt-2 border-t border-slate-200 mt-2">
                    <span className="font-semibold text-slate-700">Lưu ý cho giáo viên:</span> Bảng danh sách câu hỏi chi tiết kèm phương án học sinh đã chọn (A/B/C/D) đang chờ Backend cập nhật endpoint <code className="font-mono bg-white px-1.5 py-0.5 rounded border text-indigo-700">GET /learning/teacher/exam-assignments/:id/attempts/:attemptId</code> theo đúng hướng dẫn trong tệp <strong className="text-slate-700">TEACHER_ASSIGNMENT_ANALYTICS_SPEC.md</strong>.
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      ) : (
        <div className="py-6">
          <Alert
            type="info"
            showIcon
            className="rounded-2xl mb-4"
            title="Thông tin lượt làm bài"
            description={
              <div>
                <p className="mb-2">
                  Học sinh <strong>{studentName || "này"}</strong> đã hoàn thành bài thi với mã lượt làm:{" "}
                  <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-xs">{attemptId}</code>.
                </p>
                {errorNotice && (
                  <p className="text-xs text-slate-500">
                    Ghi chú: Chi tiết từng câu hỏi đang chờ Backend triển khai endpoint{" "}
                    <code className="font-mono bg-indigo-50 text-indigo-600 px-1 rounded">
                      GET /learning/teacher/exam-assignments/:id/attempts/:attemptId
                    </code>{" "}
                    (đã bàn giao trong tài liệu{" "}
                    <span className="font-semibold">TEACHER_ASSIGNMENT_ANALYTICS_SPEC.md</span>).
                  </p>
                )}
              </div>
            }
          />
        </div>
      )}
    </Modal>
  );
}

// ==================== EXAM ANALYTICS MODAL ====================
function ExamAnalyticsModal({
  assignmentId,
  open,
  onClose,
}: {
  assignmentId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [assignmentDetail, setAssignmentDetail] = useState<any>(null);
  const [attemptsList, setAttemptsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Filtering for student table
  const [studentSearch, setStudentSearch] = useState("");
  const [studentStatusFilter, setStudentStatusFilter] = useState<string>("all");

  // Attempt detail modal
  const [detailAttemptId, setDetailAttemptId] = useState<string | null>(null);
  const [detailStudentName, setDetailStudentName] = useState<string>("");
  const [detailAttemptSummary, setDetailAttemptSummary] = useState<any>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  useEffect(() => {
    if (!open || !assignmentId) {
      setAnalyticsData(null);
      setAssignmentDetail(null);
      setAttemptsList([]);
      setActiveTab("overview");
      setStudentSearch("");
      setStudentStatusFilter("all");
      return;
    }

    setLoading(true);
    Promise.allSettled([
      teacherLearningService.examAssignments.analytics(assignmentId),
      teacherLearningService.examAssignments.get(assignmentId),
      teacherLearningService.examAssignments.attempts(assignmentId, { limit: 100 }),
    ])
      .then(([analyticsRes, detailRes, attemptsRes]) => {
        if (analyticsRes.status === "fulfilled") {
          setAnalyticsData(analyticsRes.value);
        }
        if (detailRes.status === "fulfilled") {
          setAssignmentDetail(detailRes.value);
        }
        if (attemptsRes.status === "fulfilled") {
          const list = (attemptsRes.value as any)?.data || attemptsRes.value || [];
          setAttemptsList(Array.isArray(list) ? list : []);
        }
      })
      .catch((err) => message.error(getErrorMessage(err, "Không thể tải analytics"), 5))
      .finally(() => setLoading(false));
  }, [open, assignmentId]);

  // Phan biet De thi vs De on tap dua vao examType (maxAttempts da bi xoa)
  const isExamType = useMemo(() => {
    if (assignmentDetail?.exams?.some((e: any) => e.exam?.examType === "exam")) return true;
    if (attemptsList?.some((a: any) => a.examType === "exam" || a.examTypeSnapshot === "exam")) return true;
    return false;
  }, [assignmentDetail, attemptsList]);

  // Aggregate student stats seamlessly (works with both new & current backend)
  const studentStats = useMemo(() => {
    // 1. If backend analytics already provides students array
    if (analyticsData?.students && Array.isArray(analyticsData.students) && analyticsData.students.length > 0) {
      return analyticsData.students;
    }

    // 2. Synthesize from assignmentDetail.students & attemptsList
    const assignedStudents = assignmentDetail?.students || [];
    const attemptsByStudent = new Map<string, any[]>();
    for (const att of attemptsList) {
      if (att.assignmentStudentId) {
        const arr = attemptsByStudent.get(att.assignmentStudentId) || [];
        arr.push(att);
        attemptsByStudent.set(att.assignmentStudentId, arr);
      }
      const sId = att.studentId || att.student?.id;
      if (sId) {
        const arr = attemptsByStudent.get(sId) || [];
        arr.push(att);
        attemptsByStudent.set(sId, arr);
      }
    }

    return assignedStudents.map((item: any) => {
      const student = item.student;
      const user = student?.user;
      const sId = item.studentId || student?.id;
      
      const attsByAssignId = attemptsByStudent.get(item.id) || [];
      const attsByStudentId = attemptsByStudent.get(sId) || [];
      const attsMap = new Map<string, any>();
      [...attsByAssignId, ...attsByStudentId].forEach((a) => attsMap.set(a.id, a));
      const atts = Array.from(attsMap.values());

      const submittedAtts = atts.filter((a: any) => a.status === "submitted");
      const latest = submittedAtts[0] || atts[0];
      // Tim attempt luot 1 (attemptNumber = 1) de lay diem thi chinh thuc
      const firstAttempt = submittedAtts.find((a: any) => a.attemptNumber === 1) || submittedAtts[submittedAtts.length - 1];

      const scores = submittedAtts.map((a: any) => Number(a.score)).filter((n) => !isNaN(n));
      const pcts = submittedAtts.map((a: any) => Number(a.percentage)).filter((n) => !isNaN(n));
      const bestScore = scores.length > 0 ? Math.max(...scores) : null;
      const bestPercentage = pcts.length > 0 ? Math.max(...pcts) : null;

      // Mastery Learning (100%): Ca De thi va De on tap deu chi hoan thanh khi dat 100%
      const isMastered = bestPercentage === 100 || item.status === "finished" || submittedAtts.some((a: any) => a.mastered === true || Number(a.percentage) >= 100);
      let computedStatus = "assigned";
      if (isMastered) {
        computedStatus = "finished";
      } else if (submittedAtts.length > 0) {
        computedStatus = "submitted"; // da nop nhung chua dat 100%, can lam lai
      } else if (atts.some((a: any) => a.status === "in_progress") || item.status === "in_progress") {
        computedStatus = "in_progress";
      }

      return {
        studentId: sId,
        assignmentStudentId: item.id,
        code: user?.code || student?.code || "—",
        fullName: user?.fullName || student?.fullName || "Học sinh",
        email: user?.email || student?.email || "—",
        status: computedStatus,
        rawAssignmentStatus: item.status,
        attemptsCount: atts.length,
        submittedCount: submittedAtts.length,
        isMastered,
        firstAttemptScore: firstAttempt?.score != null ? Number(firstAttempt.score) : null,
        firstAttemptMaxScore: firstAttempt?.maxScore != null ? Number(firstAttempt.maxScore) : null,
        firstAttemptPercentage: firstAttempt?.percentage != null ? Number(firstAttempt.percentage) : null,
        latestScore: latest?.score != null ? Number(latest.score) : null,
        maxScore: latest?.maxScore != null ? Number(latest.maxScore) : null,
        latestPercentage: latest?.percentage != null ? Number(latest.percentage) : null,
        bestScore,
        bestPercentage,
        submittedAt: latest?.submittedAt || latest?.createdAt || null,
        durationSeconds: latest?.durationSeconds || null,
        latestAttemptId: latest?.id || null,
        latestAttempt: latest || null,
      };
    });
  }, [analyticsData, assignmentDetail, attemptsList, isExamType]);

  // Counts for filtering & KPIs
  const totalAssigned = analyticsData?.assignedCount ?? studentStats.length;
  const totalFinished = studentStats.filter((s: any) => s.status === "finished").length;
  const totalSubmitted = studentStats.filter((s: any) => s.submittedCount > 0).length;
  const totalInProgress = studentStats.filter((s: any) => 
    s.status === "in_progress" || (s.submittedCount > 0 && s.status !== "finished")
  ).length;
  const totalNotStarted = studentStats.filter((s: any) => s.attemptsCount === 0 && s.status === "assigned").length;
  const completionRate = totalAssigned > 0 
    ? Math.round((totalFinished / totalAssigned) * 100) 
    : 0;

  // Filter student rows
  const filteredStudents = useMemo(() => {
    return studentStats.filter((s: any) => {
      if (studentStatusFilter !== "all") {
        if (studentStatusFilter === "finished") {
          if (s.status !== "finished") return false;
        }
        if (studentStatusFilter === "in_progress") {
          if (s.status === "finished" || s.attemptsCount === 0) return false;
        }
        if (studentStatusFilter === "not_started") {
          if (s.attemptsCount > 0 || s.status !== "assigned") return false;
        }
      }
      if (studentSearch.trim()) {
        const kw = studentSearch.toLowerCase();
        const nameMatch = (s.fullName || "").toLowerCase().includes(kw);
        const codeMatch = (s.code || "").toLowerCase().includes(kw);
        const emailMatch = (s.email || "").toLowerCase().includes(kw);
        if (!nameMatch && !codeMatch && !emailMatch) return false;
      }
      return true;
    });
  }, [studentStats, studentStatusFilter, studentSearch, isExamType]);

  // Question rows with human-readable titles (no UUID hex as title!)
  const questionRows = useMemo(() => {
    const list = analyticsData?.perQuestion || [];
    return list.map((item: any, idx: number) => {
      const orderIdx = item.orderIndex != null ? item.orderIndex : idx;
      let prompt = item.prompt;
      if (!prompt) {
        prompt = `Câu hỏi ${orderIdx + 1}`;
      }
      return {
        ...item,
        displayIndex: orderIdx + 1,
        displayPrompt: prompt,
      };
    });
  }, [analyticsData]);

  // Handlers
  const handleOpenAttemptDetail = (row: any) => {
    const attemptId = row.latestAttemptId;
    if (!attemptId) {
      message.info("Học sinh này chưa có lượt làm bài nào");
      return;
    }
    setDetailAttemptId(attemptId);
    setDetailStudentName(row.fullName);
    setDetailAttemptSummary(row.latestAttempt);
    setDetailModalOpen(true);
  };

  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        title={
          <div className="flex items-center gap-2 text-indigo-700">
            <BarChartOutlined className="text-xl" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base">Thống kê bài thi được giao</span>
                {isExamType ? (
                  <Tag color="purple" className="rounded-full text-[10px] font-semibold border-none px-2.5 m-0">
                    Đề kiểm tra (Cần đạt 100%)
                  </Tag>
                ) : (
                  <Tag color="blue" className="rounded-full text-[10px] font-semibold border-none px-2.5 m-0">
                    Đề ôn tập (Làm lại tới khi 100%)
                  </Tag>
                )}
              </div>
              {assignmentDetail?.title && (
                <div className="text-xs font-normal text-slate-500 mt-0.5">
                  Đợt giao: <span className="font-semibold text-slate-700">{assignmentDetail.title}</span>
                </div>
              )}
            </div>
          </div>
        }
        width={960}
        className="rounded-3xl overflow-hidden"
      >
        {loading ? (
          <div className="flex flex-col justify-center items-center py-20">
            <Spin size="large" />
            <span className="text-slate-400 text-sm mt-3">Đang phân tích dữ liệu bài thi...</span>
          </div>
        ) : (
          <div>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              className="mt-2"
              items={[
                // ========== TAB 1: OVERVIEW & QUESTIONS ==========
                {
                  key: "overview",
                  label: (
                    <span className="flex items-center gap-2 px-1 font-semibold">
                      <BarChartOutlined />
                      <span>Tổng quan & Câu hỏi</span>
                    </span>
                  ),
                  children: (
                    <div className="space-y-6 pt-2">
                      {/* KPI Cards Row 1 */}
                      <Row gutter={[16, 16]}>
                        <Col span={6}>
                          <Card className="rounded-2xl border-slate-100 bg-indigo-50/60 text-center shadow-sm">
                            <Statistic
                              title={<span className="text-indigo-800 text-xs font-semibold">Học sinh được giao</span>}
                              value={totalAssigned}
                              prefix={<TeamOutlined className="text-indigo-500" />}
                              valueStyle={{ color: "#4338ca", fontWeight: 700 }}
                            />
                          </Card>
                        </Col>
                        <Col span={6}>
                          <Card className="rounded-2xl border-slate-100 bg-emerald-50/60 text-center shadow-sm">
                            <Statistic
                              title={
                                <span className="text-emerald-800 text-xs font-semibold">
                                  Đã hoàn thành 100%
                                </span>
                              }
                              value={totalFinished}
                              prefix={<CheckCircleOutlined className="text-emerald-500" />}
                              valueStyle={{ color: "#059669", fontWeight: 700 }}
                            />
                          </Card>
                        </Col>
                        <Col span={6}>
                          <Card className="rounded-2xl border-slate-100 bg-amber-50/60 text-center shadow-sm">
                            <Statistic
                              title={
                                <span className="text-amber-800 text-xs font-semibold">
                                  Cần làm lại / Đang làm
                                </span>
                              }
                              value={totalInProgress}
                              prefix={<ClockCircleOutlined className="text-amber-500" />}
                              valueStyle={{ color: "#d97706", fontWeight: 700 }}
                            />
                          </Card>
                        </Col>
                        <Col span={6}>
                          <Card className="rounded-2xl border-slate-100 bg-purple-50/60 text-center shadow-sm">
                            <Statistic
                              title={<span className="text-purple-800 text-xs font-semibold">Tỷ lệ hoàn thành</span>}
                              value={`${completionRate}%`}
                              prefix={<TrophyOutlined className="text-purple-500" />}
                              valueStyle={{ color: "#7c3aed", fontWeight: 700 }}
                            />
                          </Card>
                        </Col>
                      </Row>

                      {/* Score Metrics Row 2 */}
                      <Row gutter={[16, 16]}>
                        <Col span={12}>
                          <Card className="rounded-2xl border-slate-100 shadow-sm bg-white p-2">
                            <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
                              Điểm trung bình
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-black text-slate-800">
                                {analyticsData?.averageScore != null ? analyticsData.averageScore.toFixed(2) : "—"}
                              </span>
                              <span className="text-sm font-semibold text-slate-400">
                                ({analyticsData?.averagePercentage != null ? analyticsData.averagePercentage.toFixed(1) : "—"}%)
                              </span>
                            </div>
                          </Card>
                        </Col>
                        <Col span={12}>
                          <Card className="rounded-2xl border-slate-100 shadow-sm bg-white p-2">
                            <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
                              Điểm cao nhất
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-black text-emerald-600">
                                {analyticsData?.bestScore != null ? analyticsData.bestScore.toFixed(2) : "—"}
                              </span>
                              <span className="text-sm font-semibold text-emerald-500">
                                ({analyticsData?.bestPercentage != null ? analyticsData.bestPercentage.toFixed(1) : "—"}%)
                              </span>
                            </div>
                          </Card>
                        </Col>
                      </Row>

                      {/* Question Breakdown Table */}
                      <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden" bodyStyle={{ padding: "16px" }}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-slate-700 font-bold text-sm flex items-center gap-2">
                            <span>Thống kê theo câu hỏi</span>
                            <Tag color="indigo" className="rounded-full text-[11px] font-semibold border-none">
                              {questionRows.length} câu
                            </Tag>
                          </div>
                          <span className="text-xs text-slate-400">
                            Tỷ lệ câu trả lời đúng của học sinh
                          </span>
                        </div>

                        {questionRows.length > 0 ? (
                          <Table
                            size="small"
                            pagination={false}
                            rowKey="questionId"
                            dataSource={questionRows}
                            className="rounded-xl overflow-hidden"
                            columns={[
                              {
                                title: "STT",
                                width: 90,
                                render: (_: any, r: any) => (
                                  <Tag color="blue" className="font-bold rounded-full px-2.5 m-0 text-xs">
                                    Câu {r.displayIndex}
                                  </Tag>
                                ),
                              },
                              {
                                title: "Nội dung câu hỏi",
                                dataIndex: "displayPrompt",
                                render: (prompt: string, r: any) => (
                                  <Tooltip title={<div className="text-xs max-w-sm">{prompt}<br/><span className="text-slate-400 font-mono text-[10px]">ID: {r.questionId}</span></div>}>
                                    <span className="text-slate-700 font-medium text-xs line-clamp-1 cursor-default">
                                      {prompt}
                                    </span>
                                  </Tooltip>
                                ),
                              },
                              {
                                title: "Đúng / Tổng",
                                width: 120,
                                align: "center" as const,
                                render: (_: any, r: any) => (
                                  <span className="font-bold text-slate-700 text-xs">
                                    {r.correct} / {r.total}
                                  </span>
                                ),
                              },
                              {
                                title: "Tỷ lệ đúng",
                                width: 220,
                                dataIndex: "correctnessRate",
                                render: (rate: number) => {
                                  const rounded = Math.round(rate || 0);
                                  const strokeColor = rounded >= 70 ? "#10b981" : rounded >= 40 ? "#f59e0b" : "#ef4444";
                                  return (
                                    <div className="flex items-center gap-2">
                                      <Progress
                                        percent={rounded}
                                        size="small"
                                        strokeColor={strokeColor}
                                        className="m-0 flex-1"
                                      />
                                    </div>
                                  );
                                },
                              },
                            ]}
                          />
                        ) : (
                          <div className="py-8 text-center text-slate-400 text-sm">
                            Chưa có câu hỏi nào được ghi nhận làm bài
                          </div>
                        )}
                      </Card>
                    </div>
                  ),
                },

                // ========== TAB 2: STUDENT BREAKDOWN ==========
                {
                  key: "students",
                  label: (
                    <span className="flex items-center gap-2 px-1 font-semibold">
                      <TeamOutlined />
                      <span>Danh sách học sinh & Kết quả ({studentStats.length})</span>
                    </span>
                  ),
                  children: (
                    <div className="space-y-4 pt-2">
                      {/* Search and Status Filters */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lọc:</span>
                          <Segmented
                            size="small"
                            value={studentStatusFilter}
                            onChange={(val: any) => setStudentStatusFilter(val)}
                            options={[
                              { label: `Tất cả (${studentStats.length})`, value: "all" },
                              {
                                label: `Đã hoàn thành 100% (${totalFinished})`,
                                value: "finished",
                              },
                              {
                                label: `Cần làm lại / Đang làm (${totalInProgress})`,
                                value: "in_progress",
                              },
                              { label: `Chưa làm (${totalNotStarted})`, value: "not_started" },
                            ]}
                          />
                        </div>

                        <Input
                          placeholder="Tìm học sinh theo tên, mã..."
                          prefix={<SearchOutlined className="text-slate-400" />}
                          size="small"
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          allowClear
                          className="w-full sm:w-64 rounded-xl"
                        />
                      </div>

                      {/* Student Results Table */}
                      <Table
                        size="small"
                        rowKey="studentId"
                        dataSource={filteredStudents}
                        pagination={{ pageSize: 8, showSizeChanger: false }}
                        className="rounded-2xl border border-slate-100 overflow-hidden shadow-sm"
                        columns={[
                          {
                            title: "Học sinh",
                            render: (_: any, r: any) => (
                              <div className="flex items-center gap-2.5 py-1">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                                  {(r.fullName || "H")[0].toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-800 text-xs">{r.fullName}</div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    {r.code && r.code !== "—" && (
                                      <Tag color="purple" className="text-[10px] px-1 py-0 m-0 rounded border-none font-mono">
                                        {r.code}
                                      </Tag>
                                    )}
                                    {r.email && r.email !== "—" && (
                                      <span className="text-[10px] text-slate-400">{r.email}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ),
                          },
                          {
                            title: "Trạng thái",
                            width: 220,
                            render: (_: any, r: any) => {
                              if (r.status === "finished" || r.bestPercentage === 100 || r.isMastered) {
                                return (
                                  <Tag color="success" className="rounded-full font-semibold text-xs border-none px-2.5">
                                    <CheckCircleOutlined className="mr-1" /> Đã hoàn thành (100%)
                                  </Tag>
                                );
                              }
                              if (r.submittedCount > 0) {
                                const scorePct = isExamType && r.firstAttemptPercentage != null
                                  ? Math.round(r.firstAttemptPercentage)
                                  : Math.round(r.latestPercentage || r.bestPercentage || 0);
                                return (
                                  <div className="flex flex-col gap-0.5">
                                    <Tag color="cyan" className="rounded-full font-semibold text-xs border-none px-2.5 w-fit">
                                      <CheckCircleOutlined className="mr-1" /> {isExamType ? `Đã nộp lượt 1 (${scorePct}%)` : `Đã nộp (${scorePct}%)`}
                                    </Tag>
                                    <span className="text-[10px] text-amber-600 font-medium pl-1">
                                      Cần làm lại câu sai tới 100%
                                    </span>
                                  </div>
                                );
                              }
                              if (r.status === "in_progress" || r.attemptsCount > 0) {
                                return (
                                  <Tag color="warning" className="rounded-full font-semibold text-xs border-none px-2.5">
                                    <ClockCircleOutlined className="mr-1" /> Đang làm bài
                                  </Tag>
                                );
                              }
                              return (
                                <Tag color="default" className="rounded-full font-medium text-xs border-none px-2.5 text-slate-400">
                                  Chưa bắt đầu
                                </Tag>
                              );
                            },
                          },
                          {
                            title: "Số lần làm",
                            width: 100,
                            align: "center" as const,
                            render: (_: any, r: any) => (
                              <span className="text-xs font-semibold text-slate-600">
                                {r.attemptsCount > 0 ? `${r.attemptsCount} lượt` : "—"}
                              </span>
                            ),
                          },
                          {
                            title: isExamType ? "Điểm thi (Lượt 1)" : "Điểm cao nhất",
                            width: 130,
                            render: (_: any, r: any) => {
                              const score = isExamType && r.firstAttemptScore != null ? r.firstAttemptScore : r.bestScore ?? r.latestScore;
                              const maxScore = isExamType && r.firstAttemptMaxScore != null ? r.firstAttemptMaxScore : r.maxScore;
                              const pct = isExamType && r.firstAttemptPercentage != null
                                ? Math.round(r.firstAttemptPercentage)
                                : r.bestPercentage != null ? Math.round(r.bestPercentage) : r.latestPercentage != null ? Math.round(r.latestPercentage) : null;

                              if (score == null) return <span className="text-slate-400 text-xs">—</span>;

                              return (
                                <div>
                                  <div className="font-bold text-slate-800 text-xs">
                                    {score} {maxScore != null ? `/ ${maxScore}` : ""}
                                  </div>
                                  {pct != null && (
                                    <div className="text-[10px] text-emerald-600 font-semibold">
                                      {pct}%
                                    </div>
                                  )}
                                </div>
                              );
                            },
                          },
                          {
                            title: "Thời gian nộp",
                            width: 150,
                            render: (_: any, r: any) => (
                              <span className="text-xs text-slate-500">
                                {formatDateTime(r.submittedAt)}
                              </span>
                            ),
                          },
                          {
                            title: "Thời lượng",
                            width: 110,
                            render: (_: any, r: any) => (
                              <span className="text-xs text-slate-600">
                                {formatDuration(r.durationSeconds)}
                              </span>
                            ),
                          },
                          {
                            title: "Thao tác",
                            width: 110,
                            align: "right" as const,
                            render: (_: any, r: any) => {
                              const hasAttempt = Boolean(r.latestAttemptId) || r.attemptsCount > 0;
                              return (
                                <Button
                                  type="link"
                                  size="small"
                                  icon={<EyeOutlined />}
                                  disabled={!hasAttempt}
                                  onClick={() => handleOpenAttemptDetail(r)}
                                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 p-0"
                                >
                                  Xem bài làm
                                </Button>
                              );
                            },
                          },
                        ]}
                      />
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Modal>

      {/* Nested Attempt Detail Modal */}
      <TeacherAttemptDetailModal
        assignmentId={assignmentId}
        attemptId={detailAttemptId}
        studentName={detailStudentName}
        attemptSummary={detailAttemptSummary}
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setDetailAttemptId(null);
          setDetailStudentName("");
          setDetailAttemptSummary(null);
        }}
      />
    </>
  );
}

// ==================== CURRICULUM ANALYTICS MODAL ====================
function CurriculumAnalyticsModal({
  assignmentId, open, onClose,
}: { assignmentId: string | null; open: boolean; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !assignmentId) {
      setData(null);
      setDetail(null);
      return;
    }
    setLoading(true);
    Promise.allSettled([
      teacherLearningService.curriculumAssignments.analytics(assignmentId),
      teacherLearningService.curriculumAssignments.get(assignmentId),
    ])
      .then(([analyticsRes, detailRes]) => {
        if (analyticsRes.status === "fulfilled") {
          setData(analyticsRes.value);
        }
        if (detailRes.status === "fulfilled") {
          setDetail(detailRes.value);
        }
      })
      .catch((err) => message.error(getErrorMessage(err, "Không thể tải analytics"), 5))
      .finally(() => setLoading(false));
  }, [open, assignmentId]);

  const studentsList = useMemo(() => {
    if (data?.students && Array.isArray(data.students) && data.students.length > 0) {
      return data.students;
    }
    const raw = detail?.students || [];
    return raw.map((s: any) => ({
      studentId: s.studentId || s.student?.id,
      code: s.student?.user?.code || s.student?.code || "—",
      fullName: s.student?.user?.fullName || s.student?.fullName || "Học sinh",
      email: s.student?.user?.email || s.student?.email || "—",
      status: s.status || "assigned",
      progressPercentage: parseFloat(s.progressPercentage || "0"),
      finishedExamsCount: s.finishedExamsCount || 0,
      totalRequiredExamsCount: s.totalRequiredExamsCount || 0,
      finishedAt: s.finishedAt,
    }));
  }, [data, detail]);

  return (
    <Modal open={open} onCancel={onClose} footer={null}
      title={<div className="flex items-center gap-2 text-purple-700"><BarChartOutlined /><span className="font-bold">Thống kê giáo trình học được giao</span></div>}
      width={780}
      className="rounded-3xl overflow-hidden"
    >
      {loading ? (
        <div className="flex justify-center py-10"><Spin size="large" /></div>
      ) : data ? (
        <div className="space-y-4">
          <Row gutter={[16, 16]}>
            <Col span={6}><Card className="rounded-2xl border-slate-100 bg-purple-50 text-center">
              <Statistic title="Học sinh được giao" value={data.assignedCount ?? studentsList.length}
                prefix={<TeamOutlined className="text-purple-500" />} valueStyle={{ color: "#7c3aed" }} />
            </Card></Col>
            <Col span={6}><Card className="rounded-2xl border-slate-100 bg-emerald-50 text-center">
              <Statistic title="Đã hoàn thành" value={data.completedCount ?? 0}
                prefix={<CheckCircleOutlined className="text-emerald-500" />} valueStyle={{ color: "#10b981" }} />
            </Card></Col>
            <Col span={6}><Card className="rounded-2xl border-slate-100 bg-amber-50 text-center">
              <Statistic title="Đang học" value={data.inProgressCount ?? 0}
                prefix={<ClockCircleOutlined className="text-amber-500" />} valueStyle={{ color: "#f59e0b" }} />
            </Card></Col>
            <Col span={6}><Card className="rounded-2xl border-slate-100 bg-slate-50 text-center">
              <Statistic title="Tiến độ TB" value={`${data.averageProgress?.toFixed(1) ?? "0"}%`}
                prefix={<BarChartOutlined className="text-slate-500" />} valueStyle={{ color: "#475569" }} />
            </Card></Col>
          </Row>
          <Progress percent={Math.round(data.averageProgress ?? 0)}
            strokeColor={{ "0%": "#7c3aed", "100%": "#10b981" }}
            format={(p) => `Tiến độ TB: ${p}%`} />

          {/* Student Progress Table */}
          {studentsList.length > 0 && (
            <Card className="rounded-2xl border-slate-100 shadow-sm" bodyStyle={{ padding: "16px" }}>
              <div className="text-slate-700 font-bold text-sm mb-3 flex items-center justify-between">
                <span>Tiến độ từng học sinh</span>
                <span className="text-xs text-slate-400 font-normal">Tổng {studentsList.length} học sinh</span>
              </div>
              <Table
                size="small"
                pagination={{ pageSize: 5 }}
                rowKey="studentId"
                dataSource={studentsList}
                columns={[
                  {
                    title: "Học sinh",
                    render: (_: any, r: any) => (
                      <div>
                        <div className="font-bold text-slate-800 text-xs">{r.fullName}</div>
                        <div className="text-[10px] text-slate-400">{r.code} {r.email && `• ${r.email}`}</div>
                      </div>
                    ),
                  },
                  {
                    title: "Trạng thái",
                    width: 130,
                    render: (_: any, r: any) => {
                      if (r.status === "finished" || r.progressPercentage >= 100) {
                        return <Tag color="success" className="rounded-full text-xs font-semibold">Hoàn thành</Tag>;
                      }
                      if (r.status === "in_progress" || r.progressPercentage > 0) {
                        return <Tag color="warning" className="rounded-full text-xs font-semibold">Đang học</Tag>;
                      }
                      return <Tag color="default" className="rounded-full text-xs text-slate-400">Chưa bắt đầu</Tag>;
                    },
                  },
                  {
                    title: "Tiến độ",
                    width: 180,
                    render: (_: any, r: any) => (
                      <Progress percent={Math.round(r.progressPercentage || 0)} size="small"
                        strokeColor={{ "0%": "#7c3aed", "100%": "#10b981" }} />
                    ),
                  },
                  {
                    title: "Số bài thi",
                    width: 110,
                    align: "center" as const,
                    render: (_: any, r: any) => (
                      <span className="text-xs font-semibold text-slate-600">
                        {r.finishedExamsCount} {r.totalRequiredExamsCount > 0 ? `/ ${r.totalRequiredExamsCount}` : ""}
                      </span>
                    ),
                  },
                ]}
              />
            </Card>
          )}
        </div>
      ) : <Empty description="Chưa có dữ liệu thống kê" />}
    </Modal>
  );
}

// ==================== MAIN COMPONENT ====================
export default function TeacherAssignments() {
  const { user, refreshProfile } = useAuth();
  const userRoleCode = typeof user?.role === "object" ? (user?.role as any)?.code : user?.role;
  const isTeacher = userRoleCode === "teacher";
  const [activeTab, setActiveTab] = useState("class-curriculum");

  // ---- Data ----
  const [centers, setCenters] = useState<Center[]>([]);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [allClasses, setAllClasses] = useState<ClassOption[]>([]);
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [curriculums, setCurriculums] = useState<CurriculumOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [allStudents, setAllStudents] = useState<StudentOption[]>([]);

  const [classCurriculums, setClassCurriculums] = useState<ClassCurriculum[]>([]);
  const [examAssignments, setExamAssignments] = useState<any[]>([]);
  const [curriculumAssignments, setCurriculumAssignments] = useState<any[]>([]);

  // ---- Filtering & Scopes ----
  const [selectedCenterId, setSelectedCenterId] = useState<string>("all");
  const [assignmentScope, setAssignmentScope] = useState<"my" | "center" | "all">(isTeacher ? "my" : "center");
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [centerInitialized, setCenterInitialized] = useState(false);

  // ---- Loading ----
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ---- Modals ----
  const [classCurriculumFormOpen, setClassCurriculumFormOpen] = useState(false);
  const [examFormOpen, setExamFormOpen] = useState(false);
  const [curriculumFormOpen, setCurriculumFormOpen] = useState(false);
  const [examAnalyticsId, setExamAnalyticsId] = useState<string | null>(null);
  const [curriculumAnalyticsId, setCurriculumAnalyticsId] = useState<string | null>(null);

  // ---- Forms ----
  const [classCurriculumForm] = Form.useForm();
  const [examForm] = Form.useForm();
  const [curriculumForm] = Form.useForm();

  // ---- Selected class (for filtering students and exams/curriculums) ----
  const [selectedClassForExam, setSelectedClassForExam] = useState<string | undefined>(undefined);
  const [selectedClassForCurriculum, setSelectedClassForCurriculum] = useState<string | undefined>(undefined);
  const [selectedClassForClassCurriculum, setSelectedClassForClassCurriculum] = useState<string | undefined>(undefined);

  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);
  const [examVersionsMap, setExamVersionsMap] = useState<Record<string, any[]>>({});

  const handleExamSelectionChange = async (ids: string[]) => {
    setSelectedExamIds(ids);
    const newVersionsMap = { ...examVersionsMap };
    for (const id of ids) {
      if (!newVersionsMap[id]) {
        try {
          const versions = await learningCmsService.exams.listVersions(id);
          newVersionsMap[id] = versions || [];
        } catch (err) {
          console.error("Failed to fetch versions for exam " + id, err);
        }
      }
    }
    setExamVersionsMap(newVersionsMap);
  };

  // ==================== USER CENTERS & SPECIALIZATIONS ====================
  const teacherClassIds = useMemo(() => {
    return (user?.teacherProfile?.classes?.map((c: any) => c.id || c.classId) ?? []).filter(Boolean);
  }, [user]);

  const userCenters = useMemo(() => {
    const set = new Set<string>();
    if (user?.centerId) set.add(user.centerId);
    if (user?.teacherProfile?.centerId) set.add(user.teacherProfile.centerId);
    (user?.teacherProfile?.classes ?? []).forEach((c: any) => {
      const cid = c.centerId || c.center?.id || c.class?.centerId || c.class?.center?.id;
      if (cid) set.add(cid);
    });
    // Match with allClasses as well
    allClasses.filter((c) => teacherClassIds.includes(c.id)).forEach((c) => {
      if (c.centerId) set.add(c.centerId);
    });
    return Array.from(set);
  }, [user, allClasses, teacherClassIds]);

  const teacherSpecializationIds = useMemo(() => {
    const set = new Set<string>();
    (user?.teacherProfile?.specializationIds ?? []).forEach((id: string) => set.add(id));
    (user?.teacherProfile?.specializations ?? []).forEach((s: any) => set.add(s.id));
    (allClasses ?? []).forEach((c: any) => {
      if (teacherClassIds.includes(c.id) && c.specializationId) {
        set.add(c.specializationId);
      }
    });
    return Array.from(set);
  }, [user, allClasses, teacherClassIds]);

  // ==================== LOAD DATA ====================
  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const results = await Promise.allSettled([
        learningCmsService.exams.list({ status: "published", limit: 100 }),
        learningCmsService.curriculums.list({ status: "published", limit: 100 }),
        academicService.classes.list({ limit: 100, isActive: true }),
        userService.list({ roleCode: "student" }),
        teacherLearningService.classCurriculums.list({ limit: 100 }),
        teacherLearningService.examAssignments.list({ limit: 100 }),
        teacherLearningService.curriculumAssignments.list({ limit: 100 }),
        academicService.centers.list({ limit: 100 }),
        academicService.specializations.list({ limit: 100 }),
      ]);

      const get = (i: number, name: string) => {
        const res = results[i];
        if (res.status === "rejected") {
          if (name === "classes") {
            return user?.teacherProfile?.classes ?? [];
          }
          if (name === "students" || name === "centers" || name === "specializations") {
            return [];
          }
          return { data: [] };
        }
        const apiData = res.value;
        return apiData;
      };

      setExams(get(0, "exams")?.data ?? []);
      setCurriculums(get(1, "curriculums")?.data ?? []);
      const rawClasses = get(2, "classes") ?? [];
      setAllClasses(rawClasses);
      setClasses(rawClasses);
      setAllStudents(get(3, "students") ?? []);
      setClassCurriculums(get(4, "classCurriculums")?.data ?? []);
      const rawExams = get(5, "examAssignments")?.data ?? [];
      setExamAssignments(rawExams);

      // Asynchronously fetch assignment details to load recipient student profiles & exams
      Promise.all(
        rawExams.map((item: any) =>
          teacherLearningService.examAssignments.get(item.id)
            .catch(() => item)
        )
      ).then((detailed) => {
        setExamAssignments(detailed);
      });

      setCurriculumAssignments(get(6, "curriculumAssignments")?.data ?? []);
      const rawCenters = (get(7, "centers") ?? []).filter((c: any) => c.isActive !== false);
      setCenters(rawCenters);
      setSpecializations(get(8, "specializations") ?? []);
    } catch (err: any) {
      message.error(getErrorMessage(err, "Tải dữ liệu thất bại"), 5);
    } finally {
      setLoading(false);
    }
  };

  // Auto initialize selectedCenterId based on user context
  useEffect(() => {
    if (!centerInitialized && centers.length > 0) {
      if (userCenters.length > 0) {
        setSelectedCenterId(userCenters[0]);
      } else if (user?.centerId) {
        setSelectedCenterId(user.centerId);
      } else if (!isTeacher && centers.length > 0) {
        setSelectedCenterId(centers[0].id);
      }
      setCenterInitialized(true);
    }
  }, [centers, userCenters, user?.centerId, centerInitialized, isTeacher]);

  // ==================== HELPER RESOLVERS ====================
  const getCenterName = (centerId?: string) => {
    if (!centerId) return undefined;
    return centers.find((c) => c.id === centerId)?.name;
  };

  const getSpecializationName = (specId?: string) => {
    if (!specId) return undefined;
    return specializations.find((s) => s.id === specId)?.name;
  };

  const getClassSpecializationId = (classId?: string) => {
    if (!classId) return undefined;
    const cls = allClasses.find((c) => c.id === classId);
    return cls?.specializationId || (cls as any)?.specialization?.id;
  };

  const getRecordCenterId = (record: any) => {
    if (record.class?.centerId) return record.class.centerId;
    if (record.class?.center?.id) return record.class.center.id;
    if (record.classId) {
      const cls = allClasses.find((c) => c.id === record.classId);
      if (cls?.centerId) return cls.centerId;
    }
    if (record.students?.length || record.studentIds?.length) {
      const targetStudentIds =
        record.students?.map((s: any) => s.studentId || s.student?.id || s.id) || record.studentIds || [];
      const matchedStudent = allStudents.find(
        (s) => targetStudentIds.includes(s.id) || targetStudentIds.includes(s.studentProfile?.id)
      );
      if (matchedStudent) {
        const studentClasses = matchedStudent.studentProfile?.classes ?? [];
        for (const sc of studentClasses) {
          const cid = (sc as any).centerId || (sc as any).center?.id || (sc as any).class?.centerId;
          if (cid) return cid;
          const matchedCls = allClasses.find((c) => c.id === (sc.id || (sc as any).classId));
          if (matchedCls?.centerId) return matchedCls.centerId;
        }
      }
    }
    if (
      record.teacherId &&
      (record.teacherId === user?.teacherProfile?.id || record.teacherId === user?.id)
    ) {
      return userCenters[0] || user?.centerId;
    }
    return undefined;
  };

  const isMyRecord = (record: any) => {
    if (!isTeacher) return true;
    if (
      record.teacherId &&
      (record.teacherId === user?.teacherProfile?.id || record.teacherId === user?.id)
    ) {
      return true;
    }
    if (record.classId && teacherClassIds.includes(record.classId)) {
      return true;
    }
    if (record.students?.length || record.studentIds?.length) {
      const targetStudentIds =
        record.students?.map((s: any) => s.studentId || s.student?.id || s.id) || record.studentIds || [];
      const hasMyStudent = allStudents.some((s) => {
        if (!targetStudentIds.includes(s.id) && !targetStudentIds.includes(s.studentProfile?.id)) return false;
        const studentClassIds = [
          ...(s.studentProfile?.classIds ?? []),
          ...(s.studentProfile?.classes?.map((c: any) => c.id || c.classId) ?? []),
        ];
        return studentClassIds.some((cid) => teacherClassIds.includes(cid));
      });
      if (hasMyStudent) return true;
    }
    return false;
  };

  // ==================== FILTERED LISTS ====================
  const filteredClassCurriculums = useMemo(() => {
    return classCurriculums.filter((item) => {
      const itemCenterId = getRecordCenterId(item);

      // Center Filter
      if (selectedCenterId !== "all") {
        if (itemCenterId && itemCenterId !== selectedCenterId) return false;
        if (!itemCenterId && item.classId) {
          const cls = allClasses.find((c) => c.id === item.classId);
          if (cls?.centerId && cls.centerId !== selectedCenterId) return false;
        }
      }

      // Scope Filter
      if (assignmentScope === "my" && isTeacher) {
        if (!teacherClassIds.includes(item.classId)) return false;
      }

      // Search Keyword
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase();
        const curTitle = (item.curriculum?.title || "").toLowerCase();
        const curCode = (item.curriculum?.code || "").toLowerCase();
        const clsName = (item.class?.name || allClasses.find((c) => c.id === item.classId)?.name || "").toLowerCase();
        const centerName = (getCenterName(itemCenterId) || "").toLowerCase();
        if (!curTitle.includes(kw) && !curCode.includes(kw) && !clsName.includes(kw) && !centerName.includes(kw)) {
          return false;
        }
      }

      return true;
    });
  }, [classCurriculums, selectedCenterId, assignmentScope, isTeacher, teacherClassIds, searchKeyword, allClasses, centers]);

  const filteredExamAssignments = useMemo(() => {
    return examAssignments.filter((record) => {
      const itemCenterId = getRecordCenterId(record);

      // Center Filter
      if (selectedCenterId !== "all") {
        if (itemCenterId && itemCenterId !== selectedCenterId) return false;
        if (!itemCenterId && record.classId) {
          const cls = allClasses.find((c) => c.id === record.classId);
          if (cls?.centerId && cls.centerId !== selectedCenterId) return false;
        }
      }

      // Scope Filter
      if (assignmentScope === "my" && isTeacher) {
        if (!isMyRecord(record)) return false;
      }

      // Search Keyword
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase();
        const title = (record.title || "").toLowerCase();
        const examNames = (record.exams || []).map((e: any) => `${e.exam?.title || ""} ${e.exam?.code || ""}`).join(" ").toLowerCase();
        const clsName = (record.class?.name || allClasses.find((c) => c.id === record.classId)?.name || "").toLowerCase();
        const centerName = (getCenterName(itemCenterId) || "").toLowerCase();
        const studentNames = (record.students || []).map((s: any) => s.student?.user?.fullName || s.student?.fullName || "").join(" ").toLowerCase();
        if (!title.includes(kw) && !examNames.includes(kw) && !clsName.includes(kw) && !centerName.includes(kw) && !studentNames.includes(kw)) {
          return false;
        }
      }

      return true;
    });
  }, [examAssignments, selectedCenterId, assignmentScope, isTeacher, searchKeyword, allClasses, centers, allStudents, teacherClassIds]);

  const filteredCurriculumAssignments = useMemo(() => {
    return curriculumAssignments.filter((record) => {
      const itemCenterId = getRecordCenterId(record);

      // Center Filter
      if (selectedCenterId !== "all") {
        if (itemCenterId && itemCenterId !== selectedCenterId) return false;
        if (!itemCenterId && record.classId) {
          const cls = allClasses.find((c) => c.id === record.classId);
          if (cls?.centerId && cls.centerId !== selectedCenterId) return false;
        }
      }

      // Scope Filter
      if (assignmentScope === "my" && isTeacher) {
        if (!isMyRecord(record)) return false;
      }

      // Search Keyword
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase();
        const title = (record.title || record.curriculum?.title || "").toLowerCase();
        const curCode = (record.curriculum?.code || "").toLowerCase();
        const clsName = (record.class?.name || allClasses.find((c) => c.id === record.classId)?.name || "").toLowerCase();
        const centerName = (getCenterName(itemCenterId) || "").toLowerCase();
        const studentNames = (record.students || []).map((s: any) => s.student?.user?.fullName || s.student?.fullName || "").join(" ").toLowerCase();
        if (!title.includes(kw) && !curCode.includes(kw) && !clsName.includes(kw) && !centerName.includes(kw) && !studentNames.includes(kw)) {
          return false;
        }
      }

      return true;
    });
  }, [curriculumAssignments, selectedCenterId, assignmentScope, isTeacher, searchKeyword, allClasses, centers, allStudents, teacherClassIds]);

  // ==================== MODAL OPTIONS ====================
  const teacherAssignedClasses = useMemo(() => {
    if (!isTeacher) return [];
    const authClasses = user?.teacher?.classes || [];
    if (authClasses.length > 0) {
      return authClasses
        .filter((tc: any) => tc.isActive !== false && tc.class && tc.class.isActive !== false)
        .map((tc: any) => ({
          id: tc.classId,
          name: tc.class.name,
          centerId: tc.class.centerId,
          specializationId: tc.class.specializationId,
          center: tc.class.center,
          specialization: tc.class.specialization,
          specializationName: tc.class.specialization?.name,
        }));
    }
    // Fallback if auth profile classes is not yet populated
    return (user?.teacherProfile?.classes || []).map((c: any) => {
      const spec = specializations.find((s) => s.id === c.specializationId);
      return {
        ...c,
        specializationName: spec?.name || c.specialization?.name,
      };
    });
  }, [isTeacher, user, specializations]);

  const modalClasses = useMemo(() => {
    let list = allClasses;
    if (selectedCenterId !== "all") {
      list = list.filter((c) => c.centerId === selectedCenterId);
    } else if (isTeacher && userCenters.length > 0) {
      list = list.filter((c) => c.centerId && userCenters.includes(c.centerId));
    }
    return list;
  }, [allClasses, selectedCenterId, isTeacher, userCenters]);

  const examModalClasses = useMemo(() => {
    if (isTeacher) {
      return teacherAssignedClasses;
    }
    return modalClasses;
  }, [isTeacher, teacherAssignedClasses, modalClasses]);

  const modalExams = useMemo(() => {
    if (selectedClassForExam) {
      const classSpecId = isTeacher
        ? teacherAssignedClasses.find((c: any) => c.id === selectedClassForExam)?.specializationId || getClassSpecializationId(selectedClassForExam)
        : getClassSpecializationId(selectedClassForExam);
      if (classSpecId) {
        return exams.filter((e) => e.specializationId === classSpecId);
      }
    }
    if (isTeacher && teacherSpecializationIds.length > 0) {
      return exams.filter((e) => e.specializationId && teacherSpecializationIds.includes(e.specializationId));
    }
    return exams;
  }, [exams, selectedClassForExam, allClasses, isTeacher, teacherSpecializationIds, teacherAssignedClasses]);

  const modalClassCurriculums = useMemo(() => {
    if (selectedClassForClassCurriculum) {
      const classSpecId = getClassSpecializationId(selectedClassForClassCurriculum);
      if (classSpecId) {
        return curriculums.filter((c) => c.specializationId === classSpecId);
      }
    }
    if (isTeacher && teacherSpecializationIds.length > 0) {
      return curriculums.filter((c) => c.specializationId && teacherSpecializationIds.includes(c.specializationId));
    }
    return curriculums;
  }, [curriculums, selectedClassForClassCurriculum, allClasses, isTeacher, teacherSpecializationIds]);

  const modalDirectCurriculums = useMemo(() => {
    if (selectedClassForCurriculum) {
      const classSpecId = getClassSpecializationId(selectedClassForCurriculum);
      if (classSpecId) {
        return curriculums.filter((c) => c.specializationId === classSpecId);
      }
    }
    if (isTeacher && teacherSpecializationIds.length > 0) {
      return curriculums.filter((c) => c.specializationId && teacherSpecializationIds.includes(c.specializationId));
    }
    return curriculums;
  }, [curriculums, selectedClassForCurriculum, allClasses, isTeacher, teacherSpecializationIds]);

  const handleClassChangeForExam = (classId?: string) => {
    setSelectedClassForExam(classId);
    examForm.setFieldValue("studentIds", []);
    if (classId) {
      const classSpecId = isTeacher
        ? teacherAssignedClasses.find((c: any) => c.id === classId)?.specializationId || getClassSpecializationId(classId)
        : getClassSpecializationId(classId);
      if (classSpecId) {
        const currentExamIds: string[] = examForm.getFieldValue("examIds") || [];
        const validExamIds = currentExamIds.filter((id) => {
          const ex = exams.find((e) => e.id === id);
          return ex && ex.specializationId === classSpecId;
        });
        if (validExamIds.length < currentExamIds.length) {
          examForm.setFieldValue("examIds", validExamIds);
          setSelectedExamIds(validExamIds);
        }
      }
    }
  };

  const handleClassChangeForClassCurriculum = (classId?: string) => {
    setSelectedClassForClassCurriculum(classId);
    if (classId) {
      const classSpecId = getClassSpecializationId(classId);
      if (classSpecId) {
        const currentCurriculumIds: string[] = classCurriculumForm.getFieldValue("curriculumIds") || [];
        const validCurriculumIds = currentCurriculumIds.filter((id) => {
          const curr = curriculums.find((c) => c.id === id);
          return curr && curr.specializationId === classSpecId;
        });
        if (validCurriculumIds.length < currentCurriculumIds.length) {
          classCurriculumForm.setFieldValue("curriculumIds", validCurriculumIds);
          message.info("Đã tự động loại bỏ các giáo trình không cùng môn học với lớp vừa chọn");
        }
      }
    }
  };

  const handleClassChangeForCurriculum = (classId?: string) => {
    setSelectedClassForCurriculum(classId);
    curriculumForm.setFieldValue("studentIds", []);
    if (classId) {
      const classSpecId = getClassSpecializationId(classId);
      if (classSpecId) {
        const currentCurriculumId = curriculumForm.getFieldValue("curriculumId");
        if (currentCurriculumId) {
          const curr = curriculums.find((c) => c.id === currentCurriculumId);
          if (curr && curr.specializationId && curr.specializationId !== classSpecId) {
            curriculumForm.setFieldValue("curriculumId", undefined);
            message.info("Đã tự động bỏ chọn giáo trình không cùng môn học với lớp vừa chọn");
          }
        }
      }
    }
  };

  const handleResetFilters = () => {
    const defaultCenter = userCenters.length > 0 ? userCenters[0] : (user?.centerId || "all");
    setSelectedCenterId(defaultCenter);
    setAssignmentScope(isTeacher ? "my" : "center");
    setSearchKeyword("");
  };

  /**
   * Lọc học sinh theo lớp và trung tâm.
   */
  const getStudentsForClass = (classId?: string) => {
    let list = allStudents;
    const activeCenterId = selectedCenterId !== "all" ? selectedCenterId : (userCenters[0] || undefined);

    if (activeCenterId) {
      list = allStudents.filter((s) => {
        const studentClasses = s.studentProfile?.classes ?? [];
        return studentClasses.some((sc: any) => {
          const matchedClass = allClasses.find((c) => c.id === (sc.id || sc.classId));
          return matchedClass && matchedClass.centerId === activeCenterId;
        });
      });
    }

    if (!classId) return list;
    return list.filter((s) => {
      const classIds = (s.studentProfile as any)?.classIds ?? [];
      if (classIds.includes(classId)) return true;
      const classesArr = s.studentProfile?.classes ?? [];
      return classesArr.some((c: any) => c.id === classId || c.classId === classId);
    });
  };

  // ==================== CLASS-CURRICULUM HANDLERS ====================
  const handleCreateClassCurriculum = async (values: any) => {
    try {
      setSubmitting(true);
      const curriculumIds = Array.isArray(values.curriculumIds)
        ? values.curriculumIds
        : [values.curriculumIds].filter(Boolean);

      if (curriculumIds.length === 0) {
        throw new Error("Vui lòng chọn ít nhất một giáo trình!");
      }

      const results = await Promise.allSettled(
        curriculumIds.map((cId) =>
          teacherLearningService.classCurriculums.create({
            classId: values.classId,
            curriculumId: cId,
          })
        )
      );

      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length === 0) {
        message.success("Đã gắn giáo trình vào lớp thành công!");
      } else if (failed.length < curriculumIds.length) {
        const errorMessages = failed
          .map((f: any) => f.reason?.response?.data?.message || f.reason?.message || "Lỗi")
          .join(", ");
        message.warning(`Gắn thành công một số giáo trình. Lỗi: ${errorMessages}`);
      } else {
        const errorMessages = failed
          .map((f: any) => f.reason?.response?.data?.message || f.reason?.message || "Lỗi")
          .join(", ");
        throw new Error(errorMessages);
      }

      classCurriculumForm.resetFields();
      setSelectedClassForClassCurriculum(undefined);
      setClassCurriculumFormOpen(false);
      loadAll();
    } catch (err: any) {
      const msg = getErrorMessage(err, "Gắn giáo trình vào lớp thất bại");
      message.error(msg, 5);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveClassCurriculum = (id: string) => {
    Modal.confirm({
      title: "Gỡ giáo trình khỏi lớp",
      content: "Học sinh trong lớp sẽ không còn thấy giáo trình này (trừ khi đã được giao trực tiếp).",
      okText: "Gỡ",
      okButtonProps: { danger: true },
      cancelText: "Đóng",
      onOk: async () => {
        try {
          await teacherLearningService.classCurriculums.remove(id);
          message.success("Đã gỡ giáo trình khỏi lớp");
          loadAll();
        } catch (err: any) {
          message.error(getErrorMessage(err, "Gỡ thất bại"), 5);
        }
      },
    });
  };

  // ==================== EXAM ASSIGNMENT HANDLERS ====================
  const handleCreateExamAssignment = async (values: any) => {
    const examIds: string[] = Array.isArray(values.examIds) ? values.examIds : [values.examIds];
    if (!examIds.length) { message.warning("Vui lòng chọn ít nhất 1 bài thi!"); return; }
    const rawStudentIds = Array.isArray(values.studentIds) ? values.studentIds.filter(Boolean) : [];
    if (!values.classId && !rawStudentIds.length) {
      message.warning("Vui lòng chọn lớp học hoặc ít nhất 1 học sinh!");
      return;
    }
    try {
      setSubmitting(true);
      const examVersions = values.examVersions || {};
      const examsPayload = examIds.map((examId) => ({
        examId,
        examVersionId: examVersions[examId] || undefined,
      }));

      // NOTE: maxAttempts da bi xoa (migration 1780000030000).
      // Backend tu dong biet day la de kiem tra hay on tap qua examType.
      await teacherLearningService.examAssignments.create({
        exams: examsPayload,
        classId: values.classId || undefined,
        studentIds: rawStudentIds.length ? Array.from(new Set(rawStudentIds)) : undefined,
        title: values.title || undefined,
        instructions: values.instructions || undefined,
      });
      message.success(`Giao ${examIds.length > 1 ? `${examIds.length} bài thi` : "bài thi"} thành công!`);
      examForm.resetFields();
      setSelectedExamIds([]);
      setExamVersionsMap({});
      setSelectedClassForExam(undefined);
      setExamFormOpen(false);
      loadAll();
    } catch (err: any) {
      const msg = getErrorMessage(err, "Giao bài thi thất bại");
      message.error(msg, 5);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelExamAssignment = (id: string) => {
    Modal.confirm({
      title: "Huỷ giao bài thi",
      content: "Học sinh sẽ không thể làm bài mới từ assignment này.",
      okText: "Huỷ assignment",
      okButtonProps: { danger: true },
      cancelText: "Đóng",
      onOk: async () => {
        try {
          await teacherLearningService.examAssignments.cancel(id);
          message.success("Đã huỷ assignment");
          loadAll();
        } catch (err: any) {
          message.error(getErrorMessage(err, "Huỷ thất bại"), 5);
        }
      },
    });
  };

  // ==================== CURRICULUM ASSIGNMENT HANDLERS ====================
  const handleCreateCurriculumAssignment = async (values: any) => {
    const rawStudentIds = Array.isArray(values.studentIds) ? values.studentIds.filter(Boolean) : [];
    if (!rawStudentIds.length) {
      message.warning("Vui lòng chọn ít nhất 1 học sinh!"); return;
    }
    try {
      setSubmitting(true);
      await teacherLearningService.curriculumAssignments.create({
        curriculumId: values.curriculumId,
        studentIds: Array.from(new Set(rawStudentIds)),
        classId: values.classId || undefined,
        title: values.title || undefined,
        instructions: values.instructions || undefined,
      });
      message.success("Giao giáo trình cho học sinh thành công!");
      curriculumForm.resetFields();
      setSelectedClassForCurriculum(undefined);
      setCurriculumFormOpen(false);
      loadAll();
    } catch (err: any) {
      const msg = getErrorMessage(err, "Giao giáo trình thất bại");
      message.error(msg, 5);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelCurriculumAssignment = (id: string) => {
    Modal.confirm({
      title: "Huỷ giao giáo trình học",
      content: "Học sinh sẽ không còn truy cập giáo trình này.",
      okText: "Huỷ assignment",
      okButtonProps: { danger: true },
      cancelText: "Đóng",
      onOk: async () => {
        try {
          await teacherLearningService.curriculumAssignments.cancel(id);
          message.success("Đã huỷ assignment");
          loadAll();
        } catch (err: any) {
          message.error(getErrorMessage(err, "Huỷ thất bại"), 5);
        }
      },
    });
  };

  // ==================== TABLE COLUMNS ====================
  const classCurriculumColumns = [
    {
      title: "Giáo trình",
      render: (_: any, r: ClassCurriculum) => (
        <div>
          <div className="font-semibold text-slate-800">{r.curriculum?.title || r.curriculumId}</div>
          {r.curriculum?.code && <div className="text-xs text-slate-400 font-mono">{r.curriculum.code}</div>}
        </div>
      ),
    },
    {
      title: "Trung tâm",
      render: (_: any, r: ClassCurriculum) => {
        const centerId = getRecordCenterId(r);
        const centerName = getCenterName(centerId);
        return centerName ? (
          <Tag color="cyan" className="rounded-full px-2.5 py-0.5 border-none font-medium">
            <BankOutlined className="mr-1" />
            {centerName}
          </Tag>
        ) : (
          <span className="text-slate-400 text-xs">—</span>
        );
      },
    },
    {
      title: "Lớp học",
      render: (_: any, r: ClassCurriculum) => (
        <Tag color="blue" className="rounded-full">{r.class?.name || r.classId}</Tag>
      ),
    },

    {
      title: "Ngày tạo",
      render: (_: any, r: ClassCurriculum) => r.createdAt
        ? <span className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString("vi-VN")}</span>
        : "—",
    },
    {
      title: "Thao tác", align: "right" as const,
      render: (_: any, r: ClassCurriculum) => (
        <Can perform={["classes.manage", "learning.manage", "learning.assign"]} mode="any">
          <Tooltip title="Gỡ giáo trình khỏi lớp">
            <Button type="text" size="small" danger
              icon={<DeleteOutlined className="text-slate-400 hover:text-rose-600" />}
              onClick={() => handleRemoveClassCurriculum(r.id)}
            />
          </Tooltip>
        </Can>
      ),
    },
  ];

  const examAssignmentColumns = [
    {
      title: "Bài thi",
      render: (_: any, record: any) => {
        const examItems = record.exams || [];
        const titleStr = record.title;
        return (
          <div>
            {titleStr && <div className="font-semibold text-slate-800 mb-1">{titleStr}</div>}
            <div className="text-slate-600 text-sm space-y-1">
              {examItems.map((item: any, idx: number) => (
                <div key={item.examId || idx} className={titleStr ? "pl-2 border-l-2 border-slate-200" : ""}>
                  <div className={titleStr ? "text-xs font-normal" : "font-semibold text-slate-800"}>
                    {item.exam?.title || item.exam?.code || item.examId}
                  </div>
                  {item.exam?.code && <div className="text-[10px] text-slate-400 font-mono">{item.exam.code}</div>}
                </div>
              ))}
              {examItems.length === 0 && !titleStr && <span className="text-slate-400">—</span>}
            </div>
          </div>
        );
      }
    },
    {
      title: "Trung tâm",
      render: (_: any, record: any) => {
        const centerId = getRecordCenterId(record);
        const centerName = getCenterName(centerId);
        return centerName ? (
          <Tag color="cyan" className="rounded-full px-2.5 py-0.5 border-none font-medium">
            <BankOutlined className="mr-1" />
            {centerName}
          </Tag>
        ) : (
          <span className="text-slate-400 text-xs">—</span>
        );
      },
    },
    {
      title: "Lớp học",
      render: (_: any, record: any) => record.class?.name
        ? <Tag color="blue" className="rounded-full">{record.class.name}</Tag>
        : <span className="text-slate-400 text-sm">—</span>,
    },
    {
      title: "Người giao",
      render: (_: any, record: any) => {
        const isMe =
          (record.teacherId && (record.teacherId === user?.teacherProfile?.id || record.teacherId === user?.id)) ||
          (isTeacher && record.classId && teacherClassIds.includes(record.classId));
        const teacherName =
          record.teacher?.user?.fullName ||
          record.teacher?.fullName ||
          record.teacher?.name ||
          (isMe ? user?.fullName : undefined);
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm text-slate-700">{teacherName || "—"}</span>
            {isMe && (
              <Tag color="purple" className="rounded-full px-1.5 py-0 border-none text-[10px] font-bold">
                Tôi
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: "Đối tượng",
      render: (_: any, record: any) => {
        const students = record.students || [];
        const cnt = record.studentIds?.length ?? students.length;
        if (cnt) {
          const tooltipContent = (
            <div className="space-y-1 text-xs">
              {students.map((s: any, idx: number) => {
                const name = s.student?.user?.fullName || s.studentId;
                const statusText = s.status === "finished" ? "Đã hoàn thành" : s.status === "in_progress" ? "Đang làm" : "Chưa bắt đầu";
                return <div key={s.id || idx}>{name}: <span className="font-semibold">{statusText}</span></div>;
              })}
            </div>
          );
          const content = (
            <span className="text-sm text-slate-600">
              <UserOutlined className="mr-1 text-indigo-400" />
              {cnt} học sinh
            </span>
          );
          return <Tooltip title={tooltipContent}>{content}</Tooltip>;
        }
        return <span className="text-sm text-slate-600"><TeamOutlined className="mr-1 text-emerald-400" />Toàn bộ lớp</span>;
      },
    },
    {
      title: "Hình thức",
      render: (_: any, record: any) => {
        const examItems = record.exams || [];
        const isExam = examItems.some((e: any) => e.exam?.examType === "exam");
        return isExam ? (
          <Tag color="purple" className="rounded-full border-none text-xs font-semibold">
            Đề kiểm tra
          </Tag>
        ) : (
          <Tag color="blue" className="rounded-full border-none text-xs font-semibold">
            Đề ôn tập
          </Tag>
        );
      },
    },
    { title: "Trạng thái", render: (_: any, record: any) => statusTag(record.status) },
    {
      title: "Ngày tạo",
      render: (_: any, record: any) => {
        const d = record.createdAt || record.created_at;
        return d ? <span className="text-xs text-slate-400">{new Date(d).toLocaleDateString("vi-VN")}</span> : "—";
      },
    },
    {
      title: "Thao tác", align: "right" as const,
      render: (_: any, record: any) => (
        <Space size="small">
          <Tooltip title="Xem thống kê">
            <Button type="text" size="small"
              icon={<BarChartOutlined className="text-slate-400 hover:text-indigo-600" />}
              onClick={() => setExamAnalyticsId(record.id)}
            />
          </Tooltip>
          {record.status === "active" && (
            <Can perform={["learning.manage", "learning.assign"]} mode="any">
              <Tooltip title="Huỷ assignment">
                <Button type="text" size="small" danger
                  icon={<CloseCircleOutlined className="text-slate-400 hover:text-rose-600" />}
                  onClick={() => handleCancelExamAssignment(record.id)}
                />
              </Tooltip>
            </Can>
          )}
        </Space>
      ),
    },
  ];

  const curriculumAssignmentColumns = [
    {
      title: "Giáo trình học",
      render: (_: any, record: any) => (
        <div>
          <div className="font-semibold text-slate-800">
            {record.title || record.curriculum?.title || record.curriculum?.code || "—"}
          </div>
          {record.curriculum?.code && <div className="text-xs text-slate-400 font-mono">{record.curriculum.code}</div>}
        </div>
      ),
    },
    {
      title: "Trung tâm",
      render: (_: any, record: any) => {
        const centerId = getRecordCenterId(record);
        const centerName = getCenterName(centerId);
        return centerName ? (
          <Tag color="cyan" className="rounded-full px-2.5 py-0.5 border-none font-medium">
            <BankOutlined className="mr-1" />
            {centerName}
          </Tag>
        ) : (
          <span className="text-slate-400 text-xs">—</span>
        );
      },
    },
    {
      title: "Lớp học",
      render: (_: any, record: any) => record.class?.name
        ? <Tag color="purple" className="rounded-full">{record.class.name}</Tag>
        : <span className="text-slate-400 text-sm">—</span>,
    },
    {
      title: "Người giao",
      render: (_: any, record: any) => {
        const isMe =
          (record.teacherId && (record.teacherId === user?.teacherProfile?.id || record.teacherId === user?.id)) ||
          (isTeacher && record.classId && teacherClassIds.includes(record.classId));
        const teacherName =
          record.teacher?.user?.fullName ||
          record.teacher?.fullName ||
          record.teacher?.name ||
          (isMe ? user?.fullName : undefined);
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm text-slate-700">{teacherName || "—"}</span>
            {isMe && (
              <Tag color="purple" className="rounded-full px-1.5 py-0 border-none text-[10px] font-bold">
                Tôi
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: "Học sinh",
      render: (_: any, record: any) => {
        const students = record.students || [];
        const cnt = record.studentIds?.length ?? students.length;
        if (cnt) {
          const tooltipContent = (
            <div className="space-y-1 text-xs">
              {students.map((s: any, idx: number) => {
                const name = s.student?.user?.fullName || s.studentId;
                const statusText = s.status === "finished" ? "Đã hoàn thành" : s.status === "in_progress" ? "Đang làm" : "Chưa bắt đầu";
                return <div key={s.id || idx}>{name}: <span className="font-semibold">{statusText}</span></div>;
              })}
            </div>
          );
          const content = (
            <span className="text-sm text-slate-600">
              <UserOutlined className="mr-1 text-purple-400" />
              {cnt} học sinh
            </span>
          );
          return <Tooltip title={tooltipContent}>{content}</Tooltip>;
        }
        return <span className="text-sm text-slate-400">—</span>;
      },
    },

    { title: "Trạng thái", render: (_: any, record: any) => statusTag(record.status) },
    {
      title: "Ngày tạo",
      render: (_: any, record: any) => {
        const d = record.createdAt || record.created_at;
        return d ? <span className="text-xs text-slate-400">{new Date(d).toLocaleDateString("vi-VN")}</span> : "—";
      },
    },
    {
      title: "Thao tác", align: "right" as const,
      render: (_: any, record: any) => (
        <Space size="small">
          <Tooltip title="Xem thống kê">
            <Button type="text" size="small"
              icon={<BarChartOutlined className="text-slate-400 hover:text-purple-600" />}
              onClick={() => setCurriculumAnalyticsId(record.id)}
            />
          </Tooltip>
          {record.status === "active" && (
            <Can perform={["learning.manage", "learning.assign"]} mode="any">
              <Tooltip title="Huỷ assignment">
                <Button type="text" size="small" danger
                  icon={<CloseCircleOutlined className="text-slate-400 hover:text-rose-600" />}
                  onClick={() => handleCancelCurriculumAssignment(record.id)}
                />
              </Tooltip>
            </Can>
          )}
        </Space>
      ),
    },
  ];

  // ==================== RENDER ====================
  return (
    <ConfigProvider
      theme={{
        token: { borderRadius: 12, colorPrimary: "#4f46e5", fontFamily: "Inter, system-ui, -apple-system, sans-serif" },
        components: { Table: { headerBg: "#f8fafc", headerColor: "#475569", rowHoverBg: "#f1f5f9" } },
      }}
    >
      <div className="min-h-screen bg-slate-50/50 py-6 px-4 sm:px-6">
        <Spin spinning={loading} size="large">
          <div className="max-w-[1400px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-100 p-6 rounded-3xl shadow-sm">
              <div>
                <Title level={2} className="!mb-0.5 !text-slate-800 font-extrabold tracking-tight flex items-center gap-2">
                  <ClipboardList size={26} className="text-indigo-600" />
                  Quản lý Giao bài
                </Title>
                <Text className="text-slate-500 text-sm">
                  Gắn giáo trình vào lớp, giao bài thi hoặc giáo trình cho học sinh cụ thể
                </Text>
              </div>
              <Button icon={<ReloadOutlined />} onClick={loadAll}
                className="rounded-xl border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-600">
                Làm mới
              </Button>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left: Center Select & Scope Filter */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <BankOutlined className="text-indigo-500" />
                      Trung tâm:
                    </span>
                    <Select
                      value={selectedCenterId}
                      onChange={(val) => setSelectedCenterId(val)}
                      className="min-w-[210px]"
                      options={[
                        { value: "all", label: "🌐 Tất cả trung tâm (All)" },
                        ...centers.map((c) => ({
                          value: c.id,
                          label: (
                            <div className="flex items-center gap-2 justify-between">
                              <span className="truncate max-w-[180px]">{c.name}</span>
                              {userCenters.includes(c.id) && (
                                <Tag color="cyan" className="rounded-full text-[10px] py-0 px-1.5 m-0 font-medium">
                                  Của bạn
                                </Tag>
                              )}
                            </div>
                          ),
                        })),
                      ]}
                    />
                  </div>

                  <Divider orientation="vertical" className="h-6 hidden sm:block" />

                  {/* Scope Segmented */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <FilterOutlined className="text-indigo-500" />
                      Phạm vi:
                    </span>
                    <Segmented
                      value={assignmentScope}
                      onChange={(val: any) => setAssignmentScope(val)}
                      options={
                        isTeacher
                          ? [
                              { label: "Bài của tôi", value: "my" },
                              { label: "Toàn trung tâm", value: "center" },
                              { label: "Tất cả (All)", value: "all" },
                            ]
                          : [
                              { label: "Theo trung tâm", value: "center" },
                              { label: "Tất cả hệ thống (All)", value: "all" },
                            ]
                      }
                    />
                  </div>
                </div>

                {/* Right: Search Input & Reset */}
                <div className="flex items-center gap-3">
                  <Input
                    placeholder="Tìm bài thi, giáo trình, lớp, học sinh..."
                    prefix={<SearchOutlined className="text-slate-400" />}
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    allowClear
                    className="w-full sm:w-72 rounded-xl"
                  />
                  {(selectedCenterId !== "all" || (isTeacher ? assignmentScope !== "my" : assignmentScope !== "center") || searchKeyword) && (
                    <Button
                      type="link"
                      size="small"
                      onClick={handleResetFilters}
                      className="text-xs text-indigo-600 hover:text-indigo-800 whitespace-nowrap px-1 font-semibold"
                    >
                      Đặt lại
                    </Button>
                  )}
                </div>
              </div>

              {/* Status summary banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 pt-3 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-slate-600">Đang lọc:</span>
                  <Tag color={selectedCenterId === "all" ? "orange" : "blue"} className="rounded-full">
                    {selectedCenterId === "all" ? "Tất cả trung tâm" : (centers.find((c) => c.id === selectedCenterId)?.name || "Trung tâm đã chọn")}
                  </Tag>
                  <Tag color={assignmentScope === "all" ? "purple" : assignmentScope === "my" ? "green" : "default"} className="rounded-full">
                    {assignmentScope === "my" ? "Chỉ bài của tôi" : assignmentScope === "center" ? "Toàn trung tâm" : "Tất cả (All)"}
                  </Tag>
                  {searchKeyword && (
                    <Tag color="cyan" className="rounded-full">
                      Từ khóa: "{searchKeyword}"
                    </Tag>
                  )}
                </div>
                <div className="text-slate-400 font-medium">
                  {activeTab === "class-curriculum" && `Hiển thị ${filteredClassCurriculums.length} / ${classCurriculums.length} giáo trình`}
                  {activeTab === "exam" && `Hiển thị ${filteredExamAssignments.length} / ${examAssignments.length} bài thi`}
                  {activeTab === "curriculum" && `Hiển thị ${filteredCurriculumAssignments.length} / ${curriculumAssignments.length} giáo trình`}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              type="card"
              size="large"
              className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
              tabBarStyle={{ padding: "16px 16px 0", background: "white", marginBottom: 0 }}
              items={[
                // ======= TAB 1: CLASS-CURRICULUM =======
                {
                  key: "class-curriculum",
                  label: (
                    <span className="flex items-center gap-2 px-2">
                      <LinkOutlined />
                      <span>Giáo Trình → Lớp</span>
                    </span>
                  ),
                  children: (
                    <div className="p-6">
                      <Alert
                        type="info"
                        showIcon
                        className="mb-4 rounded-xl"
                        title="Gắn giáo trình vào lớp học"
                        description="Khi gắn một giáo trình vào lớp, toàn bộ học sinh trong lớp sẽ tự động thấy và có thể tự vào làm tất cả bài thi trong giáo trình đó."
                      />
                      <div className="flex justify-end mb-4">
                        <Can perform="learning.assign">
                          <Button type="primary" icon={<PlusOutlined />}
                            onClick={() => {
                              refreshProfile().catch(() => {});
                              classCurriculumForm.resetFields();
                              setClassCurriculumFormOpen(true);
                            }}
                            className="rounded-xl h-10 px-5 font-semibold shadow-md shadow-cyan-500/20"
                            style={{ background: "#0891b2", borderColor: "#0891b2" }}
                          >
                            Gắn Giáo Trình vào Lớp
                          </Button>
                        </Can>
                      </div>
                      {filteredClassCurriculums.length === 0 ? (
                        <div className="py-16 text-center">
                          <Empty description={<span className="text-slate-400">Không tìm thấy giáo trình nào phù hợp với bộ lọc hiện tại.<br />Hãy đổi bộ lọc hoặc nhấn "Gắn Giáo Trình vào Lớp".</span>} />
                        </div>
                      ) : (
                        <Table dataSource={filteredClassCurriculums} columns={classCurriculumColumns} rowKey="id"
                          pagination={{ pageSize: 10, showSizeChanger: false }} bordered={false}
                          className="rounded-2xl overflow-hidden" />
                      )}
                    </div>
                  ),
                },

                // ======= TAB 2: EXAM ASSIGNMENT =======
                {
                  key: "exam",
                  label: (
                    <span className="flex items-center gap-2 px-2">
                      <FileTextOutlined />
                      <span>Giao Bài Thi</span>
                    </span>
                  ),
                  children: (
                    <div className="p-6">
                      <Alert
                        type="info"
                        showIcon
                        className="mb-4 rounded-xl"
                        title="Giao bài thi cho học sinh"
                        description="Có thể chọn nhiều bài thi cùng lúc. Hãy chọn lớp học trước để hệ thống tự động lọc các đề thi thuộc đúng môn học của lớp."
                      />
                      <div className="flex justify-end mb-4">
                        <Can perform="learning.assign">
                          <Button type="primary" icon={<PlusOutlined />}
                            onClick={() => {
                              refreshProfile().catch(() => {});
                              examForm.resetFields();
                              setSelectedClassForExam(undefined);
                              setExamFormOpen(true);
                            }}
                            className="rounded-xl h-10 px-5 font-semibold shadow-md shadow-indigo-500/20"
                          >
                            Giao Bài Thi Mới
                          </Button>
                        </Can>
                      </div>
                      {filteredExamAssignments.length === 0 ? (
                        <div className="py-16 text-center">
                          <Empty description={<span className="text-slate-400">Không tìm thấy bài thi nào phù hợp với bộ lọc hiện tại.<br />Hãy đổi bộ lọc hoặc nhấn "Giao Bài Thi Mới".</span>} />
                        </div>
                      ) : (
                        <Table dataSource={filteredExamAssignments} columns={examAssignmentColumns} rowKey="id"
                          pagination={{ pageSize: 10, showSizeChanger: false }} bordered={false}
                          className="rounded-2xl overflow-hidden" />
                      )}
                    </div>
                  ),
                },

                // ======= TAB 3: CURRICULUM ASSIGNMENT (DIRECT) =======
                {
                  key: "curriculum",
                  label: (
                    <span className="flex items-center gap-2 px-2">
                      <BookOutlined />
                      <span>Giao Giáo Trình (Trực tiếp)</span>
                    </span>
                  ),
                  children: (
                    <div className="p-6">
                      <Alert
                        type="warning"
                        showIcon
                        className="mb-4 rounded-xl"
                        title="Giao giáo trình trực tiếp cho học sinh"
                        description="Khác với 'Gắn Giáo Trình vào Lớp', tính năng này giao giáo trình trực tiếp cho học sinh cụ thể (bất kể lớp). Học sinh được giao sẽ thấy giáo trình dù không thuộc lớp đó."
                      />
                      <div className="flex justify-end mb-4">
                        <Can perform="learning.assign">
                          <Button type="primary" icon={<PlusOutlined />}
                            onClick={() => {
                              refreshProfile().catch(() => {});
                              curriculumForm.resetFields();
                              setSelectedClassForCurriculum(undefined);
                              setCurriculumFormOpen(true);
                            }}
                            className="rounded-xl h-10 px-5 font-semibold shadow-md shadow-purple-500/20"
                            style={{ background: "#7c3aed", borderColor: "#7c3aed" }}
                          >
                            Giao Giáo Trình Trực Tiếp
                          </Button>
                        </Can>
                      </div>
                      {filteredCurriculumAssignments.length === 0 ? (
                        <div className="py-16 text-center">
                          <Empty description={<span className="text-slate-400">Không tìm thấy giáo trình nào được giao trực tiếp phù hợp với bộ lọc.<br />Hãy đổi bộ lọc hoặc nhấn "Giao Giáo Trình Trực Tiếp".</span>} />
                        </div>
                      ) : (
                        <Table dataSource={filteredCurriculumAssignments} columns={curriculumAssignmentColumns} rowKey="id"
                          pagination={{ pageSize: 10, showSizeChanger: false }} bordered={false}
                          className="rounded-2xl overflow-hidden" />
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </Spin>
      </div>

      {/* ==================== CLASS-CURRICULUM FORM MODAL ==================== */}
      <Modal open={classCurriculumFormOpen} onCancel={() => setClassCurriculumFormOpen(false)} footer={null}
        title={<div className="flex items-center gap-2 text-cyan-700 font-bold text-lg"><LinkOutlined />Gắn Giáo Trình vào Lớp</div>}
        width={520}
      >
        <Form form={classCurriculumForm} layout="vertical" onFinish={handleCreateClassCurriculum} className="pt-2">
          <Form.Item name="classId" label="Lớp học" rules={[{ required: true, message: "Vui lòng chọn lớp!" }]}>
            <Select
              showSearch
              placeholder="Chọn lớp học..."
              optionFilterProp="children"
              className="rounded-xl"
              onChange={handleClassChangeForClassCurriculum}
            >
              {modalClasses.map((c) => (
                <Select.Option key={c.id} value={c.id}>
                  {c.name}
                  {getClassSpecializationId(c.id) && getSpecializationName(getClassSpecializationId(c.id)) && (
                    <span className="text-slate-400 text-xs ml-1.5 font-normal">
                      ({getSpecializationName(getClassSpecializationId(c.id))})
                    </span>
                  )}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="curriculumIds"
            label={
              <div className="flex items-center justify-between w-full">
                <span>Giáo trình</span>
                {selectedClassForClassCurriculum && getClassSpecializationId(selectedClassForClassCurriculum) && (
                  <span className="text-xs text-cyan-600 font-medium">
                    Môn: {getSpecializationName(getClassSpecializationId(selectedClassForClassCurriculum))} ({modalClassCurriculums.length} giáo trình)
                  </span>
                )}
              </div>
            }
            rules={[{ required: true, message: "Vui lòng chọn giáo trình!" }]}
            extra={
              selectedClassForClassCurriculum && modalClassCurriculums.length === 0 ? (
                <span className="text-amber-600 text-xs mt-1 block">
                  Chưa có giáo trình nào thuộc môn học này được xuất bản (Published).
                </span>
              ) : undefined
            }
          >
            <Select mode="multiple" showSearch placeholder="Chọn giáo trình..." optionFilterProp="children" className="rounded-xl">
              {modalClassCurriculums.map((c) => (
                <Select.Option key={c.id} value={c.id}>
                  {c.title || c.code} <span className="text-slate-400 text-xs ml-1">({c.code})</span>
                  {c.specializationId && getSpecializationName(c.specializationId) && (
                    <span className="text-cyan-600 text-xs ml-1.5 font-normal">
                      • {getSpecializationName(c.specializationId)}
                    </span>
                  )}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Divider className="my-4" />
          <div className="flex justify-end gap-3">
            <Button onClick={() => setClassCurriculumFormOpen(false)} className="rounded-xl">Huỷ</Button>
            <Button type="primary" htmlType="submit" loading={submitting}
              className="rounded-xl px-6 font-semibold shadow-md"
              style={{ background: "#0891b2", borderColor: "#0891b2" }}
            >
              Gắn giáo trình
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ==================== EXAM ASSIGNMENT FORM MODAL ==================== */}
      <Modal open={examFormOpen} onCancel={() => setExamFormOpen(false)} footer={null}
        title={<div className="flex items-center gap-2 text-indigo-700 font-bold text-lg"><FileTextOutlined />Giao Bài Thi Mới</div>}
        width={600}
      >
        <Form form={examForm} layout="vertical" onFinish={handleCreateExamAssignment} className="pt-2">
          <Form.Item
            name="classId"
            label={
              <span>
                Lớp học <span className="text-slate-400 font-normal text-xs">(chọn lớp trước để hệ thống lọc danh sách đề thi theo đúng môn học)</span>
              </span>
            }
          >
            <Select
              showSearch
              placeholder="Chọn lớp học..."
              optionFilterProp="children"
              className="rounded-xl"
              allowClear
              onChange={handleClassChangeForExam}
            >
              {examModalClasses.map((c: any) => {
                const specName = c.specializationName || (getClassSpecializationId(c.id) && getSpecializationName(getClassSpecializationId(c.id)));
                return (
                  <Select.Option key={c.id} value={c.id}>
                    {c.name}
                    {specName && (
                      <span className="text-slate-400 text-xs ml-1.5 font-normal">
                        ({specName})
                      </span>
                    )}
                  </Select.Option>
                );
              })}
            </Select>
          </Form.Item>

          <Form.Item
            name="examIds"
            label={
              <div className="flex items-center justify-between w-full">
                <span>
                  Bài thi <span className="text-slate-400 font-normal text-xs">(có thể chọn nhiều)</span>
                </span>
                {selectedClassForExam && getClassSpecializationId(selectedClassForExam) && (
                  <span className="text-xs text-indigo-600 font-medium">
                    Môn: {getSpecializationName(getClassSpecializationId(selectedClassForExam))} ({modalExams.length} đề thi)
                  </span>
                )}
              </div>
            }
            rules={[{ required: true, message: "Vui lòng chọn ít nhất 1 bài thi!" }]}
            extra={
              selectedClassForExam && modalExams.length === 0 ? (
                <span className="text-amber-600 text-xs mt-1 block">
                  Chưa có đề thi nào thuộc môn học này được xuất bản (Published).
                </span>
              ) : undefined
            }
          >
            <Select
              mode="multiple"
              showSearch
              placeholder={selectedClassForExam ? "Chọn bài thi thuộc môn học của lớp..." : "Chọn bài thi..."}
              optionFilterProp="children"
              className="rounded-xl"
              onChange={handleExamSelectionChange}
            >
              {modalExams.map((e) => (
                <Select.Option key={e.id} value={e.id}>
                  {e.examType === "exam" ? "[Kiểm tra] " : "[Ôn tập] "}
                  {e.title || e.code} <span className="text-slate-400 text-xs ml-1">({e.code})</span>
                  {e.specializationId && getSpecializationName(e.specializationId) && (
                    <span className="text-indigo-500 text-xs ml-1.5 font-normal">
                      • {getSpecializationName(e.specializationId)}
                    </span>
                  )}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {selectedExamIds.length > 0 && (
            <div className="mb-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
              <span className="text-xs font-bold text-slate-500 block mb-1">Chọn phiên bản cho từng đề thi (Mặc định bản mới nhất):</span>
              {selectedExamIds.map((examId) => {
                const exam = exams.find((e) => e.id === examId);
                const versions = examVersionsMap[examId] || [];
                return (
                  <div key={examId} className="flex items-center justify-between gap-3 text-xs bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                    <span className="font-semibold text-slate-700 truncate max-w-[280px]">
                      {exam?.examType === "exam" ? "[Kiểm tra] " : "[Ôn tập] "}
                      {exam?.title || exam?.code}
                    </span>
                    <Form.Item
                      name={["examVersions", examId]}
                      className="mb-0"
                      initialValue=""
                    >
                      <Select className="w-52 text-xs font-medium" size="small">
                        <Select.Option value="">Bản mới nhất (Latest)</Select.Option>
                        {versions.map((v: any) => (
                          <Select.Option key={v.id} value={v.id}>
                            Phiên bản {v.versionNumber} ({v.questionCount} câu){v.isCurrent ? " (Hiện tại)" : ""}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </div>
                );
              })}
            </div>
          )}

          <Form.Item
            name="studentIds"
            label={<span>Học sinh cụ thể <span className="text-slate-400 font-normal text-xs">(bỏ trống = toàn bộ học sinh trong lớp)</span></span>}
            extra={!selectedClassForExam ? (
              <div className="text-amber-600 text-xs mt-1 flex items-center gap-1.5">
                <Info size={13} className="shrink-0" />
                <span><b>Mẹo:</b> Hãy chọn <b>Lớp học</b> trước để hệ thống tự động lọc đúng học sinh thuộc lớp bạn phụ trách.</span>
              </div>
            ) : undefined}
          >
            <Select
              mode="multiple"
              showSearch
              placeholder={allStudents.length === 0 ? "Đang tải học sinh..." : (selectedClassForExam ? "Chọn học sinh cụ thể trong lớp (hoặc bỏ trống để giao cả lớp)..." : "Chọn học sinh cụ thể...")}
              optionFilterProp="label"
              className="rounded-xl"
              options={getStudentsForClass(selectedClassForExam).map((s) => ({
                key: s.studentProfile?.id || s.id,
                value: s.studentProfile?.id || s.id,
                label: `${s.fullName || s.code} @${s.code}`,
              }))}
            />
          </Form.Item>

          <Form.Item name="title" label="Tiêu đề (tùy chọn)">
            <Input placeholder="VD: Bài kiểm tra Unit 1" className="rounded-xl" />
          </Form.Item>
          <Form.Item name="instructions" label="Hướng dẫn (tùy chọn)">
            <Input.TextArea rows={3} placeholder="Hướng dẫn làm bài cho học sinh..." className="rounded-xl" />
          </Form.Item>
          <Divider className="my-4" />
          <div className="flex justify-end gap-3">
            <Button onClick={() => setExamFormOpen(false)} className="rounded-xl">Huỷ</Button>
            <Button type="primary" htmlType="submit" loading={submitting}
              className="rounded-xl px-6 font-semibold shadow-md shadow-indigo-500/20">
              Giao bài thi
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ==================== CURRICULUM ASSIGNMENT FORM MODAL ==================== */}
      <Modal open={curriculumFormOpen} onCancel={() => setCurriculumFormOpen(false)} footer={null}
        title={<div className="flex items-center gap-2 text-purple-700 font-bold text-lg"><BookOutlined />Giao Giáo Trình Trực Tiếp</div>}
        width={600}
      >
        <Form form={curriculumForm} layout="vertical" onFinish={handleCreateCurriculumAssignment} className="pt-2">
          <Form.Item
            name="classId"
            label={
              <span>
                Lớp học <span className="text-slate-400 font-normal text-xs">(chọn lớp để lọc giáo trình theo môn học & danh sách học sinh)</span>
              </span>
            }
          >
            <Select
              showSearch
              placeholder="Chọn lớp học (tùy chọn)..."
              optionFilterProp="children"
              className="rounded-xl"
              allowClear
              onChange={handleClassChangeForCurriculum}
            >
              {modalClasses.map((c) => (
                <Select.Option key={c.id} value={c.id}>
                  {c.name}
                  {getClassSpecializationId(c.id) && getSpecializationName(getClassSpecializationId(c.id)) && (
                    <span className="text-slate-400 text-xs ml-1.5 font-normal">
                      ({getSpecializationName(getClassSpecializationId(c.id))})
                    </span>
                  )}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="curriculumId"
            label={
              <div className="flex items-center justify-between w-full">
                <span>Giáo trình</span>
                {selectedClassForCurriculum && getClassSpecializationId(selectedClassForCurriculum) && (
                  <span className="text-xs text-purple-600 font-medium">
                    Môn: {getSpecializationName(getClassSpecializationId(selectedClassForCurriculum))} ({modalDirectCurriculums.length} giáo trình)
                  </span>
                )}
              </div>
            }
            rules={[{ required: true, message: "Vui lòng chọn giáo trình!" }]}
            extra={
              selectedClassForCurriculum && modalDirectCurriculums.length === 0 ? (
                <span className="text-amber-600 text-xs mt-1 block">
                  Chưa có giáo trình nào thuộc môn học này được xuất bản (Published).
                </span>
              ) : undefined
            }
          >
            <Select showSearch placeholder="Chọn giáo trình..." optionFilterProp="children" className="rounded-xl">
              {modalDirectCurriculums.map((c) => (
                <Select.Option key={c.id} value={c.id}>
                  {c.title || c.code} <span className="text-slate-400 text-xs ml-1">({c.code})</span>
                  {c.specializationId && getSpecializationName(c.specializationId) && (
                    <span className="text-purple-600 text-xs ml-1.5 font-normal">
                      • {getSpecializationName(c.specializationId)}
                    </span>
                  )}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="studentIds" label={<span>Học sinh <span className="text-red-500">*</span> <span className="text-slate-400 font-normal text-xs">(bắt buộc chọn ít nhất 1)</span></span>}
            rules={[{ required: true, message: "Vui lòng chọn ít nhất 1 học sinh!" }]}>
            <Select
              mode="multiple"
              showSearch
              placeholder={allStudents.length === 0 ? "Đang tải học sinh..." : (selectedClassForCurriculum ? "Chọn học sinh trong lớp..." : "Chọn học sinh...")}
              optionFilterProp="label"
              className="rounded-xl"
              options={getStudentsForClass(selectedClassForCurriculum).map((s) => ({
                key: s.studentProfile?.id || s.id,
                value: s.studentProfile?.id || s.id,
                label: `${s.fullName || s.code} @${s.code}`,
              }))}
            />
          </Form.Item>

          <Form.Item name="title" label="Tiêu đề (tùy chọn)">
            <Input placeholder="VD: Giáo trình A1 - Học kỳ 1" className="rounded-xl" />
          </Form.Item>
          <Form.Item name="instructions" label="Hướng dẫn (tùy chọn)">
            <Input.TextArea rows={3} placeholder="Hướng dẫn học tập cho học sinh..." className="rounded-xl" />
          </Form.Item>
          <Divider className="my-4" />
          <div className="flex justify-end gap-3">
            <Button onClick={() => setCurriculumFormOpen(false)} className="rounded-xl">Huỷ</Button>
            <Button type="primary" htmlType="submit" loading={submitting}
              className="rounded-xl px-6 font-semibold shadow-md shadow-purple-500/20"
              style={{ background: "#7c3aed", borderColor: "#7c3aed" }}
            >
              Giao giáo trình
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Analytics Modals */}
      <ExamAnalyticsModal assignmentId={examAnalyticsId} open={!!examAnalyticsId} onClose={() => setExamAnalyticsId(null)} />
      <CurriculumAnalyticsModal assignmentId={curriculumAnalyticsId} open={!!curriculumAnalyticsId} onClose={() => setCurriculumAnalyticsId(null)} />
    </ConfigProvider>
  );
}
