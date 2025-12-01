import { Routes, Route } from "react-router-dom";

import { useAuthInterceptors } from "./api/useAuthInterceptors";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./features/Dashboard/DashBoardLayout";
import LogInPage from "./features/LogIn/LogInPage";
import ProfilePage from "./features/Profile/ProfilePage";
import RoleSelectionPage from "./features/SignUp/RoleSelectionPage";
import SignUpPage from "./features/SignUp/SignUpPage";
import CourseCreationPage from "./features/CourseCreation/CourseCreationPage";

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
            <div className="h-screen bg-black flex items-center justify-center overflow-hidden">
              <LogInPage />
            </div>
          }
        />
        <Route
          path="/login"
          element={
            <div className="h-screen bg-black flex items-center justify-center overflow-hidden">
              <LogInPage />
            </div>
          }
        />
        <Route
          path="/sign-up"
          element={
            <div className="h-screen bg-black flex items-center justify-center overflow-hidden">
              <SignUpPage />
            </div>
          }
        />
        <Route
          path="/role-select"
          element={
            <div className="h-screen bg-black flex items-center justify-center overflow-hidden">
              <RoleSelectionPage />
            </div>
          }
        />
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        <Route
          path="/create-course"
          element={
            <ProtectedRoute>
              <CourseCreationPage />
            </ProtectedRoute>
          }
        />
        </Routes>
    </>
  );
}

export default App;
