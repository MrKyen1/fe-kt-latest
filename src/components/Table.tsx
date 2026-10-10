import { Table as AntTable, type TableProps } from "antd";
import { useEffect, useRef, useState } from "react";

/** Shared table viewport: the body scrolls while its header/pager stay visible. */
export default function Table<T extends object = any>(props: TableProps<T>) {
  const root = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(320);
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const element = root.current;
        if (!element || !element.getClientRects().length) return;
        const viewport = window.visualViewport?.height ?? window.innerHeight;
        const top = Math.max(80, Math.min(element.getBoundingClientRect().top, viewport * .45));
        const next = Math.max(140, Math.floor(viewport - top - 150));
        setHeight(previous => previous === next ? previous : next);
      });
    };
    const observer = new ResizeObserver(measure);
    if (root.current) observer.observe(root.current);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    window.visualViewport?.addEventListener("resize", measure);
    measure();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); window.visualViewport?.removeEventListener("resize", measure); };
  }, []);
  const spinning = typeof props.loading === "object" ? props.loading.spinning : props.loading;
  const emptyText = spinning ? <div style={{ minHeight: Math.min(height, 180) }} /> : props.locale?.emptyText;
  return <div ref={root} className="app-table-viewport min-w-0 max-w-full" data-testid="table-viewport">
    <AntTable<T> {...props}
      loading={typeof props.loading === "object" ? { size: "large", ...props.loading } : { spinning: !!props.loading, size: "large" }}
      locale={{ ...props.locale, ...(emptyText !== undefined ? { emptyText } : {}) }}
      scroll={{ ...props.scroll, y: typeof props.scroll?.y === "number" ? Math.min(height, props.scroll.y) : height, scrollToFirstRowOnChange: true }}
    />
  </div>;
}
