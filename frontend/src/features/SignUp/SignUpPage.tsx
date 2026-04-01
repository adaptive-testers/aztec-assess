import { useMsal } from "@azure/msal-react";
import { useGoogleLogin } from "@react-oauth/google";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { GoPerson } from "react-icons/go";
import { IoChevronBack, IoEyeOffOutline, IoEyeOutline } from "react-icons/io5";
import { MdOutlineMailOutline } from "react-icons/md";
import { TbLockPassword } from "react-icons/tb";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { publicApi } from "../../api/axios";
import { AUTH } from "../../api/endpoints";
import googleLogo from "../../assets/googleLogo.png";
import microsoftLogo from "../../assets/microsoftLogo.png";
import { useAuth } from "../../context/AuthContext";

interface FormFields {
  firstName: string;
  lastName: string;
  userEmail: string;
  userPassword: string;
}

const OAUTH_SIGNUP_ERROR = "Sign-up failed. Please try again.";

export default function SignUpContainer() {
    const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<FormFields>();
    const { setAccessToken } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { instance } = useMsal();

    // Role must be passed from RoleSelectionPage via location.state
    const selectedRole = (location.state as { role?: string } | null)?.role ?? null;

    const [showPassword, setShowPassword] = useState(false);
    const [isOAuthLoading, setIsOAuthLoading] = useState(false);

    useEffect(() => {
        if (!selectedRole) {
            // If arrived directly, send back to role selection
            navigate("/role-select", { replace: true });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Password validation function
    const validatePassword = (password: string) => {
        const hasNumber = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
        if (!hasNumber) return "Password must contain at least one number";
        if (!hasSpecialChar) return "Password must contain at least one special character";
        return true;
    };

  const loginWithGoogleCode = useGoogleLogin({
    flow: "auth-code",
    onSuccess: async ({ code }) => {
      if (!selectedRole) {
        navigate("/role-select", { replace: true });
        return;
      }
      setIsOAuthLoading(true);
      try {
        const res = await publicApi.post(AUTH.OAUTH_GOOGLE, {
          code,
          role: selectedRole,
        });
        if (res.data?.tokens?.access) {
          setAccessToken(res.data.tokens.access);
          navigate("/profile");
        } else {
          setError("root", { message: "Google sign-up failed" });
        }
      } catch (e) {
        console.error(e);
        setError("root", { message: "Google sign-up failed" });
      } finally {
        setIsOAuthLoading(false);
      }
    },
    onError: () => setError("root", { message: "Google sign-up cancelled or failed" }),
  });

  const loginWithMicrosoft = async () => {
    if (!selectedRole) {
      navigate("/role-select", { replace: true });
      return;
    }
    try {
      const response = await instance.loginPopup({
        scopes: ["openid", "profile", "email", "User.Read"],
        overrideInteractionInProgress: true,
      });
      const accessToken = response.accessToken;
      if (!accessToken) {
        setError("root", { message: OAUTH_SIGNUP_ERROR });
        return;
      }
      setIsOAuthLoading(true);
      try {
        const res = await publicApi.post(AUTH.OAUTH_MICROSOFT, {
          access_token: accessToken,
          role: selectedRole,
        });
        if (res.data?.tokens?.access) {
          setAccessToken(res.data.tokens.access);
          navigate("/profile");
        } else {
          setError("root", { message: OAUTH_SIGNUP_ERROR });
        }
      } finally {
        setIsOAuthLoading(false);
      }
    } catch {
      setError("root", { message: OAUTH_SIGNUP_ERROR });
    }
  };

  const onSubmit: SubmitHandler<FormFields> = async (data) => {
        try {
            if (!selectedRole) {
                // If role is missing, redirect back
                navigate("/role-select", { replace: true });
                return;
            }

            const registrationData = {
                email: data.userEmail,
                first_name: data.firstName,
                last_name: data.lastName,
                password: data.userPassword,
                role: selectedRole
            };

            const response = await publicApi.post(AUTH.REGISTER, registrationData);

            if (response.data.tokens?.access) {
                setAccessToken(response.data.tokens.access);
                navigate("/profile");
            }
        }
        catch {
            setError("root", { message: "An unexpected error occurred" });
        }
    };

    return (
        <div className="Sign-Up relative w-full max-w-[1280px] bg-[#000000] flex items-center justify-center px-4 min-h-dvh">
            <Link
                to="/"
                className="fixed left-5 top-5 z-30 inline-flex items-center gap-1 rounded-md border border-[#2F2F2F] bg-[#111111]/80 px-2.5 py-1.5 font-geist text-xs text-[#D4D4D4] backdrop-blur transition hover:border-white hover:text-white"
            >
                <IoChevronBack className="h-3.5 w-3.5" />
                Back
            </Link>
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
                        <div className="text-sm text-[#8E8E8E]">Signing you up…</div>
                    </div>
                </div>
            )}
            <div className="Sign-Up-Box flex flex-col justify-center items-center p-4 sm:p-6 md:p-[40px] gap-2 sm:gap-[10px] w-full max-w-[482px] bg-[#0A0A0A] border border-[#282828] rounded-[15px] transition-all duration-300 ease-out">
                <div className="Frame-25 flex flex-col items-start gap-3 sm:gap-4 md:gap-[40px] w-full max-w-[402px]">
                    <div className="Frame-19 flex flex-col items-center w-full max-w-[402px]">
                        <h1 className="Sign-Up w-[200px] h-[31px] mb-[32px] flex items-center justify-center font-geist font-medium text-[32px] leading-[42px] text-center tracking-[0.5px] text-[#ffffff]">
                            Sign Up
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
                                {/* First Name & Last Name */}
                                <div className="grid grid-cols-2 gap-4 w-full">
                                    <div className="Frame-13 flex flex-col items-start gap-2 sm:gap-[8px]">
                                        <div className="flex justify-between items-center w-full">
                                            <label
                                                htmlFor="firstName-input"
                                                className="First-Name font-geist font-normal text-[14px] leading-[16px] flex items-center tracking-[0.5px] text-[#8E8E8E]"
                                            >
                                                First Name
                                            </label>
                                            {errors.firstName && (
                                                <div className="text-[#EF6262] text-[12px] font-geist h-[16px]">
                                                    {errors.firstName.message}
                                                </div>
                                            )}
                                        </div>
                                        <div className="Frame-10 flex flex-row items-center gap-2 w-full h-[40px] px-3 py-[11px] bg-[#0A0A0A] border border-[#282828] shadow-[0_4px_4px_#00000040] rounded-[8px] focus-within:border-primary-accent">
                                            <GoPerson className="shrink-0 w-[16px] h-[16px] text-[#8e8e8e] pointer-events-none" style={{ stroke: "currentColor", strokeWidth: 0.8 }} />
                                            <input
                                                id="firstName-input"
                                                type="text"
                                                className="peer bg-transparent flex-1 min-w-0 text-white text-[14px] outline-none focus:outline-none"
                                                {...register("firstName", {
                                                    required: "First name is required",
                                                })}
                                            />
                                        </div>
                                    </div>
                                    <div className="Frame-13 flex flex-col items-start gap-2 sm:gap-[8px]">
                                        <div className="flex justify-between items-center w-full">
                                            <label
                                                htmlFor="lastName-input"
                                                className="Last-Name font-geist font-normal text-[14px] leading-[16px] flex items-center tracking-[0.5px] text-[#8E8E8E]"
                                            >
                                                Last Name
                                            </label>
                                            {errors.lastName && (
                                                <div className="text-[#EF6262] text-[12px] font-geist h-[16px]">
                                                    {errors.lastName.message}
                                                </div>
                                            )}
                                        </div>
                                        <div className="Frame-10 flex flex-row items-center gap-2 w-full h-[40px] px-3 py-[11px] bg-[#0A0A0A] border border-[#282828] shadow-[0_4px_4px_#00000040] rounded-[8px] focus-within:border-primary-accent">
                                            <input
                                                id="lastName-input"
                                                type="text"
                                                className="peer bg-transparent flex-1 min-w-0 text-white text-[14px] outline-none focus:outline-none"
                                                {...register("lastName", {
                                                    required: "Last name is required",
                                                })}
                                            />
                                        </div>
                                    </div>
                                </div>

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
                                                minLength: { value: 8, message: "Minimum length is 8" },
                                                validate: validatePassword
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
                            </div>

                            {/* Sign Up button */}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                aria-busy={isSubmitting}
                                aria-disabled={isSubmitting}
                                className="flex justify-center items-center w-full max-w-[402px] h-[40px] gap-2 bg-[#EF6262] rounded-[8px] hover:border hover:border-white hover:scale-101 duration-300 font-geist text-[14px] tracking-[0.5px] text-white cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? "Creating account..." : "Sign Up"}
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
                                aria-label="Sign up with Google"
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
                                aria-label="Sign up with Microsoft"
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
                        <p className="font-geist font-normal text-[14px] leading-[16px] flex items-center gap-1.5 tracking-[0.5px]">
                            <span className="text-[#ededed]">Already have an account?</span>
                            <Link
                                to="/login"
                                className="text-[#EF6262] no-underline hover:underline cursor-pointer"
                            >
                                Log in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
