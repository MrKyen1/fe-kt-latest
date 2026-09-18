import { Typography, Row, Col, Button, Spin } from "antd";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, ListChecks, PlayCircle, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { learningCmsService } from "../../../services/learningCmsService";
import { Curriculum } from "../../../types/backend";
import { AppImage } from "../../../components/AppImagePreview";

const { Title, Text } = Typography;

export default function CourseHighlights() {
  const navigate = useNavigate();
  const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadPopularCurriculums() {
      try {
        setLoading(true);
        // Try popular endpoint first
        let list: Curriculum[] = [];
        try {
          const res = await learningCmsService.curriculums.popular(5);
          list = Array.isArray(res) ? res : (res as any)?.data ?? [];
        } catch {
          // Fallback to published curriculums list
          const fallbackRes = await learningCmsService.curriculums.list({ status: "published", limit: 5 });
          list = (fallbackRes as any)?.data ?? [];
        }

        if (!active) return;

        // Fetch exam counts if exams relation not loaded
        const fullList = await Promise.all(
          list.map(async (item) => {
            if (item.exams && item.exams.length > 0) return item;
            try {
              const detail = await learningCmsService.curriculums.get(item.id);
              return { ...item, ...detail };
            } catch {
              return item;
            }
          })
        );

        if (active) {
          setCurriculums(fullList);
        }
      } catch (err) {
        console.warn("Failed to load popular curriculums:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPopularCurriculums();
    return () => {
      active = false;
    };
  }, []);

  if (!loading && curriculums.length === 0) {
    return null;
  }

  return (
    <section className="py-24 bg-blue-50/70 px-6 md:px-16">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-12">
          <div>
            <Title level={2} className="text-4xl font-bold text-slate-800 mb-4">
              Khóa Luyện Thi Nổi Bật
            </Title>
            <div className="w-24 h-1 bg-blue-600 rounded-full mb-4"></div>
            <Text className="text-lg text-slate-600">
              Các giáo trình được thiết kế chuẩn hoá và được phân công học nhiều nhất.
            </Text>
          </div>
          <Link
            to="/courses"
            className="text-blue-600 hover:text-blue-700 font-medium text-lg hidden md:flex items-center no-underline"
          >
            Xem tất cả <ArrowRight className="ml-1 w-5 h-5" />
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spin size="large" />
          </div>
        ) : (
          <Row gutter={[32, 32]}>
            {curriculums.slice(0, 6).map((course, idx) => {
              const examCount = course.exams?.length || (course as any).examsCount || 0;
              const assignedCount = (course as any).assignedStudentsCount;

              return (
                <Col xs={24} sm={12} lg={8} key={course.id}>
                  <Link
                    to={`/courses/published-curriculums/${course.id}`}
                    className="block h-full no-underline text-inherit"
                  >
                    <motion.div
                      whileHover={{ y: -8 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-slate-100 h-full flex flex-col group cursor-pointer"
                    >
                    {/* Image Cover */}
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
                      {course.image ? (
                        <AppImage
                          src={course.image}
                          alt={course.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          rootClassName="w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 flex flex-col items-center justify-center text-white p-4 group-hover:scale-110 transition-transform duration-500">
                          <BookOpen size={40} className="mb-2 opacity-80" />
                          <span className="font-bold text-base tracking-wider uppercase opacity-90">
                            {course.code || "KATA EDU"}
                          </span>
                        </div>
                      )}

                      {/* Level Badge */}
                      {course.level && (
                        <div className="absolute top-4 left-4 z-10">
                          <span className="bg-white/95 backdrop-blur-sm px-3.5 py-1 rounded-full text-xs font-bold text-blue-600 shadow-sm">
                            {course.level.name}
                          </span>
                        </div>
                      )}

                      {/* Public / Popular Tag */}
                      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5">
                        {assignedCount !== undefined && assignedCount > 0 && (
                          <span className="bg-blue-600/90 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                            <Users size={12} /> {assignedCount}
                          </span>
                        )}
                        <span className="bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm">
                          Public
                        </span>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-6 md:p-8 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Code / Subject */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-mono font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            {course.code}
                          </span>
                          {course.subject?.name && (
                            <span className="text-xs font-bold text-blue-600 truncate max-w-[160px]">
                              {course.subject.name}
                            </span>
                          )}
                        </div>

                        <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-3 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                          {course.title}
                        </h3>

                        {course.description ? (
                          <p className="text-slate-500 text-sm leading-relaxed mb-6 line-clamp-2">
                            {course.description}
                          </p>
                        ) : (
                          <p className="text-slate-400 text-xs italic mb-6">
                            Giáo trình đào tạo chuẩn hoá theo khung đánh giá năng lực.
                          </p>
                        )}
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
                          <ListChecks size={16} className="text-blue-600" />
                          <span>{examCount} bài thi</span>
                        </div>

                        <span className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 group-hover:text-blue-700 group-hover:translate-x-1 transition-all">
                          Bắt đầu học <ArrowRight size={16} />
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </Link>
                </Col>
              );
            })}
          </Row>
        )}
      </div>
    </section>
  );
}

