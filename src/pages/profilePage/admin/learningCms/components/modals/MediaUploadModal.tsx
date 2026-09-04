import { Button, Input, Modal, Upload } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { Paperclip } from "lucide-react";

// ── Types ────────────────────────────────────────────────────

interface Props {
  open:           boolean;
  onCancel:       () => void;
  onUpload:       () => void;
  confirmLoading: boolean;

  uploadFile:    File | null;
  onFileChange:  (file: File | null) => void;

  mediaAlt:      string;
  onAltChange:   (value: string) => void;
}

// ── Component ────────────────────────────────────────────────

/**
 * Media upload modal — file picker + alt-text input.
 * The actual upload call is handled by the parent via `onUpload`.
 */
export default function MediaUploadModal({
  open,
  onCancel,
  onUpload,
  confirmLoading,
  uploadFile,
  onFileChange,
  mediaAlt,
  onAltChange,
}: Props) {
  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <UploadOutlined className="text-indigo-600" />
          Tải lên tệp phương tiện
        </div>
      }
      open={open}
      onCancel={onCancel}
      onOk={onUpload}
      confirmLoading={confirmLoading}
      className="rounded-2xl"
      okText="Tải lên"
      cancelText="Hủy"
    >
      <div className="space-y-4 pt-2">
        <Upload
          beforeUpload={(file) => {
            onFileChange(file);
            return false;
          }}
          maxCount={1}
          onRemove={() => onFileChange(null)}
          accept="image/*,audio/*,video/*"
        >
          <Button icon={<UploadOutlined />} className="rounded-xl">
            Chọn tệp (ảnh, âm thanh, video)
          </Button>
        </Upload>

        {uploadFile && (
          <div className="bg-indigo-50 px-3 py-2 rounded-lg text-xs text-indigo-700 flex items-center gap-1.5">
            <Paperclip size={13} className="shrink-0" />
            <span>
              Đã chọn: <strong>{uploadFile.name}</strong>{" "}
              ({(uploadFile.size / 1024).toFixed(1)} KB)
            </span>
          </div>
        )}

        <div className="space-y-1">
          <span className="text-xs text-slate-500">Mô tả văn bản thay thế (Alt Text)</span>
          <Input
            placeholder="Mô tả ngắn gọn nội dung tệp..."
            value={mediaAlt}
            onChange={(e) => onAltChange(e.target.value)}
            className="rounded-xl"
          />
        </div>
      </div>
    </Modal>
  );
}
