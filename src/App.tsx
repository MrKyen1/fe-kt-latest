import { PageSpinner } from "./components/LoadingRegion";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import { App as AntApp, ConfigProvider } from "antd";
import Layout from "./components/Layout";
import ExamLayout from "./pages/coursePage/ExamLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import ScrollToTop from "./components/ScrollToTop";

// Lazy load pages
const Home = lazy(() => import("./pages/homePage/Home"));
const Courses = lazy(() => import("./pages/coursePage/Courses"));
const ExamList = lazy(() => import("./pages/coursePage/ExamList"));
const ExamPage = lazy(() => import("./pages/coursePage/ExamDetail"));
const PublishedCurriculums = lazy(() => import("./pages/coursePage/PublishedCurriculums"));
const CurriculumExams = lazy(() => import("./pages/coursePage/CurriculumExams"));
const Login = lazy(() => import("./pages/loginPage/Login"));
const Register = lazy(() => import("./pages/loginPage/Register"));
const ForgotPassword = lazy(() => import("./pages/loginPage/ForgotPassword"));
const Profile = lazy(() => import("./pages/profilePage/Profile"));
const UserProfile = lazy(() => import("./pages/profilePage/userProfile"));
const AdminDashboard = lazy(() => import("./pages/profilePage/admin/AdminDashboard"));
const LearningCms = lazy(() => import("./pages/profilePage/admin/LearningCms"));
const AdminHomepageCms = lazy(() => import("./pages/profilePage/admin/AdminHomepageCms"));
const TeacherAssignments = lazy(() => import("./pages/profilePage/teacher/TeacherAssignments"));
const CenterManagement = lazy(() => import("./pages/profilePage/admin/centerManagement"));
const StudentMyExams = lazy(() => import("./pages/profilePage/student/StudentMyExams"));
const Leaderboard = lazy(() => import("./pages/profilePage/Leaderboard"));

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
              <Route
                path="cms/*"
                element={
                  <ProtectedRoute permissions={["learning.read"]}>
                    <LearningCms />
                  </ProtectedRoute>
                }
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
      </AntApp>
    </ConfigProvider>
  );
}
