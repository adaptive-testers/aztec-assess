import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import LogInPage from "./features/LogIn/LogInPage";
import SignUpPage from "./features/SignUp/SignUpPage";
import RoleSelectionPage from "./features/SignUp/RoleSelectionPage";
// ...existing code...
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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