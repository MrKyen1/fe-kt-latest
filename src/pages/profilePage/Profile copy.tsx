// import { useState, useEffect } from "react";
// import {
//   Layout,
//   Menu,
//   Button,
//   Row,
//   Col,
//   Progress,
//   Statistic,
//   Typography,
//   Card,
//   Empty,
//   Avatar,
//   Badge,
//   Tag,
// } from "antd";
// import {
//   BarChartOutlined,
//   BookOutlined,
//   TeamOutlined,
//   FileTextOutlined,
//   TrophyOutlined,
//   LogoutOutlined,
//   CrownOutlined,
//   StarOutlined,
//   UserOutlined,
//   ProfileOutlined,
// } from "@ant-design/icons";
// import { useAuth } from "../../contexts/AuthContext";
// import { getStudents } from "../../utils/adminStorage";
// import AdminDashboard from "./admin/AdminDashboard";
// import AdminCourses from "./admin/AdminCourses";
// import AdminAboutUs from "./admin/AdminAboutUs";
// import StudentRanking from "./StudentRanking";
// import { Student } from "../../types";
// import {
//   calculateRankingScore,
//   getStudentRank,
// } from "../../utils/rankingUtils";

// const { Sider, Content, Header } = Layout;
// const { Title, Paragraph, Text } = Typography;

// export default function Profile() {
//   const { user, logout } = useAuth();
//   const [adminMenuKey, setAdminMenuKey] = useState("dashboard");
//   const [students, setStudents] = useState<Student[]>([]);
//   const [currentStudent, setCurrentStudent] = useState<Student | null>(null);

//   useEffect(() => {
//     const data = getStudents();
//     setStudents(data);

//     if (user?.role === "student") {
//       const matched = data.find(
//         (student) => student.username === user.username,
//       );
//       setCurrentStudent(matched ?? null);
//     }
//   }, [user]);

//   const currentStudentRank = currentStudent
//     ? getStudentRank(currentStudent, students)
//     : null;

//   const sameGroupStudents = currentStudent
//     ? students.filter(
//         (student) =>
//           student.class === currentStudent.class &&
//           student.birthYear === currentStudent.birthYear,
//       )
//     : [];

//   const currentGroupRank = currentStudent
//     ? sameGroupStudents.findIndex(
//         (student) => student.id === currentStudent.id,
//       ) + 1
//     : null;

//   if (user?.role === "student") {
//     // Student Dashboard
//     return (
//       <div className="min-h-screen bg-gray-50">
//         <div className="max-w-6xl mx-auto p-4">
//           {/* Header */}
//           <div className="mb-6">
//             <Title level={2} className="!mb-0 !text-2xl">
//               Dashboard Học Tập
//             </Title>
//           </div>

//           {/* Stats */}
//           <Row gutter={[16, 16]} className="mb-6">
//             {[
//               {
//                 title: "Hoàn thành",
//                 value: 3,
//                 color: "from-orange-400 to-orange-500",
//                 icon: <TrophyOutlined />,
//               },
//               {
//                 title: "Đang học",
//                 value: 2,
//                 color: "from-blue-500 to-blue-600",
//                 icon: <BookOutlined />,
//               },
//               {
//                 title: "Thời gian học",
//                 value: 45,
//                 suffix: "h",
//                 color: "from-green-500 to-green-600",
//                 icon: <BarChartOutlined />,
//               },
//             ].map((item, i) => (
//               <Col xs={24} sm={8} key={i}>
//                 <Card
//                   className={`text-center text-white shadow-md border-0 bg-gradient-to-br ${item.color}`}
//                 >
//                   <Statistic
//                     title={<span className="text-xs">{item.title}</span>}
//                     value={item.value}
//                     suffix={item.suffix}
//                     prefix={item.icon}
//                     valueStyle={{ color: "darkslategrey", fontSize: 22 }}
//                   />
//                 </Card>
//               </Col>
//             ))}
//           </Row>

//           {/* Personal Progress */}
//           <Card
//             title="Tiến độ cá nhân"
//             className="mb-6 shadow-md"
//             bodyStyle={{ padding: "16px" }}
//           >
//             {currentStudent ? (
//               <div className="grid gap-4 md:grid-cols-3">
//                 {/* Result */}
//                 <div className="p-4 rounded-xl bg-green-50 border">
//                   <Text strong>Kết quả</Text>
//                   <Progress
//                     percent={
//                       (currentStudent.totalExams || 0) > 0
//                         ? ((currentStudent.correctAnswers || 0) /
//                             (currentStudent.totalExams || 1)) *
//                           100
//                         : 0
//                     }
//                     size="small"
//                     className="mt-2"
//                   />
//                 </div>

//                 {/* Profile */}
//                 <div className="p-4 rounded-xl bg-blue-50 border">
//                   <div className="flex items-center gap-3">
//                     <Avatar size={36}>
//                       {currentStudent.fullName.charAt(0)}
//                     </Avatar>
//                     <div>
//                       <div className="text-sm font-semibold">
//                         {currentStudent.fullName}
//                       </div>
//                       <div className="text-xs text-gray-500">
//                         {currentStudent.class}
//                       </div>
//                     </div>
//                   </div>
//                 </div>

//                 {/* Rank */}
//                 <div className="p-4 rounded-xl bg-purple-50 border">
//                   <Text strong>Hạng</Text>
//                   <div className="text-xl font-bold mt-1">
//                     #{currentStudentRank}
//                   </div>
//                 </div>
//               </div>
//             ) : (
//               <Empty description="Chưa có dữ liệu" />
//             )}
//           </Card>

//           {/* Ranking */}
//           <Card className="shadow-md mb-6" bodyStyle={{ padding: 12 }}>
//             {students.length > 0 ? (
//               <StudentRanking
//                 students={students}
//                 currentStudentId={currentStudent?.id}
//                 compact
//               />
//             ) : (
//               <Empty />
//             )}
//           </Card>

//           {/* Recent Scores */}
//           <Card title="Điểm gần đây" className="shadow-md mb-6">
//             <Row gutter={[12, 12]}>
//               {[
//                 { name: "Toán 6", score: 8.5 },
//                 { name: "Anh văn", score: 9.2 },
//                 { name: "Toán 10", score: 7.8 },
//               ].map((item, i) => (
//                 <Col xs={24} sm={12} md={8} key={i}>
//                   <Card size="small" className="text-center border">
//                     <div className="text-sm">{item.name}</div>
//                     <div className="text-xl font-bold text-blue-600">
//                       {item.score}
//                     </div>
//                   </Card>
//                 </Col>
//               ))}
//             </Row>
//           </Card>
//         </div>
//       </div>
//     );
//   }

//   // Admin Panel with Sidebar Navigation
//   const renderAdminContent = () => {
//     switch (adminMenuKey) {
//       case "profile":
//         return <Profile />;
//       case "dashboard":
//         return <AdminDashboard />;
//       case "courses":
//         return <AdminCourses />;
//       case "about":
//         return <AdminAboutUs />;
//       default:
//         return <AdminDashboard />;
//     }
//   };

//   const adminMenuItems = [
//     {
//       key: "profile",
//       icon: <ProfileOutlined />,
//       label: "Profile",
//     },
//     {
//       key: "dashboard",
//       icon: <BarChartOutlined />,
//       label: "Tổng quan",
//     },
//     {
//       key: "courses",
//       icon: <BookOutlined />,
//       label: "Quản lý Khóa học",
//     },
//     {
//       key: "about",
//       icon: <FileTextOutlined />,
//       label: "Về chúng tôi",
//     },
//   ];

//   return (
//     <Layout style={{ minHeight: "100vh" }}>
//       <Sider
//         width={250}
//         breakpoint="lg"
//         collapsedWidth={0}
//         theme="light"
//         style={{
//           background: "#f0f2f5",
//           borderRight: "1px solid #d9d9d9",
//         }}
//       >
//         <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent p-4">
//           Kata Admin
//         </h1>
//         <Menu
//           items={adminMenuItems}
//           selectedKeys={[adminMenuKey]}
//           onClick={(e) => setAdminMenuKey(e.key)}
//           style={{ borderRight: "none" }}
//         />
//       </Sider>

//       <Layout>
//         <Header
//           style={{
//             background: "#fff",
//             padding: "0 24px",
//             boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
//             display: "flex",
//             justifyContent: "space-between",
//             alignItems: "center",
//           }}
//         >
//           <Title level={3} className="mb-0">
//             {adminMenuItems.find((item) => item.key === adminMenuKey)?.label}
//           </Title>
//         </Header>

//         <Content style={{ padding: "24px", background: "#fafafa" }}>
//           {renderAdminContent()}
//         </Content>
//       </Layout>
//     </Layout>
//   );
// }
