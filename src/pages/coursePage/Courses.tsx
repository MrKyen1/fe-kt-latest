import { Typography, Row, Col, Spin, Alert } from "antd";
import { useNavigate } from "react-router-dom";
import { BookOpen, FileText } from "lucide-react";
import CourseCard from "./CourseCard";
import { useEffect, useState } from "react";
import { studentLearningService } from "../../services/studentLearningService";

const { Title, Text } = Typography;

type HubStats = {
  examAssignments: number;
  curriculums: number;
};

export default function Courses() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<HubStats>({ examAssignments: 0, curriculums: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadAssignments() {
      try {
        setIsLoading(true);
        const [examAssignments, curriculums] = await Promise.all([
          studentLearningService.examAssignments.list({ page: 1, limit: 100 }),
          studentLearningService.curriculums.list({ page: 1, limit: 100 }),
        ]);

        if (!active) return;

        setStats({
          examAssignments: examAssignments.meta?.total ?? examAssignments.data.length,
          curriculums: curriculums.meta?.total ?? curriculums.data.length,
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
  }, []);

  const cards = [
    {
      id: "exam-assignments",
      title: `Bai thi duoc giao (${stats.examAssignments})`,
      image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=900&q=80",
    },
    {
      id: "curriculums",
      title: `Lo trinh hoc tap (${stats.curriculums})`,
      image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
    },
  ];

  return (
    <div className="w-full bg-slate-50 py-16 px-6 md:px-16 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <Title level={1} className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">
            Khu vuc hoc tap
          </Title>
          <div className="w-24 h-1 bg-blue-600 mx-auto rounded-full mb-6" />
          <Text className="text-lg text-slate-600 max-w-2xl mx-auto block">
            Du lieu duoc lay tu assignment runtime cua backend.
          </Text>
        </div>

        {error && <Alert type="error" showIcon className="mb-8" message={error} />}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spin size="large" />
          </div>
        ) : (
          <div className="mb-20">
            <div className="flex items-center gap-4 mb-10">
              <div className="bg-blue-100 p-3 rounded-2xl text-blue-600">
                <BookOpen size={32} />
              </div>
              <Title level={2} className="text-3xl font-bold text-slate-800 m-0">
                Bai hoc cua toi
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
                  <div className="font-bold text-slate-800 text-xl mb-2">Ket qua va lich su</div>
                  <div>Xem lai trong tung bai thi sau khi nop bai.</div>
                </div>
              </Col>
            </Row>
          </div>
        )}
      </div>
    </div>
  );
}
