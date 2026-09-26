import { Typography, Spin, Alert, Button, Empty, Input, Pagination } from "antd";
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Building2,
  ListChecks,
  Search,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { learningCmsService } from "../../services/learningCmsService";
import { academicService } from "../../services/academicService";
import { studentLearningService } from "../../services/studentLearningService";
import { useAuth } from "../../contexts/AuthContext";
import { Curriculum, Center } from "../../types/backend";
import { AppImage } from "../../components/AppImagePreview";
import { motion } from "framer-motion";

const { Title, Text } = Typography;

export default function Courses() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isStudent = user?.role === "student";

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Curriculums & Centers
  const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
  const [assignedMap, setAssignedMap] = useState<Map<string, any>>(new Map());
  const [centers, setCenters] = useState<Center[]>([]);
  const [selectedCenterId, setSelectedCenterId] = useState<string>("all");

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const isTeacher = user?.role === "teacher";
  const isAdmin = user?.role === "admin";

  // Reset page on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedLevel]);

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

        const promises: Promise<any>[] = [
          learningCmsService.curriculums.list({ status: "published", limit: 100 }),
          academicService.centers.list().catch(() => []),
        ];

        if (isStudent) {
          promises.push(studentLearningService.curriculums.list({ limit: 100 }).catch(() => []));
        }

        const [currRes, centerRes, studentRes] = await Promise.allSettled(promises);

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

        if (isStudent && studentRes && studentRes.status === "fulfilled") {
          const rawStudentList = Array.isArray(studentRes.value)
            ? studentRes.value
            : (studentRes.value as any)?.data ?? [];

          const map = new Map<string, any>();
          rawStudentList.forEach((item: any) => {
            const cId = item.curriculumId || item.curriculum?.id || item.id;
            if (cId) map.set(cId, item);
          });
          setAssignedMap(map);
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
  }, [isStudent]);

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

  // Paginated Curriculums (max 8 per page)
  const paginatedCurriculums = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredCurriculums.slice(startIndex, startIndex + pageSize);
  }, [filteredCurriculums, currentPage, pageSize]);

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
            {/* Lean Action Banner for Teacher / Admin */}
            {(isTeacher || isAdmin) && (
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
            {/* DANH MỤC KHÓA HỌC / GIÁO TRÌNH (COURSE CATALOG)              */}
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
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                    {paginatedCurriculums.map((curr, idx) => {
                      const examCount = curr.exams?.length || 0;
                      const assignedItem = isStudent ? assignedMap.get(curr.id) : null;
                      const isAssigned = Boolean(assignedItem);
                      const progress = Number(assignedItem?.progressPercentage) || 0;
                      const isCompleted =
                        assignedItem?.status === "completed" ||
                        assignedItem?.status === "finished" ||
                        progress >= 100;
                      const isInProgress =
                        progress > 0 || (Number(assignedItem?.completedExamsCount) || 0) > 0;

                      const renderStatusPill = () => {
                        if (!isStudent) {
                          return (
                            <span className="bg-emerald-500 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs">
                              Public
                            </span>
                          );
                        }
                        if (isCompleted) {
                          return (
                            <span className="bg-purple-600 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs">
                              Hoàn thành
                            </span>
                          );
                        }
                        if (isInProgress) {
                          return (
                            <span className="bg-blue-600 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs">
                              Đang học {progress}%
                            </span>
                          );
                        }
                        if (isAssigned) {
                          return (
                            <span className="bg-emerald-600 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs">
                              Đã giao
                            </span>
                          );
                        }
                        return (
                          <span className="bg-slate-500/90 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs">
                            Chưa giao
                          </span>
                        );
                      };

                      return (
                        <Link
                          key={curr.id}
                          to={`/courses/published-curriculums/${curr.id}`}
                          className="block h-full no-underline text-inherit"
                        >
                          <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            whileHover={{ y: -6 }}
                            className="bg-white rounded-2xl overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 border border-slate-200/80 flex flex-col h-full group cursor-pointer"
                          >
                            {/* Course Thumbnail 16:10 */}
                            <div className="w-full aspect-[16/10] overflow-hidden bg-slate-100 relative">
                              {curr.image ? (
                                <AppImage
                                  src={curr.image}
                                  alt={curr.title}
                                  preview={false}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  rootClassName="w-full h-full"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 flex flex-col items-center justify-center text-white p-4 group-hover:scale-105 transition-transform duration-500">
                                  <BookOpen size={32} className="mb-1.5 opacity-80" />
                                  <span className="font-bold text-sm tracking-wider uppercase opacity-90">
                                    {curr.code || "KATA EDU"}
                                  </span>
                                </div>
                              )}

                              {/* Level badge on image */}
                              {curr.level && (
                                <div className="absolute top-3 left-3 z-10">
                                  <span className="bg-white/95 backdrop-blur-sm text-blue-600 text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                                    {curr.level.name}
                                  </span>
                                </div>
                              )}

                              {/* Public / Assignment status pill */}
                              <div className="absolute top-3 right-3 z-10">
                                {renderStatusPill()}
                              </div>
                            </div>

                            {/* Course Details */}
                            <div className="p-4 flex-1 flex flex-col justify-between">
                              <div>
                                {/* Code / Subject Tag */}
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <span className="text-[11px] font-mono font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                    {curr.code}
                                  </span>
                                  {curr.subject?.name && (
                                    <span className="text-[11px] font-bold text-blue-600 truncate max-w-[130px]">
                                      {curr.subject.name}
                                    </span>
                                  )}
                                </div>

                                {/* Title */}
                                <h3 className="text-base font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors line-clamp-1 leading-snug" title={curr.title}>
                                  {curr.title}
                                </h3>

                                {/* Short description */}
                                <p className="text-slate-500 text-xs leading-relaxed line-clamp-2 mb-3 min-h-[32px]">
                                  {curr.description || "Chương trình giáo trình đào tạo chuẩn hóa."}
                                </p>
                              </div>

                              {/* Footer Meta & Action */}
                              <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-auto text-xs">
                                <div className="flex items-center gap-1 text-slate-500 font-medium">
                                  <ListChecks size={14} className="text-blue-600" />
                                  <span>{examCount} bài thi</span>
                                </div>

                                <span className={`inline-flex items-center gap-1 font-bold group-hover:translate-x-0.5 transition-all ${isAssigned ? "text-emerald-600 group-hover:text-emerald-700" : "text-blue-600 group-hover:text-blue-700"}`}>
                                  {isStudent ? (isAssigned ? (isInProgress ? "Học tiếp" : "Vào học ngay") : "Xem chi tiết") : "Vào học"} <ArrowRight size={14} />
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        </Link>
                      );
                    })}
                  </div>

                  {/* Pagination when total items > pageSize */}
                  {filteredCurriculums.length > pageSize && (
                    <div className="flex justify-center pt-8">
                      <Pagination
                        current={currentPage}
                        pageSize={pageSize}
                        total={filteredCurriculums.length}
                        onChange={(page) => {
                          setCurrentPage(page);
                          window.scrollTo({ top: 250, behavior: "smooth" });
                        }}
                        showSizeChanger={false}
                      />
                    </div>
                  )}
                </>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
