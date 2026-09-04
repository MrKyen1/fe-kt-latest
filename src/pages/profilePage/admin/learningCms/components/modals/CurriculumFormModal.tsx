import { Form, Input, Modal, Select } from "antd";
import type { FormInstance } from "antd";
import { FileTextOutlined } from "@ant-design/icons";
import { Info } from "lucide-react";

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
 * Create / Edit Curriculum modal.
 */
export default function CurriculumFormModal({ open, onCancel, form, onFinish, isEditing, levels }: Props) {
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
    >
      <Form form={form} layout="vertical" onFinish={onFinish} className="pt-2">
        <Form.Item name="code" label="Mã giáo trình" rules={[{ required: !isEditing }]}>
          <Input
            placeholder="Ví dụ: CURR_A1"
            disabled={isEditing}
            className="rounded-xl font-mono"
          />
        </Form.Item>

        <Form.Item name="title" label="Tiêu đề giáo trình" rules={[{ required: true }]}>
          <Input placeholder="Ví dụ: Tiếng Anh nâng cao lớp 6" className="rounded-xl" />
        </Form.Item>

        <Form.Item name="levelId" label="Level (Độ tuổi / Cấp độ)">
          <Select className="rounded-xl" placeholder="Chọn level" allowClear>
            {levels.map((l) => (
              <Select.Option key={l.id} value={l.id}>{l.name}</Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="description" label="Mô tả giáo trình">
          <Input.TextArea placeholder="Mô tả giáo trình..." rows={3} className="rounded-xl" />
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
