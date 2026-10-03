import { useAuth } from "../../../../../contexts/AuthContext";
import React, { useState, useEffect } from "react";
import { Button, Segmented, Select, Tooltip, Upload, message, Tag } from "antd";
import { UploadOutlined, DeleteOutlined, SwapOutlined } from "@ant-design/icons";
import { Image as LucideImage, Volume2, Video, Eye } from "lucide-react";
import { resolveMediaUrl } from "../../../../../services/apiClient";
import { AppImage } from "../../../../../components/AppImagePreview";

export interface MediaAssetItem {
  id: string;
  url: string;
  altText?: string;
  type?: string;
  mimeType?: string;
}

export interface MediaPickerValue {
  mediaId?: string;
  file?: File;
  previewUrl?: string;
  fileName?: string;
  fileType?: "image" | "audio" | "video";
}

interface MediaPickerInputProps {
  value?: MediaPickerValue | string;
  onChange?: (val?: MediaPickerValue) => void;
  acceptType?: "image" | "audio" | "all";
  allMedia?: MediaAssetItem[];
  placeholder?: string;
  className?: string;
}

export const MediaPickerInput: React.FC<MediaPickerInputProps> = ({
  value,
  onChange,
  acceptType = "image",
  allMedia = [],
  placeholder = "Chọn tệp từ thư viện hoặc tải lên...",
  className = "",
}) => {
  const { hasPermission } = useAuth();
  const canUpload = hasPermission("learning.media.upload");
  // Normalize value
  const currentValue: MediaPickerValue =
    typeof value === "string"
      ? { mediaId: value }
      : value || {};

  const [mode, setMode] = useState<"upload" | "library">("library");

  // Filter media based on acceptType
  const filteredAssets = allMedia.filter((m) => {
    const isImg = m.type === "image" || m.mimeType?.startsWith("image");
    const isAud = m.type === "audio" || m.mimeType?.startsWith("audio");
    const isVid = m.type === "video" || m.mimeType?.startsWith("video");

    if (acceptType === "image") return isImg;
    if (acceptType === "audio") return isAud;
    return isImg || isAud || isVid;
  });

  const selectedAsset = currentValue.mediaId
    ? allMedia.find((m) => m.id === currentValue.mediaId)
    : undefined;

  const isImg =
    currentValue.fileType === "image" ||
    selectedAsset?.type === "image" ||
    selectedAsset?.mimeType?.startsWith("image");

  const isAud =
    currentValue.fileType === "audio" ||
    selectedAsset?.type === "audio" ||
    selectedAsset?.mimeType?.startsWith("audio");

  const previewSrc = currentValue.previewUrl || selectedAsset?.url || "";
  const displayName =
    currentValue.fileName ||
    currentValue.file?.name ||
    selectedAsset?.altText ||
    selectedAsset?.url?.split("/").pop() ||
    (currentValue.mediaId ? `Tệp #${currentValue.mediaId.slice(0, 8)}` : "");

  const hasItem = Boolean(currentValue.file || currentValue.mediaId);

  const handleClear = () => {
    if (currentValue.previewUrl && currentValue.file) {
      try {
        URL.revokeObjectURL(currentValue.previewUrl);
      } catch (_) {}
    }
    onChange?.(undefined);
  };

  const handleFileChosen = (file: File) => {
    if (!canUpload) return Upload.LIST_IGNORE;
    const isFileImg = file.type.startsWith("image/");
    const isFileAud = file.type.startsWith("audio/");

    if (acceptType === "image" && !isFileImg) {
      message.error("Chỉ chấp nhận tệp hình ảnh (image/*)!");
      return false;
    }
    if (acceptType === "audio" && !isFileAud) {
      message.error("Chỉ chấp nhận tệp âm thanh (audio/*)!");
      return false;
    }
    if (file.size > 20 * 1024 * 1024) {
      message.error("Kích thước tệp không được vượt quá 20MB!");
      return false;
    }

    const previewUrl = URL.createObjectURL(file);
    const fileType = isFileImg ? "image" : isFileAud ? "audio" : "video";

    onChange?.({
      file,
      previewUrl,
      fileName: file.name,
      fileType,
      mediaId: undefined,
    });
    return false;
  };

  const handleSelectAsset = (assetId?: string) => {
    if (!assetId) {
      handleClear();
      return;
    }
    const asset = allMedia.find((m) => m.id === assetId);
    const isAssetImg = asset?.type === "image" || asset?.mimeType?.startsWith("image");
    const isAssetAud = asset?.type === "audio" || asset?.mimeType?.startsWith("audio");

    onChange?.({
      mediaId: assetId,
      previewUrl: asset?.url,
      fileName: asset?.altText || asset?.url.split("/").pop(),
      fileType: isAssetImg ? "image" : isAssetAud ? "audio" : "video",
    });
  };

  // If item is selected, render Preview Card
  if (hasItem) {
    return (
      <div className={`flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl ${className}`}>
        {/* Media Thumbnail / Preview */}
        {isImg ? (
          <div className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-white flex items-center justify-center">
            <AppImage
              src={currentValue.file ? previewSrc : resolveMediaUrl(previewSrc)}
              alt={displayName}
              className="w-full h-full object-cover"
              maskText="Xem ảnh"
            />
          </div>
        ) : isAud ? (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 truncate mb-1">
              <span className="w-5 h-5 rounded bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                <Volume2 size={12} />
              </span>
              <span className="truncate">{displayName}</span>
            </div>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio
              src={currentValue.file ? previewSrc : resolveMediaUrl(previewSrc)}
              controls
              className="h-7 w-full max-w-[260px]"
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            <Video size={18} />
          </div>
        )}

        {/* Text info if image */}
        {isImg && (
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-700 truncate" title={displayName}>
              {displayName}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
              {currentValue.file ? (
                <Tag color="cyan" className="m-0 text-[10px] px-1.5 py-0 rounded">Tệp từ máy</Tag>
              ) : (
                <Tag color="blue" className="m-0 text-[10px] px-1.5 py-0 rounded">Thư viện</Tag>
              )}
              {selectedAsset?.id && <span className="font-mono truncate">ID: {selectedAsset.id.slice(0, 8)}</span>}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0 ml-auto">
          <Tooltip title="Đổi tệp khác">
            <Button
              type="text"
              size="small"
              icon={<SwapOutlined />}
              onClick={handleClear}
              className="text-slate-500 hover:text-indigo-600"
            />
          </Tooltip>
          <Tooltip title="Xóa">
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={handleClear}
              className="hover:bg-rose-50"
            />
          </Tooltip>
        </div>
      </div>
    );
  }

  // Not selected yet -> Selector mode
  const uploadAccept =
    acceptType === "image"
      ? "image/*,.png,.jpg,.jpeg,.webp,.svg"
      : acceptType === "audio"
      ? "audio/*,.mp3,.wav,.m4a,.ogg,.aac"
      : "image/*,audio/*";

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <Segmented
          size="small"
          value={mode}
          onChange={(val) => setMode(val as "upload" | "library")}
          className="bg-slate-100 p-0.5 text-xs"
          options={[
            {
              label: (
                <div className="flex items-center gap-1 px-1 py-0.5">
                  <UploadOutlined className="text-xs" />
                  <span>Tải từ máy</span>
                </div>
              ),
              value: "upload",
              disabled: !canUpload,
            },
            {
              label: (
                <div className="flex items-center gap-1 px-1 py-0.5">
                  <LucideImage size={11} />
                  <span>Thư viện ({filteredAssets.length})</span>
                </div>
              ),
              value: "library",
            },
          ]}
        />
      </div>

      {mode === "upload" ? (
        <Upload.Dragger
          disabled={!canUpload}
          showUploadList={false}
          accept={uploadAccept}
          beforeUpload={handleFileChosen}
          className="bg-slate-50/70 hover:bg-indigo-50/20 border-dashed border-slate-200 hover:border-indigo-300 rounded-xl transition-all p-2"
        >
          <div className="py-1 flex items-center justify-center gap-2 text-slate-500 text-xs">
            <UploadOutlined className="text-indigo-600 text-sm" />
            <span className="font-medium text-slate-700">Chọn hoặc kéo tệp vào đây</span>
            <span className="text-[10px] text-slate-400">
              {acceptType === "image" ? "(PNG, JPG, WEBP ≤ 20MB)" : acceptType === "audio" ? "(MP3, WAV ≤ 20MB)" : "(≤ 20MB)"}
            </span>
          </div>
        </Upload.Dragger>
      ) : (
        <Select
          showSearch
          placeholder={placeholder}
          className="w-full"
          allowClear
          filterOption={(input, option) => {
            const label = (option?.label as string) ?? "";
            return label.toLowerCase().includes(input.toLowerCase());
          }}
          onChange={handleSelectAsset}
        >
          {filteredAssets.map((asset) => {
            const isImgAsset = asset.type === "image" || asset.mimeType?.startsWith("image");
            const isAudAsset = asset.type === "audio" || asset.mimeType?.startsWith("audio");
            const fileName = asset.altText ?? asset.url.split("/").pop();

            return (
              <Select.Option key={asset.id} value={asset.id} label={fileName}>
                <div className="flex items-center gap-2 py-0.5">
                  {isImgAsset ? (
                    <div className="w-5 h-5 rounded overflow-hidden border border-slate-200 shrink-0 bg-slate-50">
                      <img
                        src={resolveMediaUrl(asset.url)}
                        alt="thumb"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : isAudAsset ? (
                    <span className="w-5 h-5 rounded bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                      <Volume2 size={11} />
                    </span>
                  ) : (
                    <span className="w-5 h-5 rounded bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                      <Video size={11} />
                    </span>
                  )}
                  <span className="font-medium text-slate-700 truncate max-w-[240px] text-xs">
                    {fileName}
                  </span>
                  <span className="text-[10px] text-slate-400 ml-auto uppercase font-mono">
                    {asset.type || "FILE"}
                  </span>
                </div>
              </Select.Option>
            );
          })}
        </Select>
      )}
    </div>
  );
};
