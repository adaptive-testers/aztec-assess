import { useState } from "react";
import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { IoPersonOutline } from "react-icons/io5";
import { IoEyeOffOutline, IoEyeOutline } from "react-icons/io5";
import { MdOutlineMailOutline } from "react-icons/md";
import { TbLockPassword } from "react-icons/tb";

import { publicApi } from "../../api/axios";
import googleLogo from "../../assets/googleLogo.png";
import microsoftLogo from "../../assets/microsoftLogo.png";
import { useAuth } from "../../context/AuthContext";

interface FormFields {
    firstName: string;
    lastName: string;
    userEmail: string;
    userPassword: string;
}


export default function SignUpContainer() {
    const {register, handleSubmit, setError, formState: { errors, isSubmitting }} = useForm<FormFields>();
    const { setAccessToken } = useAuth();

    const [showPassword, setShowPassword] = useState(false);

    // Password validation function
    const validatePassword = (password: string) => {
        const hasNumber = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
        
        if (!hasNumber) {
            return "Password must contain at least one number";
        }
        if (!hasSpecialChar) {
            return "Password must contain at least one special character";
        }
        return true;
    };

    const handlePasswordToggle = () => setShowPassword((prev) => !prev);

    const onSubmit: SubmitHandler<FormFields> = async (data) => {
        try {
            const registrationData = {
                email: data.userEmail,
                first_name: data.firstName,
                last_name: data.lastName,
                password: data.userPassword,
                role: "student"
            };

            const response = await publicApi.post("/auth/register/", registrationData);
            
            if (response.data.tokens?.access) {
                setAccessToken(response.data.tokens.access);
            }

            
            
        }
        catch (error){
            setError("root", {
                message: "An error occurred while creating your account.",
            });
            console.log(error)
        }
        
    };


    return <>
        <div className="
            bg-secondary-background
            w-[410px] h-[580px] 
            border-[2px] border-primary-border rounded-[15px] 
            flex flex-col items-center gap-5
            p-5">
                    
            <div>
                <p className="text-primary-text geist-font text-[27px] font-[415] mt-3">Sign Up</p>
            </div>

            <div className="w-full pl-4 pr-4">
                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <label htmlFor="firstName-input" className="text-secondary-text geist-font text-sm font-[475]">First Name</label>
                            <input {...register("firstName", { required: "First name is required" })} id="firstName-input" type="text" className="peer text-primary-text text-sm pl-10 pr-2 h-9 w-full border-primary-border border-[2px] rounded-lg focus:border-primary-accent focus:outline-none" />
                            <IoPersonOutline className="absolute left-[10px] top-[72%] -translate-y-1/2 text-secondary-text peer-focus:text-primary-text text-sm pointer-events-none" />
                            {errors.firstName && (
                                <p className="absolute left-0 bottom-[-18px] tracking-wider geist-font text-error-text text-[10px]">
                                    {errors.firstName.message}
                                </p>
                            )}
                        </div>
                        <div className="relative flex-1">
                            <label htmlFor="lastName-input" className="text-secondary-text geist-font text-sm font-[475]">Last Name</label>
                            <input {...register("lastName", { required: "Last name is required" })} id="lastName-input" type="text" className="peer text-primary-text text-sm pl-3 pr-2 h-9 w-full border-primary-border border-[2px] rounded-lg focus:border-primary-accent focus:outline-none geist-font" />
                            {errors.lastName && (
                                <p className="absolute left-0 bottom-[-18px] tracking-wider geist-font text-error-text text-[10px]">
                                    {errors.lastName.message}
                                </p>
                            )}
                        </div>
                    </div>


                    <div className="relative">
                        <label htmlFor="email-input" className="text-secondary-text geist-font text-sm font-[475]">Email</label>
                        <input {...register("userEmail", { required: "Email is required" })} id="email-input" type="email" className="peer text-primary-text text-sm pl-10 pr-2 h-9 w-full border-primary-border border-[2px] rounded-lg focus:border-primary-accent focus:outline-none" />
                        <MdOutlineMailOutline className="absolute left-[10px] top-[72%] transform -translate-y-1/2 text-secondary-text peer-focus:text-primary-text text-sm pointer-events-none" />
                        {errors.userEmail && (
                        <p className="absolute left-0 bottom-[-18px] tracking-wider geist-font text-error-text text-[10px]">
                            {errors.userEmail.message}
                            </p>
                            )}
                    </div>

                    <div className="relative">
                        <label htmlFor="password-input" className="text-secondary-text geist-font text-sm font-[475]">Password</label>
                        <input
                            id="password-input"
                            type={showPassword ? "text" : "password"}
                            {...register("userPassword", { 
                                required: "Password is required", 
                                minLength: { value: 8, message: "Minimum length is 8" },
                                validate: validatePassword
                            })}
                            className="peer text-primary-text text-sm pl-10 pr-10 h-9 w-full  border-primary-border border-[2px] rounded-lg focus:border-primary-accent focus:outline-none"
                        />
                        <TbLockPassword className="absolute left-[10px] top-[70%] -translate-y-1/2 text-secondary-text peer-focus:text-primary-text text-sm pointer-events-none" />
                        {errors.userPassword && (
                        <p className="absolute left-0 bottom-[-18px] tracking-wider geist-font text-error-text text-[10px]">
                            {errors.userPassword.message}
                            </p>
                            )}    
                            <button
                                type="button"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                onClick={handlePasswordToggle}
                                className="absolute right-[10px] top-[72%] -translate-y-1/2 text-secondary-text text-sm cursor-pointer hover:text-primary-text transition-colors duration-300 bg-transparent border-none p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-accent rounded">
                                {showPassword ? <IoEyeOutline /> : <IoEyeOffOutline />}
                            </button>
                    </div>

                    <div className="relative">
                        <button disabled={isSubmitting} className="text-primary-text bg-primary-accent w-full h-[35px] rounded-[6px] tracking-wider geist-font font-[250] text-[13px] mt-4 cursor-pointer transition-all duration-200 origin-center will-change-transform hover:bg-primary-accent-hover hover:shadow-[0_2px_12px_0_rgba(192,74,74,0.25)]">
                            {isSubmitting ? "Creating account..." : "Create Account"} </button>
                        {errors.root && (
                            <p className="absolute left-0 right-0 top-full mt-2 tracking-wider geist-font text-error-text text-[10px] text-center pointer-events-none" aria-live="polite" aria-atomic="true">
                                {errors.root.message}
                            </p>
                        )}
                    </div>
                            

                </form>
                

                <div className="mt-10">
                    <div className="flex items-center w-full gap-1">
                        <div className="flex-1 h-[1px] bg-primary-border" />
                        <span className="text-secondary-text geist-font font-[550] text-[11px] px-2">OR</span>
                        <div className="flex-1 h-[1px] bg-primary-border" />
                    </div>
                </div>

                <div className="flex flex-row gap-4 mt-7">
                    <button
                        aria-label="Sign up with Google"
                        className="flex items-center justify-center h-[34px] w-55 border-[2px] border-primary-border rounded-lg shadow-sm transition-all duration-200 cursor-not-allowed opacity-50"
                        disabled
                    >
                        <img src={googleLogo} alt="Google logo" className="h-4 w-4" />
                    </button>
                    <button
                        aria-label="Sign up with Microsoft"
                        className="flex items-center justify-center h-[34px] w-55 border-[2px] border-primary-border rounded-lg shadow-sm transition-all duration-200 cursor-not-allowed opacity-50"
                        disabled
                    >
                        <img src={microsoftLogo} alt="Microsoft logo" className="h-4 w-4" />
                    </button>
                </div>

                <div className="geist-font text-[12px] font-[150] tracking-wider mt-10 flex justify-center">
                    <p className="text-primary-text">Already have an account? <a href="/login" className="text-primary-accent transition-all duration-500 hover:underline">Log in</a></p>
                </div>
            </div>
        </div>
    </>
}