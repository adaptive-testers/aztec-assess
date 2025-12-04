import { Routes, Route } from "react-router-dom";

import { useAuthInterceptors } from "./api/useAuthInterceptors";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import JoinCoursePage from "./features/Course/JoinCoursePage";
import CourseCreationPage from "./features/CourseCreation/CourseCreationPage";
import DashboardLayout from "./features/Dashboard/DashBoardLayout";
import LogInPage from "./features/LogIn/LogInPage";
import ProfilePage from "./features/Profile/ProfilePage";
import RoleSelectionPage from "./features/SignUp/RoleSelectionPage";
import SignUpPage from "./features/SignUp/SignUpPage";

function AuthInterceptorsInitializer() {
  useAuthInterceptors();
  return null;
}

function App() {
  return (
    <>
      <AuthInterceptorsInitializer />
      <Routes>
        <Route
          path="/"
          element={
            <PublicRoute>
              <div className="h-screen bg-black flex items-center justify-center overflow-hidden">
                <LogInPage />
              </div>
            </PublicRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <div className="h-screen bg-black flex items-center justify-center overflow-hidden">
                <LogInPage />
              </div>
            </PublicRoute>
          }
        />
        <Route
          path="/sign-up"
          element={
            <PublicRoute>
              <div className="h-screen bg-black flex items-center justify-center overflow-hidden">
                <SignUpPage />
              </div>
            </PublicRoute>
          }
        />
        <Route
          path="/role-select"
          element={
            <PublicRoute>
              <div className="h-screen bg-black flex items-center justify-center overflow-hidden">
                <RoleSelectionPage />
              </div>
            </PublicRoute>
          }
        />
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<div className="text-primary-text">Dashboard</div>} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/courses/create" element={<CourseCreationPage />} />
          <Route path="/join-course" element={<JoinCoursePage />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
