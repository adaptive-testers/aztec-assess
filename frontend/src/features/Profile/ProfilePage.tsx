import axios from "axios";
import { useState, useEffect } from "react";

import { privateApi } from "../../api/axios";
import { AUTH } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";

interface User {
  firstName: string;
  lastName: string;
  id: string;
  email: string;
}

export default function ProfileSection() {
  const { accessToken, setAccessToken } = useAuth();

  const [edit, setEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profileError, setProfileError] = useState<string | null>(null);

  const [userData, setUserData] = useState({
    firstName: "",
    lastName: "",
    id: "",
    email: "",
  });

  const [originalUserData, setOriginalUserData] = useState({
    firstName: "",
    lastName: "",
    id: "",
    email: "",
  });

  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
  }>({});

  // Fetch profile data from backend

  useEffect(() => {
    if (!accessToken) return;
    let mounted = true;
    async function fetchUser() {
      try {
        const res = await privateApi.get(AUTH.PROFILE);
        if (!mounted) return;

        setUserData(res.data);
        setOriginalUserData(res.data);
      } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          setAccessToken(null);
          setProfileError("Session expired. Please log in again.");
        } else {
          setProfileError("Failed to load profile.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchUser();
    return () => {
      mounted = false;
    };
  }, [accessToken, setAccessToken]);

  // Handle input change (live updates while editing)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle save click (send to backend)

  const handleSave = async () => {
    const newErrors: { firstName?: string; lastName?: string } = {};
    if (!userData.firstName.trim())
      newErrors.firstName = "First name is required.";
    if (!userData.lastName.trim())
      newErrors.lastName = "Last name is required.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setSaving(true);

    try {
      const res = await privateApi.put("AUTH.PROFILE", userData);
      const saved: User = res.data;

      setUserData(saved);
      setOriginalUserData(saved);
      setEdit(false);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setAccessToken(null);
        setProfileError("Session expired. Please log in again.");
      } else {
        setProfileError("Failed to save profile.");
      }
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel (restore original data)

  const handleCancel = () => {
    setUserData({ ...originalUserData });
    setErrors({});
    setEdit(false);
  };

  // Render states

  const isLoading = !accessToken || loading;

  if (isLoading) return <p className="text-white p-6">Loading…</p>;

  if (profileError) return <p className="text-red-500 p-6">{profileError}</p>;

  return (
    <section className="flex flex-col items-start w-[887px] h-[771px] p-[26px] bg-[#0A0A0A] text-[#F1F5F9]">
      <div className="flex flex-col items-start w-[835px] h-[590px] gap-[26px]">
        <div className="flex flex-col items-start w-[835px] h-[70px] gap-[4px] relative">
          <div className="h-[39px] w-[835px] relative">
            <h1 className="absolute left-0 top-0 font-medium text-[26px] leading-[39px] tracking-[0px]">
              Profile
            </h1>
          </div>
          <div className="h-[26px] w-[835px] relative">
            <p className="absolute left-0 top-0 text-[17px] leading-[26px] tracking-[0px] text-[#A1A1AA]">
              Manage your personal information
            </p>
          </div>
        </div>

        <div className="relative w-[835px] h-[623px] bg-[#1A1A1A] border border-[#404040] rounded-[13px]">
          <div className="absolute left-[27px] top-[27px] w-[780px] h-[35px] flex items-start justify-between">
            <h2 className="text-[17px] leading-[17px] tracking-[0px]">
              Personal Information
            </h2>

            {/* Button container */}
            <div className="flex items-center gap-[10px]">
              {edit && (
                <button
                  className="h-[35px] px-[13px] rounded-[7px] text-[15px] text-white bg-[#404040] hover:bg-[#525252] transition"
                  onClick={() => handleCancel()}
                >
                  Cancel
                </button>
              )}
              <button
                className={`h-[35px] px-[13px] rounded-[7px] w-[75px] text-[15px] text-white bg-[#F87171] transition-all duration-200 ${
                  edit
                    ? "ring-2 ring-[#FCA5A5] ring-offset-2 ring-offset-[#0F0F0F] shadow-lg shadow-[#F87171]/40 scale-105"
                    : "hover:ring-2 hover:ring-[#FCA5A5] hover:ring-offset-2 hover:ring-offset-[#0F0F0F] hover:shadow-lg hover:shadow-[#F87171]/30 hover:scale-105"
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
          <div className="absolute left-[1px] top-[95px] w-[832px] h-[400px] px-[26px] flex flex-col gap-[26px]">
            <div className="w-[780px] h-[167px] border-b border-[#404040] relative">
              <div className="absolute left-[320px] top-0 w-[140px] h-[140px] flex">
                <div className="flex items-center justify-center w-[140px] h-[140px] bg-[#262626] rounded-full">
                  {/* avatar initials */}
                  <span className="text-[26px] leading-[35px]">
                    {`${userData.firstName?.[0] || ""}${
                      userData.lastName?.[0] || ""
                    }`.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            <div className="w-[780px] h-[179px] relative">
              {/* First Name */}
              <div className="absolute left-0 top-0 w-[377px] h-[76px] flex flex-col gap-[9px]">
                <div className="flex justify-between">
                  <label
                    htmlFor="firstName"
                    className="text-[15px] leading-[15px]"
                  >
                    First Name
                  </label>
                  {errors.firstName && (
                    <p className="text-[#EF6262] text-[15px] leading-[15px]">
                      {errors.firstName}
                    </p>
                  )}
                </div>
                <div
                  className={`h-[52px] w-[377px] rounded-[7px] pl-[13px] flex items-center transition-all duration-200 bg-[#262626] ${
                    edit
                      ? "border border-dashed border-[#F87171] focus-within:border-2 focus-within:border-[#F87171]"
                      : "border border-transparent"
                  }`}
                >
                  {edit ? (
                    <input
                      name="firstName"
                      type="text"
                      value={userData.firstName}
                      onChange={handleChange}
                      className="bg-transparent text-[17px] text-white outline-none w-full"
                    />
                  ) : (
                    <span className="text-[17px] leading-[26px] text-[#F1F5F9]">
                      {userData.firstName}
                    </span>
                  )}
                </div>
              </div>

              {/* Last Name */}
              <div className="absolute left-[403px] top-0 w-[377px] h-[76px] flex flex-col gap-[9px]">
                <div className="flex justify-between">
                  <label
                    htmlFor="lastName"
                    className="text-[15px] leading-[15px]"
                  >
                    Last Name
                  </label>
                  {errors.lastName && (
                    <p className="text-[#EF6262] text-[15px] leading-[15px]">
                      {errors.lastName}
                    </p>
                  )}
                </div>
                <div
                  className={`h-[52px] w-[377px] rounded-[7px] pl-[13px] flex items-center transition-all duration-200 bg-[#262626] ${
                    edit
                      ? "border border-dashed border-[#F87171] focus-within:border-2 focus-within:border-[#F87171]"
                      : "border border-transparent"
                  }`}
                >
                  {edit ? (
                    <input
                      name="lastName"
                      type="text"
                      value={userData.lastName}
                      onChange={handleChange}
                      className="bg-transparent text-[17px] text-white outline-none w-full"
                    />
                  ) : (
                    <span className="text-[17px] text-[#F1F5F9]">
                      {userData.lastName}
                    </span>
                  )}
                </div>
              </div>

              {/* ID */}
              <div className="absolute left-0 top-[103px] w-[377px] h-[76px] flex flex-col gap-[9px]">
                <div className="h-[15px] flex items-center gap-[9px] text-[15px] leading-[15px] tracking-[0px]">
                  ID
                </div>
                <div className="h-[52px] w-[377px] bg-[#262626] rounded-[7px] pl-[13px] flex items-center gap-[13px]">
                  <span className="text-[17px] leading-[26px] tracking-[0px] text-[#F1F5F9]">
                    {userData.id || "Loading..."}
                  </span>
                </div>
              </div>

              {/* Email */}
              <div className="absolute left-[403px] top-[103px] w-[377px] h-[76px] flex flex-col gap-[9px]">
                <div className="h-[15px] flex items-center gap-[9px] text-[15px] leading-[15px] tracking-[0px]">
                  Email
                </div>
                <div className="h-[52px] w-[377px] bg-[#262626] rounded-[7px] pl-[13px] flex items-center gap-[13px]">
                  <span className="text-[17px] leading-[26px] tracking-[0px] text-[#F1F5F9] capitalize">
                    {userData.email || "Loading..."}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
