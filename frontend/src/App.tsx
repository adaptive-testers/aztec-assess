import { BrowserRouter, Routes, Route } from "react-router-dom";

import { useAuthInterceptors } from "./api/useAuthInterceptors";
import { AuthProvider } from "./context/AuthContext";
import LogInPage from "./features/LogIn/LogInPage";
import ProfilePage from "./features/Profile/ProfilePage";
import SignUpPage from "./features/SignUp/SignUpPage";

function AuthInterceptorsInitializer() {
  useAuthInterceptors();
  return null;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthInterceptorsInitializer />
        <div className="bg-black min-h-screen flex flex-col items-center justify-center gap-10">
          <Routes>
-            <Route path="/" element={<LogInPage />} />
+            <Route path="/role-select" element={<RoleSelectionPage />} />
             <Route path="/sign-up" element={<SignUpPage />} />
             <Route path="/login" element={<LogInPage />} />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
// ...existing code...
export default App;