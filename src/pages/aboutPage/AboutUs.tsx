import { Row, Col, Typography } from "antd";
import { motion } from "framer-motion";
import { Target, Users, BookOpen } from "lucide-react";
import { useState, useEffect } from "react";

const { Title, Paragraph, Text } = Typography;

export default function AboutUs() {
  const [customText, setCustomText] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('admin_aboutUs');
    if (saved) setCustomText(saved);
  }, []);

  if (customText) {
    return (
      <section id="about" className="py-24 px-6 md:px-16 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <Title level={2} className="text-4xl font-bold text-slate-800 mb-4">
            Về Kata Edu
          </Title>
          <div className="w-24 h-1 bg-blue-600 mx-auto rounded-full"></div>
        </div>
        <Paragraph className="text-lg text-slate-600 leading-relaxed whitespace-pre-line">
          {customText}
        </Paragraph>
      </section>
    );
  }

  return (
    <section id="about" className="py-24 px-6 md:px-16 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <Title level={2} className="text-4xl font-bold text-slate-800 mb-4">
          Về Kata Edu
        </Title>
        <div className="w-24 h-1 bg-blue-600 mx-auto rounded-full"></div>
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
              src="https://picsum.photos/seed/about/800/600"
              alt="About Kata Edu"
              className="w-full h-auto"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-blue-600/10"></div>
            <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-xl max-w-xs">
              <div className="flex items-center gap-4 mb-2">
                <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                  <Target size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Tầm nhìn</h3>
              </div>
              <p className="text-slate-600">
                Trở thành hệ thống giáo dục hàng đầu Việt Nam.
              </p>
            </div>
          </motion.div>
        </Col>

        <Col xs={24} md={12}>
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Title level={3} className="text-3xl text-slate-800 mb-6">
              Sứ mệnh của chúng tôi
            </Title>
            <Paragraph className="text-lg text-slate-600 leading-relaxed mb-8">
              Tại Kata Edu, chúng tôi tin rằng mỗi học sinh đều có một tiềm
              năng vô hạn. Sứ mệnh của chúng tôi là khơi dậy niềm đam mê học
              tập, cung cấp môi trường giáo dục tiên tiến và đội ngũ giáo viên
              tận tâm để giúp các em phát triển toàn diện cả về trí tuệ lẫn
              nhân cách.
            </Paragraph>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <Users className="text-blue-500 mb-4 w-8 h-8" />
                <h4 className="text-xl font-bold text-slate-800 mb-2">10,000+</h4>
                <p className="text-slate-500">Học viên tin tưởng</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <BookOpen className="text-blue-500 mb-4 w-8 h-8" />
                <h4 className="text-xl font-bold text-slate-800 mb-2">50+</h4>
                <p className="text-slate-500">Khóa học đa dạng</p>
              </div>
            </div>
          </motion.div>
        </Col>
      </Row>
    </section>
  );
}
