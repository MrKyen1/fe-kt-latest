import { Typography, Row, Col } from "antd";
import { motion } from "framer-motion";
import { teachersData } from "../../data/mockData";
import { useState, useEffect } from "react";

const { Title, Paragraph } = Typography;

export default function Teachers() {
  const [customText, setCustomText] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('admin_teachers');
    if (saved) setCustomText(saved);
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
          Những người thầy, người cô tâm huyết, giàu kinh nghiệm, luôn đồng
          hành cùng sự phát triển của học sinh.
        </p>
      </div>

      <Row gutter={[32, 32]}>
        {teachersData.map((teacher, index) => (
          <Col xs={24} sm={12} lg={6} key={teacher.id}>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-3xl p-6 text-center shadow-sm hover:shadow-xl transition-shadow border border-slate-100 group"
            >
              <div className="w-40 h-40 mx-auto rounded-full overflow-hidden mb-6 border-4 border-blue-50 group-hover:border-blue-100 transition-colors">
                <img
                  src={teacher.image}
                  alt={teacher.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-1">
                {teacher.name}
              </h3>
              <p className="text-blue-600 font-medium mb-3">{teacher.subject}</p>
              <p className="text-slate-500 text-sm">{teacher.desc}</p>
            </motion.div>
          </Col>
        ))}
      </Row>
    </section>
  );
}
