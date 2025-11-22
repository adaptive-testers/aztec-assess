import { Routes, Route } from "react-router-dom";

import { useAuthInterceptors } from "./api/useAuthInterceptors";
import { AuthProvider } from "./context/AuthContext";
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
    <AuthProvider>
      <AuthInterceptorsInitializer />
      <div className="bg-black min-h-screen flex flex-col items-center justify-center gap-10">
        <Routes>
          <Route path="/" element={<LogInPage />} />
          <Route path="/login" element={<LogInPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />
          <Route path="/role-select" element={<RoleSelectionPage />} />
          <Route element={<DashboardLayout />}>
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;
