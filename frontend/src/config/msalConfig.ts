import type { Configuration } from "@azure/msal-browser";
import { PublicClientApplication } from "@azure/msal-browser";

export const msalConfig: Configuration = {
    auth: {
        clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${import.meta.env.VITE_MICROSOFT_TENANT_ID}`,
        redirectUri: `${window.location.origin}/auth-callback.html`,
    },
    cache: {
        cacheLocation: "sessionStorage",
    },
};

export const msalInstance = new PublicClientApplication(msalConfig);