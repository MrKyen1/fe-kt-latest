import { useNavigate } from "react-router-dom";
import { Layout } from "antd";
import {
  LayoutDashboard,
  User,
  BookOpen,
  Trophy,
  ShieldCheck,
  Info,
  LogOut,
  ChevronRight,
  Users,
} from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";

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
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const roleLabel: Record<string, string> = {
    admin: "Administrator",
    teacher: "Giáo viên",
    student: "Học viên",
  };
  const currentRoleLabel = roleLabel[user?.role ?? ""] ?? user?.role ?? "";

  return (
    <div className="flex" style={{ minHeight: "100vh" }}>
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        style={{
          width: 240,
          flexShrink: 0,
          position: "sticky",
          top: 64,
          height: "calc(100vh - 64px)",
        }}
        className="flex flex-col bg-white border-r border-slate-200"
      >
        {/* Brand header */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm shadow-indigo-200">
              <LayoutDashboard size={15} className="text-white" />
            </div>
            <div>
              <div className="text-slate-800 font-bold text-sm leading-none tracking-tight">
                Kata <span className="text-indigo-600">Admin</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 font-medium uppercase tracking-wider leading-none">
                {currentRoleLabel}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
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
      <Layout className="flex-1 min-w-0">
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

