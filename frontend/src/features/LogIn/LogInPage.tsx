import axios from "axios";
import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { IoEyeOffOutline, IoEyeOutline } from "react-icons/io5";
import { MdOutlineMailOutline } from "react-icons/md";
import { TbLockPassword } from "react-icons/tb";
import { Link, useNavigate } from "react-router-dom";

import { publicApi } from "../../api/axios";
import googleLogo from "../../assets/googleLogo.png";
import microsoftLogo from "../../assets/microsoftLogo.png";
import { useAuth } from "../../context/AuthContext";

interface FormFields {
  userEmail: string;
  userPassword: string;
  keepSignedIn: boolean;
}

const validatePassword = (password: string) => {
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  if (!hasNumber) return "Password must contain at least one number";
  if (!hasSpecialChar)
    return "Password must contain at least one special character";
  return true as const;
};

export default function LogInContainer() {
  const [showPassword, setShowPassword] = useState(false);
  const { setAccessToken } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormFields>({
    defaultValues: { userEmail: "", userPassword: "", keepSignedIn: false },
  });

  const keepSignedIn = watch("keepSignedIn") ?? false;

  const onSubmit: SubmitHandler<FormFields> = async (data) => {
    try {
      const { data: res } = await publicApi.post("/auth/login", {
        email: data.userEmail,
        password: data.userPassword,
        keepSignedIn: data.keepSignedIn,
      });

      if (res?.access) setAccessToken(res.access);
      navigate("/dashboard");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError("root", {
          message: error.response?.data?.message || "Invalid email or password",
        });
      } else {
        setError("root", { message: "An unexpected error occurred" });
      }
    }
  };

  return (
    <div className="Log-In w-[1280px] h-[832px] bg-[#000000]">
      <div className="Sign-Up-Box relative flex justify-center items-center p-[40px] gap-[10px] w-[482px] h-[631px] bg-[#0A0A0A] left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%] border border-[#282828] rounded-[15px]">
        <div className="Frame-25 absolute flex flex-col items-start gap-[40px] w-[402px] h-[551px]">
          <div className="Frame-19 flex flex-col items-center gap-[40px] w-[402px] h-[335px]">
            <h1 className="Log-In w-[120px] h-[31px] flex items-center justify-center font-geist font-medium text-[32px] leading-[42px] flex items-center text-center tracking-[0.5px] text-[#ffffff]">
              Log In
            </h1>
            <div className="Frame-18 flex flex-col items-start gap-[32px] w-[402px] h-[264px]">
              <div className="Frame-17 flex flex-col items-start gap-[24px] w-[402px] h-[192px]">
                {/* Email */}
                <form
                  className="Frame-13 flex flex-col items-start gap-[8px] w-[402px] h-[64px]"
                  onSubmit={handleSubmit(onSubmit)}
                  noValidate
                >
                  <div className="flex justify-between items-center w-full">
                    <label
                      htmlFor="email-input"
                      className="Email w-[38px] h-[16px] font-geist font-normal text-[14px] leading-[16px] flex items-center tracking-[0.5px] text-[#8E8E8E]"
                    >
                      Email
                    </label>
                    {errors.userEmail && (
                      <div className="text-[#EF6262] text-[12px] font-geist h-[16px]">
                        {errors.userEmail.message}
                      </div>
                    )}
                  </div>
                  <div className="Frame-10 flex flex-row items-center gap-[12px] w-[402px] h-[40px] px-[14px] py-[11px] bg-[#0A0A0A] border border-[#282828] shadow-[0_4px_4px_#00000040] rounded-[8px] focus-within:border-[rgba(174,58,58,0.4)]">
                    <input
                      id="email-input"
                      type="email"
                      className="peer bg-transparent flex-1 text-white text-[14px] outline-none focus:border-[rgba(174,58,58,0.4)] focus:outline-none"
                      placeholder="Enter your email"
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
                </form>

                {/* Password */}
                <form
                  className="Frame-14 flex flex-col items-start gap-[8px] w-[402px] h-[64px]"
                  onSubmit={handleSubmit(onSubmit)}
                  noValidate
                >
                  <div className="flex justify-between items-center w-full">
                    <label
                      htmlFor="password-input"
                      className="Password w-[67px] h-[16px] font-geist font-normal text-[14px] leading-[16px] flex items-center tracking-[0.5px] text-[#8E8E8E]"
                    >
                      Password
                    </label>
                    {errors.userPassword && (
                      <span className="text-[#EF6262] text-[12px] font-geist h-[16px]">
                        {errors.userPassword.message}
                      </span>
                    )}
                  </div>
                  <div className="Frame-10 flex flex-row items-center gap-[12px] w-[402px] h-[40px] px-[14px] py-[11px] bg-[#0A0A0A] border border-[#282828] shadow-[0_4px_4px_#00000040] rounded-[8px] focus-within:border-[rgba(174,58,58,0.4)]">
                    <input
                      id="password-input"
                      type={showPassword ? "text" : "password"}
                      className="peer bg-transparent flex-1 text-white text-[14px] outline-none focus:border-[rgba(174,58,58,0.4)] focus:outline-none"
                      placeholder="Enter your password"
                      {...register("userPassword", {
                        required: "Password is required",
                        minLength: { value: 8, message: "Minimum length is 8" },
                        validate: validatePassword,
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
                </form>

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
              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  aria-busy={isSubmitting}
                  aria-disabled={isSubmitting}
                  className="flex justify-center items-center w-[402px] h-[40px] gap-2 bg-[#EF6262] rounded-[8px] hover:border hover:border-white hover:scale-101 duration-300 font-geist text-[14px] tracking-[0.5px] text-white cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Logging in..." : "Log In"}
                </button>
              </form>
            </div>
          </div>

          <div className="Frame-26 flex justify-center items-center gap-[10px] w-[402px] h-[16px]">
            <div className="Rectangle-2 w-[182px] h-[1px] bg-[#232323] flex-grow"></div>
            <p className="OR w-[18px] h-[16px] font-geist font-semibold text-[12px] leading-[16px] flex items-center text-center tracking-[0.5px] text-[#8E8E8E]">
              OR
            </p>
            <div className="Rectangle-1 w-[182px] h-[1px] bg-[#232323] flex-grow"></div>
          </div>

          <div className="Frame-24 flex flex-col items-center gap-[40px] w-[402px] h-[120px]">
            <div className="Frame-27 flex justify-between items-center gap-[24px] w-[402px] h-[40px]">
              <button className="Frame-20 flex justify-center items-center gap-[10px] w-[192px] h-[40px] px-[14px] mx-auto border border-[#242424] rounded-[8px] hover:border-white hover:scale-102 duration-600 cursor-pointer">
                <img
                  src={googleLogo}
                  alt="Google logo"
                  className="h-5 w-5 object-contain"
                />
              </button>
              <button className="Frame-24 flex justify-center items-center gap-[10px] w-[192px] h-[40px] px-[14px] mx-auto border border-[#242424] rounded-[8px] hover:border-white hover:scale-102 duration-600 cursor-pointer">
                <img
                  src={microsoftLogo}
                  alt="Microsoft logo"
                  className="h-4 w-4 object-contain"
                />
              </button>
            </div>
          </div>

          <div className="Frame-7 flex flex-col justify-center items-center gap-[21px] w-[402px] h-[40px]">
            <p className="font-geist font-normal text-[14px] leading-[16px] flex items-center tracking-[0.5px]">
              <a
                href="/forgot-password"
                className="text-[#EF6262] no-underline hover:underline cursor-pointer"
              >
                Can&#39;t log in?
              </a>
              <span className="mx-1 text-[#ededed]">•</span>
              <Link
                to="/signup"
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
