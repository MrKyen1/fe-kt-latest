import { Typography, Row, Col } from "antd";
import { Building, Sparkles } from "lucide-react";
import { HomepageFacilities } from "../../types/homepage";

const { Title } = Typography;

interface FacilitiesActivitiesProps {
  facilities?: HomepageFacilities;
}

export default function FacilitiesActivities({ facilities }: FacilitiesActivitiesProps) {
  const title = facilities?.title?.trim() || "Cơ Sở Vật Chất & Hoạt Động";
  const description =
    facilities?.description?.trim() ||
    "Môi trường học tập hiện đại, khang trang cùng các hoạt động ngoại khóa phong phú giúp học sinh phát triển kỹ năng mềm, giải tỏa căng thẳng sau những giờ học tập.";

  const highlights =
    facilities?.highlights && facilities.highlights.length > 0
      ? facilities.highlights
      : [
          { title: "Phòng học tiêu chuẩn quốc tế", description: "" },
          { title: "Thư viện sách phong phú", description: "" },
          { title: "Khu vực tự học yên tĩnh", description: "" },
          { title: "Hoạt động dã ngoại hàng tháng", description: "" },
        ];

  const defaultGallery = [
    { url: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=500&h=500&fit=crop&q=80", altText: "Phòng học hiện đại" },
    { url: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=500&h=500&fit=crop&q=80", altText: "Hoạt động sinh hoạt" },
    { url: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=500&h=500&fit=crop&q=80", altText: "Thư viện mở" },
    { url: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=500&h=500&fit=crop&q=80", altText: "Giao lưu ngoại khóa" },
  ];

  const galleryItems =
    facilities?.gallery && facilities.gallery.length > 0
      ? facilities.gallery.map((g) => ({
          url: g.media?.url || "",
          altText: g.altText || "Hoạt động & cơ sở vật chất",
        }))
      : defaultGallery;

  return (
    <section className="py-24 bg-slate-50 px-6 md:px-16">
      <div className="max-w-7xl mx-auto">
        <Row gutter={[48, 48]} className="items-center">
          <Col xs={24} md={12}>
            <Title level={2} className="!text-4xl !font-bold !text-slate-800 mb-6">
              {title}
            </Title>
            <div className="w-24 h-1 bg-blue-500 rounded-full mb-8"></div>

            <p className="text-lg text-slate-600 leading-relaxed mb-8 whitespace-pre-line">
              {description}
            </p>

            <ul className="space-y-4 mb-8">
              {highlights.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-slate-700">
                  <div className="bg-blue-100 text-blue-600 p-2 rounded-xl shrink-0 mt-0.5">
                    {item.description ? <Sparkles size={16} /> : <Building size={16} />}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">{item.title}</div>
                    {item.description && (
                      <div className="text-sm text-slate-500 mt-0.5">{item.description}</div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Col>

          <Col xs={24} md={12}>
            <div className="grid grid-cols-2 gap-4">
              {galleryItems.slice(0, 4).map((img, idx) => (
                <div
                  key={idx}
                  className={`overflow-hidden rounded-2xl shadow-lg group relative h-48 ${
                    idx % 2 === 1 ? "mt-6" : ""
                  }`}
                >
                  <img
                    src={img.url}
                    alt={img.altText}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  {img.altText && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-3 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      {img.altText}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Col>
        </Row>
      </div>
    </section>
  );
}
