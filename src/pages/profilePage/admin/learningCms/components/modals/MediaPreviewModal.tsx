import { Modal } from "antd";
import { SoundOutlined } from "@ant-design/icons";
import { resolveMediaUrl } from "../../../../../../services/apiClient";

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
 * the asset's type / mimeType.  Read-only; no actions.
 */
export default function MediaPreviewModal({ open, asset, onCancel }: Props) {
  const isImage = asset?.type === "image" || asset?.mimeType?.startsWith("image");
  const isAudio = asset?.type === "audio" || asset?.mimeType?.startsWith("audio");

  return (
    <Modal
      open={open}
      title={asset?.altText ?? "Xem chi tiết Media"}
      footer={null}
      onCancel={onCancel}
      centered
      destroyOnClose
    >
      {asset && (
        <div className="flex flex-col items-center justify-center p-4">
          {isImage ? (
            <img
              src={resolveMediaUrl(asset.url)}
              alt={asset.altText}
              style={{ maxWidth: "100%", maxHeight: "60vh", objectFit: "contain" }}
              className="rounded-lg shadow-sm"
            />
          ) : isAudio ? (
            <div className="w-full text-center space-y-4">
              <div className="text-6xl text-indigo-500">
                <SoundOutlined />
              </div>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio src={resolveMediaUrl(asset.url)} controls autoPlay className="w-full" />
            </div>
          ) : (
            <div className="w-full text-center space-y-4">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                src={resolveMediaUrl(asset.url)}
                controls
                autoPlay
                style={{ maxWidth: "100%", maxHeight: "60vh" }}
                className="rounded-lg"
              />
            </div>
          )}

          <div className="mt-4 text-xs text-slate-400 font-mono select-all">
            ID: {asset.id}
          </div>
        </div>
      )}
    </Modal>
  );
}
