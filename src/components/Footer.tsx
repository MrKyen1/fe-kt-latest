import { Layout, Row, Col, Typography, Space, Tag } from "antd";
import {
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Globe,
  Building2,
} from "lucide-react";
import { memo, useEffect, useState } from "react";
import { academicService } from "../services/academicService";
import { homepageService } from "../services/homepageService";
import { Center } from "../types/backend";
import { HomepageFooter } from "../types/homepage";

const { Footer: AntFooter } = Layout;
const { Title, Text } = Typography;

const Footer = memo(function Footer() {
  const [footerData, setFooterData] = useState<HomepageFooter | null>(null);
  const [centers, setCenters] = useState<Center[]>([]);
  const [selectedCenterIndex, setSelectedCenterIndex] = useState(0);

  useEffect(() => {
    let active = true;

    Promise.all([
      homepageService.getPublic().catch(() => null),
      academicService.centers.list().catch(() => []),
    ]).then(([hpData, centersList]) => {
      if (!active) return;
      if (hpData?.footer) {
        setFooterData(hpData.footer);
      }
      if (Array.isArray(centersList) && centersList.length > 0) {
        setCenters(centersList.filter((c) => c.isActive !== false));
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const brandName = footerData?.brandName?.trim() || "KATA LANGUAGE ACADEMY";
  const brandDescription =
    footerData?.description?.trim() ||
    "Trung tâm giáo dục Kata Edu - Nơi ươm mầm tài năng Việt. Chúng tôi cam kết mang đến chất lượng giáo dục tốt nhất cho học sinh từ 10-16 tuổi.";
  const phone = footerData?.phone?.trim() || "0123 456 789";
  const email = footerData?.email?.trim() || "contact@kataedu.vn";
  const copyright =
    footerData?.copyright?.trim() ||
    `© ${new Date().getFullYear()} Kata Language Academy. All rights reserved.`;
  const socialLinks = footerData?.socialLinks || [
    { platform: "Facebook", url: "https://fb.com/kata" },
  ];

  const currentCenter = centers[selectedCenterIndex] || centers[0];
  const centerAddress =
    currentCenter?.address || "123 Đình Cả, Quảng Minh, Việt Yên, Bắc Giang";
  const mapEmbedUrl =
    currentCenter?.mapEmbedUrl ||
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3718.4552851639846!2d106.12792497512365!3d21.25343838045273!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31350dc2b53aaaa7%3A0x2c21448f641c767d!2zTmdv4bqhaSBuZ-G7ryBLQVRB!5e0!3m2!1svi!2s!4v1773211786824!5m2!1svi!2s";

  return (
    <AntFooter className="!bg-slate-900 text-slate-300 py-16 px-6 md:px-16 mt-auto z-99" id="contact">
      <div className="max-w-7xl mx-auto">
        <Row gutter={[40, 40]}>
          {/* Brand & Introduction */}
          <Col xs={24} md={8}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl font-black tracking-tight text-white">
                {brandName}
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed mb-6 text-sm">
              {brandDescription}
            </p>

            {/* Social links */}
            <div className="flex flex-wrap items-center gap-3">
              {socialLinks.map((social, idx) => (
                <a
                  key={idx}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white text-xs font-medium transition-colors"
                >
                  <MessageCircle size={14} />
                  <span>{social.platform}</span>
                </a>
              ))}
            </div>
          </Col>

          {/* Contact & Centers List */}
          <Col xs={24} md={8}>
            <Title level={4} className="!text-white mb-5 font-bold">
              Hệ thống Cơ sở &amp; Liên hệ
            </Title>

            <Space orientation="vertical" size="middle" className="w-full">
              {/* Centers tabs/tags */}
              {centers.length > 0 && (
                <div className="space-y-2 mb-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Building2 size={14} className="text-blue-400" />
                    Các cơ sở Kata Edu:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {centers.map((center, idx) => {
                      const isSelected = idx === selectedCenterIndex;
                      return (
                        <button
                          key={center.id}
                          type="button"
                          onClick={() => setSelectedCenterIndex(idx)}
                          className={`text-xs px-2.5 py-1 rounded-md transition-all font-medium ${isSelected
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                            }`}
                        >
                          {center.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Address of selected center */}
              <div className="flex orientation-horizontal items-start gap-3">
                <MapPin className="text-blue-400 mt-1 shrink-0" size={18} />
                <span className="text-slate-300 text-sm">
                  {currentCenter ? (
                    <>
                      <strong className="text-white block">{currentCenter.name}</strong>
                      {centerAddress}
                    </>
                  ) : (
                    centerAddress
                  )}
                </span>
              </div>

              {/* Shared Hotline & Email */}
              <div className="flex items-center gap-3">
                <Phone className="text-blue-400 shrink-0" size={18} />
                <span className="text-slate-300 text-sm">{phone}</span>
                <span className="text-slate-500 text-xs">(Hotline dùng chung)</span>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="text-blue-400 shrink-0" size={18} />
                <span className="text-slate-300 text-sm">{email}</span>
              </div>
            </Space>
          </Col>

          {/* Map */}
          <Col xs={24} md={8}>
            <Title level={4} className="!text-white mb-5 font-bold">
              Bản đồ cơ sở
            </Title>
            <div className="w-full h-52 rounded-2xl overflow-hidden shadow-xl border border-slate-800 bg-slate-950">
              <iframe
                src={mapEmbedUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={true}
                loading="lazy"
                title="Bản đồ Kata Edu"
              ></iframe>
            </div>
            {currentCenter && (
              <p className="text-xs text-slate-500 mt-2 text-right">
                Đang hiển thị vị trí: <span className="text-slate-300 font-medium">{currentCenter.name}</span>
              </p>
            )}
          </Col>
        </Row>

        <div className="border-t border-slate-800/80 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <span>{copyright}</span>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-300 transition-colors cursor-pointer">Chính sách bảo mật</span>
            <span>•</span>
            <span className="hover:text-slate-300 transition-colors cursor-pointer">Điều khoản dịch vụ</span>
          </div>
        </div>
      </div>
    </AntFooter>
  );
});

export default Footer;
