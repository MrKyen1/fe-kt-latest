import { useEffect, useMemo } from "react";
import { useSearchParams, useLocation, useNavigate, useOutlet } from "react-router-dom";

import {
  BarChartOutlined,
  BookOutlined,
  FileTextOutlined,
  ProfileOutlined,
  TeamOutlined,
  TrophyOutlined,
} from "@ant-design/icons";

import { useAuth } from "../../contexts/AuthContext";

import AdminDashboard from "./admin/AdminDashboard";
import AdminHomepageCms from "./admin/AdminHomepageCms";
import LearningCms from "./admin/LearningCms";
import TeacherAssignments from "./teacher/TeacherAssignments";
import StudentMyExams from "./student/StudentMyExams";
import Leaderboard from "./Leaderboard";

import UserProfile from "./userProfile";
import ProfileLayout from "./layouts/ProfileLayout";

export default function Profile() {
  const { user, hasRole, hasPermission } = useAuth();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const outlet = useOutlet();

  const rolePrefix = useMemo(() => {
    if (user?.role === "student") return "student";
    if (user?.role === "teacher") return "teacher";
    return "admin";
  }, [user?.role]);

  const menuKey = useMemo(() => {
    const parts = location.pathname.split("/").filter(Boolean);
    if (parts.length >= 2 && ["student", "teacher", "admin"].includes(parts[0])) {
      return parts[1];
    }
    return searchParams.get("tab") || (rolePrefix === "admin" ? "dashboard" : "profile");
  }, [location.pathname, searchParams, rolePrefix]);

  useEffect(() => {
    if (location.pathname === "/profile") {
      const tabParam = searchParams.get("tab");
      const defaultTab = tabParam || (rolePrefix === "admin" ? "dashboard" : "profile");
      navigate(`/${rolePrefix}/${defaultTab}`, { replace: true });
    }
  }, [location.pathname, searchParams, rolePrefix, navigate]);

  const handleTabChange = (key: string) => {
    navigate(`/${rolePrefix}/${key}`);
  };

  /* =====================================================
     STUDENT MENU
  ===================================================== */

  const studentMenu = [
    {
      key: "profile",
      icon: <ProfileOutlined />,
      label: "Profile",
    },
    {
      key: "my-exams",
      icon: <BookOutlined />,
      label: "Bài học của tôi",
    },
    {
      key: "ranking",
      icon: <TrophyOutlined />,
      label: "Xếp hạng",
    },
  ];

  /* =====================================================
     ADMIN MENU
  ===================================================== */

  const adminMenu = [
    {
      key: "profile",
      icon: <ProfileOutlined />,
      label: "Profile",
    },
    {
      key: "dashboard",
      icon: <BarChartOutlined />,
      label: "Dashboard",
    },
    {
      key: "cms",
      icon: <BookOutlined />,
      label: "Learning CMS",
    },
    {
      key: "ranking",
      icon: <TrophyOutlined />,
      label: "Xếp hạng",
    },
    {
      key: "homepage-cms",
      icon: <FileTextOutlined />,
      label: "Cấu hình Trang chủ",
    },
  ];

  const teacherMenu = [
    {
      key: "profile",
      icon: <ProfileOutlined />,
      label: "Profile",
    },
    {
      key: "cms",
      icon: <BookOutlined />,
      label: "Learning CMS",
    },
    {
      key: "assignments",
      icon: <TeamOutlined />,
      label: "Giao bài",
    },
    {
      key: "ranking",
      icon: <TrophyOutlined />,
      label: "Xếp hạng",
    },
  ];

  /* =====================================================
     STUDENT RENDER
  ===================================================== */

  const renderStudentContent = () => {
    switch (menuKey) {
      case "profile":
        return <UserProfile />;
      case "my-exams":
        return <StudentMyExams />;
      case "ranking":
        return <Leaderboard />;
    }
  };

  const renderTeacherContent = () => {
    switch (menuKey) {
      case "profile":
        return <UserProfile />;
      case "cms":
        return <LearningCms />;
      case "assignments":
        return <TeacherAssignments />;
      case "ranking":
        return <Leaderboard />;
      default:
        return <UserProfile />;
    }
  };

  /* =====================================================
     ADMIN RENDER
  ===================================================== */

  const renderAdminContent = () => {
    switch (menuKey) {
      case "dashboard":
        return <AdminDashboard />;
      case "ranking":
        return <Leaderboard />;
      case "cms":
        return <LearningCms />;
      case "profile":
        return <UserProfile />;
      case "homepage-cms":
      case "homepage":
      case "about":
        return <AdminHomepageCms />;
      default:
        return <UserProfile />;
    }
  };

  /* =====================================================
     MAIN RETURN
  ===================================================== */

  const getMenuItems = () => {
    let baseMenu = adminMenu;
    if (user?.role === "student") {
      baseMenu = studentMenu;
    } else if (user?.role === "teacher") {
      baseMenu = teacherMenu;
    }

    return baseMenu
      .filter((item) => {
        if (item.key === "profile" || item.key === "ranking") return true;
        if (item.key === "cms") {
          return hasPermission("learning.read");
        }
        if (item.key === "assignments") {
          return hasPermission("learning.assign");
        }
        if (item.key === "dashboard") {
          return hasPermission(["classes.read", "users.read", "classes.manage"], { mode: "any" });
        }
        if (item.key === "homepage-cms") {
          return hasRole("admin") || hasPermission("classes.manage");
        }
        if (item.key === "my-exams") {
          return hasRole("student") || hasPermission("learning.attempt");
        }
        return true;
      })
      .map((item) => ({
        ...item,
        href: `/${rolePrefix}/${item.key}`,
      }));
  };

  const renderContent = () => {
    if (outlet) return outlet;
    if (user?.role === "student") return renderStudentContent();
    if (user?.role === "teacher") return renderTeacherContent();
    return renderAdminContent();
  };

  return (
    <ProfileLayout
      menuItems={getMenuItems()}
      selectedKey={menuKey}
      onChange={handleTabChange}
    >
      {renderContent()}
    </ProfileLayout>
  );
}
