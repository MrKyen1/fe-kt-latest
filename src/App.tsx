import { PageSpinner } from "./components/LoadingRegion";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, useEffect } from "react";
import { lazyPage } from "./utils/lazyPage";
import { App as AntApp, ConfigProvider } from "antd";
import Layout from "./components/Layout";
import ExamLayout from "./pages/coursePage/ExamLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import ScrollToTop from "./components/ScrollToTop";
import MaintenanceOverlay from "./components/MaintenanceOverlay";

// Lazy load pages
const Home = lazyPage(() => import("./pages/homePage/Home"));
const Courses = lazyPage(() => import("./pages/coursePage/Courses"));
const ExamList = lazyPage(() => import("./pages/coursePage/ExamList"));
const ExamPage = lazyPage(() => import("./pages/coursePage/ExamDetail"));
const PublishedCurriculums = lazyPage(() => import("./pages/coursePage/PublishedCurriculums"));
const CurriculumExams = lazyPage(() => import("./pages/coursePage/CurriculumExams"));
const Login = lazyPage(() => import("./pages/loginPage/Login"));
const Register = lazyPage(() => import("./pages/loginPage/Register"));
const ForgotPassword = lazyPage(() => import("./pages/loginPage/ForgotPassword"));
const Profile = lazyPage(() => import("./pages/profilePage/Profile"));
const UserProfile = lazyPage(() => import("./pages/profilePage/userProfile"));
const AdminDashboard = lazyPage(() => import("./pages/profilePage/admin/AdminDashboard"));
const AdminBackups = lazyPage(() => import("./pages/profilePage/admin/AdminBackups"));
const LearningCms = lazyPage(() => import("./pages/profilePage/admin/LearningCms"));
const AdminHomepageCms = lazyPage(() => import("./pages/profilePage/admin/AdminHomepageCms"));
const TeacherAssignments = lazyPage(() => import("./pages/profilePage/teacher/TeacherAssignments"));
const CenterManagement = lazyPage(() => import("./pages/profilePage/admin/centerManagement"));
const StudentMyExams = lazyPage(() => import("./pages/profilePage/student/StudentMyExams"));
const Leaderboard = lazyPage(() => import("./pages/profilePage/Leaderboard"));

export default function App() {
  useEffect(() => {
    // Đảm bảo luôn chạy light mode và dọn dẹp dark mode tồn dư
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("darkMode");
  }, []);
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#4f46e5",
          fontFamily: "'Inter', sans-serif",
          borderRadius: 10,
        },
      }}
    >
      <AntApp className="w-full h-full">
        <BrowserRouter>
          <ScrollToTop />
      <Suspense
        fallback={
          <PageSpinner />
        }
      >
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/home" replace />} />
            <Route path="home" element={<Home />} />
            <Route
              path="courses"
              element={
                <ProtectedRoute permissions={["learning.read"]}>
                  <Courses />
                </ProtectedRoute>
              }
            />
            <Route
              path="courses/published-curriculums"
              element={
                <ProtectedRoute permissions={["learning.read"]}>
                  <PublishedCurriculums />
                </ProtectedRoute>
              }
            />
            <Route
              path="courses/published-curriculums/:curriculumId"
              element={
                <ProtectedRoute permissions={["learning.read"]}>
                  <CurriculumExams />
                </ProtectedRoute>
              }
            />
            <Route
              path="courses/:courseId"
              element={
                <ProtectedRoute roles={["student"]} permissions={["learning.attempt"]}>
                  <ExamList />
                </ProtectedRoute>
              }
            />

            {/* Legacy Profile Route */}
            <Route
              path="profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            {/* Admin Dedicated Nested Routes */}
            <Route
              path="admin"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <Profile />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="profile" element={<UserProfile />} />
              <Route path="dashboard/*" element={<AdminDashboard />} />
              <Route path="backups" element={<AdminBackups />} />
              <Route
                path="cms/*"
                element={
                  <ProtectedRoute permissions={["learning.read"]}>
                    <LearningCms />
                  </ProtectedRoute>
                }
              />
              <Route
                path="assignments/*"
                element={<TeacherAssignments />}
              />
              <Route path="ranking/*" element={<Leaderboard />} />
              <Route path="leaderboard/*" element={<Navigate to="/admin/ranking" replace />} />
              <Route path="rbac/*" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="about/*" element={<AdminHomepageCms />} />
              <Route path="homepage-cms/*" element={<AdminHomepageCms />} />
              <Route path="homepage/*" element={<AdminHomepageCms />} />
            </Route>

            {/* Teacher Dedicated Nested Routes */}
            <Route
              path="teacher"
              element={
                <ProtectedRoute roles={["teacher"]}>
                  <Profile />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/teacher/profile" replace />} />
              <Route path="profile" element={<UserProfile />} />
              <Route
                path="cms/*"
                element={
                  <ProtectedRoute permissions={["learning.read"]}>
                    <LearningCms />
                  </ProtectedRoute>
                }
              />
              <Route
                path="assignments/*"
                element={
                  <ProtectedRoute permissions={["learning.assign"]}>
                    <TeacherAssignments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="centers/*"
                element={
                  <ProtectedRoute permissions={["centers.read"]}>
                    <CenterManagement />
                  </ProtectedRoute>
                }
              />
              <Route path="ranking/*" element={<Leaderboard />} />
              <Route path="leaderboard/*" element={<Navigate to="/teacher/ranking" replace />} />
            </Route>

            {/* Student Dedicated Nested Routes */}
            <Route
              path="student"
              element={
                <ProtectedRoute roles={["student"]}>
                  <Profile />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/student/my-exams" replace />} />
              <Route path="profile" element={<UserProfile />} />
              <Route path="leaderboard/*" element={<Navigate to="/student/ranking" replace />} />
              <Route path="my-exams" element={<ProtectedRoute permissions={["learning.attempt"]}><StudentMyExams /></ProtectedRoute>} />
              <Route path="ranking/*" element={<Leaderboard />} />
            </Route>
          </Route>

          <Route path="/exam/:examId" element={<ExamLayout />}>
            <Route
              index
              element={
                <ProtectedRoute roles={["student"]} permissions={["learning.attempt"]}>
                  <ExamPage />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Routes>
      </Suspense>
        </BrowserRouter>
        <MaintenanceOverlay />
      </AntApp>
    </ConfigProvider>
  );
}
