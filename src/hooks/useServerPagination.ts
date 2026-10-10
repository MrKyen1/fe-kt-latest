import { useAuth } from "../contexts/AuthContext";
import { useEffect, useRef, useState } from "react";
import { apiClient, unwrapList } from "../services/apiClient";
import type { ApiEnvelope } from "../types/api";

import { pageCache, getQueryVersion, invalidateQueries, subscribeQueryInvalidation } from "../services/queryCache";

const EMPTY: never[] = [];
const CACHE_TTL_MS = 15_000;


export function useServerPagination<T = any>(
  endpoint: string,
  params: Record<string, unknown> = {},
  pageSize = 20,
  enabled = true,
  mapItem?: (item: any) => T,
) {
  const actor = useAuth().user?.id ?? "public";
  const key = JSON.stringify([endpoint, params, enabled, actor]);
  const [paging, setPaging] = useState({ key, page: 1, size: pageSize });
  const page = paging.key === key ? paging.page : 1;
  const size = paging.size;
  const [result, setResult] = useState<{ key: string; data: T[]; total: number; meta?: Record<string, any> }>({ key: "", data: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [revision, setRevision] = useState(0);
  const mapper = useRef(mapItem);
  mapper.current = mapItem;
  const generation = getQueryVersion(endpoint);
  const requestKey = JSON.stringify([key, page, size, revision, generation]);
  const cacheKey = JSON.stringify([actor, endpoint, params, page, size]);

  useEffect(() => subscribeQueryInvalidation(endpoint, () => setRevision(value => value + 1)), [endpoint]);

  useEffect(() => {
    let current = true;
    const controller = new AbortController();
    if (!enabled) {
      setLoading(false);
      return;
    }
    const cached = pageCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      setResult({ key: requestKey, data: mapper.current ? cached.data.map(mapper.current) : cached.data, total: cached.total, meta: cached.meta });
      setError(null); setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const timer = setTimeout(async () => {
      try {
        const [, query] = JSON.parse(key);
        const response = unwrapList(await apiClient.get<ApiEnvelope<T[]>>(endpoint, {
          params: { ...query, page, limit: size }, signal: controller.signal,
        }));
        if (!current || generation !== getQueryVersion(endpoint)) return;
        const total = response.meta?.total ?? response.data.length;
        const lastPage = Math.max(1, Math.ceil(total / size));
        if (page > lastPage) {
          setPaging({ key, page: lastPage, size });
          return;
        }
        if (pageCache.size >= 100) pageCache.delete(pageCache.keys().next().value!);
        pageCache.set(cacheKey, { data: response.data, total, meta: response.meta, expiresAt: Date.now() + CACHE_TTL_MS, endpoint, actor });
        setResult({ key: requestKey, data: mapper.current ? response.data.map(mapper.current) : response.data, total, meta: response.meta });
      } catch (err) {
        if (current && generation === getQueryVersion(endpoint)) {
          setError(err instanceof Error ? err : new Error("Không thể tải dữ liệu"));
          setResult({ key: requestKey, data: [], total: 0 });
        }
      } finally {
        if (current) setLoading(false);
      }
    }, 200);
    return () => { current = false; clearTimeout(timer); controller.abort(); };
  }, [requestKey]);

  const changePage = (next: number, nextSize = size) =>
    setPaging({ key, page: nextSize === size ? next : 1, size: nextSize });
  const sameQuery = result.key && JSON.parse(result.key)[0] === key;
  const total = sameQuery ? result.total : 0;
  return {
    data: enabled && result.key === requestKey ? result.data : EMPTY,
    total, generation,
    meta: sameQuery ? result.meta : undefined,
    loading: enabled && (loading || result.key !== requestKey) && !error, error,
    reload: () => invalidateQueries([endpoint]),
    pagination: { current: page, pageSize: size, total, onChange: changePage, showSizeChanger: true },
  };
}
