import { useEffect, useMemo, useState } from "react";

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

import UserProfile from "./userProfile";
import ProfileLayout from "./layouts/ProfileLayout";

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
        <div className="font-bold text-lg">⭐ {record.score}</div>
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
                    prefix="⭐"
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

  const [menuKey, setMenuKey] = useState("dashboard");

  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    setStudents(MOCK_STUDENTS);
  }, []);

  const currentStudent = useMemo(() => {
    return students.find((student) => student.username === user?.username);
  }, [students, user]);

  /* =====================================================
     STUDENT MENU
  ===================================================== */

  const studentMenu = [
    {
      key: "dashboard",

      icon: <BarChartOutlined />,

      label: "Dashboard",
    },

    {
      key: "ranking",

      icon: <TrophyOutlined />,

      label: "Ranking",
    },

    {
      key: "profile",

      icon: <ProfileOutlined />,

      label: "Profile",
    },
  ];

  /* =====================================================
     ADMIN MENU
  ===================================================== */

  const adminMenu = [
    {
      key: "dashboard",

      icon: <BarChartOutlined />,

      label: "Dashboard",
    },

    {
      key: "courses",

      icon: <BookOutlined />,

      label: "Courses",
    },

    {
      key: "ranking",

      icon: <TrophyOutlined />,

      label: "Student Ranking",
    },

    {
      key: "profile",

      icon: <ProfileOutlined />,

      label: "Profile",
    },

    {
      key: "about",

      icon: <FileTextOutlined />,

      label: "About",
    },
  ];

  /* =====================================================
     STUDENT RENDER
  ===================================================== */

  const renderStudentContent = () => {
    switch (menuKey) {
      case "profile":
        return <UserProfile />;
      case "ranking":
        return (
          <StudentRanking
            students={students}
            role="student"
            currentStudentId={currentStudent?.id}
          />
        );
    }
  };

  /* =====================================================
     ADMIN RENDER
  ===================================================== */

  const renderAdminContent = () => {
    switch (menuKey) {
      case "dashboard":
        return <AdminDashboard />;

      case "courses":
        return <AdminCourses />;

      case "ranking":
        return <StudentRanking students={students} role="admin" />;

      case "profile":
        return <UserProfile />;

      case "about":
        return <AdminAboutUs />;

      default:
        return <AdminDashboard />;
    }
  };

  /* =====================================================
     MAIN RETURN
  ===================================================== */

  return (
    <ProfileLayout
      menuItems={user?.role === "student" ? studentMenu : adminMenu}
      selectedKey={menuKey}
      onChange={setMenuKey}
    >
      {user?.role === "student" ? renderStudentContent() : renderAdminContent()}
    </ProfileLayout>
  );
}
