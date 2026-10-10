import { Spin } from "antd";
import type { ReactNode } from "react";

type Variant = "cards" | "teachers" | "media" | "detail" | "stats" | "list" | "classes" | "centers";
const Bar = ({ width = "75%" }: { width?: string }) => <div aria-hidden="true" className="h-4 rounded-md bg-slate-100 animate-pulse" style={{ width }} />;

/** Initial loading follows the actual content shape; refetch overlays existing content. */
export function ContentSkeleton({ variant = "cards", count = 6 }: { variant?: Variant; count?: number }) {
  if (variant === "centers") return <div role="status" aria-label="Đang tải trung tâm" data-testid="content-skeleton" className="space-y-2">
    {Array.from({ length: 5 }, (_, index) => <div key={index} className="rounded-2xl border border-slate-100 p-3.5 flex gap-2 items-center">
      <div className="w-4 h-4 rounded bg-slate-100 animate-pulse shrink-0" /><Bar width="75%" />
    </div>)}
  </div>;
  if (variant === "detail") return <div role="status" aria-label="Đang tải nội dung" className="space-y-6" data-testid="content-skeleton">
    <div className="rounded-3xl bg-slate-100 animate-pulse h-52" />
    <div className="rounded-3xl border border-slate-100 bg-white p-6 space-y-5"><Bar width="50%" /><Bar /><Bar width="90%" /><Bar width="65%" /></div>
  </div>;
  const columns = variant === "media" ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6" : variant === "teachers" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" : variant === "classes" ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3" : variant === "list" ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
  return <div role="status" aria-label="Đang tải nội dung" data-testid="content-skeleton" className={`grid gap-4 ${columns}`}>
    {Array.from({ length: count }, (_, index) => <div key={index} className="rounded-2xl border border-slate-100 bg-white overflow-hidden">
      {variant === "media" || variant === "cards" ? <div className={`${variant === "media" ? "h-32" : "h-40"} bg-slate-100 animate-pulse`} /> : null}
      <div className="p-5 space-y-3">
        {variant === "teachers" && <div className="w-32 h-32 rounded-full bg-slate-100 animate-pulse mx-auto mb-5" />}
        <Bar width="65%" /><Bar width="90%" />{variant !== "media" && <Bar width="50%" />}
      </div>
    </div>)}
  </div>;
}

export function LoadingRegion({ loading, hasData, variant = "cards", children, footer }: { loading: boolean; hasData: boolean; variant?: Variant; children: ReactNode; footer?: ReactNode }) {
  if (loading && !hasData) return <ContentSkeleton variant={variant} />;
  return <><Spin spinning={loading} size="large">{children}</Spin>{footer}</>;
}

/** Route/auth initialization has no resolved layout yet. */
export function PageSpinner() {
  return <div role="status" aria-label="Đang tải trang" className="min-h-[60dvh] flex items-center justify-center"><Spin size="large" /></div>;
}
