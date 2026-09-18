import { useEffect, useState, useMemo } from "react";
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
  Input,
  Select,
  Radio,
} from "antd";
import { History, BookOpen } from "lucide-react";

import {
  BookOutlined,
  FileTextOutlined,
  HistoryOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ArrowRightOutlined,
  ReloadOutlined,
  SearchOutlined,
  FilterOutlined,
  TrophyOutlined,
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
        ? <Tag color="success" className="rounded-full border-none text-xs font-semibold">Đã nộp</Tag>
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
    {
      title: "Ngày làm",
      render: (_: any, r: any) => (
        <span className="text-xs text-slate-500">
          {formatDate(r.createdAt || r.submittedAt || r.updatedAt)}
        </span>
      ),
    },
    {
      title: "", width: 100,
      render: (_: any, r: any) => (
        <Button size="small" type="link" onClick={() => { onClose(); navigate(`/exam/${r.id}`); }} className="text-xs font-semibold p-0 text-indigo-600">
          {r.status === "submitted" ? "Xem bài làm" : "Tiếp tục làm"}
        </Button>
      ),
    },
  ];

  return (
    <Modal
      title={<div className="font-bold text-base text-slate-800 flex items-center gap-1.5"><History size={18} className="text-indigo-600" /> Lịch sử làm bài: {title}</div>}
      open={open}
      onCancel={onClose}
      footer={null}
      width={680}
      className="rounded-2xl overflow-hidden"
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
  const [curriculumItems, setCurriculumItems] = useState<any[]>([]);

  // ---- Starting exam ----
  const [startingId, setStartingId] = useState<string | null>(null);

  // ---- History modal ----
  const [historyAssignmentStudentId, setHistoryAssignmentStudentId] = useState<string | null>(null);
  const [historyExamId, setHistoryExamId] = useState<string | null>(null);
  const [historyTitle, setHistoryTitle] = useState<string | undefined>(undefined);

  // ---- Search and Filter state for Assigned Exams ----
  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState<"all" | "exam" | "practice">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "completed" | "pending">("all");

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
          enriched.map((r: any) => (r.status === "fulfilled" ? r.value : null)).filter(Boolean)
        );
      }

      // --- Curriculum items ---
      if (curriculumRes.status === "fulfilled" && curriculumRes.value?.data) {
        const cList = curriculumRes.value.data as any[];
        const enrichedC = await Promise.allSettled(
          cList.map(async (item: any) => {
            try {
              const detail = await studentLearningService.curriculums.get(item.curriculumId);
              return { ...item, ...detail };
            } catch {
              return item;
            }
          })
        );
        setCurriculumItems(
          enrichedC.map((r: any) => (r.status === "fulfilled" ? r.value : null)).filter(Boolean)
        );
      }
    } catch (err) {
      console.error("Failed to load student exams data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = async (assignmentStudentId: string, examId: string) => {
    const key = `${assignmentStudentId}:${examId}`;
    try {
      setStartingId(key);
      const res = await studentLearningService.examAssignments.startAttempt(
        assignmentStudentId,
        examId
      );
      const attemptId = res?.id;
      if (!attemptId) {
        throw new Error("Không thể khởi tạo lượt làm bài.");
      }
      navigate(`/exam/${attemptId}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Không thể bắt đầu bài thi.");
    } finally {
      setStartingId(null);
    }
  };

  const handleStartCurriculumExam = async (curriculumId: string, examId: string) => {
    const key = `${curriculumId}:${examId}`;
    try {
      setStartingId(key);
      const res = await studentLearningService.curriculums.startAttempt(
        curriculumId,
        examId
      );
      const attemptId = res?.id;
      if (!attemptId) {
        throw new Error("Không thể khởi tạo lượt làm bài trong lộ trình.");
      }
      navigate(`/exam/${attemptId}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Không thể bắt đầu bài thi.");
    } finally {
      setStartingId(null);
    }
  };

  // ==================== FLATTENED ASSIGNED EXAMS LIST ====================
  const allAssignedExamItems = useMemo(() => {
    const list: any[] = [];

    examAssignments.forEach((row: any) => {
      const assignmentStudentId = row.id;
      const cls = row.class || row.assignment?.class;
      const assignmentTitle = row.assignment?.title || "Bài thi được giao";
      const className = cls?.name;
      const exams: any[] = row.exams || [];
      const exam = row.exam || row.assignment?.exam;
      const resolvedExams = exams.length > 0 ? exams : (exam ? [{
        examId: exam.id,
        exam,
        attemptsCount: row.summary?.attemptsCount ?? 0,
        bestPercentage: row.summary?.bestPercentage,
        status: (row.summary?.attemptsCount ?? 0) > 0 ? "in_progress" : "assigned"
      }] : []);

      resolvedExams.forEach((ep: any, idx: number) => {
        const currentExam = ep.exam;
        const examId = ep.examId || currentExam?.id;
        const examTitle = currentExam?.title || currentExam?.code || `Bài thi ${idx + 1}`;
        const attemptsCount = ep.attemptsCount ?? 0;
        const attemptsList = row.attempts || [];
        const examAttempts = attemptsList.filter((att: any) => (att.examId === examId || !att.examId) && att.status === "submitted");
        const inProgressAttempts = attemptsList.filter((att: any) => (att.examId === examId || !att.examId) && att.status === "in_progress");
        const hasInProgress = inProgressAttempts.length > 0 || ep.status === "in_progress" || ((row.summary?.attemptsCount ?? 0) > 0 && examAttempts.length === 0);
        const resolvedAttemptsCount = Math.max(attemptsCount, examAttempts.length);
        const totalAttemptsCount = Math.max(resolvedAttemptsCount, row.summary?.attemptsCount ?? 0, attemptsList.length);
        const bestAttempt = examAttempts.reduce((best: any, current: any) => {
          return (!best || parseFloat(current.percentage) > parseFloat(best.percentage)) ? current : best;
        }, null);

        const bestPct = ep.bestPercentage || bestAttempt?.percentage;
        const bestScore = bestAttempt?.score;
        const examType = currentExam?.examType ?? ep.examType ?? "practice";
        const isExamType = examType === "exam";
        // NOTE: maxAttempts da bi xoa (migration 1780000030000).

        const pctVal = parseFloat(bestPct ?? "0");
        const mastered = ep.mastered ?? bestAttempt?.mastered ?? (pctVal >= 100);
        const requiresRemediation = ep.requiresRemediation ?? bestAttempt?.requiresRemediation ?? (!mastered && resolvedAttemptsCount >= 1);

        // Mastery Learning: Ca De thi va De on tap deu chi hoan thanh khi dat 100% hoac mastered
        const isCompleted = mastered || pctVal >= 100 || ep.status === "completed" || ep.status === "finished" || ep.status === "mastered";

        list.push({
          id: `${assignmentStudentId}_${examId}_${idx}`,
          assignmentStudentId,
          examId,
          examTitle,
          assignmentTitle,
          className,
          examType,
          isExamType,
          currentExam,
          timeLimitSeconds: currentExam?.timeLimitSeconds,
          // NOTE: maxAttempts removed
          attemptsCount: resolvedAttemptsCount,
          totalAttemptsCount,
          hasInProgress,
          bestPct,
          bestScore,
          bestPctVal: pctVal,
          mastered,
          requiresRemediation,
          isCompleted,
        });
      });
    });

    return list;
  }, [examAssignments]);

  const filteredAssignedExams = useMemo(() => {
    return allAssignedExamItems.filter((item: any) => {
      // 1. Search text filter
      if (searchText.trim()) {
        const query = searchText.toLowerCase().trim();
        const matchesTitle = item.examTitle.toLowerCase().includes(query);
        const matchesAssignment = item.assignmentTitle.toLowerCase().includes(query);
        const matchesClass = item.className ? item.className.toLowerCase().includes(query) : false;
        if (!matchesTitle && !matchesAssignment && !matchesClass) {
          return false;
        }
      }

      // 2. Type filter
      if (filterType === "exam" && !item.isExamType) return false;
      if (filterType === "practice" && item.isExamType) return false;

      // 3. Status filter
      if (filterStatus === "completed" && !item.isCompleted) return false;
      if (filterStatus === "pending" && item.isCompleted) return false;

      return true;
    });
  }, [allAssignedExamItems, searchText, filterType, filterStatus]);

  const totalAssignedCount = allAssignedExamItems.length;
  const completedAssignedCount = allAssignedExamItems.filter((x) => x.isCompleted).length;
  const pendingAssignedCount = totalAssignedCount - completedAssignedCount;

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
      <div className="space-y-5">
        {/* Top Filter and Search Bar */}
        <Card className="rounded-2xl border border-slate-200/80 shadow-sm bg-white p-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Box */}
            <div className="flex-1 min-w-[240px]">
              <Input
                placeholder="Tìm kiếm theo tên bài thi, mã đề hoặc lớp học..."
                prefix={<SearchOutlined className="text-slate-400 mr-1" />}
                allowClear
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="rounded-xl h-10 border-slate-200 hover:border-indigo-400 focus:border-indigo-500 text-sm"
              />
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Type Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setFilterType("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filterType === "all" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Tất cả loại ({totalAssignedCount})
                </button>
                <button
                  onClick={() => setFilterType("exam")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filterType === "exam" ? "bg-white text-purple-600 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Kiểm tra
                </button>
                <button
                  onClick={() => setFilterType("practice")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filterType === "practice" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Ôn tập
                </button>
              </div>

              {/* Status Filter */}
              <Select
                value={filterStatus}
                onChange={(val) => setFilterStatus(val)}
                className="w-40 h-10 font-semibold"
                dropdownClassName="rounded-xl"
                options={[
                  { value: "all", label: "Tất cả trạng thái" },
                  { value: "pending", label: "Chưa làm / Ôn tập" },
                  { value: "completed", label: "Đã hoàn thành" },
                ]}
              />
            </div>
          </div>

          {/* Quick Summary Bar */}
          <div className="flex items-center gap-6 mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              Tổng số bài: <strong className="text-slate-800 font-bold">{totalAssignedCount}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Đã hoàn thành: <strong className="text-emerald-600 font-bold">{completedAssignedCount}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Cần ôn tập / Chưa làm: <strong className="text-amber-600 font-bold">{pendingAssignedCount}</strong>
            </span>
          </div>
        </Card>

        {/* Flat List View */}
        {filteredAssignedExams.length === 0 ? (
          <div className="py-12 bg-white rounded-2xl border border-slate-100 text-center">
            <Empty description={<span className="text-slate-400 font-medium">Không tìm thấy bài thi nào phù hợp với bộ lọc.</span>} />
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAssignedExams.map((item: any) => {
              const isStarting = startingId === `${item.assignmentStudentId}:${item.examId}`;

              return (
                <div
                  key={item.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border transition-all duration-200 ${item.isCompleted
                    ? "bg-emerald-50/40 border-emerald-100 hover:border-emerald-300"
                    : "bg-white border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-200"}`}
                >
                  {/* Left info */}
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-sm ${item.isCompleted
                        ? "bg-emerald-500 text-white"
                        : item.isExamType
                        ? "bg-purple-100 text-purple-600 border border-purple-200"
                        : "bg-blue-100 text-blue-600 border border-blue-200"}`}
                    >
                      {item.isCompleted ? <CheckCircleOutlined /> : item.isExamType ? <FileTextOutlined /> : <BookOutlined />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-800 text-base hover:text-indigo-600 transition cursor-pointer"
                          onClick={() => {
                            if (item.isCompleted) {
                              setHistoryAssignmentStudentId(item.assignmentStudentId);
                              setHistoryExamId(item.examId);
                              setHistoryTitle(item.examTitle);
                            } else {
                              handleStartExam(item.assignmentStudentId, item.examId);
                            }
                          }}
                        >
                          {item.examTitle}
                        </span>
                        <Tag color={item.isExamType ? "purple" : "blue"} className="rounded-full border-none text-[10px] font-bold px-2 py-0.5 m-0">
                          {item.isExamType ? "Kiểm tra" : "Ôn tập"}
                        </Tag>
                        {item.className && (
                          <Tag color="cyan" className="rounded-full border-none text-[10px] font-semibold px-2 py-0.5 m-0">
                            Lớp: {item.className}
                          </Tag>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="text-slate-400 font-medium">{item.assignmentTitle}</span>
                        {item.timeLimitSeconds ? (
                          <span className="flex items-center gap-1 text-slate-600 font-semibold">
                            <ClockCircleOutlined /> {Math.ceil(item.timeLimitSeconds / 60)} phút
                          </span>
                        ) : null}
                        {item.attemptsCount > 0 && (
                          <span className="text-slate-400">{item.attemptsCount} lần đã làm</span>
                        )}
                      </div>

                      {/* Status badge */}
                      <div className="pt-1 flex items-center gap-2">
                        {item.isExamType ? (
                          item.isCompleted ? (
                            <Tag color="green" className="rounded-full border-none text-xs px-2.5 py-0.5 font-bold">
                              Đã hoàn thành (100%)
                            </Tag>
                          ) : item.requiresRemediation ? (
                            <Tag color="volcano" className="rounded-full border-none text-xs px-2.5 py-0.5 font-bold">
                              Cần làm lại câu sai ({item.bestPctVal.toFixed(0)}%)
                            </Tag>
                          ) : item.attemptsCount > 0 ? (
                            <Tag color="orange" className="rounded-full border-none text-xs px-2.5 py-0.5 font-bold">
                              Đang làm bài
                            </Tag>
                          ) : (
                            <Tag color="default" className="rounded-full border-none text-xs px-2.5 py-0.5">
                              Chưa làm bài
                            </Tag>
                          )
                        ) : (
                          item.isCompleted ? (
                            <Tag color="green" className="rounded-full border-none text-xs px-2.5 py-0.5 font-bold">
                              Đã hoàn thành (100%)
                            </Tag>
                          ) : item.attemptsCount > 0 ? (
                            <Tag color="orange" className="rounded-full border-none text-xs px-2.5 py-0.5 font-bold">
                              Đang ôn tập ({item.bestPctVal.toFixed(0)}%)
                            </Tag>
                          ) : item.hasInProgress ? (
                            <Tag color="processing" className="rounded-full border-none text-xs px-2.5 py-0.5 font-bold">
                              Đang làm dở
                            </Tag>
                          ) : (
                            <Tag color="default" className="rounded-full border-none text-xs px-2.5 py-0.5">
                              Chưa ôn tập
                            </Tag>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Action buttons */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {(item.attemptsCount > 0 || item.totalAttemptsCount > 0) && (
                      <Tooltip title="Xem lịch sử các lần làm">
                        <Button
                          size="small"
                          icon={<HistoryOutlined />}
                          onClick={() => {
                            setHistoryAssignmentStudentId(item.assignmentStudentId);
                            setHistoryExamId(item.examId);
                            setHistoryTitle(item.examTitle);
                          }}
                          className="rounded-xl border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 text-xs h-9 px-3 font-semibold"
                        >
                          Lịch sử
                        </Button>
                      </Tooltip>
                    )}

                    <Tooltip title={item.isCompleted ? "Xem lại lịch sử làm bài" : undefined}>
                      <Button
                        size="small"
                        type={item.isCompleted ? "default" : "primary"}
                        icon={item.isCompleted ? <HistoryOutlined /> : <PlayCircleOutlined />}
                        loading={isStarting}
                        onClick={() => {
                          if (item.isCompleted) {
                            setHistoryAssignmentStudentId(item.assignmentStudentId);
                            setHistoryExamId(item.examId);
                            setHistoryTitle(item.examTitle);
                          } else {
                            handleStartExam(item.assignmentStudentId, item.examId);
                          }
                        }}
                        className={`rounded-xl font-bold text-xs h-9 px-4 transition ${item.isCompleted
                          ? "border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                          : "bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20"}`}
                      >
                        {item.isCompleted ? "Xem bài làm" : item.requiresRemediation ? "Làm lại câu sai" : (item.attemptsCount > 0 || item.hasInProgress) ? "Làm tiếp" : "Làm bài"}
                      </Button>
                    </Tooltip>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
          // NOTE: maxAttempts da bi xoa (migration 1780000030000).

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
                      const examType = exam?.examType ?? ep.examType ?? "practice";
                      const isExamType = examType === "exam";
                      const bestPctVal = parseFloat(ep.bestPercentage ?? ep.bestScorePct ?? ep.bestScore ?? "0");
                      const attemptsCount = ep.attemptsCount ?? ep.attemptCount ?? ep.attempts?.length ?? 0;
                      const isPracticeMode = !isExamType;
                      const isMastered = ep.mastered ?? (bestPctVal >= 100);
                      const requiresRemediation = ep.requiresRemediation ?? (!isMastered && attemptsCount >= 1);
                      // Mastery Learning: Ca De thi va De on tap deu chi hoan thanh khi dat 100% hoac mastered
                      const isCompleted = isMastered || bestPctVal >= 100 || ep.status === "completed" || ep.status === "finished" || ep.status === "mastered";
                      const startKey = `${curriculumId}:${examId}`;
                      const isStarting = startingId === startKey;
                      const isExhausted = false;

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
                                <Tag color={isExamType ? "purple" : "blue"} className="rounded-full border-none text-[10px] px-2 m-0 font-semibold">
                                  {isExamType ? "Kiểm tra" : "Ôn tập"}
                                </Tag>
                                {isRequired
                                  ? <Tag color="red" className="rounded-full border-none text-[10px] px-2 m-0">Bắt buộc</Tag>
                                  : <Tag color="default" className="rounded-full border-none text-[10px] px-2 m-0">Tuỳ chọn</Tag>}
                                {attemptsCount > 0 && (
                                  <span className="text-slate-400 text-xs">{attemptsCount} lần đã làm</span>
                                )}
                                {isPracticeMode ? (
                                  isCompleted ? (
                                    <Tag color="green" className="rounded-full border-none text-[10px] px-2 m-0 font-bold">
                                      Đã hoàn thành (100%)
                                    </Tag>
                                  ) : attemptsCount > 0 ? (
                                    <Tag color="orange" className="rounded-full border-none text-[10px] px-2 m-0 font-bold">
                                      Đang ôn tập ({bestPctVal.toFixed(0)}%)
                                    </Tag>
                                  ) : (
                                    <Tag color="default" className="rounded-full border-none text-[10px] px-2 m-0">
                                      Chưa ôn tập
                                    </Tag>
                                  )
                                ) : (
                                  isCompleted ? (
                                    <Tag color="green" className="rounded-full border-none text-[10px] px-2 m-0 font-bold">
                                      Đã hoàn thành (100%)
                                    </Tag>
                                  ) : requiresRemediation ? (
                                    <Tag color="volcano" className="rounded-full border-none text-[10px] px-2 m-0 font-bold">
                                      Cần làm lại câu sai ({bestPctVal.toFixed(0)}%)
                                    </Tag>
                                  ) : attemptsCount > 0 ? (
                                    <Tag color="orange" className="rounded-full border-none text-[10px] px-2 m-0 font-bold">
                                      Đang làm bài
                                    </Tag>
                                  ) : (
                                    <Tag color="default" className="rounded-full border-none text-[10px] px-2 m-0">
                                      Chưa làm bài
                                    </Tag>
                                  )
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
                            <Tooltip title={isCompleted ? "Xem lại lịch sử bài làm" : isExhausted ? "Đã hết lượt làm bài" : undefined}>
                              <Button size="small"
                                type={isCompleted ? "default" : "primary"}
                                icon={isCompleted ? <HistoryOutlined /> : <PlayCircleOutlined />}
                                loading={isStarting}
                                disabled={isExamType ? false : isExhausted}
                                onClick={() => {
                                  if (isCompleted && item.enrollmentId) {
                                    setHistoryAssignmentStudentId(item.enrollmentId);
                                    setHistoryExamId(examId);
                                    setHistoryTitle(examTitle);
                                  } else {
                                    handleStartCurriculumExam(curriculumId, examId);
                                  }
                                }}
                                className={`rounded-lg font-semibold text-xs h-8 px-3 ${isCompleted
                                  ? "border-emerald-200 text-emerald-600 hover:border-emerald-400"
                                  : "shadow-sm shadow-indigo-500/20"}`}
                              >
                                {isCompleted ? "Xem bài làm" : requiresRemediation ? "Làm lại câu sai" : attemptsCount > 0 ? "Làm tiếp" : "Làm bài"}
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
                <Title level={2} className="!mb-0.5 !text-slate-800 font-extrabold tracking-tight flex items-center gap-2">
                  <BookOpen size={24} className="text-indigo-600" />
                  <span>Bài học của tôi</span>
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
