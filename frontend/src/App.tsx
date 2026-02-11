import { Routes, Route } from "react-router-dom";

import { useAuthInterceptors } from "./api/useAuthInterceptors";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import CourseDetailPage from "./features/Course/CourseDetailPage";
import JoinCoursePage from "./features/Course/JoinCoursePage";
import CourseCreationPage from "./features/CourseCreation/CourseCreationPage";
import DashboardLayout from "./features/Dashboard/DashBoardLayout";
import LogInPage from "./features/LogIn/LogInPage";
import ProfilePage from "./features/Profile/ProfilePage";
import RoleSelectionPage from "./features/SignUp/RoleSelectionPage";
import SignUpPage from "./features/SignUp/SignUpPage";
import StudentQuizList from "./features/StudentQuizzes/StudentQuizList";
import StudentQuizLanding from "./features/StudentQuizzes/StudentQuizLanding";
import StudentQuizResults from "./features/StudentQuizzes/StudentQuizResults";

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
          <Route path="/courses/:courseId" element={<CourseDetailPage />} />
          <Route path="/join-course" element={<JoinCoursePage />} />
        </Route>
        {/* Temporary development route - has sidebar but no auth */}
        <Route element={<DashboardLayout />}>
          <Route path="/student-quizzes" element={<StudentQuizList />} />
          <Route path="/quiz-landing/:quizId" element={<StudentQuizLanding />} />
          <Route path="/quiz-results/:attemptId" element={<StudentQuizResults />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
