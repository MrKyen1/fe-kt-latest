import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  Col,
  ConfigProvider,
  Empty,
  Modal,
  Pagination,
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
import {
  History,
  BookOpen,
  Clock,
  FileText,
  ArrowLeft,
  ArrowRight,
  ListChecks,
  Play,
  CheckCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { AppImage } from "../../../components/AppImagePreview";

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
import {
  enrichExamAssignments,
  flattenAssignedExams,
  getAssignedExamStatus,
  getAssignedExamAction,
  FlattenedAssignedExam,
  formatScore,
} from "../../../utils/studentExamUtils";
import { learningCmsService } from "../../../services/learningCmsService";
import { resolveMediaUrl } from "../../../services/apiClient";

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
  const [selectedCurriculumId, setSelectedCurriculumId] = useState<string | null>(null);

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
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, filterType, filterStatus]);

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
        const enriched = await enrichExamAssignments(summaryList);
        setExamAssignments(enriched);
      }

      // --- Curriculum items ---
      if (curriculumRes.status === "fulfilled" && curriculumRes.value?.data) {
        const cList = curriculumRes.value.data as any[];
        const enrichedC = await Promise.allSettled(
          cList.map(async (item: any) => {
            try {
              const [studentDetail, cmsDetail] = await Promise.allSettled([
                studentLearningService.curriculums.get(item.curriculumId),
                learningCmsService.curriculums.get(item.curriculumId),
              ]);
              const sVal = studentDetail.status === "fulfilled" ? studentDetail.value : {};
              const cVal =
                cmsDetail.status === "fulfilled" && (cmsDetail.value as any)?.data
                  ? (cmsDetail.value as any).data
                  : cmsDetail.status === "fulfilled"
                  ? cmsDetail.value
                  : {};

              return {
                ...item,
                ...sVal,
                curriculum: {
                  ...(item.curriculum ?? {}),
                  ...((sVal as any)?.curriculum ?? {}),
                  ...cVal,
                },
              };
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
        if ((res as any)?.mastered) {
          message.info("Bạn đã hoàn thành xuất sắc 100% bài thi này!");
          return;
        }
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
        if ((res as any)?.mastered) {
          message.info("Bạn đã hoàn thành xuất sắc 100% bài thi trong lộ trình!");
          return;
        }
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
    return flattenAssignedExams(examAssignments);
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

  const paginatedAssignedExams = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAssignedExams.slice(startIndex, startIndex + pageSize);
  }, [filteredAssignedExams, currentPage, pageSize]);

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

        {/* Flat Table List View */}
        {filteredAssignedExams.length === 0 ? (
          <div className="py-12 bg-white rounded-2xl border border-slate-100 text-center">
            <Empty description={<span className="text-slate-400 font-medium">Không tìm thấy bài thi nào phù hợp với bộ lọc.</span>} />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mt-5">
            {/* Table Header */}
            <div className="hidden md:grid md:grid-cols-12 gap-4 px-5 py-3 bg-slate-50/80 border-b border-slate-200/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <div className="col-span-4">Bài thi & Lớp học</div>
              <div className="col-span-2 text-center">Thời lượng & Lượt làm</div>
              <div className="col-span-2 text-center">Tiến độ</div>
              <div className="col-span-2 text-center">Trạng thái</div>
              <div className="col-span-2 text-right">Thao tác</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-slate-100">
              {paginatedAssignedExams.map((item: any) => {
                const isStarting = startingId === `${item.assignmentStudentId}:${item.examId}`;
                const statusInfo = getAssignedExamStatus(item);
                const actionInfo = getAssignedExamAction(item);

                return (
                  <div
                    key={item.id}
                    className="grid grid-cols-1 md:grid-cols-12 gap-4 px-5 py-3.5 items-center hover:bg-slate-50/70 transition-colors"
                  >
                    {/* Cột 1: Bài thi & Lớp học */}
                    <div className="col-span-1 md:col-span-4 flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0 shadow-sm ${
                          item.isCompleted
                            ? "bg-emerald-500 text-white"
                            : item.isExamType
                            ? "bg-purple-100 text-purple-600 border border-purple-200"
                            : "bg-blue-100 text-blue-600 border border-blue-200"
                        }`}
                      >
                        {item.isCompleted ? <CheckCircleOutlined /> : item.isExamType ? <FileTextOutlined /> : <BookOutlined />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="font-bold text-slate-800 text-sm hover:text-indigo-600 transition cursor-pointer line-clamp-1"
                            onClick={() => {
                              if (actionInfo.actionType === "review") {
                                if (item.lastAttemptId) {
                                  navigate(`/exam/${item.lastAttemptId}`);
                                } else {
                                  setHistoryAssignmentStudentId(item.assignmentStudentId);
                                  setHistoryExamId(item.examId);
                                  setHistoryTitle(item.examTitle);
                                }
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
                        <div className="text-xs text-slate-400 font-medium truncate mt-0.5">
                          {item.assignmentTitle}
                        </div>
                      </div>
                    </div>

                    {/* Cột 2: Thời lượng & Lượt làm */}
                    <div className="col-span-1 md:col-span-2 flex md:flex-col md:items-center md:justify-center gap-1.5 text-xs text-slate-500">
                      {item.timeLimitSeconds ? (
                        <span className="flex items-center gap-1 text-slate-600 font-semibold">
                          <ClockCircleOutlined /> {Math.ceil(item.timeLimitSeconds / 60)} phút
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Không giới hạn</span>
                      )}
                      {item.attemptsCount > 0 ? (
                        <span className="text-slate-400">{item.attemptsCount} lần đã làm</span>
                      ) : (
                        <span className="text-slate-300">Chưa làm</span>
                      )}
                    </div>

                    {/* Cột 3: Tiến độ */}
                    <div className="col-span-1 md:col-span-2 flex flex-col items-center justify-center px-2">
                      {item.attemptsCount > 0 ? (
                        <div className="w-full max-w-[120px] flex flex-col items-center">
                          <div className="flex justify-between w-full text-xs font-bold mb-1">
                            <span className={item.isCompleted ? "text-emerald-600" : "text-slate-700"}>
                              {item.bestPctVal.toFixed(0)}%
                            </span>
                            {item.bestScore && (
                              <span className="text-[11px] font-normal text-slate-400">
                                {formatScore(item.bestScore)} đ
                              </span>
                            )}
                          </div>
                          <Progress
                            percent={Math.round(item.bestPctVal)}
                            size="small"
                            showInfo={false}
                            strokeColor={item.isCompleted ? "#10b981" : item.bestPctVal >= 50 ? "#f59e0b" : "#ef4444"}
                            className="m-0 w-full"
                          />
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs italic">—</span>
                      )}
                    </div>

                    {/* Cột 4: Trạng thái */}
                    <div className="col-span-1 md:col-span-2 flex md:justify-center items-center">
                      <Tag color={statusInfo.color} className="rounded-full border-none text-xs px-2.5 py-0.5 font-bold">
                        {statusInfo.label}
                      </Tag>
                    </div>

                    {/* Cột 5: Thao tác */}
                    <div className="col-span-1 md:col-span-2 flex items-center justify-end gap-1.5">
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
                            className="rounded-xl border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 text-xs h-8 px-2.5 font-semibold"
                          >
                            Lịch sử
                          </Button>
                        </Tooltip>
                      )}

                      <Tooltip title={actionInfo.actionType === "review" ? "Xem lại bài thi đã làm" : undefined}>
                        <Button
                          size="small"
                          type={actionInfo.isPrimary ? "primary" : "default"}
                          icon={actionInfo.actionType === "review" ? <HistoryOutlined /> : <PlayCircleOutlined />}
                          loading={isStarting}
                          onClick={() => {
                            if (actionInfo.actionType === "review") {
                              if (item.lastAttemptId) {
                                navigate(`/exam/${item.lastAttemptId}`);
                              } else {
                                setHistoryAssignmentStudentId(item.assignmentStudentId);
                                setHistoryExamId(item.examId);
                                setHistoryTitle(item.examTitle);
                              }
                            } else {
                              handleStartExam(item.assignmentStudentId, item.examId);
                            }
                          }}
                          className={`rounded-xl font-bold text-xs h-8 px-3 transition ${
                            actionInfo.actionType === "review"
                              ? "border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                              : "bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20 text-white"
                          }`}
                        >
                          {actionInfo.label}
                        </Button>
                      </Tooltip>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Footer */}
            {filteredAssignedExams.length > 0 && (
              <div className="px-5 py-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 bg-slate-50/50">
                <span className="text-xs text-slate-500 font-medium">
                  Hiển thị{" "}
                  <strong>
                    {Math.min((currentPage - 1) * pageSize + 1, filteredAssignedExams.length)}
                  </strong>{" "}
                  -{" "}
                  <strong>
                    {Math.min(currentPage * pageSize, filteredAssignedExams.length)}
                  </strong>{" "}
                  trên <strong>{filteredAssignedExams.length}</strong> bài thi
                </span>
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={filteredAssignedExams.length}
                  onChange={(page) => setCurrentPage(page)}
                  showSizeChanger={false}
                  size="small"
                />
              </div>
            )}
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
          <Empty
            description={
              <span className="text-slate-400">
                Chưa có lộ trình học nào.
                <br />
                Bạn sẽ thấy giáo trình khi được giao trực tiếp hoặc khi lớp của bạn được gắn giáo trình.
              </span>
            }
          />
        </div>
      );
    }

    // 1. Grid view: hiển thị danh sách giáo trình dạng thẻ giống Course Page (Image 2)
    if (!selectedCurriculumId) {
      return (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-800 m-0">Lộ trình học của bạn</h3>
              <p className="text-sm text-slate-500 mt-1 m-0">
                Các giáo trình được phân công trực tiếp hoặc qua lớp học. Chọn giáo trình để xem danh sách bài thi.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-3.5 py-1 rounded-full shadow-xs">
              {curriculumItems.length} giáo trình
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {curriculumItems.map((item: any, idx: number) => {
              const curriculumId = item.curriculumId;
              const curriculum = item.curriculum;
              const title = curriculum?.title || curriculum?.code || "Lộ trình học";
              const accessType = item.accessType; // 'class' | 'direct'
              const progressPct = parseFloat(item.progressPercentage ?? "0");
              const completedCount = item.completedExamsCount ?? item.finishedExamsCount ?? 0;
              const totalRequired = item.totalRequiredExamsCount ?? 0;
              const exams: any[] = item.exams ?? [];
              const levelName = curriculum?.level?.name || (curriculum as any)?.levelName;
              const subjectName = curriculum?.subject?.name || curriculum?.specialization?.name;
              const description = curriculum?.description;
              const imageUrl = curriculum?.image ? resolveMediaUrl(curriculum.image) : null;

              return (
                <motion.div
                  key={curriculumId}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ y: -6 }}
                  onClick={() => setSelectedCurriculumId(curriculumId)}
                  className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 flex flex-col h-full group cursor-pointer"
                >
                  {/* Thumbnail 16:9 */}
                  <div className="w-full aspect-[16/9] overflow-hidden bg-slate-100 relative">
                    {imageUrl ? (
                      <AppImage
                        src={imageUrl}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        rootClassName="w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 flex flex-col items-center justify-center text-white p-4 group-hover:scale-105 transition-transform duration-500">
                        <BookOpen size={40} className="mb-2 opacity-80" />
                        <span className="font-bold text-base tracking-wider uppercase opacity-90">
                          {curriculum?.code || "KATA EDU"}
                        </span>
                      </div>
                    )}

                    {/* Level badge */}
                    {levelName && (
                      <div className="absolute top-3.5 left-3.5 z-10">
                        <span className="bg-white/95 backdrop-blur-sm text-blue-600 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                          {levelName}
                        </span>
                      </div>
                    )}

                    {/* Public / Access Tag */}
                    <div className="absolute top-3.5 right-3.5 z-10">
                      <span className="bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm">
                        PUBLIC
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 md:p-6 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Subject tag */}
                      <div className="flex items-center gap-2 mb-2">
                        {subjectName ? (
                          <span className="text-xs font-bold text-blue-600 truncate max-w-[180px]">
                            {subjectName}
                          </span>
                        ) : curriculum?.code ? (
                          <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {curriculum.code}
                          </span>
                        ) : null}
                      </div>

                      {/* Title */}
                      <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">
                        {title}
                      </h3>

                      {/* Description */}
                      <p className="text-slate-500 text-xs leading-relaxed mb-4 line-clamp-2 min-h-[32px]">
                        {description || "Giáo trình đào tạo chuẩn hoá theo khung đánh giá năng lực."}
                      </p>

                      {/* Progress Bar */}
                      <div className="mb-4 pt-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-500 font-medium">
                            {completedCount}/{totalRequired || exams.length} bài hoàn thành
                          </span>
                          <span className="text-blue-600 font-bold">
                            {Math.round(progressPct)}%
                          </span>
                        </div>
                        <Progress
                          percent={Math.round(progressPct)}
                          showInfo={false}
                          strokeColor="#3b82f6"
                          trailColor="#f1f5f9"
                          size={{ height: 6 }}
                        />
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-600">
                        <ListChecks size={15} className="text-blue-600" />
                        {exams.length} bài thi
                      </span>
                      <span className="font-bold text-blue-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                        Vào học <ArrowRight size={13} />
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      );
    }

    // 2. Drill-down view: Khi học sinh click vào một giáo trình cụ thể (Image 3)
    const selectedItem = curriculumItems.find((item: any) => item.curriculumId === selectedCurriculumId);
    if (!selectedItem) {
      setSelectedCurriculumId(null);
      return null;
    }

    const curriculumId = selectedItem.curriculumId;
    const curriculum = selectedItem.curriculum;
    const title = curriculum?.title || curriculum?.code || "Lộ trình học";
    const accessType = selectedItem.accessType;
    const progressPct = parseFloat(selectedItem.progressPercentage ?? "0");
    const completedCount = selectedItem.completedExamsCount ?? selectedItem.finishedExamsCount ?? 0;
    const totalRequired = selectedItem.totalRequiredExamsCount ?? 0;
    const exams: any[] = selectedItem.exams ?? [];
    const levelName = curriculum?.level?.name || (curriculum as any)?.levelName;
    const subjectName = curriculum?.subject?.name || curriculum?.specialization?.name || curriculum?.code;
    const description = curriculum?.description;

    return (
      <div className="space-y-6">
        {/* Back navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedCurriculumId(null)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors bg-white hover:bg-blue-50 px-4 py-2 rounded-xl border border-slate-200 cursor-pointer shadow-xs"
          >
            <ArrowLeft size={16} /> Quay lại danh sách lộ trình
          </button>
        </div>

        {/* Curriculum Banner */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-6 md:p-8 text-white shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-xs font-semibold">
                  Lộ trình học
                </span>
                {levelName && (
                  <span className="bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-xs font-semibold">
                    {levelName}
                  </span>
                )}
                {accessType === "class" ? (
                  <span className="bg-cyan-400/30 text-cyan-100 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                    Qua lớp
                  </span>
                ) : (
                  <span className="bg-emerald-400/30 text-emerald-100 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                    Trực tiếp
                  </span>
                )}
                {curriculum?.code && (
                  <span className="font-mono text-xs opacity-80">
                    {curriculum.code}
                  </span>
                )}
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">
                {title}
              </h2>
              {description && (
                <p className="text-white/80 text-sm leading-relaxed m-0 max-w-xl">
                  {description}
                </p>
              )}
            </div>

            <div className="flex md:flex-col items-center justify-center bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-center min-w-[140px] shrink-0">
              <div className="text-3xl font-black text-white">
                {Math.round(progressPct)}%
              </div>
              <div className="text-xs text-white/80 mt-0.5">
                Hoàn thành
              </div>
              <div className="text-[11px] text-white/70 mt-1">
                {completedCount}/{totalRequired || exams.length} bài bắt buộc
              </div>
            </div>
          </div>
        </div>

        {/* Exam List Card matching Image 3 */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <FileText size={18} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 m-0">
              Danh sách bài thi ({exams.length})
            </h3>
          </div>

          {exams.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Lộ trình này hiện chưa có bài thi nào.
            </div>
          ) : (
            <div className="space-y-4">
              {exams
                .sort(
                  (a: any, b: any) =>
                    (a.orderIndex ?? a.curriculumExam?.orderIndex ?? 0) -
                    (b.orderIndex ?? b.curriculumExam?.orderIndex ?? 0)
                )
                .map((ep: any, idx: number) => {
                  const exam = ep.exam;
                  const examId = ep.examId || exam?.id;
                  const examTitle = exam?.title || exam?.code || `Bài thi ${idx + 1}`;
                  const isRequired = ep.isRequired ?? ep.curriculumExam?.isRequired ?? true;
                  const examType = exam?.examType ?? ep.examType ?? "practice";
                  const isExamType = examType === "exam";
                  const timeLimitMinutes = exam?.timeLimitSeconds
                    ? Math.ceil(exam.timeLimitSeconds / 60)
                    : null;
                  const questionCount =
                    exam?.questionsCount ??
                    exam?.questionCount ??
                    exam?.questions?.length ??
                    exam?.examQuestions?.length ??
                    (ep.firstAttemptResult?.maxScore
                      ? Math.trunc(Number(ep.firstAttemptResult.maxScore))
                      : null);
                  const bestPctVal = parseFloat(
                    ep.bestPercentage ?? ep.bestScorePct ?? ep.bestScore ?? "0"
                  );
                  const attemptsCount =
                    ep.attemptsCount ?? ep.attemptCount ?? ep.attempts?.length ?? 0;
                  const isMastered = Boolean(ep.mastered ?? (bestPctVal >= 100));
                  // isCompleted: đã mastered (100%) hoặc đã "finished" (task done theo backend)
                  const isCompleted =
                    isMastered ||
                    bestPctVal >= 100 ||
                    ep.status === "finished";
                  const requiresRemediation =
                    ep.requiresRemediation ?? (!isMastered && attemptsCount >= 1);
                  const startKey = `${curriculumId}:${examId}`;
                  const isStarting = startingId === startKey;

                  return (
                    <div
                      key={examId || idx}
                      className="bg-white rounded-2xl p-4 md:p-5 border border-slate-100 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                    >
                      {/* Left + Middle: Index + Title + Meta row */}
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-base shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          {idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-slate-800 text-base leading-snug truncate mb-1">
                            {examTitle}
                          </h4>
                          <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                            <span className="flex items-center gap-1 font-medium">
                              <Clock size={13} className="text-slate-400" />
                              {timeLimitMinutes ? `${timeLimitMinutes} phút` : "Tự do"}
                            </span>
                            {questionCount != null && questionCount > 0 && (
                              <span className="flex items-center gap-1 font-medium">
                                <FileText size={13} className="text-slate-400" />
                                {questionCount} câu hỏi
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                isRequired
                                  ? "bg-rose-50 text-rose-600"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {isRequired ? "Bắt buộc" : "Tùy chọn"}
                            </span>
                            <Tag
                              color={isExamType ? "purple" : "blue"}
                              className="rounded-full border-none text-[10px] px-2 m-0 font-semibold"
                            >
                              {isExamType ? "Kiểm tra" : "Ôn tập"}
                            </Tag>
                            {isCompleted ? (
                              <Tag
                                color="green"
                                className="rounded-full border-none text-[10px] px-2 m-0 font-bold"
                              >
                                Đã hoàn thành (100%)
                              </Tag>
                            ) : requiresRemediation ? (
                              <Tag
                                color="volcano"
                                className="rounded-full border-none text-[10px] px-2 m-0 font-bold"
                              >
                                Cần làm lại câu sai
                              </Tag>
                            ) : attemptsCount > 0 ? (
                              <Tag
                                color="orange"
                                className="rounded-full border-none text-[10px] px-2 m-0 font-bold"
                              >
                                Đang làm dở
                              </Tag>
                            ) : null}
                            {attemptsCount > 0 && (
                              <span className="text-slate-400 text-xs">
                                ({attemptsCount} lần làm)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {attemptsCount > 0 && (
                          <Tooltip title={ep.lastAttemptId ? "Xem bài làm gần nhất" : "Lịch sử làm bài"}>
                            <Button
                              size="middle"
                              icon={<HistoryOutlined />}
                              onClick={() => {
                                if (ep.lastAttemptId) {
                                  navigate(`/exam/${ep.lastAttemptId}`);
                                } else {
                                  message.info(`Đã làm ${attemptsCount} lượt, điểm cao nhất: ${bestPctVal.toFixed(0)}%`);
                                }
                              }}
                              className="rounded-xl border-slate-200 text-slate-600 hover:text-indigo-600 h-9 px-3"
                            />
                          </Tooltip>
                        )}
                        <Button
                          type="primary"
                          icon={<PlayCircleOutlined />}
                          loading={isStarting}
                          onClick={() => {
                            if (isCompleted && ep.lastAttemptId) {
                              navigate(`/exam/${ep.lastAttemptId}`);
                            } else {
                              handleStartCurriculumExam(curriculumId, examId);
                            }
                          }}
                          className={`rounded-xl font-semibold text-xs md:text-sm h-9 px-4 flex items-center gap-1.5 ${
                            isCompleted
                              ? "bg-emerald-600 hover:bg-emerald-500"
                              : "bg-indigo-600 hover:bg-indigo-500"
                          }`}
                        >
                          {isCompleted
                            ? "Xem bài làm"
                            : requiresRemediation
                            ? "Làm lại câu sai"
                            : attemptsCount > 0
                            ? "Làm tiếp"
                            : "Làm bài ngay"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
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
                    value={allAssignedExamItems.length}
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
              onChange={(key) => {
                setActiveTab(key);
                if (key !== "curriculums") {
                  setSelectedCurriculumId(null);
                }
              }}
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
                      <Badge count={allAssignedExamItems.length} style={{ backgroundColor: "#4f46e5" }} />
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
