import { useState, useEffect } from "react";
import {
  Card,
  Form,
  Input,
  Button,
  Row,
  Col,
  Statistic,
  message,
  InputNumber,
  Divider,
  Typography,
} from "antd";
import { SaveOutlined, FileTextOutlined } from "@ant-design/icons";
import { Info } from "lucide-react";
import { getAboutUs, saveAboutUs } from "../../../utils/adminStorage";
import { AboutUs } from "../../../types";

const { TextArea } = Input;
const { Title, Paragraph } = Typography;

export default function AdminAboutUs() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [aboutUs, setAboutUs] = useState<AboutUs | null>(null);

  useEffect(() => {
    loadAboutUs();
  }, []);

  const loadAboutUs = () => {
    const data = getAboutUs();
    setAboutUs(data);
    form.setFieldsValue(data);
  };

  const handleSubmit = async (values: AboutUs) => {
    setLoading(true);
    try {
      saveAboutUs(values);
      setAboutUs(values);
      message.success("Cập nhật thông tin thành công!");
    } catch (error) {
      message.error("Lỗi khi lưu thông tin!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Info Preview */}
      {aboutUs && (
        <Card title="Thông tin Hiện tại">
          <Row gutter={[24, 24]} className="mb-6">
            <Col xs={24} sm={12}>
              <Card className="text-center">
                <Statistic
                  title="Số lượng Học sinh (Hiện thi)"
                  value={aboutUs.studentsCount}
                  suffix="+"
                  valueStyle={{ color: "#1890ff" }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12}>
              <Card className="text-center">
                <Statistic
                  title="Số lượng Khóa học (Hiện thi)"
                  value={aboutUs.coursesCount}
                  suffix="+"
                  valueStyle={{ color: "#52c41a" }}
                />
              </Card>
            </Col>
          </Row>

          <Divider />

          <div className="space-y-4">
            <div>
              <Title level={4}>Sứ mệnh (Mission)</Title>
              <Paragraph className="text-gray-700 mb-0">
                {aboutUs.mission}
              </Paragraph>
            </div>

            <div>
              <Title level={4}>Tầm nhìn (Vision)</Title>
              <Paragraph className="text-gray-700 mb-0">
                {aboutUs.vision}
              </Paragraph>
            </div>
          </div>
        </Card>
      )}

      {/* Edit Form */}
      <Card title="Chỉnh sửa Thông tin" icon={<FileTextOutlined />}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
          className="space-y-4"
        >
          <Form.Item
            label="Sứ mệnh (Mission)"
            name="mission"
            rules={[{ required: true, message: "Vui lòng nhập sứ mệnh!" }]}
          >
            <TextArea rows={6} placeholder="Nhập sứ mệnh của tổ chức..." />
          </Form.Item>

          <Form.Item
            label="Tầm nhìn (Vision)"
            name="vision"
            rules={[{ required: true, message: "Vui lòng nhập tầm nhìn!" }]}
          >
            <TextArea rows={4} placeholder="Nhập tầm nhìn của tổ chức..." />
          </Form.Item>

          <Form.Item
            label="Số lượng Học sinh (Hiện thi)"
            name="studentsCount"
            rules={[{ required: true, message: "Vui lòng nhập số lượng!" }]}
          >
            <InputNumber
              min={0}
              placeholder="10000"
              className="w-full"
              formatter={(value) =>
                `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
              }
              parser={(value: any) => value.replace(/\$\s?|(,*)/g, "")}
            />
          </Form.Item>

          <Form.Item
            label="Số lượng Khóa học (Hiện thi)"
            name="coursesCount"
            rules={[{ required: true, message: "Vui lòng nhập số lượng!" }]}
          >
            <InputNumber
              min={0}
              placeholder="50"
              className="w-full"
              formatter={(value) =>
                `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
              }
              parser={(value: any) => value.replace(/\$\s?|(,*)/g, "")}
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={loading}
              size="large"
              block
            >
              Lưu Thông tin
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* Help Info */}
      <Card type="inner" className="bg-blue-50 border-blue-200">
        <Title level={5} className="text-blue-800 flex items-center gap-1.5">
          <Info size={16} className="text-blue-600" /> Ghi chú
        </Title>
        <ul className="text-sm text-gray-700 space-y-2">
          <li>
            • Sứ mệnh và Tầm nhìn sẽ được hiển thị trên trang "Về chúng tôi"
          </li>
          <li>
            • Số lượng Học sinh và Khóa học sẽ được hiển thị trên Dashboard
          </li>
          <li>• Các thay đổi sẽ được lưu tự động vào localStorage</li>
        </ul>
      </Card>
    </div>
  );
}
