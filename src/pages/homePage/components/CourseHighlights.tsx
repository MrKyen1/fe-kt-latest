import { Typography, Row, Col, Button } from "antd";
import { motion } from "framer-motion";
import { ArrowRight, PlayCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { coursesData } from "../../../data/mockData";

const { Title, Text } = Typography;

export default function CourseHighlights() {
  const navigate = useNavigate();

  return (
    <section className="py-24 bg-blue-50 px-6 md:px-16">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-12">
          <div>
            <Title level={2} className="text-4xl font-bold text-slate-800 mb-4">
              Khóa Luyện Thi Nổi Bật
            </Title>
            <div className="w-24 h-1 bg-blue-600 rounded-full mb-4"></div>
            <Text className="text-lg text-slate-600">
              Các khóa học được thiết kế chuyên biệt giúp học sinh đạt điểm cao.
            </Text>
          </div>
          <Button
            type="link"
            className="text-blue-600 font-medium text-lg hidden md:flex items-center"
            onClick={() => navigate("/courses")}
          >
            Xem tất cả <ArrowRight className="ml-1 w-5 h-5" />
          </Button>
        </div>

        <Row gutter={[32, 32]}>
          {coursesData
            .map((category) =>
              category.subCourses.slice(0, 2).map((course) => (
                <Col xs={24} sm={12} lg={8} key={course.id}>
                  <motion.div
                    whileHover={{ y: -10 }}
                    className="bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-slate-100 h-full flex flex-col"
                  >
                    <div className="relative h-56 overflow-hidden group">
                      <img
                        src={course.image}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-4 py-1 rounded-full text-sm font-bold text-blue-600 shadow-sm">
                        {category.title}
                      </div>
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-300"></div>
                    </div>
                    <div className="p-8 flex-1 flex flex-col">
                      <h3 className="text-2xl font-bold text-slate-800 mb-4 line-clamp-2">
                        {course.title}
                      </h3>
                      <p className="text-slate-500 mb-6 flex-1">
                        Khóa học luyện thi chuyên sâu, bám sát cấu trúc đề thi mới nhất.
                      </p>
                      <Button
                        type="primary"
                        className="w-full bg-blue-50 h-12 text-blue-600 font-semibold rounded-xl hover:bg-blue-600 hover:text-white transition-colors border-none shadow-none"
                        onClick={() => navigate(`/courses/${course.id}`)}
                      >
                        Bắt đầu học <PlayCircle className="ml-2 w-5 h-5" />
                      </Button>
                    </div>
                  </motion.div>
                </Col>
              )),
            )
            .flat()
            .slice(0, 6)}
        </Row>
      </div>
    </section>
  );
}
