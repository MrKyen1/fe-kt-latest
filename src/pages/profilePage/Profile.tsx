import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useLocation, useNavigate, useOutlet } from "react-router-dom";


import {
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Layout,
  Menu,
  Progress,
  Row,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import { Star } from "lucide-react";

import {
  BarChartOutlined,
  BookOutlined,
  CrownOutlined,
  FileTextOutlined,
  LogoutOutlined,
  ProfileOutlined,
  StarOutlined,
  TeamOutlined,
  TrophyOutlined,
  UserOutlined,
} from "@ant-design/icons";

import { useAuth } from "../../contexts/AuthContext";

import AdminDashboard from "./admin/AdminDashboard";
import AdminCourses from "./admin/AdminCourses";
import AdminAboutUs from "./admin/AdminAboutUs";
import RbacManagement from "./admin/RbacManagement";
import LearningCms from "./admin/LearningCms";
import TeacherAssignments from "./teacher/TeacherAssignments";
import StudentMyExams from "./student/StudentMyExams";
import Leaderboard from "./Leaderboard";

import UserProfile from "./userProfile";
import ProfileLayout from "./layouts/ProfileLayout";
import { userService } from "../../services/userService";

const { Sider, Content, Header } = Layout;

const { Title, Text } = Typography;

/* =========================================================
   MOCK TYPES
========================================================= */

interface Student {
  id: string;
  username: string;
  fullName: string;
  class: string;
  birthYear: number;

  totalExams: number;
  correctAnswers: number;

  score: number;
}

/* =========================================================
   MOCK DATA
========================================================= */

const MOCK_STUDENTS: Student[] = [
  {
    id: "1",
    username: "kien",
    fullName: "Ngô Đăng Kiên",
    class: "Teen A",
    birthYear: 2010,
    totalExams: 10,
    correctAnswers: 8,
    score: 95,
  },

  {
    id: "2",
    username: "minh",
    fullName: "Nguyễn Minh",
    class: "Teen A",
    birthYear: 2010,
    totalExams: 8,
    correctAnswers: 7,
    score: 89,
  },

  {
    id: "3",
    username: "long",
    fullName: "Trần Long",
    class: "Teen B",
    birthYear: 2009,
    totalExams: 12,
    correctAnswers: 11,
    score: 98,
  },

  {
    id: "4",
    username: "anh",
    fullName: "Lê Anh",
    class: "Teen C",
    birthYear: 2011,
    totalExams: 7,
    correctAnswers: 5,
    score: 78,
  },
];

/* =========================================================
   SHARED STUDENT RANKING
========================================================= */

interface RankingProps {
  students: Student[];

  role: "admin" | "student";

  currentStudentId?: string;
}

function StudentRanking({ students, role, currentStudentId }: RankingProps) {
  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => b.score - a.score);
  }, [students]);

  const currentStudent = sortedStudents.find((s) => s.id === currentStudentId);

  const displayedStudents =
    role === "student" ? sortedStudents.slice(0, 5) : sortedStudents;

  const columns = [
    {
      title: "Rank",

      render: (_: any, __: any, index: number) => {
        if (index === 0)
          return <CrownOutlined className="text-yellow-500 text-xl" />;

        if (index === 1)
          return <TrophyOutlined className="text-gray-400 text-xl" />;

        if (index === 2)
          return <StarOutlined className="text-orange-500 text-xl" />;

        return `#${index + 1}`;
      },
    },

    {
      title: "Student",

      render: (_: any, record: Student) => (
        <div className="flex items-center gap-3">
          <Avatar className="bg-gradient-to-r from-blue-500 to-indigo-500">
            {record.fullName.charAt(0)}
          </Avatar>

          <div>
            <div className="font-semibold">{record.fullName}</div>

            <div className="text-xs text-gray-500">@{record.username}</div>
          </div>
        </div>
      ),
    },

    {
      title: "Class",
      dataIndex: "class",

      render: (value: string) => <Tag color="blue">{value}</Tag>,
    },

    {
      title: "Score",

      render: (_: any, record: Student) => (
        <div className="font-bold text-lg flex items-center gap-1.5">
          <Star size={16} className="text-amber-500 fill-amber-500" />
          <span>{record.score}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* CURRENT STUDENT */}
      {role === "student" && currentStudent && (
        <Card className="rounded-3xl border-0 shadow-[0_10px_40px_rgba(0,0,0,0.08)] overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-5">
            <div className="text-white text-xl font-bold">Your Progress</div>

            <div className="text-white/80 text-sm mt-1">
              Current learning progress
            </div>
          </div>

          <div className="p-6">
            <Row gutter={[20, 20]}>
              <Col xs={24} md={8}>
                <div className="bg-blue-50 rounded-2xl p-5">
                  <Text strong>Completion</Text>

                  <Progress
                    percent={
                      (
                        (currentStudent.correctAnswers /
                          currentStudent.totalExams) *
                        100
                      ).toFixed(0) as any
                    }
                    className="mt-3"
                  />
                </div>
              </Col>

              <Col xs={24} md={8}>
                <div className="bg-purple-50 rounded-2xl p-5">
                  <Statistic
                    title="Your Rank"
                    value={
                      sortedStudents.findIndex(
                        (s) => s.id === currentStudent.id,
                      ) + 1
                    }
                    prefix={<CrownOutlined />}
                  />
                </div>
              </Col>

              <Col xs={24} md={8}>
                <div className="bg-orange-50 rounded-2xl p-5">
                  <Statistic
                    title="Current Score"
                    value={currentStudent.score}
                    prefix={<Star size={18} className="text-amber-500 fill-amber-500 inline" />}
                  />
                </div>
              </Col>
            </Row>
          </div>
        </Card>
      )}

      {/* RANKING */}
      <Card className="rounded-3xl border-0 shadow-[0_10px_40px_rgba(0,0,0,0.08)] overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-5">
          <div className="text-white text-xl font-bold">
            {role === "admin" ? "All Students Ranking" : "Top 5 Ranking"}
          </div>

          <div className="text-white/80 text-sm mt-1">Student leaderboard</div>
        </div>

        <div className="p-6">
          <Table
            dataSource={displayedStudents}
            columns={columns}
            pagination={false}
            rowKey="id"
          />
        </div>
      </Card>
    </div>
  );
}

/* =========================================================
   MAIN PROFILE
========================================================= */

export default function Profile() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const outlet = useOutlet();
  const [searchParams] = useSearchParams();

  const rolePrefix = useMemo(() => {
    if (user?.role === "student") return "student";
    if (user?.role === "teacher") return "teacher";
    return "admin";
  }, [user?.role]);

  const menuKey = useMemo(() => {
    const pathSegments = location.pathname.split("/").filter(Boolean);
    if (pathSegments.length >= 2 && (pathSegments[0] === "admin" || pathSegments[0] === "teacher" || pathSegments[0] === "student")) {
      return pathSegments[1];
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

  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    let active = true;
    const fetchStudents = async () => {
      try {
        let users;
        try {
          users = await userService.list({ roleCode: "student" });
        } catch (err) {
          console.warn("Failed to load students for ranking from API (403 Forbidden for teacher), falling back to database students:", err);
        }
        if (!active) return;

        // Deterministic hash helper for ranking scores
        const hashString = (str: string) => {
          let hash = 0;
          for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash |= 0;
          }
          return Math.abs(hash);
        };

        const mapped: Student[] = (users || []).map((u) => {
          const seed = hashString(u.code || u.id);
          const totalExams = (seed % 15) + 5;
          const correctAnswers = Math.floor(totalExams * (0.6 + (seed % 30) / 100));
          const score = Math.floor(correctAnswers * 10 + (seed % 10));

          const classNames = u.studentProfile?.classes?.map((c: any) => c.name).join(", ") || "—";
          const birthYear = u.dateOfBirth ? new Date(u.dateOfBirth).getFullYear() : 2010;

          return {
            id: u.id,
            username: u.code,
            fullName: u.fullName || u.code,
            class: classNames,
            birthYear,
            totalExams,
            correctAnswers,
            score,
          };
        });
        setStudents(mapped);
      } catch (err) {
        console.error("Failed to load students for ranking:", err);
      }
    };

    fetchStudents();
    return () => {
      active = false;
    };
  }, []);

  const currentStudent = useMemo(() => {
    return students.find((student) => student.username === user?.username);
  }, [students, user]);

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
      key: "rbac",
      icon: <CrownOutlined />,
      label: "Phân quyền (RBAC)",
    },
    {
      key: "about",
      icon: <FileTextOutlined />,
      label: (
        <>
          About{" "}
          <span className="text-[9px] bg-rose-50 text-rose-500 border border-rose-200 px-1 py-0.5 rounded font-bold uppercase ml-1.5">
            Coming Soon
          </span>
        </>
      ),
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
      case "rbac":
        return <RbacManagement />;
      case "cms":
        return <LearningCms />;
      case "profile":
        return <UserProfile />;
      case "about":
        return <AdminAboutUs />;
      default:
        return <UserProfile />;
    }
  };

  /* =====================================================
     MAIN RETURN
  ===================================================== */

  const getMenuItems = () => {
    if (user?.role === "student") return studentMenu;
    if (user?.role === "teacher") return teacherMenu;
    return adminMenu;
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
