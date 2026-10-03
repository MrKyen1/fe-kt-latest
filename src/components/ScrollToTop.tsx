import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname, hash, state } = useLocation();

  useEffect(() => {
    if (hash) return;
    if ((state as any)?.preventScroll || (state as any)?.preventScrollReset) {
      return;
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [pathname, hash, state]);

  // Đồng bộ toàn hệ thống: Tự động đưa vị trí cuộn của mọi Ant Design Modal về đầu (top = 0) mỗi khi mở Modal
  useEffect(() => {
    const openModals = new WeakSet<HTMLElement>();

    const checkModalWrap = (wrap: HTMLElement) => {
      const isHidden =
        wrap.style.display === "none" || wrap.classList.contains("ant-modal-wrap-hidden");

      if (!isHidden) {
        if (!openModals.has(wrap)) {
          openModals.add(wrap);
          const resetScroll = () => {
            wrap.scrollTop = 0;
            const bodies = wrap.querySelectorAll<HTMLElement>(".ant-modal-body");
            bodies.forEach((b) => {
              b.scrollTop = 0;
            });
          };
          resetScroll();
          requestAnimationFrame(resetScroll);
        }
      } else {
        openModals.delete(wrap);
      }
    };

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes" && mutation.target instanceof HTMLElement) {
          const el = mutation.target;
          if (el.classList.contains("ant-modal-wrap")) {
            checkModalWrap(el);
          }
        } else if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              if (node.classList.contains("ant-modal-wrap")) {
                checkModalWrap(node);
              } else {
                const wraps = node.querySelectorAll<HTMLElement>(".ant-modal-wrap");
                wraps.forEach(checkModalWrap);
              }
            }
          });
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class"],
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
