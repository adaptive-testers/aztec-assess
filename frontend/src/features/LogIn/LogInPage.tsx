import { useMsal } from "@azure/msal-react";
import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { useState } from "react";
import { useForm, type SubmitHandler, useWatch } from "react-hook-form";
import { IoEyeOffOutline, IoEyeOutline } from "react-icons/io5";
import { MdOutlineMailOutline } from "react-icons/md";
import { TbLockPassword } from "react-icons/tb";
import { Link, useNavigate } from "react-router-dom";

import { publicApi } from "../../api/axios";
import { AUTH } from "../../api/endpoints";
import googleLogo from "../../assets/googleLogo.png";
import microsoftLogo from "../../assets/microsoftLogo.png";
import { useAuth } from "../../context/AuthContext";

const OAUTH_ERRORS = {
  accountNotFound: "Account not found. Please create an account first.",
  signInFailed: "Sign-in failed. Please try again.",
  cancelled: "Sign-in was cancelled.",
} as const;

function getOAuthErrorMessage(
  backendDetail: string | undefined,
  rawError: unknown,
  isMicrosoft: boolean
): string | null {
  if (backendDetail?.includes("Role is required")) return OAUTH_ERRORS.accountNotFound;
  if (isMicrosoft && rawError) {
    const s = [
      String(rawError),
      rawError instanceof Error ? rawError.message : "",
      (rawError as { errorCode?: string })?.errorCode ?? "",
      (rawError as { name?: string })?.name ?? "",
    ].join(" ").toLowerCase();
    if (s.includes("cancelled")) return null;
  }
  return OAUTH_ERRORS.signInFailed;
}

interface FormFields {
  userEmail: string;
  userPassword: string;
  keepSignedIn: boolean;
}

export default function LogInContainer() {
  const [showPassword, setShowPassword] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);
  const { setAccessToken } = useAuth();
  const navigate = useNavigate();
  const { instance } = useMsal();

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormFields>({
    defaultValues: { userEmail: "", userPassword: "", keepSignedIn: false },
  });

  const keepSignedIn = useWatch({ control, name: "keepSignedIn" }) ?? false;

  const loginWithGoogleCode = useGoogleLogin({
    flow: "auth-code",
    onSuccess: async ({ code }) => {
      setIsOAuthLoading(true);
      try {
        const res = await publicApi.post(AUTH.OAUTH_GOOGLE, {
          code,
          // No role needed for login - user already exists
        });

        if (res.data?.tokens?.access) {
          setAccessToken(res.data.tokens.access);
          navigate("/profile");
        } else {
          setError("root", { message: OAUTH_ERRORS.signInFailed });
        }
      } catch (e) {
        const detail = axios.isAxiosError(e) ? e.response?.data?.detail || e.response?.data?.message : undefined;
        const message = getOAuthErrorMessage(detail, e, false);
        if (message) setError("root", { message });
      } finally {
        setIsOAuthLoading(false);
      }
    },
    onError: () => {
      setError("root", { message: OAUTH_ERRORS.cancelled });
    },
  });

  const loginWithMicrosoft = async () => {
    try {
      const response = await instance.loginPopup({
        scopes: ["openid", "profile", "email", "User.Read"],
        overrideInteractionInProgress: true,
      });
      const accessToken = response.accessToken;

      if (!accessToken) {
        setError("root", { message: OAUTH_ERRORS.signInFailed });
        return;
      }

      setIsOAuthLoading(true);
      try {
        const res = await publicApi.post(AUTH.OAUTH_MICROSOFT, {
          access_token: accessToken,
        });

        if (res.data?.tokens?.access) {
          setAccessToken(res.data.tokens.access);
          navigate("/profile");
        } else {
          const detail = res.data?.detail || res.data?.message;
          setError("root", {
            message: getOAuthErrorMessage(detail, null, false) ?? OAUTH_ERRORS.signInFailed,
          });
        }
      } finally {
        setIsOAuthLoading(false);
      }
    } catch (e) {
      const detail = axios.isAxiosError(e) ? e.response?.data?.detail || e.response?.data?.message : undefined;
      const message = getOAuthErrorMessage(detail, e, true);
      if (message) {
        setError("root", { message });
      }
    }
  };

  const onSubmit: SubmitHandler<FormFields> = async (data) => {
    try {
      const { data: res } = await publicApi.post(AUTH.LOGIN, {
        email: data.userEmail,
        password: data.userPassword,
        // TODO: Enable keepSignedIn once backend support is available
      });

      if (res?.tokens?.access) setAccessToken(res.tokens.access);
      navigate("/profile");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Extract error message from backend response
        const backendMessage =
          error.response?.data?.detail || error.response?.data?.message;
        setError("root", {
          message: backendMessage || "Invalid email or password",
        });
      } else {
        setError("root", { message: "An unexpected error occurred" });
      }
    }
  };

  return (
    <div className="Log-In relative w-full max-w-[1280px] bg-[#000000] flex items-center justify-center px-4 min-h-dvh">
      {isOAuthLoading && (
        <div
          className="fixed inset-0 z-20 flex h-screen w-full items-center justify-center bg-[#0A0A0A]"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="relative h-12 w-12" aria-hidden>
              <div className="absolute inset-0 rounded-full border-4 border-[#2A2A2A]" />
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-[#EF6262]" />
            </div>
            <div className="text-sm text-[#8E8E8E]">Signing you in…</div>
          </div>
        </div>
      )}
      <div className="Sign-Up-Box flex flex-col justify-center items-center p-4 sm:p-6 md:p-[40px] gap-2 sm:gap-[10px] w-full max-w-[482px] bg-[#0A0A0A] border border-[#282828] rounded-[15px] transition-all duration-300 ease-out">
        <div className="Frame-25 flex flex-col items-start gap-3 sm:gap-4 md:gap-[40px] w-full max-w-[402px]">
          <div className="Frame-19 flex flex-col items-center w-full max-w-[402px]">
            <h1 className="Log-In w-[120px] h-[31px] mb-[32px] flex items-center justify-center font-geist font-medium text-[32px] leading-[42px] text-center tracking-[0.5px] text-[#ffffff]">
              Log In
            </h1>

            {/* Error message banner */}
            {errors.root && (
              <div
                className="w-[402px] px-4 py-2 mb-[24px] bg-[#2A1414] border border-[#EF6262] rounded-[8px] text-[#EF6262] text-sm text-center"
                role="alert"
                aria-live="polite"
                aria-atomic="true"
              >
                {errors.root.message}
              </div>
            )}

            <form
              className="Frame-18 flex flex-col items-start gap-4 sm:gap-6 md:gap-[32px] w-full max-w-[402px]"
              onSubmit={handleSubmit(onSubmit)}
              noValidate
            >
              <div className="Frame-17 flex flex-col items-start gap-3 sm:gap-4 md:gap-[24px] w-full">
                {/* Email */}
                <div className="Frame-13 flex flex-col items-start gap-2 sm:gap-[8px] w-full">
                  <div className="flex justify-between items-center w-full">
                    <label
                      htmlFor="email-input"
                      className="Email font-geist font-normal text-[14px] leading-[16px] flex items-center tracking-[0.5px] text-[#8E8E8E]"
                    >
                      Email
                    </label>
                    {errors.userEmail && (
                      <div className="text-[#EF6262] text-[12px] font-geist h-[16px]">
                        {errors.userEmail.message}
                      </div>
                    )}
                  </div>
                  <div className="Frame-10 flex flex-row items-center gap-3 sm:gap-[12px] w-full h-[40px] px-3 sm:px-[14px] py-[11px] bg-[#0A0A0A] border border-[#282828] shadow-[0_4px_4px_#00000040] rounded-[8px] focus-within:border-primary-accent">
                    <input
                      id="email-input"
                      type="email"
                      className="peer bg-transparent flex-1 text-white text-[14px] outline-none focus:border-primary-accent focus:outline-none"
                      {...register("userEmail", {
                        required: "Email is required",
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: "Enter a valid email address",
                        },
                      })}
                    />
                    <MdOutlineMailOutline className="order-first scale-170 w-[10px] h-[12px] mx-auto text-[#8e8e8e] peer-focus:text-white text-sm pointer-events-none" />
                  </div>
                </div>

                {/* Password */}
                <div className="Frame-14 flex flex-col items-start gap-2 sm:gap-[8px] w-full">
                  <div className="flex justify-between items-center w-full">
                    <label
                      htmlFor="password-input"
                      className="Password font-geist font-normal text-[14px] leading-[16px] flex items-center tracking-[0.5px] text-[#8E8E8E]"
                    >
                      Password
                    </label>
                    {errors.userPassword && (
                      <span className="text-[#EF6262] text-[12px] font-geist h-[16px]">
                        {errors.userPassword.message}
                      </span>
                    )}
                  </div>
                  <div className="Frame-10 flex flex-row items-center gap-3 sm:gap-[12px] w-full h-[40px] px-3 sm:px-[14px] py-[11px] bg-[#0A0A0A] border border-[#282828] shadow-[0_4px_4px_#00000040] rounded-[8px] focus-within:border-primary-accent">
                    <input
                      id="password-input"
                      type={showPassword ? "text" : "password"}
                      className="peer bg-transparent flex-1 text-white text-[14px] outline-none focus:border-primary-accent focus:outline-none"
                      {...register("userPassword", {
                        required: "Password is required",
                      })}
                    />
                    <TbLockPassword className="flex order-first justify-center scale-170 w-[11px] h-[12px] gap-[10px] mx-auto text-[#8e8e8e] peer-focus:text-white text-sm pointer-events-none" />
                    <button
                      type="button"
                      aria-controls="password-input"
                      aria-label={
                        showPassword ? "Hide password" : "Show characters"
                      }
                      onClick={() => setShowPassword((v) => !v)}
                      className="w-[16px] h-[13px] mx-auto scale-125 text-[#8e8e8e] text-sm cursor-pointer hover:text-white transition-colors duration-300 bg-transparent border-none p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ae3a3a] rounded"
                    >
                      {showPassword ? (
                        <IoEyeOutline aria-hidden="true" focusable="false" />
                      ) : (
                        <IoEyeOffOutline aria-hidden="true" focusable="false" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Keep me signed in */}
                <input
                  type="checkbox"
                  {...register("keepSignedIn")}
                  className="hidden"
                  aria-hidden="true"
                  tabIndex={-1}
                />
                <div className="Frame-39 flex items-center gap-[8px] w-[140px] h-[16px] text-[#8E8E8E] transition duration-300 ease-in-out hover:scale-101 hover:text-white cursor-pointer">
                  <button
                    type="button"
                    aria-pressed={keepSignedIn}
                    aria-label="Keep me signed in"
                    onClick={() =>
                      setValue("keepSignedIn", !keepSignedIn, {
                        shouldDirty: true,
                      })
                    }
                    className={`flex items-center gap-[10px] w-[14px] h-[14px] p-[3px] rounded-[4px] border border-[#282828] ${
                      keepSignedIn ? "bg-[#EF6262]" : "bg-[#0A0A0A]"
                    }`}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setValue("keepSignedIn", !keepSignedIn, {
                        shouldDirty: true,
                      })
                    }
                    className="Forgot-pass w-[120px] h-[16px] font-geist font-normal text-[12px] leading-[16px] flex items-center tracking-[0.5px] bg-transparent border-none cursor-pointer"
                  >
                    Keep me signed in
                  </button>
                </div>
              </div>

              {/* Login */}
              <button
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
                aria-disabled={isSubmitting}
                className="flex justify-center items-center w-full max-w-[402px] h-[40px] gap-2 bg-[#EF6262] rounded-[8px] hover:border hover:border-white hover:scale-101 duration-300 font-geist text-[14px] tracking-[0.5px] text-white cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Logging in..." : "Log In"}
              </button>
            </form>
          </div>

          <div className="Frame-26 flex justify-center items-center gap-[10px] w-full max-w-[402px] h-[16px]">
            <div className="Rectangle-2 w-[182px] h-px bg-[#232323] grow"></div>
            <p className="OR w-[18px] h-[16px] font-geist font-semibold text-[12px] leading-[16px] flex items-center text-center tracking-[0.5px] text-[#8E8E8E]">
              OR
            </p>
            <div className="Rectangle-1 w-[182px] h-px bg-[#232323] grow"></div>
          </div>

          <div className="Frame-24 flex flex-col items-center gap-6 sm:gap-[40px] w-full max-w-[402px]">
            <div className="Frame-27 flex justify-between items-center gap-4 sm:gap-[24px] w-full max-w-[402px] h-[40px]">
              <button
                type="button"
                onClick={() => loginWithGoogleCode()}
                aria-label="Sign in with Google"
                className="Frame-20 flex justify-center items-center gap-[10px] w-[192px] h-[40px] px-[14px] mx-auto border border-[#242424] rounded-[8px] hover:border-white hover:scale-102 duration-600 cursor-pointer"
              >
                <img
                  src={googleLogo}
                  alt="Google logo"
                  className="h-5 w-5 object-contain"
                />
              </button>
              <button
                type="button"
                onClick={() => loginWithMicrosoft()}
                aria-label="Sign in with Microsoft"
                className="Frame-24 flex justify-center items-center gap-[10px] w-[192px] h-[40px] px-[14px] mx-auto border border-[#242424] rounded-[8px] hover:border-white hover:scale-102 duration-600 cursor-pointer"
              >
                <img
                  src={microsoftLogo}
                  alt="Microsoft logo"
                  className="h-4 w-4 object-contain"
                />
              </button>
            </div>
          </div>

          <div className="Frame-7 flex flex-col justify-center items-center gap-4 sm:gap-[21px] w-full max-w-[402px]">
            <p className="font-geist font-normal text-[14px] leading-[16px] flex items-center tracking-[0.5px]">
              <a
                href="/forgot-password"
                className="text-[#EF6262] no-underline hover:underline cursor-pointer"
              >
                Can&#39;t log in?
              </a>
              <span className="mx-1 text-[#ededed]">•</span>
              <Link
                to="/role-select"
                className="text-[#EF6262] no-underline hover:underline cursor-pointer"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
