import { useEffect, useState } from "react";
import {
  Avatar,
  Button,
  Card,
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
import { resolveMediaUrl } from "../../services/apiClient";
import { learningCmsService } from "../../services/learningCmsService";

const { Title, Text } = Typography;

interface ProfileFormValues {
  fullName: string;
  phone?: string;
  email?: string;
  dateOfBirth?: string;
  address?: string;
}

export default function UserProfile() {
  const { user, updateUser } = useAuth();
  const [form] = Form.useForm<ProfileFormValues>();
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    form.setFieldsValue({
      fullName: user?.fullName || "",
      phone: user?.phone || "",
      email: user?.email || "",
      dateOfBirth: user?.dateOfBirth || "",
      address: user?.address || "",
    });
    setAvatar(user?.avatar || "");
  }, [form, user]);

  const normalizeOptional = (value?: string) => {
    const normalized = value?.trim();
    return normalized ? normalized : undefined;
  };

  const beforeUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      message.error("Chi duoc upload anh");
      return Upload.LIST_IGNORE;
    }

    return false;
  };

  const handlePreview = (info: { file: { originFileObj?: File } | File }) => {
    const file = "originFileObj" in info.file ? info.file.originFileObj : info.file;
    if (!file) return;

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (event) => setPreviewAvatar(event.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async (values: ProfileFormValues) => {
    try {
      setIsSaving(true);
      let finalAvatar = avatar;

      if (avatarFile) {
        const media = await learningCmsService.mediaAssets.upload(avatarFile, "User avatar");
        finalAvatar = media.url;
      }

      const avatarForBackend = finalAvatar.startsWith("data:")
        ? undefined
        : normalizeOptional(finalAvatar);

      const updatedUser = await authService.updateMe({
        fullName: values.fullName.trim(),
        phone: normalizeOptional(values.phone),
        email: normalizeOptional(values.email),
        dateOfBirth: normalizeOptional(values.dateOfBirth),
        address: normalizeOptional(values.address),
        avatar: avatarForBackend,
      });

      updateUser(updatedUser);

      setAvatar(updatedUser.avatar || "");
      setPreviewAvatar(null);
      setAvatarFile(null);
      message.success("Cập nhật thành công");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Cap nhat that bai");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex justify-center">
      <Card
        bordered={false}
        className="w-full max-w-3xl rounded-xl"
        style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}
      >
        <div className="text-center mb-6">
          <Title level={4} className="!mb-1">
            {user?.username || user?.code || "Profile"}
          </Title>
          <Text type="secondary">Update profile information</Text>
        </div>

        <Form form={form} layout="vertical" onFinish={handleSave}>
          <div className="flex flex-col items-center mb-8">
            <div className="relative">
              <Avatar
                size={120}
                src={previewAvatar || resolveMediaUrl(avatar)}
                icon={!avatar && <UserOutlined />}
                imgProps={{ crossOrigin: "anonymous" }}
              />

              <Upload
                showUploadList={false}
                beforeUpload={beforeUpload}
                onChange={handlePreview}
                accept="image/*"
              >
                <Button
                  shape="circle"
                  icon={<CameraOutlined />}
                  className="absolute bottom-0 right-0"
                />
              </Upload>
            </div>

            {previewAvatar && (
              <Text className="mt-2 text-orange-500 text-sm">
                Ảnh mới chưa được lưu
              </Text>
            )}
          </div>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Username">
                <Input
                  prefix={<UserOutlined />}
                  value={user?.code || user?.username || ""}
                  disabled
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="Full Name" name="fullName" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="Phone" name="phone">
                <Input prefix={<PhoneOutlined />} />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="Email" name="email">
                <Input prefix={<MailOutlined />} />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="Ngày sinh" name="dateOfBirth">
                <Input type="date" />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item label="Địa chỉ" name="address">
                <Input.TextArea rows={3} />
              </Form.Item>
            </Col>
          </Row>

          <div className="flex justify-center">
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              size="middle"
              loading={isSaving}
              className="px-6 h-9 rounded-lg"
            >
              Lưu thay đổi
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
