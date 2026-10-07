import { Grid } from "antd";

/**
 * Breakpoints đồng bộ giữa Tailwind và antd:
 *  - mobile : < 768px  (Tailwind default + sm:)
 *  - tablet : 768–1023 (Tailwind md:)
 *  - desktop: >= 1024  (Tailwind lg:) → giữ nguyên layout desktop hiện tại
 */
export function useResponsive() {
  const screens = Grid.useBreakpoint();
  // Trước lần đo đầu tiên screens = {} → mặc định coi là desktop để không nhấp nháy layout desktop
  const measured = Object.keys(screens).length > 0;
  const isDesktop = !measured || !!screens.lg;
  const isTablet = measured && !!screens.md && !screens.lg;
  const isMobile = measured && !screens.md;
  return { isMobile, isTablet, isDesktop, screens };
}
