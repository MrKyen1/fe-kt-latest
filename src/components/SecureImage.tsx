import React, { useEffect, useState } from "react";
import { Spin } from "antd";
import { apiClient } from "../services/apiClient";

interface SecureImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
}

export const SecureImage: React.FC<SecureImageProps> = ({ src, className, ...props }) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) return;

    let active = true;
    let localUrl: string | null = null;
    
    setLoading(true);
    setError(false);

    let targetUrl = src;
    const baseURL = apiClient.defaults.baseURL;
    if (baseURL && targetUrl.startsWith(baseURL)) {
      targetUrl = targetUrl.substring(baseURL.length);
    } else if (targetUrl.startsWith("/api/v1")) {
      targetUrl = targetUrl.substring(7);
    }

    apiClient
      .get(targetUrl, { responseType: "blob" })
      .then((response) => {
        if (!active) return;
        const blob = response.data;
        localUrl = URL.createObjectURL(blob);
        setObjectUrl(localUrl);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Failed to load secure image:", err);
        setError(true);
        setLoading(false);
      });

    return () => {
      active = false;
      if (localUrl) {
        URL.revokeObjectURL(localUrl);
      }
    };
  }, [src]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 ${className}`} style={{ minHeight: 100 }}>
        <Spin size="small" />
      </div>
    );
  }

  if (error || !objectUrl) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 text-slate-400 text-xs text-center p-2 ${className}`} style={{ minHeight: 100 }}>
        ⚠️ Lỗi tải ảnh
      </div>
    );
  }

  return <img src={objectUrl} className={className} {...props} />;
};
