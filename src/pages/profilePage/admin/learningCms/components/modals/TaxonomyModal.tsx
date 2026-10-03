import { Form, Input, InputNumber, Modal, Select } from "antd";
import type { FormInstance } from "antd";
import { OrderedListOutlined } from "@ant-design/icons";

// ── Types ────────────────────────────────────────────────────

interface TaxItem { id: string; name: string; }

interface Props {
  open:       boolean;
  onCancel:   () => void;
  form:       FormInstance;
  onFinish:   (values: any) => void;

  /** Currently selected inner taxonomy tab key */
  taxTab:      string;
  isEditing:   boolean;
  topics:      TaxItem[];  // needed for parentId select (topics only)
  editingItem: any;
}

// ── Helper ───────────────────────────────────────────────────

function taxTabLabel(taxTab: string): string {
  switch (taxTab) {
    case "levels": return "Level";
    case "skills": return "Kỹ năng";
    case "topics": return "Chủ đề";
    default:       return "Thẻ gắn";
  }
}

// ── Component ────────────────────────────────────────────────

/**
 * Create / Edit taxonomy item modal.
 * Adapts its fields based on `taxTab` (levels add a rank field,
 * topics add a parent-topic selector).
 */
export default function TaxonomyModal({
  open,
  onCancel,
  form,
  onFinish,
  taxTab,
  isEditing,
  topics,
  editingItem,
}: Props) {
  const label = taxTabLabel(taxTab);

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <OrderedListOutlined className="text-indigo-600" />
          {isEditing ? "Chỉnh sửa danh mục" : `Tạo mới ${label}`}
        </div>
      }
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      maskClosable={false}
      centered
      width={540}
      className="rounded-2xl"
      okText="Lưu lại"
      cancelText="Hủy"
    >
      <Form form={form} layout="vertical" onFinish={onFinish} className="pt-2">
        <Form.Item name="code" label="Mã" rules={[{ required: true, message: "Nhập mã!" }]}>
          <Input
            placeholder="Mã không dấu, viết liền (vd: beginner_a1)"
            disabled={isEditing}
            className="rounded-xl font-mono"
          />
        </Form.Item>

        <Form.Item name="name" label="Tên" rules={[{ required: true, message: "Nhập tên!" }]}>
          <Input placeholder="Tên hiển thị" className="rounded-xl" />
        </Form.Item>

        {taxTab === "levels" && (
          <Form.Item name="rank" label="Thứ tự (Rank)" rules={[{ required: true, message: "Vui lòng nhập thứ tự sắp xếp!" }]}>
            <InputNumber style={{ width: "100%" }} min={0} placeholder="Thứ tự sắp xếp" className="rounded-xl" />
          </Form.Item>
        )}

        {taxTab === "topics" && (
          <Form.Item name="parentId" label="Chủ đề cha (nếu có)">
            <Select placeholder="Chọn chủ đề cha..." className="rounded-xl" allowClear>
              {topics
                .filter((t) => t.id !== editingItem?.id)
                .map((t) => (
                  <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>
                ))}
            </Select>
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
