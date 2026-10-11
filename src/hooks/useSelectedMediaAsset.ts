import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { apiClient, unwrapData } from "../services/apiClient";
import type { ApiEnvelope } from "../types/api";
import { getQueryVersion } from "../services/queryCache";
import { useQueryVersion } from "./useQueryVersion";

interface PreviewAsset {
  id: string;
  url: string;
  altText?: string;
  type?: string;
  mimeType?: string;
}

/** Resolve only the selected asset when its metadata is absent from the form/library page. */
export function useSelectedMediaAsset(id: string | undefined, assets: PreviewAsset[], previewUrl?: string) {
  const actor = useAuth().user?.id;
  const endpoint = "/learning/media-assets";
  const revision = useQueryVersion(endpoint);
  const generation = getQueryVersion(endpoint);
  const known = assets.find(asset => asset.id === id);
  const needsFetch = Boolean(id && !known?.url && !previewUrl);
  const key = JSON.stringify([actor, id, generation]);
  const [result, setResult] = useState<{ key: string; data: PreviewAsset }>();

  useEffect(() => {
    if (!needsFetch || !id) return;
    const controller = new AbortController();
    let current = true;
    apiClient.get<ApiEnvelope<PreviewAsset>>(`${endpoint}/${id}`, { signal: controller.signal })
      .then(response => {
        if (current && generation === getQueryVersion(endpoint)) {
          setResult({ key, data: unwrapData(response) });
        }
      })
      .catch(() => { /* Keep the existing ID fallback if the asset cannot be read. */ });
    return () => { current = false; controller.abort(); };
  }, [id, key, needsFetch, revision, generation]);

  return known?.url ? known : result?.key === key ? result.data : undefined;
}
