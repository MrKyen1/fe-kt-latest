import React, { useEffect, useState } from "react";
import { Button, Input, Modal, Upload, message } from "antd";
import { UploadOutlined, DeleteOutlined } from "@ant-design/icons";
import { Paperclip, Image as ImageIcon } from "lucide-react";
import { handleClipboardImagePaste } from "../../../../../../utils/clipboardUtils";

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
 * Media upload modal — file picker + drag & drop + Ctrl+V paste + alt-text input.
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
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (uploadFile && uploadFile.type.startsWith("image/")) {
      const url = URL.createObjectURL(uploadFile);
      setImagePreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setImagePreviewUrl(null);
    }
  }, [uploadFile]);

  // Lắng nghe sự kiện Ctrl+V khi modal đang mở
  useEffect(() => {
    if (!open) return;
    const handleWindowPaste = (e: ClipboardEvent) => {
      handleClipboardImagePaste(e, (pastedFile) => {
        onFileChange(pastedFile);
        message.success("Đã dán ảnh từ clipboard (Ctrl+V)!");
      });
    };
    window.addEventListener("paste", handleWindowPaste);
    return () => {
      window.removeEventListener("paste", handleWindowPaste);
    };
  }, [open, onFileChange]);

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <UploadOutlined className="text-indigo-600" />
          <span>Tải lên tệp phương tiện</span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      onOk={onUpload}
      confirmLoading={confirmLoading}
      centered
      maskClosable={false}
      width={520}
      className="rounded-2xl"
      okText="Tải lên"
      cancelText="Hủy"
    >
      <div className="space-y-4 pt-2">
        <Upload.Dragger
          beforeUpload={(file) => {
            onFileChange(file);
            return false;
          }}
          maxCount={1}
          showUploadList={false}
          accept="image/*,audio/*,video/*"
          className="p-3 rounded-2xl border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/20"
        >
          <div className="py-2 flex flex-col items-center justify-center gap-1.5 text-slate-500">
            <div className="w-10 h-10 rounded-full bg-indigo-100/70 text-indigo-600 flex items-center justify-center mb-0.5">
              <UploadOutlined className="text-lg" />
            </div>
            <p className="text-sm font-semibold text-slate-700 m-0">
              Nhấp để chọn tệp hoặc kéo thả vào đây
            </p>
            <p className="text-xs text-indigo-600 font-medium m-0 flex items-center gap-1">
              ✨ Hoặc chụp màn hình và nhấn <kbd className="px-1.5 py-0.5 bg-white border border-indigo-200 rounded font-mono text-[10px]">Ctrl+V</kbd> để dán ảnh
            </p>
            <p className="text-[11px] text-slate-400 m-0">
              Hỗ trợ Hình ảnh, Âm thanh hoặc Video (Tối đa 20MB)
            </p>
          </div>
        </Upload.Dragger>

        {uploadFile && (
          <div className="bg-indigo-50/80 border border-indigo-100 px-3.5 py-2.5 rounded-xl text-xs text-indigo-900 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {imagePreviewUrl ? (
                <img
                  src={imagePreviewUrl}
                  alt="Xem trước"
                  className="w-10 h-10 rounded-lg object-cover border border-indigo-200 bg-white shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <Paperclip size={16} />
                </div>
              )}
              <div className="min-w-0 truncate">
                <div className="font-semibold truncate">{uploadFile.name}</div>
                <div className="text-[11px] text-indigo-600/80">
                  {(uploadFile.size / 1024).toFixed(1)} KB • {uploadFile.type || "file"}
                </div>
              </div>
            </div>

            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => onFileChange(null)}
              className="hover:bg-rose-50 shrink-0"
            />
          </div>
        )}

        <div className="space-y-1">
          <span className="text-xs text-slate-500 font-medium">Mô tả văn bản thay thế (Alt Text)</span>
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
