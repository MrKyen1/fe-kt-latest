import { Button, Card, Col, Empty, Row, Space } from "antd";
import { DeleteOutlined, PlayCircleOutlined, SoundOutlined, UploadOutlined } from "@ant-design/icons";
import { Video } from "lucide-react";
import { resolveMediaUrl } from "../../../../../services/apiClient";
import { AppImage } from "../../../../../components/AppImagePreview";
import { Can } from "../../../../../components/Can";

// ── Types ────────────────────────────────────────────────────

interface MediaAsset {
  id: string;
  url: string;
  altText?: string;
  type?: string;
  mimeType?: string;
}

interface Props {
  media: MediaAsset[];
  onUploadClick: () => void;
  onDeleteClick: (asset: MediaAsset) => void;
  onPreviewClick: (asset: MediaAsset) => void;
}

// ── Helper ───────────────────────────────────────────────────

function isImage(asset: MediaAsset): boolean {
  return asset.type === "image" || !!asset.mimeType?.startsWith("image");
}

function isAudio(asset: MediaAsset): boolean {
  return asset.type === "audio" || !!asset.mimeType?.startsWith("audio");
}

// ── Component ────────────────────────────────────────────────

/**
 * Media Assets tab — gallery grid of uploaded files
 * (images, audio, video) with upload, preview, and delete actions.
 */
export default function MediaTab({ media, onUploadClick, onDeleteClick, onPreviewClick }: Props) {
  return (
    <div className="space-y-4 pt-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <span className="text-slate-500">
          Thư viện hình ảnh, tệp tin âm thanh hoặc video cho câu hỏi ({media.length} tệp)
        </span>
        <Can perform="learning.media.upload">
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={onUploadClick}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-sm font-semibold"
          >
            Tải lên tệp
          </Button>
        </Can>
      </div>

      {/* Gallery grid */}
      <Row gutter={[16, 16]}>
        {media.map((asset) => (
          <Col xs={12} sm={8} md={6} lg={4} key={asset.id}>
            <Card
              hoverable
              className="overflow-hidden border-slate-100 rounded-2xl relative group"
              cover={
                <div className="h-32 bg-slate-50 flex items-center justify-center overflow-hidden relative">
                  {isImage(asset) ? (
                    <div className="h-full w-full">
                      <AppImage
                        src={asset.url}
                        alt={asset.altText}
                        rootClassName="w-full h-full"
                        className="h-full w-full object-cover"
                        maskText="Xem ảnh"
                      />
                    </div>
                  ) : isAudio(asset) ? (
                    <div
                      className="h-full w-full bg-indigo-50/40 flex items-center justify-center relative cursor-pointer group/audio"
                      onClick={() => onPreviewClick(asset)}
                    >
                      <div className="text-4xl text-indigo-400/80 flex flex-col items-center gap-1 group-hover/audio:scale-105 transition-transform duration-200">
                        <SoundOutlined />
                        <span className="text-xs text-slate-400 font-medium">Audio</span>
                      </div>
                      {/* Hover Mask matching AppImage */}
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/audio:opacity-100 flex items-center justify-center transition-all duration-200">
                        <span className="text-white text-xs font-semibold bg-slate-900/60 px-3 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-1.5">
                          <SoundOutlined /> Nghe audio
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="h-full w-full bg-slate-900 flex items-center justify-center relative cursor-pointer group/video overflow-hidden"
                      onClick={() => onPreviewClick(asset)}
                    >
                      {asset.url ? (
                        <video
                          src={`${resolveMediaUrl(asset.url)}#t=0.5`}
                          preload="metadata"
                          className="w-full h-full object-cover opacity-80 group-hover/video:scale-105 transition-transform duration-300 pointer-events-none"
                        />
                      ) : (
                        <div className="text-slate-400 flex flex-col items-center gap-1">
                          <Video size={36} className="text-slate-400" />
                          <span className="text-xs text-slate-400 font-medium">Video</span>
                        </div>
                      )}
                      {/* Center Play Indicator */}
                      <div className="absolute inset-0 flex items-center justify-center group-hover/video:opacity-0 transition-opacity">
                        <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white text-lg">
                          <PlayCircleOutlined />
                        </div>
                      </div>
                      {/* Hover Mask matching AppImage */}
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/video:opacity-100 flex items-center justify-center transition-all duration-200">
                        <span className="text-white text-xs font-semibold bg-slate-900/60 px-3 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-1.5">
                          <PlayCircleOutlined /> Xem video
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              }
            >
              <Card.Meta
                title={
                  <span className="text-xs font-semibold block truncate">
                    {asset.altText ?? "Tệp không tên"}
                  </span>
                }
                description={
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 uppercase font-medium">
                      {asset.type ?? "File"}
                    </span>
                    <Space size={2}>
                      <Can perform="learning.delete">
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteClick(asset);
                          }}
                        />
                      </Can>
                    </Space>
                  </div>
                }
              />
            </Card>
          </Col>
        ))}

        {media.length === 0 && (
          <Col span={24}>
            <Empty description="Thư viện tệp trống" />
          </Col>
        )}
      </Row>
    </div>
  );
}
