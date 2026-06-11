import { Layout, Row, Col, Typography, Space } from "antd";
import {
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  BookOpen,
} from "lucide-react";
import { memo } from "react";

const { Footer: AntFooter } = Layout;
const { Title, Text, Link } = Typography;

const Footer = memo(function Footer() {
  return (
    <AntFooter
      className="!bg-slate-200 py-12 px-6 md:px-16 mt-auto "
      id="contact"
    >
      <div className="max-w-7xl mx-auto ">
        <Row gutter={[32, 32]}>
          <Col xs={24} md={8}>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-2xl font-bold  tracking-tight">
                KATA LANGUAGE ACADEMY
              </span>
            </div>
            <Text className=" block mb-6">
              Trung tâm giáo dục Kata Edu - Nơi ươm mầm tài năng Việt. Chúng tôi
              cam kết mang đến chất lượng giáo dục tốt nhất cho học sinh từ
              10-16 tuổi.
            </Text>
            <div className="flex items-center gap-3">
              <MessageCircle className="text-blue-500 shrink-0" size={20} />
              <a href="https://fb.com/kata" className="text-slate-400">
                Kata Page
              </a>
            </div>
          </Col>

          <Col xs={24} md={8}>
            <Title level={4} className=" mb-6">
              Thông tin liên hệ
            </Title>
            <Space direction="vertical" size="middle" className="w-full">
              <div className="flex items-start gap-3">
                <MapPin className="text-blue-500 mt-1 shrink-0" size={20} />
                <Text className="text-slate-400">
                  123 Đình Cả, Quảng Minh, Việt Yên, Bắc Giang
                </Text>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="text-blue-500 shrink-0" size={20} />
                <Text className="text-slate-400">0123 456 789</Text>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="text-blue-500 shrink-0" size={20} />
                <Text className="text-slate-400">contact@kataedu.vn</Text>
              </div>
            </Space>
          </Col>

          <Col xs={24} md={8}>
            <Title level={4} className="text-white mb-6">
              Bản đồ
            </Title>
            <div className="w-full h-48 rounded-xl overflow-hidden shadow-lg border border-amber-50">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3718.4552851639846!2d106.12792497512365!3d21.25343838045273!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31350dc2b53aaaa7%3A0x2c21448f641c767d!2zTmdv4bqhaSBuZ-G7ryBLQVRB!5e0!3m2!1svi!2s!4v1773211786824!5m2!1svi!2s"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={true}
                loading="lazy"
              ></iframe>
            </div>
          </Col>
        </Row>

        <div className="border-t border-slate-800 mt-12 pt-8 text-center">
          <Text className="text-slate-500">
            © 2026 Kata Language Academy. All rights reserved.
          </Text>
        </div>
      </div>
    </AntFooter>
  );
});

export default Footer;
