import { Col, Form, Input, Modal, Row, Select } from "antd";
import type { FormInstance } from "antd";
import { ReadOutlined } from "@ant-design/icons";

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
 * Create / Edit Reading Passage modal.
 */
export default function PassageFormModal({ open, onCancel, form, onFinish, isEditing, levels }: Props) {
  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <ReadOutlined className="text-indigo-600" />
          {isEditing ? "Cập nhật Bài đọc" : "Tạo Bài đọc mới"}
        </div>
      }
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      width={680}
      className="rounded-2xl"
      okText="Lưu lại"
      cancelText="Hủy"
    >
      <Form form={form} layout="vertical" onFinish={onFinish} className="pt-2">
        <Form.Item name="title" label="Tiêu đề bài đọc" rules={[{ required: true, message: "Nhập tiêu đề!" }]}>
          <Input placeholder="Tiêu đề..." className="rounded-xl" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="source" label="Nguồn tài liệu">
              <Input placeholder="Nguồn trích dẫn..." className="rounded-xl" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="levelId" label="Level (Độ khó)">
              <Select placeholder="Chọn level..." className="rounded-xl" allowClear>
                {levels.map((l) => (
                  <Select.Option key={l.id} value={l.id}>{l.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="content" label="Nội dung bài đọc" rules={[{ required: true, message: "Nhập nội dung!" }]}>
          <Input.TextArea placeholder="Nhập văn bản bài đọc chi tiết..." rows={10} className="rounded-xl" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
