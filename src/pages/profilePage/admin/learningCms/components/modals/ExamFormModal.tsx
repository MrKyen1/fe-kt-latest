import { Form, Input, InputNumber, Modal, Select } from "antd";
import type { FormInstance } from "antd";
import { BookOutlined } from "@ant-design/icons";
import { Info } from "lucide-react";

// ── Types ────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onCancel: () => void;
  form: FormInstance;
  onFinish: (values: any) => void;
  isEditing: boolean;
}

// ── Component ────────────────────────────────────────────────

/**
 * Create / Edit Exam modal.
 */
export default function ExamFormModal({ open, onCancel, form, onFinish, isEditing }: Props) {
  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <BookOutlined className="text-indigo-600" />
          {isEditing ? "Cập nhật Đề thi" : "Tạo Đề thi mới"}
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
        <Form.Item name="code" label="Mã đề thi" rules={[{ required: !isEditing }]}>
          <Input
            placeholder="Ví dụ: EXAM_A1_001"
            disabled={isEditing}
            className="rounded-xl font-mono"
          />
        </Form.Item>

        <Form.Item name="title" label="Tiêu đề đề thi" rules={[{ required: true }]}>
          <Input placeholder="Ví dụ: Đề kiểm tra giữa kỳ 1" className="rounded-xl" />
        </Form.Item>

        <Form.Item
          name="examType"
          label="Loại đề thi"
          initialValue="practice"
          rules={[{ required: true, message: "Vui lòng chọn loại đề thi!" }]}
        >
          <Select className="rounded-xl">
            <Select.Option value="practice">
              Đề ôn tập (Làm nhiều lần cho tới khi đúng hết 100%)
            </Select.Option>
            <Select.Option value="exam">
              Đề kiểm tra (Làm 1 lần duy nhất)
            </Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="timeLimitMinutes"
          label="Thời gian làm bài (phút)"
          rules={[{ required: true, message: "Nhập thời gian làm bài!" }]}
        >
          <InputNumber style={{ width: "100%" }} min={1} placeholder="Ví dụ: 45" className="rounded-xl" />
        </Form.Item>

        <Form.Item name="description" label="Mô tả chi tiết">
          <Input.TextArea placeholder="Mô tả đề thi..." rows={3} className="rounded-xl" />
        </Form.Item>

        {!isEditing && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 flex items-start gap-2">
            <Info size={15} className="shrink-0 text-amber-600 mt-0.5" />
            <span>Đề thi sẽ được tạo ở trạng thái <strong>Nháp</strong>. Sau khi thêm câu hỏi (đã duyệt), bạn có thể Phát hành đề thi.</span>
          </div>
        )}
      </Form>
    </Modal>
  );
}
