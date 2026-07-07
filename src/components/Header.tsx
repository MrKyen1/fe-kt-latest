import { Link, useLocation, useNavigate } from "react-router-dom";
import { Layout, Menu, Button, Dropdown, MenuProps, Avatar } from "antd";
import { UserOutlined, LogoutOutlined } from "@ant-design/icons";
import { useEffect, useState, memo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { resolveMediaUrl } from "../services/apiClient";
import logoImg from "../assets/logo/logo.png";

const { Header: AntHeader } = Layout;

const Header = memo(function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoggedIn, logout } = useAuth();
  const [current, setCurrent] = useState(location.pathname);

  useEffect(() => {
    setCurrent(location.pathname);
    console.log("user", user);
  }, [location]);

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
                imgProps={{ crossOrigin: "anonymous" }}
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
