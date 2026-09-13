import { Button, Card, Col, Empty, Row, Space, Tooltip } from "antd";
import { DeleteOutlined, EyeOutlined, SoundOutlined, UploadOutlined } from "@ant-design/icons";
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
                <div className="h-32 bg-slate-50 flex items-center justify-center overflow-hidden">
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
                    <div className="text-4xl text-slate-400 flex flex-col items-center gap-1">
                      <SoundOutlined />
                      <span className="text-xs text-slate-400">Audio</span>
                    </div>
                  ) : (
                    <div className="text-slate-400 flex flex-col items-center gap-1">
                      <Video size={36} className="text-slate-400" />
                      <span className="text-xs text-slate-400">Video</span>
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
                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 uppercase">
                      {asset.type ?? "File"}
                    </span>
                    <Space size={2}>
                      {!isImage(asset) && (
                        <Tooltip title="Xem chi tiết">
                          <Button
                            type="text"
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => onPreviewClick(asset)}
                          />
                        </Tooltip>
                      )}
                      <Can perform="learning.delete">
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => onDeleteClick(asset)}
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
