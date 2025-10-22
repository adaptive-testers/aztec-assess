import { Routes, Route } from "react-router-dom";

import { useAuthInterceptors } from "./api/useAuthInterceptors";
import { AuthProvider } from "./context/AuthContext";
import LogInPage from "./features/LogIn/LogInPage";
import ProfilePage from "./features/Profile/ProfilePage";
import RoleSelectionPage from "./features/SignUp/RoleSelectionPage";
import SignUpPage from "./features/SignUp/SignUpPage";

function AuthInterceptorsInitializer() {
  useAuthInterceptors();
  return null;
}
<<<<<<< HEAD
=======
=======
import { AuthProvider } from "./context/AuthContext";
import Dashboard from "./features/Dashboard/DashBoard";
import DashboardLayout from "./features/Dashboard/DashBoardLayout";
import Profile from "./features/Dashboard/Profile";
import Settings from "./features/Dashboard/Settings";
import LogInPage from "./features/LogIn/LogInPage";
import SignUpPage from "./features/SignUp/SignUpPage";
>>>>>>> 14bfadc (feat: Implement routing and login functionality with react-router-dom)
>>>>>>> 7db0cc6 (feat(Dashboard): implement dashboard layout with sidebar and routing; add profile and settings components)

function App() {
  return (
<<<<<<< HEAD
    <BrowserRouter>
      <AuthProvider>
        <AuthInterceptorsInitializer />
        <div className="bg-black min-h-screen flex flex-col items-center justify-center gap-10">
          <Routes>
            <Route path="/role-select" element={<RoleSelectionPage />} />
            <Route path="/sign-up" element={<SignUpPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/" element={<LogInPage />} />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
=======
    <AuthProvider>
      <div className="bg-black min-h-screen flex flex-col items-center justify-center gap-10">
        <Routes>
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/login" element={<LogInPage />} />

          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Profile />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </div>
    </AuthProvider>
>>>>>>> 7fe5070 (feat(Dashboard): implement dashboard layout with sidebar and routing; add profile and settings components)
  );
}

export default App;
