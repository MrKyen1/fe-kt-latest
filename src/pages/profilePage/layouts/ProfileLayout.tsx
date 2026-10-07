import { useState } from "react";
import { Layout, Tooltip, Drawer, Button } from "antd";
import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  User,
  BookOpen,
  Trophy,
  ShieldCheck,
  Globe,
  ChevronRight,
  Users,
  ClipboardList,
  GraduationCap,
  Menu,
} from "lucide-react";
import { useResponsive } from "../../../hooks/useResponsive";

const { Content } = Layout;

// Map keys directly to crisp Lucide icons
const KEY_ICON_MAP: Record<string, React.ReactNode> = {
  profile: <User size={18} />,
  dashboard: <LayoutDashboard size={18} />,
  cms: <BookOpen size={18} />,
  ranking: <Trophy size={18} />,
  "homepage-cms": <Globe size={18} />,
  assignments: <ClipboardList size={18} />,
  "my-exams": <GraduationCap size={18} />,
};

// Map AntD icon display names → Lucide icons (fallback)
const ICON_MAP: Record<string, React.ReactNode> = {
  BarChartOutlined: <LayoutDashboard size={18} />,
  ProfileOutlined: <User size={18} />,
  BookOutlined: <BookOpen size={18} />,
  TrophyOutlined: <Trophy size={18} />,
  CrownOutlined: <ShieldCheck size={18} />,
  FileTextOutlined: <Globe size={18} />,
  TeamOutlined: <Users size={18} />,
};

export interface NavItem {
  key: string;
  icon?: React.ReactNode;
  label: React.ReactNode;
  href?: string;
}

interface Props {
  menuItems: NavItem[];
  selectedKey: string;
  onChange: (key: string) => void;
  children: React.ReactNode;
}

function SidebarNavItem({
  item,
  isActive,
  isCollapsed,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  isCollapsed?: boolean;
  onClick?: () => void;
}) {
  const resolvedIcon =
    KEY_ICON_MAP[item.key] ??
    (() => {
      if (!item.icon) return null;
      const el = item.icon as React.ReactElement;
      const typeName =
        (el.type as any)?.displayName || (el.type as any)?.name || "";
      return ICON_MAP[typeName] ?? el;
    })();

  if (isCollapsed) {
    const miniContent = (
      <div
        className={`flex items-center justify-center w-11 h-11 mx-auto rounded-xl transition-all duration-150 ${
          isActive
            ? "bg-indigo-50 !text-indigo-600 font-semibold border border-indigo-200 shadow-xs"
            : "!text-slate-500 hover:!text-slate-900 hover:bg-slate-100"
        }`}
      >
        {resolvedIcon}
      </div>
    );

    return (
      <Tooltip title={item.label} placement="right">
        {item.href ? (
          <Link to={item.href} onClick={onClick} className="block my-1 outline-none no-underline">
            {miniContent}
          </Link>
        ) : (
          <button
            type="button"
            onClick={onClick}
            className="w-full my-1 outline-none bg-transparent border-none p-0 cursor-pointer block"
          >
            {miniContent}
          </button>
        )}
      </Tooltip>
    );
  }

  const itemClassName = [
    "relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-150 text-left group no-underline select-none",
    isActive
      ? "bg-indigo-50/90 !text-indigo-700 font-semibold border border-indigo-100 shadow-xs"
      : "!text-slate-600 hover:!text-slate-900 hover:bg-slate-100/80 border border-transparent font-medium",
  ].join(" ");

  const innerContent = (
    <>
      <span
        className={[
          "flex-shrink-0 transition-colors flex items-center justify-center",
          isActive
            ? "!text-indigo-600"
            : "!text-slate-400 group-hover:!text-slate-600",
        ].join(" ")}
      >
        {resolvedIcon}
      </span>

      <span
        className={[
          "flex-1 leading-tight text-[13.5px] transition-colors",
          isActive
            ? "!text-indigo-700 font-semibold"
            : "!text-slate-600 group-hover:!text-slate-900 font-medium",
        ].join(" ")}
      >
        {item.label}
      </span>

      {isActive ? (
        <ChevronRight size={14} className="!text-indigo-500 flex-shrink-0" />
      ) : (
        <ChevronRight
          size={14}
          className="text-transparent group-hover:text-slate-400 flex-shrink-0 transition-colors"
        />
      )}
    </>
  );

  const styleProps: React.CSSProperties = {
    outline: "none",
    textDecoration: "none",
    color: isActive ? "#4338ca" : "#475569",
  };

  if (item.href) {
    return (
      <Link
        to={item.href}
        onClick={onClick}
        className={itemClassName}
        style={styleProps}
      >
        {innerContent}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={itemClassName}
      style={styleProps}
    >
      {innerContent}
    </button>
  );
}

export default function ProfileLayout({
  menuItems,
  selectedKey,
  onChange,
  children,
}: Props) {
  const { isMobile, isTablet } = useResponsive();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const currentItem =
    menuItems.find(
      (item) =>
        selectedKey === item.key || selectedKey.startsWith(item.key + "/")
    ) || menuItems[0];

  return (
    <div className="flex flex-col md:flex-row" style={{ minHeight: "100vh" }}>
      {/* ── Mobile Sub-bar (< md) ────────────────────────── */}
      <div className="md:hidden sticky top-[64px] z-30 bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shadow-xs">
        <Button
          type="text"
          onClick={() => setMobileDrawerOpen(true)}
          icon={<Menu size={18} className="text-slate-700" />}
          className="flex items-center gap-2 font-medium text-slate-800 -ml-2"
        >
          <span className="font-semibold text-sm truncate max-w-[220px]">
            {currentItem?.label || "Menu"}
          </span>
        </Button>
        <span className="text-xs text-slate-400 font-medium">Bấm để đổi mục</span>
      </div>

      {/* ── Mobile Navigation Drawer (< md) ──────────────── */}
      <Drawer
        placement="left"
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        width={260}
        title="Danh mục quản lý"
        styles={{ body: { padding: "12px 8px" } }}
      >
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <SidebarNavItem
              key={item.key}
              item={item}
              isActive={
                selectedKey === item.key ||
                selectedKey.startsWith(item.key + "/")
              }
              onClick={() => {
                setMobileDrawerOpen(false);
                onChange(item.key);
              }}
            />
          ))}
        </nav>
      </Drawer>

      {/* ── Sidebar Desktop / Tablet (≥ md) ──────────────────── */}
      <aside
        className={`hidden md:flex flex-col bg-white border-r border-slate-200 fixed top-[64px] left-0 bottom-0 z-40 transition-all duration-200 ${
          isTablet ? "w-[72px]" : "w-[240px]"
        }`}
      >
        {/* Scrollable nav */}
        <nav className="flex-1 overflow-y-auto px-2 lg:px-3 py-4 space-y-1 custom-scrollbar">
          {!isTablet && (
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2.5 select-none">
              Navigation
            </div>
          )}
          {menuItems.map((item) => (
            <SidebarNavItem
              key={item.key}
              item={item}
              isCollapsed={isTablet}
              isActive={
                selectedKey === item.key ||
                selectedKey.startsWith(item.key + "/")
              }
              onClick={() => onChange(item.key)}
            />
          ))}
        </nav>
      </aside>

      {/* ── Main content ────────────────────────────────────── */}
      <Layout
        className={`flex-1 min-w-0 transition-all duration-200 ${
          isTablet ? "md:ml-[72px]" : "md:ml-[240px]"
        }`}
      >
        <Content className="p-3 sm:p-4 lg:p-6 bg-slate-50 min-h-full">
          {children}
        </Content>
      </Layout>
    </div>
  );
}

