import { Typography, Row, Col } from "antd";
import { Building } from "lucide-react";

const { Title } = Typography;

export default function FacilitiesActivities() {
  return (
    <section className="py-24 bg-slate-50 px-6 md:px-16">
      <div className="max-w-7xl mx-auto">
        <Row gutter={[48, 48]} className="items-center">
          <Col xs={24} md={12}>
            <Title level={2} className="!text-4xl !font-bold !text-slate-800 mb-6">
              Cơ Sở Vật Chất &amp; Hoạt Động
            </Title>
            <div className="w-24 h-1 bg-blue-500 rounded-full mb-8"></div>

            <p className="text-lg text-slate-600 leading-relaxed mb-8">
              Môi trường học tập hiện đại, khang trang cùng các hoạt động ngoại khóa phong phú giúp học sinh phát triển kỹ năng mềm, giải tỏa căng thẳng sau những giờ học tập.
            </p>

            <ul className="space-y-4 mb-8">
              {[
                "Phòng học tiêu chuẩn quốc tế",
                "Thư viện sách phong phú",
                "Khu vực tự học yên tĩnh",
                "Hoạt động dã ngoại hàng tháng",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-700">
                  <div className="bg-blue-100 text-blue-600 p-1.5 rounded-full">
                    <Building size={16} />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </Col>

          <Col xs={24} md={12}>
            <div className="grid grid-cols-2 gap-4">
              <img
                src="https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400&h=400&fit=crop&q=80"
                alt="Facility 1"
                className="rounded-2xl w-full h-48 object-cover shadow-lg"
              />
              <img
                src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=400&fit=crop&q=80"
                alt="Facility 2"
                className="rounded-2xl w-full h-48 object-cover shadow-lg mt-8"
              />
              <img
                src="https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=400&h=400&fit=crop&q=80"
                alt="Facility 3"
                className="rounded-2xl w-full h-48 object-cover shadow-lg"
              />
              <img
                src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&h=400&fit=crop&q=80"
                alt="Facility 4"
                className="rounded-2xl w-full h-48 object-cover shadow-lg mt-8"
              />
            </div>
          </Col>
        </Row>
      </div>
    </section>
  );
}
