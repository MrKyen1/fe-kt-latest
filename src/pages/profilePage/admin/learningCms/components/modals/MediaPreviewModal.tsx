import { useEffect, useRef } from "react";
import { Modal } from "antd";
import { SoundOutlined } from "@ant-design/icons";
import { resolveMediaUrl } from "../../../../../../services/apiClient";
import { AppImage } from "../../../../../../components/AppImagePreview";

// ── Types ────────────────────────────────────────────────────

interface MediaAsset {
  id: string;
  url: string;
  altText?: string;
  type?: string;
  mimeType?: string;
}

interface Props {
  open:      boolean;
  asset:     MediaAsset | null;
  onCancel:  () => void;
}

// ── Component ────────────────────────────────────────────────

/**
 * Media preview modal — renders image, audio, or video based on
 * the asset's type / mimeType with instant auto-play on open.
 */
export default function MediaPreviewModal({ open, asset, onCancel }: Props) {
  const isImage = asset?.type === "image" || asset?.mimeType?.startsWith("image");
  const isAudio = asset?.type === "audio" || asset?.mimeType?.startsWith("audio");

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (open && asset) {
      if (isAudio && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      } else if (!isImage && videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [open, asset, isAudio, isImage]);

  return (
    <Modal
      open={open}
      title={asset?.altText ?? "Xem chi tiết Media"}
      footer={null}
      onCancel={onCancel}
      centered
      maskClosable={false}
      destroyOnClose
      width={isAudio ? 500 : 720}
      className="rounded-2xl"
    >
      {asset && (
        <div className="flex flex-col items-center justify-center p-2">
          {isImage ? (
            <div className="rounded-xl overflow-hidden shadow-sm">
              <AppImage
                src={asset.url}
                alt={asset.altText}
                style={{ maxWidth: "100%", maxHeight: "60vh", objectFit: "contain" }}
                className="rounded-xl"
                maskText="Phóng to ảnh"
              />
            </div>
          ) : isAudio ? (
            <div className="w-full text-center space-y-4 py-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-indigo-50 flex items-center justify-center text-4xl text-indigo-500 shadow-inner">
                <SoundOutlined />
              </div>
              {asset.altText && (
                <div className="text-sm font-medium text-slate-700 truncate max-w-sm mx-auto px-4">
                  {asset.altText}
                </div>
              )}
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio
                ref={audioRef}
                src={resolveMediaUrl(asset.url)}
                controls
                autoPlay
                className="w-full mt-2"
              />
            </div>
          ) : (
            <div className="w-full text-center bg-black/95 rounded-2xl overflow-hidden shadow-lg p-1">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                ref={videoRef}
                src={resolveMediaUrl(asset.url)}
                controls
                autoPlay
                playsInline
                style={{ maxWidth: "100%", maxHeight: "65vh" }}
                className="rounded-xl mx-auto block"
              />
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
