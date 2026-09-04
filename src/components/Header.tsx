import { Link, useLocation, useNavigate } from "react-router-dom";
import { Layout, Menu, Button, Dropdown, MenuProps, Avatar, Badge, Popover, Spin, Tag } from "antd";
import { UserOutlined, LogoutOutlined, BellOutlined } from "@ant-design/icons";
import { useEffect, useState, memo } from "react";
import { Bell, Inbox, PenTool, BookOpen } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { resolveMediaUrl } from "../services/apiClient";
import { studentLearningService } from "../services/studentLearningService";
import logoImg from "../assets/logo/logo.png";

const { Header: AntHeader } = Layout;

function NotificationPopoverContent({
  assignments,
  loading,
  onNavigate,
}: {
  assignments: any[];
  loading: boolean;
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

  if (!assignments || assignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400" style={{ width: 300 }}>
        <Inbox className="w-8 h-8 text-slate-300 mb-2 stroke-[1.5]" />
        <span className="text-xs font-medium">Bạn chưa có bài thi mới nào!</span>
      </div>
    );
  }

  return (
    <div style={{ width: 330 }} className="font-sans">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
        <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
          <Bell size={15} className="text-indigo-600" />
          Thông báo bài thi mới
        </span>
        <Tag color="indigo" className="m-0 rounded-full text-[10px] font-bold">
          {assignments.length} cần làm
        </Tag>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {assignments.slice(0, 5).map((item, idx) => {
          const title = item.title || item.exam?.title || item.assignment?.title || "Bài thi mới được giao";
          const isExam = item.examType === "exam" || item.exam?.examType === "exam";
          const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString("vi-VN") : "";

          return (
            <div
              key={item.id || idx}
              onClick={() => onNavigate("/student/my-exams")}
              className="p-2.5 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all cursor-pointer flex gap-2.5 items-start group"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${isExam ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"}`}>
                {isExam ? <PenTool size={15} /> : <BookOpen size={15} />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-slate-800 truncate group-hover:text-indigo-600">
                    {title}
                  </span>
                  {isExam ? (
                    <Tag color="purple" className="m-0 text-[9px] border-none shrink-0 font-semibold">1 lần</Tag>
                  ) : (
                    <Tag color="blue" className="m-0 text-[9px] border-none shrink-0 font-semibold">Ôn tập</Tag>
                  )}
                </div>

                <div className="text-[11px] text-slate-400 mt-1 flex justify-between items-center">
                  <span>{dateStr ? `Ngày giao: ${dateStr}` : "Chưa làm"}</span>
                  <span className="text-indigo-600 font-bold group-hover:translate-x-0.5 transition-transform text-xs">
                    Vào làm →
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2 mt-2 border-t border-slate-100 text-center">
        <Button
          type="link"
          size="small"
          onClick={() => onNavigate("/student/my-exams")}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
        >
          Xem tất cả bài thi của tôi →
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
  const [notifications, setNotifications] = useState<any[]>([]);
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

    studentLearningService.examAssignments.list({ page: 1, limit: 20 })
      .then((res: any) => {
        if (!isMounted) return;
        const list = Array.isArray(res) ? res : res?.data ?? [];
        // Chỉ đếm bài thi mới được giao mà học sinh chưa bắt đầu làm (assigned)
        // Khi học sinh bắt đầu làm bài (in_progress) hoặc nộp bài (finished), thông báo sẽ tự động mất khỏi Quả chuông
        const newAssignments = list.filter((item: any) => {
          const status = item.status || item.summary?.status || "assigned";
          return status === "assigned";
        });
        setNotifications(newAssignments);
      })
      .catch(() => {
        if (isMounted) setNotifications([]);
      })
      .finally(() => {
        if (isMounted) setLoadingNotifs(false);
      });

    return () => { isMounted = false; };
  }, [isLoggedIn, isStudent, location.pathname]);

  const handleMenuClick = (e: any) => {
    if (e.key === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      navigate("/");
    } else if (
      e.key === "about" ||
      e.key === "teachers" ||
      e.key === "contact"
    ) {
      // Nếu đang ở trang khác, điều hướng về /?scrollTo=...
      // Nếu đã ở trang chủ, cuộn luôn
      if (location.pathname !== "/") {
        navigate(`/?scrollTo=${e.key}`);
      } else {
        const element = document.getElementById(e.key);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }
    } else {
      navigate(e.key);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const items = [
    { key: "/", label: "Trang chủ" },
    { key: "/courses", label: "Khóa học" },
    { key: "about", label: "Về chúng tôi" },
    { key: "teachers", label: "Giáo viên" },
    { key: "contact", label: "Liên hệ" },
  ];

  const userMenuItems: MenuProps["items"] = [
    {
      key: "profile",
      label: `${user?.fullName}`,
      onClick: () => navigate("/profile"),
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
      <div
        className="flex items-center gap-3 cursor-pointer group"
        onClick={() => {
          navigate("/");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      >
        <img
          src={logoImg}
          alt="Logo"
          className="h-14 object-contain m-0"
        />
      </div>

      <Menu
        mode="horizontal"
        selectedKeys={[current]}
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
                    assignments={notifications}
                    loading={loadingNotifs}
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
          <Button
            type="primary"
            shape="round"
            size="large"
            onClick={() => navigate("/login")}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Đăng nhập
          </Button>
        )}
      </div>
    </AntHeader>
  );
});

export default Header;
