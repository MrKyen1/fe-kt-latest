import { useState } from "react";
import { Form, Input, Modal, Select, Upload, Button, message, Spin } from "antd";
import type { FormInstance } from "antd";
import { FileTextOutlined, UploadOutlined, DeleteOutlined } from "@ant-design/icons";
import { Info, Image as ImageIcon } from "lucide-react";
import { AppImage } from "../../../../../../components/AppImagePreview";
import { learningCmsService } from "../../../../../../services/learningCmsService";

// ── Types ────────────────────────────────────────────────────

interface Level { id: string; name: string; }

interface Props {
  open:      boolean;
  onCancel:  () => void;
  form:      FormInstance;
  onFinish:  (values: any) => void;
  isEditing: boolean;
  levels:    Level[];
}

// ── Component ────────────────────────────────────────────────

/**
 * Create / Edit Curriculum modal with cover image upload support (Backend ## 2026-09-16).
 */
export default function CurriculumFormModal({ open, onCancel, form, onFinish, isEditing, levels }: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const imageUrl = Form.useWatch("image", form);

  const handleUploadImage = async (file: File) => {
    try {
      setIsUploading(true);
      const media = await learningCmsService.mediaAssets.upload(file, `Cover: ${form.getFieldValue("title") || "Curriculum"}`);
      form.setFieldValue("image", media.url);
      message.success("Tải ảnh bìa giáo trình thành công!");
    } catch (err: any) {
      message.error(err?.message || "Tải ảnh bìa thất bại");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    form.setFieldValue("image", null);
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <FileTextOutlined className="text-purple-600" />
          {isEditing ? "Cập nhật Giáo trình" : "Tạo Giáo trình mới"}
        </div>
      }
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      className="rounded-2xl"
      okText="Lưu lại"
      cancelText="Hủy"
      width={600}
    >
      <Form form={form} layout="vertical" onFinish={onFinish} className="pt-2">
        <Form.Item name="code" label="Mã giáo trình" rules={[{ required: !isEditing }]}>
          <Input
            placeholder="Ví dụ: CURR_A1"
            disabled={isEditing}
            className="rounded-xl font-mono"
          />
        </Form.Item>

        <Form.Item name="title" label="Tiêu đề giáo trình" rules={[{ required: true, message: "Vui lòng nhập tiêu đề giáo trình" }]}>
          <Input placeholder="Ví dụ: Tiếng Anh nâng cao lớp 6" className="rounded-xl" />
        </Form.Item>

        <Form.Item name="levelId" label="Level (Độ tuổi / Cấp độ)">
          <Select className="rounded-xl" placeholder="Chọn level" allowClear>
            {levels.map((l) => (
              <Select.Option key={l.id} value={l.id}>{l.name}</Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* Cover Image Upload (Backend 2026-09-16) */}
        <Form.Item label="Ảnh bìa giáo trình" className="mb-4">
          <div className="space-y-3">
            {imageUrl ? (
              <div className="relative group w-full h-44 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center shadow-sm">
                <AppImage
                  src={imageUrl}
                  alt="Curriculum Cover"
                  className="w-full h-44 object-cover"
                  rootClassName="w-full h-full flex items-center justify-center"
                />
                <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                  <Upload
                    beforeUpload={(file) => {
                      handleUploadImage(file);
                      return false;
                    }}
                    showUploadList={false}
                    accept="image/*"
                  >
                    <Button
                      size="small"
                      icon={<UploadOutlined />}
                      className="bg-white/90 backdrop-blur shadow-sm rounded-lg hover:bg-white text-xs"
                      loading={isUploading}
                    >
                      Đổi ảnh
                    </Button>
                  </Upload>
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={handleRemoveImage}
                    className="bg-white/90 backdrop-blur shadow-sm rounded-lg hover:bg-white text-xs"
                  >
                    Xóa
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-200 hover:border-purple-400 rounded-2xl p-6 text-center transition-colors bg-slate-50/50">
                {isUploading ? (
                  <div className="py-4 flex flex-col items-center gap-2 text-purple-600">
                    <Spin size="default" />
                    <span className="text-xs">Đang tải ảnh lên server...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                      <ImageIcon size={20} />
                    </div>
                    <div className="text-sm font-medium text-slate-700">Tải lên ảnh bìa cho giáo trình</div>
                    <div className="text-xs text-slate-400 max-w-xs">Định dạng PNG, JPG, WEBP. Ảnh hiển thị ở tỉ lệ khung chữ nhật đẹp mắt.</div>
                    <div className="mt-2">
                      <Upload
                        beforeUpload={(file) => {
                          handleUploadImage(file);
                          return false;
                        }}
                        showUploadList={false}
                        accept="image/*"
                      >
                        <Button
                          type="dashed"
                          icon={<UploadOutlined />}
                          className="rounded-xl border-purple-300 text-purple-600 hover:border-purple-500"
                        >
                          Chọn tệp ảnh
                        </Button>
                      </Upload>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Hidden field storing image URL */}
            <Form.Item name="image" noStyle>
              <Input type="hidden" />
            </Form.Item>
          </div>
        </Form.Item>

        <Form.Item name="description" label="Mô tả giáo trình">
          <Input.TextArea placeholder="Mô tả tóm tắt nội dung giáo trình..." rows={3} className="rounded-xl" />
        </Form.Item>

        {!isEditing && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-xs text-purple-700 flex items-start gap-2">
            <Info size={15} className="shrink-0 text-purple-600 mt-0.5" />
            <span>Giáo trình sẽ được tạo ở trạng thái <strong>Nháp</strong>. Sau khi thêm đề thi (đã phát hành), bạn có thể Phát hành giáo trình.</span>
          </div>
        )}
      </Form>
    </Modal>
  );
}
