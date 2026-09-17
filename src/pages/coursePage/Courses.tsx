import { Typography, Row, Col, Spin, Alert, Tag, Button, Empty, Input } from "antd";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Clock,
  PlayCircle,
  Building2,
  ChevronRight,
  ListChecks,
  Search,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { studentLearningService } from "../../services/studentLearningService";
import { learningCmsService } from "../../services/learningCmsService";
import { academicService } from "../../services/academicService";
import { useAuth } from "../../contexts/AuthContext";
import { Curriculum, Center } from "../../types/backend";
import { AppImage } from "../../components/AppImagePreview";
import { motion } from "framer-motion";

const { Title, Text } = Typography;

export default function Courses() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Curriculums & Centers
  const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [selectedCenterId, setSelectedCenterId] = useState<string>("all");

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");

  // Assigned exams for student
  const [assignedExams, setAssignedExams] = useState<any[]>([]);
  const [startingExamKey, setStartingExamKey] = useState<string | null>(null);

  const isStudent = user?.role === "student";
  const isTeacher = user?.role === "teacher";
  const isAdmin = user?.role === "admin";

  // Determine user center
  const userCenterId = useMemo(() => {
    if (user?.centerId) return user.centerId;
    const studentClassCenter = user?.student?.classes?.find((c: any) => c.class?.centerId || c.centerId);
    if (studentClassCenter) return studentClassCenter.class?.centerId || studentClassCenter.centerId;
    const teacherClassCenter = user?.teacher?.classes?.find((c: any) => c.class?.centerId || c.centerId);
    if (teacherClassCenter) return teacherClassCenter.class?.centerId || teacherClassCenter.centerId;
    return null;
  }, [user]);

  useEffect(() => {
    if (userCenterId) {
      setSelectedCenterId(userCenterId);
    }
  }, [userCenterId]);

  useEffect(() => {
    let active = true;

    async function fetchData() {
      try {
        setIsLoading(true);

        const [currRes, centerRes, examRes] = await Promise.allSettled([
          learningCmsService.curriculums.list({ status: "published", limit: 100 }),
          academicService.centers.list().catch(() => []),
          isStudent ? studentLearningService.examAssignments.list({ page: 1, limit: 10 }) : Promise.resolve({ data: [] }),
        ]);

        if (!active) return;

        if (currRes.status === "fulfilled") {
          const rawList = (currRes.value as any)?.data ?? [];
          // Backend GET /learning/curriculums (list) does not include the 'exams' relation.
          // Fetch curriculum details in parallel to get the exact exams array & count.
          const fullCurrs = await Promise.all(
            rawList.map(async (item: Curriculum) => {
              if (item.exams && item.exams.length > 0) return item;
              try {
                const detail = await learningCmsService.curriculums.get(item.id);
                return { ...item, ...detail };
              } catch {
                return item;
              }
            })
          );
          setCurriculums(fullCurrs);
        }

        if (centerRes.status === "fulfilled") {
          setCenters(Array.isArray(centerRes.value) ? centerRes.value : []);
        }

        if (examRes.status === "fulfilled") {
          const rawAssignments = (examRes.value as any)?.data ?? [];
          const flattened: any[] = [];
          for (const row of rawAssignments) {
            const assignmentStudentId = row.id;
            const assignmentTitle = row.assignment?.title || "Bài thi được giao";
            const examsArr = row.exams || row.assignment?.exams || [];
            if (examsArr.length > 0) {
              for (const exMap of examsArr) {
                const ex = exMap.exam;
                const examId = exMap.examId || ex?.id;
                if (!examId) continue;
                flattened.push({
                  assignmentStudentId,
                  examId,
                  title: ex?.title || assignmentTitle,
                  code: ex?.code,
                  timeLimitSeconds: ex?.timeLimitSeconds,
                  status: exMap.status || row.status,
                  finished: exMap.finished,
                  bestPercentage: exMap.bestPercentage,
                  attemptsCount: exMap.attemptsCount || 0,
                  className: row.class?.name || row.assignment?.class?.name,
                });
              }
            } else if (row.exam || row.assignment?.exam) {
              const ex = row.exam || row.assignment?.exam;
              flattened.push({
                assignmentStudentId,
                examId: ex.id,
                title: ex.title || assignmentTitle,
                code: ex.code,
                timeLimitSeconds: ex.timeLimitSeconds,
                status: row.status,
                finished: row.finished,
                bestPercentage: row.bestPercentage,
                attemptsCount: row.attemptsCount || 0,
                className: row.class?.name || row.assignment?.class?.name,
              });
            }
          }
          setAssignedExams(flattened);
        }

        setError(null);
      } catch (err: any) {
        if (active) setError(err?.message || "Không thể tải dữ liệu khóa học.");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    fetchData();
    return () => {
      active = false;
    };
  }, [user, isStudent]);

  // Handle start exam
  const handleStartAssignedExam = async (assignmentStudentId: string, examId: string) => {
    const key = `${assignmentStudentId}:${examId}`;
    try {
      setStartingExamKey(key);
      const attempt = await studentLearningService.examAssignments.startAttempt(assignmentStudentId, examId);
      const attemptId = (attempt as any)?.id;
      if (!attemptId) throw new Error("Backend không trả về attemptId.");
      navigate(`/exam/${attemptId}`);
    } catch (err: any) {
      setError(err?.message || "Không thể bắt đầu làm bài thi.");
    } finally {
      setStartingExamKey(null);
    }
  };

  // Center display name
  const currentCenter = useMemo(() => {
    if (selectedCenterId && selectedCenterId !== "all") {
      return centers.find((c) => c.id === selectedCenterId);
    }
    return null;
  }, [centers, selectedCenterId]);

  // Levels for filter pills
  const availableLevels = useMemo(() => {
    const map = new Map<string, string>();
    curriculums.forEach((c) => {
      if (c.level?.id && c.level?.name) {
        map.set(c.level.id, c.level.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [curriculums]);

  // Filtered Curriculums
  const filteredCurriculums = useMemo(() => {
    return curriculums.filter((c) => {
      const matchSearch =
        !searchQuery.trim() ||
        c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchLevel = selectedLevel === "all" || c.level?.id === selectedLevel;
      return matchSearch && matchLevel;
    });
  }, [curriculums, searchQuery, selectedLevel]);

  return (
    <div className="w-full bg-slate-50 py-12 px-6 md:px-16 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* ============================================================ */}
        {/* HERO / SEARCH HEADER                                         */}
        {/* ============================================================ */}
        <div className="relative rounded-3xl bg-white p-8 md:p-10 shadow-sm overflow-hidden border border-slate-100">
          <div className="absolute -right-16 -top-16 w-80 h-80 bg-blue-50/70 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 w-80 h-80 bg-blue-50/50 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-sm font-semibold text-blue-600 mb-3">
                <Sparkles size={15} />
                <span>Học tập & Đánh giá năng lực</span>
              </div>
              <Title level={2} className="!text-3xl md:!text-4xl !font-bold !text-slate-800 !mb-2">
                Khoá học & Giáo trình
              </Title>
              <Text className="text-base md:text-lg text-slate-600 max-w-2xl block leading-relaxed">
                Khám phá lộ trình bài giảng chuẩn hoá và hoàn thành các bài thi theo chương trình đào tạo.
              </Text>
            </div>

            {/* Quick Center Pill */}
            <div className="shrink-0 flex items-center gap-2.5 bg-slate-50 border border-slate-200/80 px-4 py-2.5 rounded-2xl text-sm text-slate-700 shadow-xs">
              <Building2 size={16} className="text-blue-600 shrink-0" />
              <div className="truncate max-w-[220px] font-semibold text-slate-800">
                {currentCenter?.name || "Trung tâm khảo thí"}
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="relative z-10 mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Input
                size="large"
                prefix={<Search size={18} className="text-slate-400 mr-2" />}
                placeholder="Tìm khóa học theo tên hoặc mã giáo trình..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                allowClear
                className="rounded-2xl bg-slate-50/80 hover:bg-white focus:bg-white text-slate-800 border border-slate-200 text-base !py-2.5 shadow-xs"
              />
            </div>

            {/* Level Filter Pills */}
            {availableLevels.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto py-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedLevel("all")}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    selectedLevel === "all"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800"
                  }`}
                >
                  Tất cả
                </button>
                {availableLevels.map((lvl) => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setSelectedLevel(lvl.id)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      selectedLevel === lvl.id
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800"
                    }`}
                  >
                    {lvl.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {error && <Alert type="error" showIcon message={error} className="rounded-2xl" />}

        {isLoading ? (
          <div className="flex justify-center py-24">
            <Spin size="large" />
          </div>
        ) : (
          <>
            {/* ============================================================ */}
            {/* PHẦN 1: BÀI TẬP ĐƯỢC GIAO (STUDENT / TEACHER / ADMIN)        */}
            {/* ============================================================ */}
            {isStudent ? (
              assignedExams.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Title level={3} className="!text-2xl !font-bold !text-slate-800 !m-0">
                        Bài tập cần hoàn thành
                      </Title>
                      <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full">
                        {assignedExams.length}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate("/profile?tab=my-exams")}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      Tất cả bài tập <ChevronRight size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {assignedExams.slice(0, 4).map((item) => {
                      const isStarting = startingExamKey === `${item.assignmentStudentId}:${item.examId}`;
                      const isDone = item.finished || item.status === "finished";

                      return (
                        <div
                          key={`${item.assignmentStudentId}:${item.examId}`}
                          className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <span
                                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                                  isDone
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                    : "bg-amber-50 text-amber-700 border border-amber-200/60"
                                }`}
                              >
                                {isDone ? "Đã nộp bài" : "Chưa hoàn thành"}
                              </span>
                              {item.className && (
                                <span className="text-xs text-slate-400 font-medium truncate max-w-[120px]">
                                  {item.className}
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-slate-800 text-base leading-snug line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">
                              {item.title}
                            </h4>
                          </div>

                          <div className="pt-3 border-t border-slate-100 mt-2 flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                              <Clock size={14} className="text-slate-400" />
                              {item.timeLimitSeconds ? `${Math.ceil(item.timeLimitSeconds / 60)} phút` : "Tự do"}
                            </span>

                            <Button
                              type={isDone ? "default" : "primary"}
                              size="middle"
                              icon={<PlayCircle size={15} />}
                              loading={isStarting}
                              onClick={() => handleStartAssignedExam(item.assignmentStudentId, item.examId)}
                              className={`rounded-xl font-semibold text-xs h-8 ${
                                isDone ? "border-slate-300" : "bg-blue-600 hover:bg-blue-500"
                              }`}
                            >
                              {isDone ? "Luyện lại" : "Làm ngay"}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )
            ) : (
              // Lean Action Banner for Teacher / Admin
              <div className="bg-white rounded-3xl border border-slate-100 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 text-base">
                      {isTeacher ? "Quản lý bài giảng & phân công" : "Quản lý giáo trình & ngân hàng đề"}
                    </div>
                    <div className="text-sm text-slate-500">
                      {isTeacher
                        ? "Xem tiến độ và phân công bài tập cho học sinh lớp bạn phụ trách"
                        : "Cấu hình giáo trình, đề thi và chương trình đào tạo toàn trung tâm"}
                    </div>
                  </div>
                </div>

                <Button
                  type="primary"
                  size="middle"
                  onClick={() => navigate(isTeacher ? "/teacher/assignments" : "/admin/cms/curriculums")}
                  className="bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold shrink-0"
                >
                  {isTeacher ? "Đến trang Giao bài" : "Quản lý Giáo trình CMS"}
                </Button>
              </div>
            )}

            {/* ============================================================ */}
            {/* PHẦN 2: DANH MỤC KHÓA HỌC / GIÁO TRÌNH (COURSE CATALOG)      */}
            {/* ============================================================ */}
            <section className="space-y-6">
              <div className="flex items-end justify-between">
                <div>
                  <Title level={2} className="!text-3xl !font-bold !text-slate-800 !mb-2">
                    Chương trình giáo trình
                  </Title>
                  <Text className="text-base text-slate-600 block">
                    Chọn giáo trình để xem cấu trúc và luyện tập các bộ đề kiểm tra.
                  </Text>
                </div>

                <span className="text-sm font-semibold text-slate-500 bg-white border border-slate-200 px-3.5 py-1 rounded-full shadow-xs">
                  {filteredCurriculums.length} giáo trình
                </span>
              </div>

              {filteredCurriculums.length === 0 ? (
                <div className="bg-white p-16 rounded-3xl border border-slate-100 text-center shadow-sm">
                  <Empty
                    description={
                      searchQuery
                        ? "Không tìm thấy giáo trình phù hợp với từ khóa."
                        : "Hiện chưa có giáo trình nào được công khai."
                    }
                  />
                  {searchQuery && (
                    <Button
                      type="link"
                      onClick={() => setSearchQuery("")}
                      className="text-blue-600 font-semibold text-sm mt-2"
                    >
                      Xóa bộ lọc tìm kiếm
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8">
                  {filteredCurriculums.map((curr, idx) => {
                    const examCount = curr.exams?.length || 0;

                    return (
                      <motion.div
                        key={curr.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        whileHover={{ y: -8 }}
                        className="bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-slate-100 flex flex-col h-full group cursor-pointer"
                        onClick={() => navigate(`/courses/published-curriculums/${curr.id}`)}
                      >
                        {/* Course Thumbnail 16:9 */}
                        <div className="w-full aspect-[16/9] overflow-hidden bg-slate-100 relative">
                          {curr.image ? (
                            <AppImage
                              src={curr.image}
                              alt={curr.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              rootClassName="w-full h-full"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 flex flex-col items-center justify-center text-white p-4 group-hover:scale-110 transition-transform duration-500">
                              <BookOpen size={40} className="mb-2 opacity-80" />
                              <span className="font-bold text-base tracking-wider uppercase opacity-90">
                                {curr.code || "KATA EDU"}
                              </span>
                            </div>
                          )}

                          {/* Level badge on image (matching Home style) */}
                          {curr.level && (
                            <div className="absolute top-4 left-4 z-10">
                              <span className="bg-white/95 backdrop-blur-sm text-blue-600 text-xs font-bold px-3.5 py-1 rounded-full shadow-sm">
                                {curr.level.name}
                              </span>
                            </div>
                          )}

                          {/* Public status pill */}
                          <div className="absolute top-4 right-4 z-10">
                            <span className="bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm">
                              Public
                            </span>
                          </div>
                        </div>

                        {/* Course Details (Matching CourseHighlights typography) */}
                        <div className="p-6 md:p-8 flex-1 flex flex-col justify-between">
                          <div>
                            {/* Code / Subject Tag */}
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-mono font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                {curr.code}
                              </span>
                              {curr.subject?.name && (
                                <span className="text-xs font-bold text-blue-600 truncate max-w-[160px]">
                                  {curr.subject.name}
                                </span>
                              )}
                            </div>

                            {/* Title (matches text-2xl font-bold text-slate-800 from Home) */}
                            <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                              {curr.title}
                            </h3>

                            {/* Short description */}
                            {curr.description && (
                              <p className="text-slate-500 text-sm md:text-base leading-relaxed line-clamp-2 mb-4">
                                {curr.description}
                              </p>
                            )}
                          </div>

                          {/* Footer Meta & Action */}
                          <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-auto">
                            <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
                              <ListChecks size={16} className="text-blue-600" />
                              <span>{examCount} bài thi</span>
                            </div>

                            <span className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 group-hover:text-blue-700 group-hover:translate-x-1 transition-all">
                              Vào học <ArrowRight size={16} />
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}


