import { useState } from "react";
import { Tag } from "antd";
import { PlayCircleOutlined, SoundOutlined, FileUnknownOutlined } from "@ant-design/icons";
import { AppImage } from "../../../../../components/AppImagePreview";
import { resolveMediaUrl } from "../../../../../services/apiClient";
import type { MediaAsset } from "../../../../../types/backend";

const TYPE_LABEL: Record<string, string> = { image: "Hình ảnh", audio: "Âm thanh", video: "Video" };

/** A media file you can recognise at a glance: preview, name and type (used where there is no card, e.g. the stopped list). */
export function MediaFileCell({ asset }: { asset: MediaAsset }) {
  const [broken, setBroken] = useState(false);
  const kind = asset.type === "audio" || asset.mimeType?.startsWith("audio") ? "audio"
    : asset.type === "video" || asset.mimeType?.startsWith("video") ? "video" : "image";
  const url = resolveMediaUrl(asset.url);
  const box = "relative w-14 h-14 shrink-0 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center";
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className={box}>
        {broken ? (
          <FileUnknownOutlined className="text-xl text-slate-300" title="Tệp không còn trên máy chủ" />
        ) : kind === "image" ? (
          /* No rootClassName here: antd also applies it to the zoomed preview, which would shrink it to 56px in a corner. */
          <AppImage src={asset.url} alt={asset.altText} className="!w-14 !h-14 object-cover" maskText="Xem" onError={() => setBroken(true)} />
        ) : kind === "video" ? (
          <video src={`${url}#t=0.5`} preload="metadata" muted playsInline className="w-full h-full object-cover bg-slate-900" onError={() => setBroken(true)} />
        ) : (
          <SoundOutlined className="text-xl text-indigo-400" />
        )}
        {kind === "video" && !broken && <PlayCircleOutlined className="absolute text-white/90 text-lg pointer-events-none" />}
      </div>
      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-sm font-semibold text-slate-700 break-words">{asset.altText || "Tệp không tên"}</span>
        <Tag className="!m-0 self-start !rounded-md !border-slate-200 !bg-slate-50 !text-slate-500 !text-[10px]">{TYPE_LABEL[kind]}</Tag>
        {kind === "audio" && !broken && <audio controls preload="none" src={url} className="h-8 w-56 max-w-full" onError={() => setBroken(true)} />}
      </div>
    </div>
  );
}
