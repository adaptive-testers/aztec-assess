import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';

import { useAuthInterceptors } from "./api/useAuthInterceptors";
import { AuthProvider } from "./context/AuthContext";
import LogInPage from "./features/LogIn/LogInPage";
import ProfilePage from "./features/Profile/ProfilePage";
import RoleSelectionPage from "./features/SignUp/RoleSelectionPage";
import SignUpPage from "./features/SignUp/SignUpPage";
import StudentDashBoardPage from "./features/Dashboard/StudentDashboardPage";


function AuthInterceptorsInitializer() {
  useAuthInterceptors();
  return null;
}

function App() {
  return (
    <MantineProvider>
    <BrowserRouter>
      <AuthProvider>
        <AuthInterceptorsInitializer />
        <div className="bg-black min-h-screen flex flex-col items-center justify-center gap-10">
          <Routes>
            <Route path="/role-select" element={<RoleSelectionPage />} />
            <Route path="/sign-up" element={<SignUpPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/student-dashboard" element={<StudentDashBoardPage />} />
            <Route path="/" element={<LogInPage />} />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
    </MantineProvider>
  );
}

export default App;
