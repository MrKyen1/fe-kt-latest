import React, { useRef, useState, useEffect, useLayoutEffect, useCallback } from "react";
import { Tabs, Select } from "antd";
import type { TabsProps } from "antd";
import { useResponsive } from "../hooks/useResponsive";

export interface ResponsiveTabsProps extends TabsProps {
  /**
   * Tiêu đề danh mục hiển thị phía trên dropdown trên màn hình mobile.
   * Mặc định là "Danh mục quản lý:". Truyền null hoặc "" nếu muốn ẩn.
   */
  dropdownLabel?: React.ReactNode;

  /**
   * Chế độ chuyển đổi responsive:
   * - "auto": Tự động đo lường độ dài tab thực tế. Khi vượt quá chiều rộng container (tràn ngang) trên mobile mới chuyển thành Select Dropdown.
   * - "mobile-always": Luôn chuyển thành Select Dropdown khi ở mobile (< 768px).
   * Mặc định: "auto".
   */
  mode?: "auto" | "mobile-always";

  /**
   * Cho phép kích hoạt chế độ dropdown trên cả tablet khi bị tràn ngang.
   * Mặc định: false (chỉ áp dụng trên mobile).
   */
  enableTabletDropdown?: boolean;
}

/**
 * ResponsiveTabs: Wrapper thông minh cho Ant Design Tabs.
 * 
 * - Trên PC (!isMobile): Giữ nguyên 100% thanh Tabs nguyên bản với đầy đủ icon, hiệu ứng và trải nghiệm chuẩn.
 * - Trên Mobile (isMobile):
 *   + Tự động phát hiện khi chiều rộng các tab vượt quá chiều rộng màn hình (scrollWidth > clientWidth).
 *   + Tự động chuyển đổi thành Select Dropdown full-width.
 *   + Tái sử dụng 100% icon, text, badge có sẵn từ `items` mà không cần cấu hình lại hay can thiệp vào code gốc.
 */
export function ResponsiveTabs({
  items = [],
  activeKey,
  defaultActiveKey,
  onChange,
  mode = "auto",
  dropdownLabel = "Danh mục quản lý:",
  enableTabletDropdown = false,
  renderTabBar,
  className,
  ...restProps
}: ResponsiveTabsProps) {
  const { isMobile, isTablet } = useResponsive();
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  // Khởi tạo trạng thái ban đầu mượt mà, tránh layout shift:
  // Nếu có từ 4 tab trở lên trên mobile, mặc định là tràn ngang
  const [isOverflowing, setIsOverflowing] = useState<boolean>(() => {
    return isMobile && items.length >= 4;
  });

  // Hỗ trợ cả Controlled (activeKey) và Uncontrolled (defaultActiveKey)
  const [internalKey, setInternalKey] = useState<string>(() => {
    return (activeKey ?? defaultActiveKey ?? items[0]?.key ?? "") as string;
  });

  const currentKey = activeKey !== undefined ? String(activeKey) : internalKey;

  // Đo đạc tràn ngang chính xác bằng ResizeObserver
  const checkOverflow = useCallback(() => {
    if (!containerRef.current || !measureRef.current) return;
    const availableWidth = containerRef.current.clientWidth;
    const totalTabsWidth = measureRef.current.scrollWidth;

    if (availableWidth > 0 && totalTabsWidth > 0) {
      // Nếu tổng độ dài các tab lớn hơn chiều rộng vùng chứa (trừ padding an toàn 16px)
      setIsOverflowing(totalTabsWidth > availableWidth - 16);
    }
  }, []);

  useLayoutEffect(() => {
    checkOverflow();
  }, [items, checkOverflow]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    checkOverflow();

    const ro = new ResizeObserver(() => {
      checkOverflow();
    });
    ro.observe(el);

    return () => ro.disconnect();
  }, [checkOverflow]);

  // Điều kiện kích hoạt Dropdown
  const isTargetScreen = isMobile || (enableTabletDropdown && isTablet);
  const shouldRenderDropdown =
    isTargetScreen && (mode === "mobile-always" ? isMobile : isOverflowing);

  // Tái sử dụng trực tiếp icon, text, badge từ items có sẵn
  const selectOptions = items.map((item) => ({
    value: String(item.key),
    label: item.label,
    disabled: item.disabled,
  }));

  const handleSelectChange = (val: string) => {
    if (activeKey === undefined) {
      setInternalKey(val);
    }
    onChange?.(val);
  };

  return (
    <div ref={containerRef} className={`w-full relative ${className || ""}`}>
      {/* ── Thước đo ẩn ngoài màn hình để đo độ rộng thực tế của tất cả tab ── */}
      <div
        ref={measureRef}
        aria-hidden="true"
        className="invisible pointer-events-none absolute -top-[9999px] left-0 flex items-center gap-6 px-4"
        style={{ whiteSpace: "nowrap" }}
      >
        {items.map((item) => (
          <div
            key={String(item.key)}
            className="flex items-center gap-2 font-semibold text-sm px-4 py-2"
          >
            {item.label}
          </div>
        ))}
      </div>

      {/* ── Ant Design Tabs chính ── */}
      <Tabs
        items={items}
        activeKey={activeKey}
        defaultActiveKey={defaultActiveKey}
        onChange={onChange}
        renderTabBar={(tabBarProps, DefaultTabBar) => {
          if (shouldRenderDropdown) {
            return (
              <div className="mb-3.5 pb-2.5 border-b border-slate-100">
                {dropdownLabel && (
                  <div className="text-xs font-semibold text-slate-500 mb-1.5 flex items-center justify-between">
                    <span>{dropdownLabel}</span>
                  </div>
                )}
                <Select
                  value={currentKey}
                  onChange={handleSelectChange}
                  size="large"
                  className="w-full text-sm font-semibold rounded-xl"
                  popupMatchSelectWidth={true}
                  options={selectOptions}
                />
              </div>
            );
          }
          // Trên PC (!isMobile) hoặc khi không tràn: Giữ nguyên 100% DefaultTabBar
          return renderTabBar ? renderTabBar(tabBarProps, DefaultTabBar) : <DefaultTabBar {...tabBarProps} />;
        }}
        {...restProps}
      />
    </div>
  );
}
export default ResponsiveTabs;
