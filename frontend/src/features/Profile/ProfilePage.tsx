import axios from "axios";
import { useState, useEffect } from "react";

import { privateApi } from "../../api/axios";
import { AUTH } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";

interface User {
  first_name: string;
  last_name: string;
  id: string;
  email: string;
}

export default function ProfilePage() {
  const { accessToken, setAccessToken, checkingRefresh } = useAuth();
  const [edit, setEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState({
    first_name: "",
    last_name: "",
    id: "",
    email: "",
  });
  const [originalUserData, setOriginalUserData] = useState({
    first_name: "",
    last_name: "",
    id: "",
    email: "",
  });

  const [errors, setErrors] = useState<{
    first_name?: string;
    last_name?: string;
  }>({});

  useEffect(() => {
    if (checkingRefresh) {
      setLoading(true);
      setError(null);
      return;
    }

    if (!accessToken) {
      setLoading(false);
      return;
    }

    let mounted = true;
    setError(null);
    setLoading(true);

    const fetchUser = async () => {
      if (!mounted) return;

      try {
        const res = await privateApi.get(AUTH.PROFILE);
        if (!mounted) return;

        if (!res.data || typeof res.data !== "object") {
          throw new Error("Invalid response format");
        }

        const profileData = {
          first_name: res.data.first_name || "",
          last_name: res.data.last_name || "",
          id: res.data.id ? String(res.data.id) : "",
          email: res.data.email || "",
        };

        setUserData(profileData);
        setOriginalUserData(profileData);
        setError(null);
      } catch (err: unknown) {
        if (!mounted) return;
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          setAccessToken(null);
          setError("Session expired. Please log in again.");
        } else {
          setError("Failed to load profile. Please try again.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchUser();
    return () => {
      mounted = false;
    };
  }, [accessToken, checkingRefresh, setAccessToken]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    const newErrors: { first_name?: string; last_name?: string } = {};
    if (!userData.first_name.trim())
      newErrors.first_name = "First name is required.";
    if (!userData.last_name.trim())
      newErrors.last_name = "Last name is required.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setSaving(true);

    try {
      const res = await privateApi.patch(AUTH.PROFILE, userData);
      const saved: User = res.data;

      setUserData(saved);
      setOriginalUserData(saved);
      setEdit(false);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setAccessToken(null);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setUserData({ ...originalUserData });
    setErrors({});
    setEdit(false);
  };

  if (error && !loading && !checkingRefresh) {
    return (
      <section className="flex w-full justify-center bg-[#0A0A0A] text-[#F1F5F9] px-4 py-6 md:py-10">
        <div className="flex w-full max-w-[887px] flex-col gap-[26px]">
          <div className="rounded-[13px] border border-red-500/50 bg-red-900/20 p-6">
            <h2 className="text-lg font-medium text-red-400 mb-2">Error</h2>
            <p className="text-red-300">{error}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex w-full justify-center bg-[#0A0A0A] text-[#F1F5F9] px-4 py-4 md:py-6">
      <div className="flex w-full max-w-[887px] flex-col gap-4 md:gap-[26px]">
        {/* Page header */}
        <div className="flex flex-col items-start gap-[4px]">
          <h1 className="font-medium text-[26px] leading-[39px] tracking-[0px]">
            Profile
          </h1>
          <p className="text-[17px] leading-[26px] tracking-[0px] text-[#A1A1AA]">
            Manage your personal information
          </p>
        </div>

        {/* Card */}
        <div className="w-full rounded-[13px] border border-[#404040] bg-[#1A1A1A] shadow-[0_4px_6px_rgba(0,0,0,0.25)]">
          {/* Card header */}
          <div className="flex flex-wrap items-center justify-between gap-[10px] border-b border-[#404040] px-[26px] py-4 md:py-[22px]">
            <h2 className="text-[17px] leading-[17px] tracking-[0px]">
              Personal Information
            </h2>

            <div className="flex items-center gap-[10px]">
              {edit && (
                <button
                  className="h-[35px] px-[13px] rounded-[7px] text-[15px] text-white bg-[#404040] hover:bg-[#525252] transition"
                  onClick={handleCancel}
                  type="button"
                >
                  Cancel
                </button>
              )}
              <button
                className={`h-[35px] px-[13px] rounded-[7px] min-w-[75px] text-[15px] text-white bg-[#F87171] transition-all duration-200 ${
                  edit
                    ? "ring-2 ring-[#FCA5A5] ring-offset-2 ring-offset-[#0F0F0F] scale-105"
                    : "hover:ring-2 hover:ring-[#FCA5A5] hover:ring-offset-2 hover:ring-offset-[#0F0F0F] hover:scale-105"
                }`}
                onClick={edit ? handleSave : () => setEdit(true)}
                type="submit"
                disabled={saving}
                aria-busy={saving}
              >
                {edit ? (saving ? "Saving..." : "Save") : "Edit"}
              </button>
            </div>
          </div>

          {/* Card content */}
          <div className="flex flex-col gap-4 md:gap-[26px] px-[26px] py-4 md:py-[26px]">
            {/* Avatar */}
            <div className="flex w-full justify-center border-b border-[#404040] pb-4 md:pb-[26px]">
              <div className="flex h-[120px] w-[120px] md:h-[140px] md:w-[140px] items-center justify-center rounded-full bg-[#262626]">
                <span className="text-[22px] md:text-[26px] leading-[35px]">
                  {`${userData.first_name?.[0] || ""}${
                    userData.last_name?.[0] || ""
                  }`.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:gap-[26px] md:grid-cols-2">
              {/* First Name */}
              <div className="flex flex-col gap-[9px]">
                <div className="flex justify-between">
                  <label
                    htmlFor="first_name"
                    className="text-[15px] leading-[15px]"
                  >
                    First Name
                  </label>
                  {errors.first_name && (
                    <p className="text-[15px] leading-[15px] text-[#EF6262]">
                      {errors.first_name}
                    </p>
                  )}
                </div>
                {loading ? (
                  <div className="skeleton-shimmer h-[52px] w-full rounded-[7px] bg-[#2A2A2A] pl-[13px] flex items-center" />
                ) : (
                  <div
                    className={`flex h-[52px] w-full items-center rounded-[7px] bg-[#262626] pl-[13px] transition-all duration-200 ${
                      edit
                        ? "border border-dashed border-[#F87171] focus-within:border-2 focus-within:border-[#F87171]"
                        : "border border-transparent"
                    }`}
                  >
                    {edit ? (
                      <input
                        id="first_name"
                        name="first_name"
                        type="text"
                        value={userData.first_name}
                        onChange={handleChange}
                        className="w-full bg-transparent text-[17px] text-white outline-none"
                      />
                    ) : (
                      <span className="text-[17px] leading-[26px] text-[#F1F5F9]">
                        {userData.first_name}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Last Name */}
              <div className="flex flex-col gap-[9px]">
                <div className="flex justify-between">
                  <label
                    htmlFor="last_name"
                    className="text-[15px] leading-[15px]"
                  >
                    Last Name
                  </label>
                  {errors.last_name && (
                    <p className="text-[15px] leading-[15px] text-[#EF6262]">
                      {errors.last_name}
                    </p>
                  )}
                </div>
                {loading ? (
                  <div className="skeleton-shimmer h-[52px] w-full rounded-[7px] bg-[#2A2A2A] pl-[13px] flex items-center" />
                ) : (
                  <div
                    className={`flex h-[52px] w-full items-center rounded-[7px] bg-[#262626] pl-[13px] transition-all duration-200 ${
                      edit
                        ? "border border-dashed border-[#F87171] focus-within:border-2 focus-within:border-[#F87171]"
                        : "border border-transparent"
                    }`}
                  >
                    {edit ? (
                      <input
                        id="last_name"
                        name="last_name"
                        type="text"
                        value={userData.last_name}
                        onChange={handleChange}
                        className="w-full bg-transparent text-[17px] text-white outline-none"
                      />
                    ) : (
                      <span className="text-[17px] text-[#F1F5F9]">
                        {userData.last_name}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* ID */}
              <div className="flex flex-col gap-[9px]">
                <div className="h-[15px] text-[15px] leading-[15px] tracking-[0px]">
                  ID
                </div>
                {loading ? (
                  <div className="skeleton-shimmer h-[52px] w-full rounded-[7px] bg-[#2A2A2A]" />
                ) : (
                  <div className="flex h-[52px] w-full items-center gap-[13px] rounded-[7px] bg-[#262626] pl-[13px]">
                    <span className="text-[17px] leading-[26px] tracking-[0px] text-[#F1F5F9]">
                      {userData.id || "—"}
                    </span>
                  </div>
                )}
              </div>

              {/* Email */}
              <div className="flex flex-col gap-[9px]">
                <div className="h-[15px] text-[15px] leading-[15px] tracking-[0px]">
                  Email
                </div>
                {loading ? (
                  <div className="skeleton-shimmer h-[52px] w-full rounded-[7px] bg-[#2A2A2A]" />
                ) : (
                  <div className="flex h-[52px] w-full items-center gap-[13px] rounded-[7px] bg-[#262626] pl-[13px]">
                    <span className="text-[17px] leading-[26px] tracking-[0px] text-[#F1F5F9]">
                      {userData.email || "—"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
