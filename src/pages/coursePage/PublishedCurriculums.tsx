import { Typography, Row, Col, Spin, Alert, Tag, Empty } from "antd";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, ChevronRight, ArrowLeft, GraduationCap, ListChecks } from "lucide-react";
import { useEffect, useState } from "react";
import { learningCmsService } from "../../services/learningCmsService";
import { Curriculum } from "../../types/backend";
import { AppImage } from "../../components/AppImagePreview";

const { Title, Text } = Typography;

export default function PublishedCurriculums() {
  const navigate = useNavigate();
  const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setIsLoading(true);
        const res = await learningCmsService.curriculums.list({
          status: "published",
          page: 1,
          limit: 100,
        });
        if (active) {
          setCurriculums((res as any).data ?? []);
          setError(null);
        }
      } catch (err) {
        if (active)
          setError(err instanceof Error ? err.message : "Không thể tải danh sách giáo trình.");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="w-full bg-slate-50 py-16 px-6 md:px-16 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => navigate("/courses")}
          className="mb-8 flex items-center gap-2 text-slate-500 hover:text-blue-600 font-medium transition-colors group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          Quay lại khu vực học tập
        </button>

        <div className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-indigo-100 p-3 rounded-2xl text-indigo-600">
              <GraduationCap size={32} />
            </div>
            <Title level={1} className="!text-4xl !font-bold !text-slate-800 !m-0">
              Giáo trình phát hành
            </Title>
          </div>
          <div className="w-24 h-1 bg-indigo-500 rounded-full mb-4 ml-[72px]" />
          <Text className="text-lg text-slate-500 ml-[72px] block">
            Tất cả giáo trình đang được phát hành — click vào để xem và làm bài thi.
          </Text>
        </div>

        {error && <Alert type="error" showIcon className="mb-8" message={error} />}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spin size="large" />
          </div>
        ) : curriculums.length === 0 ? (
          <div className="bg-white p-16 rounded-3xl shadow-sm border border-slate-100 text-center">
            <Empty description="Chưa có giáo trình nào được phát hành." />
          </div>
        ) : (
          <Row gutter={[24, 24]}>
            {curriculums.map((curriculum, idx) => {
              const examCount = curriculum.exams?.length ?? 0;
              return (
                <Col xs={24} md={12} key={curriculum.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.07 }}
                    whileHover={{ y: -4, boxShadow: "0 16px 40px rgba(99,102,241,0.13)" }}
                    className="bg-white rounded-3xl border border-slate-100 cursor-pointer transition-all duration-300 flex flex-col group relative overflow-hidden"
                    onClick={() => navigate(`/courses/published-curriculums/${curriculum.id}`)}
                    style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
                  >
                    {/* Cover image if available */}
                    {curriculum.image && (
                      <div className="w-full h-48 overflow-hidden bg-slate-100 relative">
                        <AppImage
                          src={curriculum.image}
                          alt={curriculum.title}
                          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
                          rootClassName="w-full h-full"
                        />
                        <div className="absolute top-3 right-3 z-10">
                          <Tag color="green" className="rounded-full px-3 py-0.5 text-xs font-semibold shadow-sm">
                            Published
                          </Tag>
                        </div>
                      </div>
                    )}

                    <div className="p-7 flex flex-col gap-4 flex-1 justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            {!curriculum.image && (
                              <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600 shrink-0">
                                <BookOpen size={24} />
                              </div>
                            )}
                            <div>
                              <span className="text-xs text-slate-400 font-mono block mb-1">{curriculum.code}</span>
                              <h3 className="text-xl font-bold text-slate-800 group-hover:text-indigo-600 transition-colors leading-tight m-0">
                                {curriculum.title}
                              </h3>
                            </div>
                          </div>
                          {!curriculum.image && (
                            <Tag color="green" className="shrink-0 mt-1 rounded-full px-3">
                              Published
                            </Tag>
                          )}
                        </div>

                        {curriculum.description && (
                          <p className="text-slate-500 text-sm leading-relaxed line-clamp-2 mt-3 mb-0">
                            {curriculum.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                          <ListChecks size={16} className="text-indigo-400" />
                          <span>{examCount} bài thi</span>
                          {curriculum.level && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-indigo-500">{curriculum.level.name}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-indigo-500 font-semibold text-sm group-hover:gap-2 transition-all">
                          Xem bài thi
                          <ChevronRight size={16} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </Col>
              );
            })}
          </Row>
        )}
      </div>
    </div>
  );
}
