import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
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

export default function App() {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  return (
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
            <Route index element={<Home />} />
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
            <Route
              path="profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
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
  );
}
