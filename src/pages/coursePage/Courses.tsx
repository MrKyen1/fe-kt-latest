import { Typography, Row, Col, Spin, Alert } from "antd";
import { useNavigate } from "react-router-dom";
import { BookOpen, FileText, GraduationCap } from "lucide-react";
import CourseCard from "./CourseCard";
import { useEffect, useState } from "react";
import { studentLearningService } from "../../services/studentLearningService";
import { learningCmsService } from "../../services/learningCmsService";
import { useAuth } from "../../contexts/AuthContext";

const { Title, Text } = Typography;

type HubStats = {
  examAssignments: number;
  curriculums: number;
  publishedCurriculums: number;
};

export default function Courses() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<HubStats>({ examAssignments: 0, curriculums: 0, publishedCurriculums: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadAssignments() {
      try {
        setIsLoading(true);
        let examCount = 0;
        let curriculumCount = 0;
        let publishedCount = 0;

        if (user?.role === "student") {
          try {
            const res = await studentLearningService.examAssignments.list({ page: 1, limit: 1 });
            examCount = res.meta?.total ?? res.data.length;
          } catch (err) {
            console.error("Failed to load student exam assignments:", err);
          }

          try {
            const res = await studentLearningService.curriculums.list({ page: 1, limit: 1 });
            curriculumCount = res.meta?.total ?? res.data.length;
          } catch (err) {
            console.error("Failed to load student curriculums:", err);
          }
        } else {
          try {
            const res = await learningCmsService.exams.list({ page: 1, limit: 1 });
            examCount = (res as any).meta?.total ?? (res as any).data?.length ?? 0;
          } catch (err) {
            console.error("Failed to load CMS exams:", err);
          }

          try {
            const res = await learningCmsService.curriculums.list({ page: 1, limit: 1 });
            curriculumCount = (res as any).meta?.total ?? (res as any).data?.length ?? 0;
          } catch (err) {
            console.error("Failed to load CMS curriculums:", err);
          }
        }

        // Always load published curriculums count (visible to all roles)
        try {
          const res = await learningCmsService.curriculums.list({ status: "published", page: 1, limit: 1 });
          publishedCount = (res as any).meta?.total ?? (res as any).data?.length ?? 0;
        } catch (err) {
          console.error("Failed to load published curriculums:", err);
        }

        if (!active) return;

        setStats({
          examAssignments: examCount,
          curriculums: curriculumCount,
          publishedCurriculums: publishedCount,
        });
        setError(null);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Khong the tai du lieu hoc tap.");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadAssignments();
    return () => {
      active = false;
    };
  }, [user]);

  const cards = [
    {
      id: "exam-assignments",
      title: `Bài thi được giao (${stats.examAssignments})`,
      image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=900&q=80",
    },
    {
      id: "curriculums",
      title: `Lộ trình học tập (${stats.curriculums})`,
      image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
    },
    {
      id: "published-curriculums",
      title: `Giáo trình phát hành (${stats.publishedCurriculums})`,
      image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=900&q=80",
    },
  ];

  return (
    <div className="w-full bg-slate-50 py-16 px-6 md:px-16 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <Title level={1} className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">
            Khu vực học tập
          </Title>
          <div className="w-24 h-1 bg-blue-600 mx-auto rounded-full mb-6" />
          <Text className="text-lg text-slate-600 max-w-2xl mx-auto block">
            Chọn mục học tập bên dưới để bắt đầu.
          </Text>
        </div>

        {error && <Alert type="error" showIcon className="mb-8" message={error} />}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spin size="large" />
          </div>
        ) : (
          <>
            <div className="mb-20">
              <div className="flex items-center gap-4 mb-10">
                <div className="bg-blue-100 p-3 rounded-2xl text-blue-600">
                  <BookOpen size={32} />
                </div>
                <Title level={2} className="text-3xl font-bold text-slate-800 m-0">
                  Bài học của tôi
                </Title>
              </div>

              <Row gutter={[32, 32]}>
                {cards.map((course) => (
                  <Col xs={24} sm={12} lg={8} key={course.id}>
                    <CourseCard course={course} onSelect={(courseId) => navigate(`/courses/${courseId}`)} />
                  </Col>
                ))}
                <Col xs={24} sm={12} lg={8}>
                  <div className="bg-white rounded-3xl border border-slate-100 h-full p-8 flex flex-col justify-center text-slate-500">
                    <FileText className="mb-4 text-blue-500" size={32} />
                    <div className="font-bold text-slate-800 text-xl mb-2">Kết quả & lịch sử</div>
                    <div>Xem lại trong từng bài thi sau khi nộp bài.</div>
                  </div>
                </Col>
              </Row>
            </div>

            {/* Published Curriculums Banner */}
            <div
              className="rounded-3xl overflow-hidden cursor-pointer group relative"
              style={{
                background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 60%, #a855f7 100%)",
                boxShadow: "0 8px 32px rgba(99,102,241,0.25)",
              }}
              onClick={() => navigate("/courses/published-curriculums")}
            >
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white 0%, transparent 60%)" }} />
              <div className="relative px-10 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="bg-white/20 p-4 rounded-2xl">
                    <GraduationCap size={36} className="text-white" />
                  </div>
                  <div>
                    <div className="text-white/70 text-sm font-medium mb-1 uppercase tracking-widest">Đang phát hành</div>
                    <h3 className="text-white text-2xl md:text-3xl font-bold">
                      Giáo trình phát hành ({stats.publishedCurriculums})
                    </h3>
                    <p className="text-white/75 mt-1 text-sm">Xem các giáo trình admin đã công bố và bắt đầu làm bài thi ngay.</p>
                  </div>
                </div>
                <div className="bg-white text-indigo-700 font-bold px-8 py-4 rounded-2xl text-lg group-hover:bg-indigo-50 transition-colors shrink-0 shadow-lg">
                  Khám phá →
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
