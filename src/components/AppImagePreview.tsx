import React, { useState } from "react";
import { Image, ImageProps } from "antd";
import { resolveMediaUrl } from "../services/apiClient";

export interface AppImageProps extends ImageProps {
  maskText?: string;
  autoResolve?: boolean;
}

/**
 * Component hiển thị hình ảnh chuẩn với Ant Design Lightbox Viewer.
 * Có thanh công cụ xoay, lật, thu nhỏ, phóng to và mask badge 'Xem ảnh' khi hover.
 */
export const AppImage: React.FC<AppImageProps> = ({
  src,
  maskText = "Xem ảnh",
  autoResolve = true,
  preview,
  className,
  rootClassName,
  ...props
}) => {
  const finalSrc = autoResolve && src ? resolveMediaUrl(src) : src;

  const defaultMask = (
    <span className="text-white text-xs font-semibold bg-slate-900/60 px-3 py-1.5 rounded-full backdrop-blur-sm">
      {maskText}
    </span>
  );

  const previewConfig =
    preview === false
      ? false
      : {
          cover: defaultMask,
          ...(typeof preview === "object" ? preview : {}),
        };

  return (
    <Image
      src={finalSrc || undefined}
      className={className}
      rootClassName={rootClassName}
      preview={previewConfig}
      {...props}
    />
  );
};

export const AppImagePreviewGroup = Image.PreviewGroup;

/**
 * Custom Hook cho phép kích hoạt Ant Design Lightbox Viewer từ bất kỳ nút bấm
 * hoặc hàm callback nào (ví dụ onPreview trong Upload, button EyeOutlined,...).
 */
export function useAppImagePreview() {
  const [visible, setVisible] = useState(false);
  const [src, setSrc] = useState<string | null>(null);

  const showPreview = (imageSrc: string) => {
    if (!imageSrc) return;
    setSrc(resolveMediaUrl(imageSrc));
    setVisible(true);
  };

  const closePreview = () => {
    setVisible(false);
    setSrc(null);
  };

  const previewElement = src ? (
    <Image
      width={0}
      height={0}
      style={{ display: "none" }}
      src={src}
      preview={{
        open: visible,
        src,
        onOpenChange: (val) => {
          setVisible(val);
          if (!val) {
            setSrc(null);
          }
        },
      }}
    />
  ) : null;

  return {
    visible,
    src,
    showPreview,
    closePreview,
    previewElement,
  };
}
