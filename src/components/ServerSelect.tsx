import { Select, Spin } from "antd";
import type { SelectProps } from "antd";
import { createContext, useContext, useEffect, useState } from "react";
import { useServerPagination } from "../hooks/useServerPagination";

export const LearningLookupScope = createContext<string | undefined>(undefined);

type Option = { value: string; label: string };
type Props = SelectProps & {
  endpoint: string;
  query?: Record<string, unknown>;
  optionLabel?: (item: any) => string;
  optionValue?: (item: any) => string;
  onRecords?: (items: any[]) => void;
};

/** Fetch selector options on demand; scrolling requests the next server page. */
export function ServerSelect({ endpoint, query = {}, optionLabel, optionValue, onRecords, options = [], ...props }: Props) {
  const specializationId = useContext(LearningLookupScope);
  const scopedQuery = /^\/learning\/(levels|skills|topics|reading-passages|curriculums|exams|questions)$/.test(endpoint)
    ? { specializationId, ...query } : query;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const result = useServerPagination(endpoint, { ...scopedQuery, search: search || undefined }, 20, open);
  const key = JSON.stringify([endpoint, scopedQuery, search, result.generation]);
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
    setCache(previous => ({ key, options: Array.from(new Map([
      ...(previous.key === key && result.pagination.current > 1 ? previous.options : []), ...next,
    ].map(option => [option.value, option])).values()) }));
  }, [result.data, result.loading, open, key]);
  const selected = Array.isArray(props.value) ? props.value : [props.value];
  const seeds = options.filter(option => selected.includes(option?.value));
  const merged = Array.from(new Map([...seeds, ...(cache.key === key ? cache.options : [])]
    .map(option => [option?.value, option])).values());
  return <Select {...props} options={merged} showSearch filterOption={false}
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
    }} />;
}
