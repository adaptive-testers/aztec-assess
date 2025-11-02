import { useEffect, useState } from "react";

import { privateApi } from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

interface ProfileData {
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

export default function ProfilePage() {
  const { accessToken, setAccessToken } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    
    privateApi
      .get("/auth/profile/")
      .then((res) => setProfile(res.data))
      .catch((err) => {
        if (err.response?.status === 401) {
          setAccessToken(null);
          setError("Not authenticated or token expired.");
        } else {
          setError("Failed to load profile.");
        }
      });
  }, [accessToken, setAccessToken]);

  if (!accessToken) {
    return <div className="p-6">Loading session…</div>;
  }
  
  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }
  
  if (!profile) {
    return <div className="p-6">Loading profile…</div>;
  }
  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-bold">Profile</h1>
      <pre className="bg-black text-white p-4 rounded-xl overflow-x-auto border border-gray-800">
        {JSON.stringify(profile, null, 2)}
      </pre>
    </div>
  );
}
