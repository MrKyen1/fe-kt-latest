import { Layout } from "antd";
import {
  LayoutDashboard,
  User,
  BookOpen,
  Trophy,
  ShieldCheck,
  Info,
  ChevronRight,
  Users,
} from "lucide-react";

const { Content } = Layout;

// Map AntD icon display names → Lucide icons
const ICON_MAP: Record<string, React.ReactNode> = {
  BarChartOutlined: <LayoutDashboard size={17} />,
  ProfileOutlined: <User size={17} />,
  BookOutlined: <BookOpen size={17} />,
  TrophyOutlined: <Trophy size={17} />,
  CrownOutlined: <ShieldCheck size={17} />,
  FileTextOutlined: <Info size={17} />,
  TeamOutlined: <Users size={17} />,
};

interface NavItem {
  key: string;
  icon?: React.ReactNode;
  label: React.ReactNode;
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
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
}) {
  const resolvedIcon = (() => {
    if (!item.icon) return null;
    const el = item.icon as React.ReactElement;
    const typeName =
      (el.type as any)?.displayName || (el.type as any)?.name || "";
    return ICON_MAP[typeName] ?? el;
  })();

  return (
    <button
      onClick={onClick}
      className={[
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left group",
        isActive
          ? "bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent",
      ].join(" ")}
      style={{ outline: "none" }}
    >
      <span
        className={[
          "flex-shrink-0 transition-colors",
          isActive
            ? "text-indigo-600"
            : "text-slate-400 group-hover:text-slate-600",
        ].join(" ")}
      >
        {resolvedIcon}
      </span>

      <span className="flex-1 leading-tight">{item.label}</span>

      {isActive && (
        <ChevronRight size={13} className="text-indigo-400 flex-shrink-0" />
      )}
    </button>
  );
}

export default function ProfileLayout({
  menuItems,
  selectedKey,
  onChange,
  children,
}: Props) {
  return (
    <div className="flex" style={{ minHeight: "100vh" }}>
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        style={{
          width: 240,
          position: "fixed",
          top: 64,
          left: 0,
          bottom: 0,
          zIndex: 40,
        }}
        className="flex flex-col bg-white border-r border-slate-200"
      >
        {/* Scrollable nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5 custom-scrollbar">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2 mb-2 select-none">
            Navigation
          </div>
          {menuItems.map((item) => (
            <SidebarNavItem
              key={item.key}
              item={item}
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
      <Layout className="flex-1 min-w-0" style={{ marginLeft: 240 }}>
        <Content
          style={{
            padding: "24px",
            background: "#f8fafc",
            minHeight: "100%",
          }}
        >
          {children}
        </Content>
      </Layout>
    </div>
  );
}

