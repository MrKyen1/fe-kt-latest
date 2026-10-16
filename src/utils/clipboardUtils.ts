import type React from "react";

/**
 * Trích xuất file hình ảnh từ ClipboardEvent (hỗ trợ cả React.ClipboardEvent và native ClipboardEvent).
 * Phục vụ tính năng chụp màn hình (Snipping Tool, Win+Shift+S, PrtSc) và Ctrl+V dán ảnh trực tiếp.
 */
export function extractImageFromClipboard(
  event: React.ClipboardEvent | ClipboardEvent
): File | null {
  const clipboardData =
    "clipboardData" in event ? event.clipboardData : null;
  if (!clipboardData) return null;

  // 1. Duyệt qua items (phổ biến nhất khi cắt ảnh từ Snipping Tool / trình duyệt)
  const items = clipboardData.items;
  if (items && items.length > 0) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type && item.type.startsWith("image/")) {
        const blob = item.getAsFile();
        if (blob) {
          const ext = item.type.split("/")[1]?.replace("+xml", "") || "png";
          const fileName =
            blob.name && blob.name !== "image.png"
              ? blob.name
              : `pasted_image_${Date.now()}.${ext}`;
          return new File([blob], fileName, { type: item.type });
        }
      }
    }
  }

  // 2. Fallback duyệt qua files (khi copy trực tiếp file ảnh từ File Explorer)
  const files = clipboardData.files;
  if (files && files.length > 0) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type && file.type.startsWith("image/")) {
        return file;
      }
    }
  }

  return null;
}

/**
 * Xử lý sự kiện paste ảnh tiện lợi.
 * Nếu có ảnh trong clipboard: ngăn chặn sự kiện mặc định và gọi callback `onImagePasted(file)`.
 * Nếu chỉ có text: giữ nguyên hành vi paste mặc định của trình duyệt.
 */
export function handleClipboardImagePaste(
  event: React.ClipboardEvent | ClipboardEvent,
  onImagePasted: (file: File) => void
): boolean {
  const imageFile = extractImageFromClipboard(event);
  if (imageFile) {
    event.preventDefault();
    event.stopPropagation();
    onImagePasted(imageFile);
    return true;
  }
  return false;
}
