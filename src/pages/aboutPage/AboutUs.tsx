import { Row, Col, Typography } from "antd";
import { motion } from "framer-motion";
import { Target, Users, BookOpen, Award, CheckCircle2 } from "lucide-react";
import { HomepageAbout } from "../../types/homepage";

const { Title, Paragraph } = Typography;

interface AboutUsProps {
  about?: HomepageAbout;
}

export default function AboutUs({ about }: AboutUsProps) {
  const title = about?.title?.trim() || "Về Kata Edu";
  const mission =
    about?.mission?.trim() ||
    "Tại Kata Edu, chúng tôi tin rằng mỗi học sinh đều có một tiềm năng vô hạn. Sứ mệnh của chúng tôi là khơi dậy niềm đam mê học tập, cung cấp môi trường giáo dục tiên tiến và đội ngũ giáo viên tận tâm để giúp các em phát triển toàn diện cả về trí tuệ lẫn nhân cách.";
  const vision =
    about?.vision?.trim() ||
    "Trở thành hệ thống giáo dục hàng đầu Việt Nam, trang bị cho thế hệ trẻ tri thức vững chắc và kỹ năng hội nhập toàn cầu.";
  const description = about?.description?.trim();
  const imageUrl = about?.image?.url || "src/assets/aboutus/aboutUs.jpg";

  const stats =
    about?.stats && about.stats.length > 0
      ? about.stats
      : [
          { label: "Học viên tin tưởng", value: "10,000+" },
          { label: "Khóa học đa dạng", value: "50+" },
        ];

  const statIcons = [
    <Users className="text-blue-500 mb-4 w-8 h-8" key="0" />,
    <BookOpen className="text-blue-500 mb-4 w-8 h-8" key="1" />,
    <Award className="text-blue-500 mb-4 w-8 h-8" key="2" />,
    <CheckCircle2 className="text-blue-500 mb-4 w-8 h-8" key="3" />,
  ];

  return (
    <section id="about" className="py-24 px-6 md:px-16 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <Title level={2} className="!text-4xl !font-bold !text-slate-800 mb-4">
          {title}
        </Title>
        <div className="w-24 h-1 bg-blue-600 mx-auto rounded-full"></div>
        {description && (
          <p className="mt-4 text-slate-600 max-w-3xl mx-auto text-lg leading-relaxed">
            {description}
          </p>
        )}
      </div>

      <Row gutter={[48, 48]} className="items-center">
        <Col xs={24} md={12}>
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden shadow-2xl"
          >
            <img
              src={imageUrl}
              alt="About Kata Edu"
              className="w-full h-[420px] object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent"></div>
            <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-md p-6 rounded-2xl shadow-xl">
              <div className="flex items-center gap-4 mb-2">
                <div className="bg-blue-100 p-3 rounded-full text-blue-600 shrink-0">
                  <Target size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Tầm nhìn</h3>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">{vision}</p>
            </div>
          </motion.div>
        </Col>

        <Col xs={24} md={12}>
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Title level={3} className="!text-3xl !text-slate-800 mb-6 font-bold">
              Sứ mệnh của chúng tôi
            </Title>
            <Paragraph className="text-lg text-slate-600 leading-relaxed mb-8 whitespace-pre-line">
              {mission}
            </Paragraph>

            <div className={`grid grid-cols-1 ${stats.length >= 2 ? "sm:grid-cols-2" : ""} gap-6`}>
              {stats.map((stat, idx) => (
                <div
                  key={idx}
                  className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
                >
                  {statIcons[idx % statIcons.length]}
                  <h4 className="text-2xl font-black text-slate-800 mb-1 tracking-tight">
                    {stat.value}
                  </h4>
                  <p className="text-slate-500 font-medium">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </Col>
      </Row>
    </section>
  );
}
