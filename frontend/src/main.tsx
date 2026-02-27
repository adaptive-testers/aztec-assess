import { MsalProvider } from "@azure/msal-react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "./index.css";
import App from "./App.tsx";
import { msalInstance } from "./config/msalConfig.ts";
import { AuthProvider } from "./context/AuthContext.tsx";

// Initialize MSAL for popup flow
msalInstance.initialize().catch((error) => {
  console.error("MSAL initialization error:", error);
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <MsalProvider instance={msalInstance}>
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </GoogleOAuthProvider>
      </MsalProvider>
    </BrowserRouter>
  </StrictMode>
);
