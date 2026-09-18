import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { App as AntApp, ConfigProvider } from "antd";
import Layout from "./components/Layout";
import ExamLayout from "./pages/coursePage/ExamLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import ScrollToTop from "./components/ScrollToTop";
import useDarkMode from "./hooks/useDarkMode";

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
const AdminAboutUs = lazy(() => import("./pages/profilePage/admin/AdminAboutUs"));
const AdminHomepageCms = lazy(() => import("./pages/profilePage/admin/AdminHomepageCms"));
const TeacherAssignments = lazy(() => import("./pages/profilePage/teacher/TeacherAssignments"));
const StudentMyExams = lazy(() => import("./pages/profilePage/student/StudentMyExams"));
const Leaderboard = lazy(() => import("./pages/profilePage/Leaderboard"));

export default function App() {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
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
          <div className="flex justify-center items-center h-screen">
            Loading...
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/home" replace />} />
            <Route path="home" element={<Home />} />
            <Route
              path="courses"
              element={
                <ProtectedRoute>
                  <Courses />
                </ProtectedRoute>
              }
            />
            <Route
              path="courses/published-curriculums"
              element={
                <ProtectedRoute>
                  <PublishedCurriculums />
                </ProtectedRoute>
              }
            />
            <Route
              path="courses/published-curriculums/:curriculumId"
              element={
                <ProtectedRoute>
                  <CurriculumExams />
                </ProtectedRoute>
              }
            />
            <Route
              path="courses/:courseId"
              element={
                <ProtectedRoute>
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
              <Route path="ranking/*" element={<Leaderboard />} />
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
              <Route index element={<Navigate to="/student/profile" replace />} />
              <Route path="profile" element={<UserProfile />} />
              <Route path="my-exams" element={<StudentMyExams />} />
              <Route path="ranking/*" element={<Leaderboard />} />
            </Route>
          </Route>

          <Route path="/exam/:examId" element={<ExamLayout />}>
            <Route
              index
              element={
                <ProtectedRoute>
                  <ExamPage
                    isDarkMode={isDarkMode}
                    toggleDarkMode={toggleDarkMode}
                  />
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
