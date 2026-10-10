import { useEffect, useRef, useState, type ReactNode } from "react";
import { LoadingRegion } from "./LoadingRegion";

/** A bounded list/gallery body with a pager outside its scrolling area. */
export function PagedCollection({ children, footer, loading = false, hasData = true, variant = "cards", region }: {
  region?: string; children: ReactNode; footer?: ReactNode; loading?: boolean; hasData?: boolean;
  variant?: "cards" | "teachers" | "media" | "detail" | "stats" | "list" | "classes" | "centers";
}) {
  const root = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(400);
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!root.current?.getClientRects().length) return;
        const viewport = window.visualViewport?.height ?? window.innerHeight;
        const top = Math.max(80, Math.min(root.current.getBoundingClientRect().top, viewport * .45));
        setHeight(Math.max(160, Math.floor(viewport - top - 100)));
      });
    };
    const observer = new ResizeObserver(measure);
    if (root.current) observer.observe(root.current);
    window.addEventListener("resize", measure); window.addEventListener("scroll", measure, true); measure();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, []);
  // Keep scroll at its current position while waiting; reset when a new page arrives.
  useEffect(() => { if (!loading) body.current?.scrollTo({ top: 0 }); }, [loading]);
  return <div ref={root} data-testid="paged-collection" data-region={region} className="min-w-0">
    <div ref={body} data-testid="collection-body" className="overflow-y-auto overscroll-contain p-1" style={{ maxHeight: height }}>
      <LoadingRegion loading={loading} hasData={hasData} variant={variant}>{children}</LoadingRegion>
    </div>
    {footer && <div data-testid="collection-pagination" className="pt-3 pb-1 bg-white">{footer}</div>}
  </div>;
}
