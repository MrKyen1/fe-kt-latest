import { LoadingRegion } from "../../../components/LoadingRegion";
import { Typography, Row, Col, Tag, Spin, Empty } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { homepageService } from "../../../services/homepageService";
import { resolveMediaUrl } from "../../../services/apiClient";

const { Title, Paragraph } = Typography;

export interface TeacherItem {
  id: string;
  name: string;
  avatar?: string;
  subject: string;
  desc: string;
  centerName?: string;
  centerNames?: string[];
}

export default function HomeTeachers() {
  const [customText, setCustomText] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("admin_teachers");
    if (saved) setCustomText(saved);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadTeachersFromBackend() {
      try {
        setLoading(true);

        setLoadError(false);
        const publicTeachers = await homepageService.getTeachers();
        const mapped: TeacherItem[] = publicTeachers.map((t) => {
          const specNames = (t.specializations || []).map((s) => s.name).filter(Boolean);
          const subjectText = specNames.length > 0 ? specNames.join(" • ") : "Giáo viên chuyên môn";
          const descText =
            t.description ||
            (t.yearsOfExperience
              ? `${t.yearsOfExperience} năm kinh nghiệm giảng dạy`
              : "Giáo viên tâm huyết, giàu kinh nghiệm đồng hành cùng sự phát triển của học sinh.");
          const centerNames = (t.centers || []).map((c: any) => c.name).filter(Boolean);
          const centerName = centerNames.length > 0 ? centerNames.join(" • ") : undefined;

          return {
            id: t.id,
            name: t.fullName || "Giáo viên",
            avatar: t.avatar ? resolveMediaUrl(t.avatar) : undefined,
            subject: subjectText,
            desc: descText,
            centerName,
            centerNames,
          };
        });
        if (active) setTeachers(mapped);
      } catch {
        if (active) {
          setTeachers([]);
          setLoadError(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadTeachersFromBackend();

    return () => {
      active = false;
    };
  }, []);

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
          Những người thầy, người cô tâm huyết, giàu kinh nghiệm, luôn đồng hành cùng sự phát triển của học sinh.
        </p>
      </div>

      <LoadingRegion loading={loading} hasData={teachers.length > 0} variant="teachers">{teachers.length > 0 ? (
        <Row gutter={[32, 32]} className="justify-center">
          {teachers.map((teacher, index) => (
            <Col xs={24} sm={12} lg={8} key={teacher.id}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="bg-white rounded-3xl p-6 text-center shadow-sm hover:shadow-xl transition-shadow border border-slate-100 group flex flex-col h-full"
              >
                {/* Avatar tròn */}
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

                {/* Tên giáo viên */}
                <h3
                  className="text-xl font-bold text-slate-800 mb-1 line-clamp-1"
                  title={teacher.name}
                >
                  {teacher.name}
                </h3>

                {/* Chuyên môn */}
                <p
                  className="text-blue-600 font-semibold text-sm mb-2 line-clamp-1"
                  title={teacher.subject}
                >
                  {teacher.subject}
                </p>

                {/* Trung tâm */}
                {((teacher.centerNames && teacher.centerNames.length > 0) || teacher.centerName) && (
                  <div className="mb-3 flex flex-wrap justify-center gap-1.5">
                    {(teacher.centerNames && teacher.centerNames.length > 0
                      ? teacher.centerNames
                      : [teacher.centerName!]
                    ).map((cName) => (
                      <Tag
                        key={cName}
                        color="cyan"
                        className="rounded-full text-[11px] px-2.5 py-0.5 border-none font-medium m-0"
                      >
                        {cName}
                      </Tag>
                    ))}
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
          <Empty description={loadError ? "Không tải được danh sách giáo viên. Vui lòng thử lại sau." : "Chưa có thông tin giáo viên từ hệ thống"} />
        </div>
      )}</LoadingRegion>
    </section>
  );
}
