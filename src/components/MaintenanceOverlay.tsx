import { useEffect, useState } from "react";
import { Button } from "antd";
import {
  checkApiNow,
  maintenanceNeedsReload,
  subscribeToMaintenance,
  waitForApi,
} from "../services/apiClient";

/**
 * Covers an already-open app while a deploy runs. Blocked requests are held by
 * apiClient and resent afterwards, so the page underneath keeps all its state.
 */
export default function MaintenanceOverlay() {
  const [active, setActive] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => subscribeToMaintenance(() => setActive(true)), []);

  useEffect(() => {
    if (!active) return;
    let mounted = true;
    void waitForApi().then(() => {
      if (!mounted) return;
      // A page chunk failed to load: only a reload can fetch it.
      if (maintenanceNeedsReload()) window.location.reload();
      else setActive(false);
    });
    return () => {
      mounted = false;
    };
  }, [active]);

  if (!active) return null;

  const checkNow = async () => {
    setChecking(true);
    await checkApiNow();
    setChecking(false);
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="maintenance-title"
      aria-describedby="maintenance-description"
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-50/95 px-4 py-6 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg">
        <svg
          viewBox="0 0 300 120"
          aria-hidden="true"
          className="mb-6 block h-auto w-full max-w-[260px]"
        >
          <path
            d="M10 100 C 70 100, 90 30, 160 45 S 250 90, 230 40"
            fill="none"
            stroke="#c7d2fe"
            strokeWidth="2"
            strokeDasharray="6 8"
          />
          <path d="M220 38 L290 10 L262 62 L248 44 Z" fill="#4f46e5" />
          <path d="M248 44 L290 10 L242 58 Z" fill="#4f46e5" opacity=".6" />
        </svg>
        <h2
          id="maintenance-title"
          className="mb-3 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl"
        >
          Website đang được nâng cấp
        </h2>
        <div
          id="maintenance-description"
          className="space-y-2 text-base text-slate-600"
        >
          <p>
            Hệ thống sẽ hoạt động lại sau vài phút. Đừng đóng hoặc tải lại
            trang: nội dung bạn đang nhập vẫn còn nguyên.
          </p>
          <p>
            Thao tác bạn vừa thực hiện (lưu, nộp bài…) sẽ tự được gửi lại khi hệ
            thống hoạt động trở lại.
          </p>
          <p className="text-sm text-slate-500">
            Trang tự kiểm tra lại mỗi 15 giây.
          </p>
        </div>
        <Button
          type="primary"
          size="large"
          className="mt-6"
          loading={checking}
          autoFocus
          onClick={() => void checkNow()}
        >
          Kiểm tra ngay
        </Button>
      </div>
    </div>
  );
}
