import { Select, Spin } from "antd";
import type { SelectProps } from "antd";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { apiClient, unwrapData } from "../services/apiClient";
import { pageCache, getQueryVersion } from "../services/queryCache";
import { useServerPagination } from "../hooks/useServerPagination";

export const LearningLookupScope = createContext<string | undefined>(undefined);

type Option = { value: string; label: string };
const pendingRecords = new Map<string, Promise<any>>();

/** Resolve selected IDs only, sharing the bounded account-scoped query cache. */
function selectedRecord(actor: string, endpoint: string, id: string) {
  const generation = getQueryVersion(endpoint);
  const cacheKey = JSON.stringify(["select-record", actor, endpoint, id]);
  const cached = pageCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.data[0]);
  const pendingKey = JSON.stringify([cacheKey, generation]);
  const existing = pendingRecords.get(pendingKey);
  if (existing) return existing;
  const promise = apiClient.get(`${endpoint}/${encodeURIComponent(id)}`).then(response => {
    const record = unwrapData(response);
    if (generation === getQueryVersion(endpoint)) {
      if (pageCache.size >= 100) pageCache.delete(pageCache.keys().next().value!);
      pageCache.set(cacheKey, { data: [record], total: 1, expiresAt: Date.now() + 15_000,
        endpoint: `${endpoint}/${id}`, actor });
    }
    return record;
  }).finally(() => pendingRecords.delete(pendingKey));
  pendingRecords.set(pendingKey, promise);
  return promise;
}
type Props = SelectProps & {
  endpoint: string;
  query?: Record<string, unknown>;
  optionLabel?: (item: any) => string;
  optionValue?: (item: any) => string;
  onRecords?: (items: any[]) => void;
};

/** Fetch selector options on demand; scrolling requests the next server page. */
export function ServerSelect({ endpoint, query = {}, optionLabel, optionValue, onRecords, options = [], ...props }: Props) {
  const actor = useAuth().user?.id ?? "public";
  const selectRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = selectRef.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(!!element.getClientRects().length);
      return;
    }
    const observer = new IntersectionObserver(entries => setVisible(entries.some(entry => entry.isIntersecting)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const specializationId = useContext(LearningLookupScope);
  const scopedQuery = /^\/learning\/(levels|skills|topics|reading-passages|curriculums|exams|questions)$/.test(endpoint)
    ? { specializationId, ...query } : query;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const result = useServerPagination(endpoint, { ...scopedQuery, search: search || undefined }, 20, open);
  const key = JSON.stringify([actor, endpoint, scopedQuery, search, result.generation]);
  const labelScope = JSON.stringify([actor, endpoint, result.generation]);
  const [remembered, setRemembered] = useState<{ scope: string; options: Option[] }>({ scope: "", options: [] });
  const callbacks = useRef({ optionLabel, optionValue, onRecords });
  callbacks.current = { optionLabel, optionValue, onRecords };
  const toOption = (item: any): Option => ({
    value: callbacks.current.optionValue ? callbacks.current.optionValue(item) : item.id,
    label: callbacks.current.optionLabel ? callbacks.current.optionLabel(item) : item.name || item.title || item.fullName || item.code,
  });
  useEffect(() => {
    if (result.pagination.current > 1) result.pagination.onChange(1);
  }, [result.generation]);
  const [cache, setCache] = useState<{ key: string; options: Option[] }>({ key: "", options: [] });
  useEffect(() => {
    if (result.loading || !open || result.error) return;
    if (result.data.length) onRecords?.(result.data);
    const next = result.data.map(item => ({
      value: optionValue ? optionValue(item) : item.id,
      label: optionLabel ? optionLabel(item) : item.name || item.title || item.fullName || item.code,
    }));
    setRemembered(previous => ({ scope: labelScope, options: Array.from(new Map([
      ...(previous.scope === labelScope ? previous.options : []), ...next,
    ].map(option => [option.value, option])).values()).slice(-200) }));
    setCache(previous => ({ key, options: Array.from(new Map([
      ...(previous.key === key && result.pagination.current > 1 ? previous.options : []), ...next,
    ].map(option => [option.value, option])).values()) }));
  }, [result.data, result.loading, open, key]);
  const selected = (Array.isArray(props.value) ? props.value : [props.value])
    .map(value => typeof value === "object" && value !== null ? value.value : value)
    .filter((value): value is string => typeof value === "string" && value.length > 0);
  const known = new Map([
    ...(remembered.scope === labelScope ? remembered.options : []),
    ...(cache.key === key ? cache.options : []), ...options,
  ].map(option => [option?.value, option]));
  const missing = selected.filter(value => !known.get(value)?.label);
  const missingKey = JSON.stringify(missing);
  useEffect(() => {
    if (!missing.length || !visible) return;
    let current = true;
    const generation = result.generation;
    // Limit concurrent detail requests for a preselected multi-select.
    void (async () => {
      for (let index = 0; current && index < missing.length; index += 4) {
        await Promise.all(missing.slice(index, index + 4).map(async id => {
          let option: Option;
          try {
            const record = await selectedRecord(actor, endpoint, id);
            option = toOption(record);
            if (current && generation === getQueryVersion(endpoint)) callbacks.current.onRecords?.([record]);
          } catch {
            option = { value: id, label: "Không tải được tên" };
          }
          if (current && generation === getQueryVersion(endpoint)) setRemembered(previous => ({
            scope: labelScope, options: Array.from(new Map([
              ...(previous.scope === labelScope ? previous.options : []), option,
            ].map(item => [item.value, item])).values()),
          }));
        }));
      }
    })();
    return () => { current = false; };
  }, [actor, endpoint, labelScope, missingKey, open, options, visible]);
  const seeds = selected.map(value => known.get(value) || { value, label: "Đang tải tên…" });
  const merged = Array.from(new Map([...seeds, ...(cache.key === key ? cache.options : [])]
    .map(option => [option?.value, option])).values());
  return <div ref={selectRef} className="w-full"><Select {...props} options={merged} showSearch filterOption={false}
    loading={result.loading} onSearch={setSearch}
    onOpenChange={value => { setOpen(value); props.onOpenChange?.(value); }}
    notFoundContent={result.loading ? <Spin size="small" /> : result.error ? "Không thể tải dữ liệu" : "Không có dữ liệu"}
    onPopupScroll={event => {
      const element = event.target as HTMLElement;
      if (!result.loading && element.scrollTop + element.clientHeight >= element.scrollHeight - 24 &&
          result.pagination.current * result.pagination.pageSize < result.total) {
        result.pagination.onChange(result.pagination.current + 1);
      }
      props.onPopupScroll?.(event);
    }} /></div>;
}
