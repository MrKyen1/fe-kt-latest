import { useEffect, useState } from "react";
import {
  Avatar,
  Button,
  Col,
  Form,
  Input,
  Row,
  Typography,
  Upload,
  message,
} from "antd";
import {
  CameraOutlined,
  MailOutlined,
  PhoneOutlined,
  SaveOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../contexts/AuthContext";
import { authService } from "../../services/authService";

const { Title, Text } = Typography;

export default function UserProfile() {
  const [form] = Form.useForm();
  const { user } = useAuth();
  const [avatar, setAvatar] = useState(user?.avatar || "https://i.pravatar.cc/150?img=3");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    form.setFieldsValue({
      code: user?.code,
      fullName: user?.fullName || user?.username,
      email: user?.email,
      phone: "",
      address: "",
    });
    setAvatar(user?.avatar || "https://i.pravatar.cc/150?img=3");
  }, [form, user]);

  const handleUploadAvatar = (info: any) => {
    const file = info.file.originFileObj;
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => setAvatar(event.target?.result as string);
    reader.readAsDataURL(file);
    message.success("Cap nhat avatar thanh cong");
  };

  const handleSaveProfile = async (values: any) => {
    try {
      setIsSaving(true);
      await authService.updateMe({
        code: values.code,
        fullName: values.fullName,
        email: values.email || undefined,
        phone: values.phone || undefined,
        address: values.address || undefined,
        avatar,
      });
      message.success("Cap nhat thong tin thanh cong");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Khong the cap nhat thong tin");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-3xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.08)] mb-8">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-8">
            <Title level={2} className="!text-white !mb-1">
              User Profile
            </Title>
            <Text className="text-white/80">Manage your personal information</Text>
          </div>
        </div>

        <Row gutter={[24, 24]}>
          <Col xs={24} lg={8}>
            <div className="bg-white rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-5">
                <div className="text-white text-xl font-bold">Avatar Profile</div>
                <div className="text-white/80 text-sm mt-1">Upload and manage your avatar</div>
              </div>

              <div className="p-8 flex flex-col items-center">
                <div className="relative">
                  <Avatar
                    size={150}
                    src={avatar}
                    icon={!avatar ? <UserOutlined /> : undefined}
                    className="shadow-[0_10px_30px_rgba(0,0,0,0.15)] border-4 border-white"
                  />
                  <Upload showUploadList={false} beforeUpload={() => false} onChange={handleUploadAvatar}>
                    <Button
                      shape="circle"
                      type="primary"
                      size="large"
                      icon={<CameraOutlined />}
                      className="!absolute bottom-2 right-2 shadow-lg"
                    />
                  </Upload>
                </div>
              </div>
            </div>
          </Col>

          <Col xs={24} lg={16}>
            <div className="bg-white rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-5">
                <div className="text-white text-xl font-bold">Personal Information</div>
                <div className="text-white/80 text-sm mt-1">Update your personal information here</div>
              </div>

              <div className="p-8">
                <Form form={form} layout="vertical" onFinish={handleSaveProfile}>
                  <Row gutter={[20, 20]}>
                    <Col xs={24} md={12}>
                      <Form.Item label="Code" name="code" rules={[{ required: true }]}>
                        <Input size="large" prefix={<UserOutlined />} className="rounded-xl" />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item label="Full name" name="fullName" rules={[{ required: true }]}>
                        <Input size="large" className="rounded-xl" />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item label="Email" name="email">
                        <Input size="large" prefix={<MailOutlined />} className="rounded-xl" />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item label="Phone" name="phone">
                        <Input size="large" prefix={<PhoneOutlined />} className="rounded-xl" />
                      </Form.Item>
                    </Col>

                    <Col span={24}>
                      <Form.Item label="Address" name="address">
                        <Input.TextArea rows={4} className="rounded-xl" />
                      </Form.Item>
                    </Col>

                    <Col span={24}>
                      <Button
                        htmlType="submit"
                        type="primary"
                        size="large"
                        icon={<SaveOutlined />}
                        loading={isSaving}
                        className="rounded-xl h-12 px-8 shadow-lg"
                      >
                        Save changes
                      </Button>
                    </Col>
                  </Row>
                </Form>
              </div>
            </div>
          </Col>
        </Row>
      </div>
    </div>
  );
}
