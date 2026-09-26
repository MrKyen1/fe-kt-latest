import { Link, useLocation, useNavigate } from "react-router-dom";
import { Layout, Menu, Button, Dropdown, MenuProps, Avatar, Badge, Popover, Spin, Tag } from "antd";
import { UserOutlined, LogoutOutlined, BellOutlined } from "@ant-design/icons";
import { useEffect, useState, memo, useMemo } from "react";
import { Bell, Inbox, PenTool, BookOpen } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { resolveMediaUrl } from "../services/apiClient";
import { studentLearningService } from "../services/studentLearningService";
import logoImg from "../assets/logo/logo.png";

const { Header: AntHeader } = Layout;

export interface AppNotificationItem {
  id: string;
  type: "exam" | "curriculum";
  title: string;
  subTitle?: string;
  badgeLabel: string;
  badgeColor: string;
  dateStr?: string;
  actionUrl: string;
  raw?: any;
}

function NotificationPopoverContent({
  notifications,
  loading,
  onItemClick,
  onNavigate,
}: {
  notifications: AppNotificationItem[];
  loading: boolean;
  onItemClick: (item: AppNotificationItem) => void;
  onNavigate: (path: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-6 text-slate-400">
        <Spin size="small" />
        <span className="ml-2 text-xs font-medium">Đang tải thông báo...</span>
      </div>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400" style={{ width: 330 }}>
        <Inbox className="w-8 h-8 text-slate-300 mb-2 stroke-[1.5]" />
        <span className="text-xs font-medium">Bạn chưa có bài thi hoặc giáo trình mới nào!</span>
      </div>
    );
  }

  const examCount = notifications.filter((n) => n.type === "exam").length;
  const currCount = notifications.filter((n) => n.type === "curriculum").length;

  return (
    <div style={{ width: 350 }} className="font-sans">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
        <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
          <Bell size={15} className="text-indigo-600" />
          Thông báo mới
        </span>
        <div className="flex items-center gap-1">
          {examCount > 0 && (
            <Tag color="purple" className="m-0 rounded-full text-[10px] font-bold">
              {examCount} bài thi
            </Tag>
          )}
          {currCount > 0 && (
            <Tag color="emerald" className="m-0 rounded-full text-[10px] font-bold">
              {currCount} giáo trình
            </Tag>
          )}
        </div>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {notifications.slice(0, 6).map((item, idx) => {
          const isCurr = item.type === "curriculum";

          return (
            <div
              key={`${item.type}-${item.id || idx}`}
              onClick={() => onItemClick(item)}
              className="p-2.5 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all cursor-pointer flex gap-2.5 items-start group"
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  isCurr
                    ? "bg-emerald-100 text-emerald-600"
                    : item.badgeColor === "purple"
                    ? "bg-purple-100 text-purple-600"
                    : "bg-blue-100 text-blue-600"
                }`}
              >
                {isCurr ? <BookOpen size={15} /> : <PenTool size={15} />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-slate-800 truncate group-hover:text-indigo-600">
                    {item.title}
                  </span>
                  <Tag
                    color={item.badgeColor}
                    className="m-0 text-[9px] border-none shrink-0 font-semibold"
                  >
                    {item.badgeLabel}
                  </Tag>
                </div>

                {item.subTitle && (
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                    {item.subTitle}
                  </div>
                )}

                <div className="text-[11px] text-slate-400 mt-1 flex justify-between items-center">
                  <span>{item.dateStr ? `Giao: ${item.dateStr}` : "Mới được giao"}</span>
                  <span className="text-indigo-600 font-bold group-hover:translate-x-0.5 transition-transform text-xs">
                    {isCurr ? "Xem giáo trình →" : "Vào làm →"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-xs px-1">
        <Button
          type="link"
          size="small"
          onClick={() => onNavigate("/student/my-exams")}
          className="p-0 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
        >
          Bài thi của tôi →
        </Button>
        <Button
          type="link"
          size="small"
          onClick={() => onNavigate("/courses/published-curriculums")}
          className="p-0 text-xs font-semibold text-emerald-600 hover:text-emerald-800"
        >
          Tất cả giáo trình →
        </Button>
      </div>
    </div>
  );
}

const Header = memo(function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoggedIn, logout, hasRole } = useAuth();
  const isStudent = hasRole("student");
  const [current, setCurrent] = useState(location.pathname);

  // Notifications state
  const [notifications, setNotifications] = useState<AppNotificationItem[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    setCurrent(location.pathname);
  }, [location]);

  useEffect(() => {
    if (!isLoggedIn || !isStudent) {
      setNotifications([]);
      return;
    }

    let isMounted = true;
    setLoadingNotifs(true);

    Promise.allSettled([
      studentLearningService.examAssignments.list({ page: 1, limit: 50 }),
      studentLearningService.curriculums.list({ page: 1, limit: 50 }),
    ])
      .then(([examRes, currRes]) => {
        if (!isMounted) return;

        const items: AppNotificationItem[] = [];

        // 1. Exam assignments
        if (examRes.status === "fulfilled") {
          const rawList = Array.isArray(examRes.value)
            ? examRes.value
            : (examRes.value as any)?.data ?? [];
          const newAssignments = rawList.filter((item: any) => {
            const status = item.status || item.summary?.status || "assigned";
            return status === "assigned";
          });

          newAssignments.forEach((item: any) => {
            const title =
              item.title ||
              item.exam?.title ||
              item.assignment?.title ||
              "Bài thi mới được giao";
            const isExam =
              item.examType === "exam" || item.exam?.examType === "exam";
            const date = item.createdAt || item.assignedAt;
            items.push({
              id: item.id,
              type: "exam",
              title,
              subTitle: item.exam?.code || item.assignment?.code,
              badgeLabel: isExam ? "1 lần" : "Ôn tập",
              badgeColor: isExam ? "purple" : "blue",
              dateStr: date ? new Date(date).toLocaleDateString("vi-VN") : "",
              actionUrl: "/student/my-exams",
              raw: item,
            });
          });
        }

        // 2. Curriculum assignments (Hybrid method)
        if (currRes.status === "fulfilled") {
          const rawCurrList = Array.isArray(currRes.value)
            ? currRes.value
            : (currRes.value as any)?.data ?? [];

          let readIds: string[] = [];
          if (user?.id) {
            try {
              const raw = localStorage.getItem(`read_curriculum_notifications_${user.id}`);
              readIds = raw ? JSON.parse(raw) : [];
            } catch {
              readIds = [];
            }
          }

          const unreadCurriculums = rawCurrList.filter((item: any) => {
            const currId = item.curriculumId || item.curriculum?.id || item.id;
            if (!currId) return false;

            // Hybrid Rule 1: Đã đọc trong localStorage thì không hiện thông báo chuông
            if (readIds.includes(currId)) return false;

            // Hybrid Rule 2: Trạng thái hoàn thành thì không hiện
            if (item.status === "completed" || item.status === "finished") return false;

            // Hybrid Rule 3: Đã làm bài hoặc có tiến độ thì coi như đã bắt đầu học
            const completedCount = Number(item.completedExamsCount) || 0;
            const progress = Number(item.progressPercentage) || 0;
            if (completedCount > 0 || progress > 0) return false;

            return true;
          });

          unreadCurriculums.forEach((item: any) => {
            const currId = item.curriculumId || item.curriculum?.id || item.id;
            const title = item.curriculum?.title || item.title || "Giáo trình mới được giao";
            const date = item.assignedAt || item.createdAt;
            items.push({
              id: currId,
              type: "curriculum",
              title,
              subTitle: item.curriculum?.code || item.code,
              badgeLabel: "Giáo trình",
              badgeColor: "emerald",
              dateStr: date ? new Date(date).toLocaleDateString("vi-VN") : "",
              actionUrl: `/courses/published-curriculums/${currId}`,
              raw: item,
            });
          });
        }

        // Sắp xếp ngày mới nhất lên trước
        items.sort((a, b) => {
          const dateA = a.raw?.createdAt || a.raw?.assignedAt || "";
          const dateB = b.raw?.createdAt || b.raw?.assignedAt || "";
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        });

        setNotifications(items);
      })
      .catch(() => {
        if (isMounted) setNotifications([]);
      })
      .finally(() => {
        if (isMounted) setLoadingNotifs(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isLoggedIn, isStudent, location.pathname, user?.id]);

  const activeMenuKey = useMemo(() => {
    if (location.pathname === "/courses") {
      return "/courses";
    }
    if (location.pathname === "/" || location.pathname === "/home") {
      if (location.hash === "#about") return "/home#about";
      if (location.hash === "#teachers") return "/home#teachers";
      if (location.hash === "#contact") return "/home#contact";
      return "/home";
    }
    return location.pathname;
  }, [location.pathname, location.hash]);

  const handleMenuClick = (e: any) => {
    if (e.key === "/home" || e.key === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      navigate("/home");
      return;
    }

    if (e.key.startsWith("/home#")) {
      const targetId = e.key.replace("/home#", "");
      navigate(e.key);
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }

    navigate(e.key);
  };

  const handleNotificationClick = (item: AppNotificationItem) => {
    if (item.type === "curriculum" && user?.id) {
      try {
        const storageKey = `read_curriculum_notifications_${user.id}`;
        const raw = localStorage.getItem(storageKey);
        const readSet = new Set(raw ? JSON.parse(raw) : []);
        readSet.add(item.id);
        localStorage.setItem(storageKey, JSON.stringify(Array.from(readSet)));
      } catch (err) {
        console.error("Storage error:", err);
      }
      // Optimistically remove dismissed curriculum notification from state
      setNotifications((prev) => prev.filter((n) => !(n.type === "curriculum" && n.id === item.id)));
    }
    setNotifOpen(false);
    navigate(item.actionUrl);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/home");
  };

  const items = [
    {
      key: "/home",
      label: (
        <Link to="/home" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          Trang chủ
        </Link>
      ),
    },
    {
      key: "/courses",
      label: <Link to="/courses">Khóa học</Link>,
    },
    {
      key: "/home#about",
      label: <Link to="/home#about">Về chúng tôi</Link>,
    },
    {
      key: "/home#teachers",
      label: <Link to="/home#teachers">Giáo viên</Link>,
    },
    {
      key: "/home#contact",
      label: <Link to="/home#contact">Liên hệ</Link>,
    },
  ];

  const userMenuItems: MenuProps["items"] = [
    {
      key: "profile",
      label: <Link to="/profile">{user?.fullName}</Link>,
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      label: "Đăng xuất",
      icon: <LogoutOutlined />,
      onClick: handleLogout,
    },
  ];

  return (
    <AntHeader className="sticky top-0 z-50 flex items-center justify-between bg-white px-4 md:px-12 shadow-sm header">
      <Link
        to="/home"
        className="flex items-center gap-3 cursor-pointer group"
        onClick={() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      >
        <img
          src={logoImg}
          alt="Logo"
          className="h-14 object-contain m-0"
        />
      </Link>

      <Menu
        mode="horizontal"
        selectedKeys={[activeMenuKey]}
        onClick={handleMenuClick}
        items={items}
        className="flex-1 justify-center border-none bg-transparent font-medium text-gray-700 hidden md:flex"
      />

      <div className="flex items-center gap-4">
        {isLoggedIn ? (
          <div className="flex items-center gap-3">
            {/* Notification Bell Badge & Popover (Student only) */}
            {isStudent && (
              <Popover
                open={notifOpen}
                onOpenChange={setNotifOpen}
                content={
                  <NotificationPopoverContent
                    notifications={notifications}
                    loading={loadingNotifs}
                    onItemClick={handleNotificationClick}
                    onNavigate={(path) => {
                      setNotifOpen(false);
                      navigate(path);
                    }}
                  />
                }
                trigger="click"
                placement="bottomRight"
              >
                <Badge count={notifications.length} overflowCount={99} className="mr-1">
                  <Button
                    type="text"
                    shape="circle"
                    icon={<BellOutlined className="text-lg text-slate-600 hover:text-indigo-600" />}
                    className="flex items-center justify-center hover:bg-indigo-50 transition-colors"
                  />
                </Badge>
              </Popover>
            )}

            <span className="text-sm text-gray-600">
              Xin chào,{" "}
              <span className="font-semibold text-blue-600">
                {user?.fullName}
              </span>
              !
            </span>

            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Avatar
                src={user?.avatar ? resolveMediaUrl(user.avatar) : undefined}
                icon={!user?.avatar && <UserOutlined />}
                size="large"
                className="cursor-pointer bg-blue-500 text-white"
                crossOrigin="anonymous"
              >
                {user?.fullName?.charAt(0)?.toUpperCase()}
              </Avatar>
            </Dropdown>
          </div>
        ) : (
          <Link to="/login">
            <Button
              type="primary"
              shape="round"
              size="large"
              className="bg-blue-600 hover:bg-blue-700"
            >
              Đăng nhập
            </Button>
          </Link>
        )}
      </div>
    </AntHeader>
  );
});

export default Header;
