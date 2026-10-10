import { PagedCollection } from "../../components/PagedCollection";
import { useServerPagination } from "../../hooks/useServerPagination";
import { Typography, Row, Col, Spin, Tag, Empty, Pagination, Alert } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { userService } from "../../services/userService";
import { academicService } from "../../services/academicService";
import { resolveMediaUrl } from "../../services/apiClient";
import { Specialization, User } from "../../types/backend";

const { Title, Paragraph } = Typography;

interface TeacherItem {
  id: string;
  name: string;
  avatar?: string;
  subject: string;
  desc: string;
  centerName?: string;
}

export default function Teachers() {
  const [customText, setCustomText] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("admin_teachers");
    if (saved) setCustomText(saved);
  }, []);

  const directory = useServerPagination("/homepage/teachers", {}, 12);
  useEffect(() => {
    setLoading(directory.loading);
    setTeachers(directory.data.map(item => ({
      id: item.id, name: item.fullName, avatar: item.avatar ? resolveMediaUrl(item.avatar) : undefined,
      subject: item.specializations?.map((row: any) => row.name).join(" • ") || "Giáo viên chuyên môn",
      desc: item.description || `${item.yearsOfExperience || 0} năm kinh nghiệm giảng dạy`,
      centerName: item.centers?.map((row: any) => row.name).join(" • "),
    })));
  }, [directory.data, directory.loading]);

  if (customText) {
    return (
      <section id="teachers" className="py-24 px-6 md:px-16 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <Title level={2} className="text-4xl font-bold text-slate-800 mb-4">
            Đội Ngũ Giáo Viên
          </Title>
          <div className="w-24 h-1 bg-blue-600 mx-auto rounded-full mb-4"></div>
        </div>
        <Paragraph className="text-lg text-slate-600 leading-relaxed whitespace-pre-line">
          {customText}
        </Paragraph>
      </section>
    );
  }

  return (
    <section id="teachers" className="py-24 px-6 md:px-16 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <Title level={2} className="text-4xl font-bold text-slate-800 mb-4">
          Đội Ngũ Giáo Viên
        </Title>
        <div className="w-24 h-1 bg-blue-600 mx-auto rounded-full mb-4"></div>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto block">
          Những người thầy, người cô tâm huyết, giàu kinh nghiệm, luôn đồng
          hành cùng sự phát triển của học sinh.
        </p>
      </div>

      <PagedCollection loading={loading} hasData={teachers.length > 0} variant="teachers" footer={directory.total > 12 && <Pagination {...directory.pagination} showSizeChanger={false} className="mt-6 text-center" />}>{teachers.length > 0 ? (
        <Row gutter={[32, 32]} className="justify-center">
          {teachers.map((teacher, index) => (
            <Col xs={24} sm={12} lg={6} key={teacher.id}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="bg-white rounded-3xl p-6 text-center shadow-sm hover:shadow-xl transition-shadow border border-slate-100 group flex flex-col h-full"
              >
                {/* Avatar tròn với fallback như Profile */}
                <div className="w-36 h-36 mx-auto rounded-full overflow-hidden mb-6 border-4 border-blue-50 group-hover:border-blue-100 transition-colors flex items-center justify-center bg-slate-200 shrink-0">
                  {teacher.avatar ? (
                    <img
                      src={teacher.avatar}
                      alt={teacher.name}
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const fallbackEl = e.currentTarget.nextElementSibling as HTMLElement;
                        if (fallbackEl) fallbackEl.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    className="w-full h-full flex items-center justify-center bg-[#bfbfbf] text-white"
                    style={{ display: teacher.avatar ? "none" : "flex" }}
                  >
                    <UserOutlined className="text-5xl text-white opacity-95" />
                  </div>
                </div>

                {/* Tên giáo viên lấy từ fullName */}
                <h3
                  className="text-xl font-bold text-slate-800 mb-1 line-clamp-1"
                  title={teacher.name}
                >
                  {teacher.name}
                </h3>

                {/* Chuyên môn */}
                <p className="text-blue-600 font-semibold text-sm mb-2 line-clamp-1" title={teacher.subject}>
                  {teacher.subject}
                </p>

                {/* Trung tâm (nếu có) */}
                {teacher.centerName && (
                  <div className="mb-2">
                    <Tag color="cyan" className="rounded-full text-[11px] px-2.5 py-0 border-none font-medium">
                      {teacher.centerName}
                    </Tag>
                  </div>
                )}

                {/* Mô tả */}
                <p className="text-slate-500 text-sm line-clamp-3 leading-relaxed mt-auto">
                  {teacher.desc}
                </p>
              </motion.div>
            </Col>
          ))}
        </Row>
      ) : (
        <div className="py-12">
          <Empty description="Chưa có thông tin giáo viên từ hệ thống" />
        </div>
      )}</PagedCollection>
      {directory.error && <Alert type="error" title={directory.error.message} />}

    </section>
  );
}
