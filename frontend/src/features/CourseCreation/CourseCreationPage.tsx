import axios from "axios";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { privateApi } from "../../api/axios";
import { COURSES } from "../../api/endpoints";
import { Toast } from "../../components/Toast";

interface FormFields {
  title: string;
  description: string;
}

export default function CourseCreationPage() {
    const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<FormFields>();
    const navigate = useNavigate();
    const [showSuccessToast, setShowSuccessToast] = useState(false);

    const handleCancel = () => {
        navigate("/profile");
    };

    const onSubmit: SubmitHandler<FormFields> = async (data) => {
        try {
            const response = await privateApi.post(COURSES.CREATE, {
                title: data.title,
                // Description is not supported by backend, so we don't send it
            });
            
            setShowSuccessToast(true);
            
            const courseSlug = response.data?.slug;
            if (courseSlug) {
                setTimeout(() => {
                    navigate(`/courses/${courseSlug}`);
                }, 1000);
            } else {
                // Fallback to dashboard if slug is unexpectedly missing
                setTimeout(() => {
                    navigate("/dashboard");
                }, 1500);
            }
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                const backendMessage = error.response?.data?.detail || error.response?.data?.message;
                setError("root", {
                    message: backendMessage || "Failed to create course. Please try again.",
                });
            } else {
                setError("root", { message: "An unexpected error occurred" });
            }
            console.error(error);
        }
    };

    return (
        <>
            {showSuccessToast && (
                <Toast
                    message="Course created successfully!"
                    type="success"
                    onClose={() => setShowSuccessToast(false)}
                />
            )}
            <div className="w-full flex items-center justify-center py-4 md:py-6">
                <div className="w-full max-w-[887px] flex flex-col gap-4 md:gap-[26px]">
                    {/* Page header */}
                    <div className="flex flex-col items-start gap-[4px]">
                        <h1 className="font-medium text-[26px] leading-[39px] tracking-[0px] text-[#F1F5F9]">
                            Create New Course
                        </h1>
                        <p className="text-[17px] leading-[26px] tracking-[0px] text-[#A1A1AA]">
                            Enter your course details
                        </p>
                    </div>

                    {/* Card */}
                    <div className="w-full rounded-[13px] border border-[#404040] bg-[#1A1A1A] shadow-[0_4px_6px_rgba(0,0,0,0.25)]">
                        {/* Card header */}
                        <div className="flex flex-wrap items-center justify-between gap-[10px] border-b border-[#404040] px-[26px] py-4 md:py-[22px]">
                            <h2 className="text-[17px] leading-[17px] tracking-[0px] text-[#F1F5F9]">
                                Course Information
                            </h2>
                        </div>

                        {/* Card content */}
                        <div className="flex flex-col gap-4 md:gap-[26px] px-[26px] py-4 md:py-[26px]">
                            {/* Error message banner */}
                            {errors.root && (
                                <div
                                    className="w-full px-4 py-2 bg-[#2A1414] border border-[#EF6262] rounded-[8px] text-[#EF6262] text-[15px] text-center"
                                    role="alert"
                                    aria-live="polite"
                                    aria-atomic="true"
                                >
                                    {errors.root.message}
                                </div>
                            )}

                            <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4 md:gap-[26px]">
                                {/* Course Name */}
                                <div className="flex flex-col gap-[9px]">
                                    <div className="flex justify-between">
                                        <label
                                            htmlFor="title-input"
                                            className="text-[15px] leading-[15px] text-[#F1F5F9]"
                                        >
                                            Course Name
                                        </label>
                                        {errors.title && (
                                            <p className="text-[15px] leading-[15px] text-[#EF6262]">
                                                {errors.title.message}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex h-[52px] w-full items-center rounded-[7px] bg-[#262626] pl-[13px] pr-[13px] border border-[#404040] focus-within:border-[#F87171] transition-all duration-200">
                                        <input
                                            {...register("title", { 
                                                required: "Course name is required",
                                                maxLength: { value: 200, message: "Course name must be 200 characters or less" }
                                            })}
                                            id="title-input"
                                            type="text"
                                            placeholder="e.g., Introduction to Psychology"
                                            maxLength={200}
                                            className="w-full bg-transparent text-[17px] text-[#F1F5F9] outline-none placeholder:text-[#8E8E8E]"
                                        />
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="flex flex-col gap-[9px]">
                                    <div className="flex justify-between">
                                        <label
                                            htmlFor="description-input"
                                            className="text-[15px] leading-[15px] text-[#F1F5F9]"
                                        >
                                            Description (Optional)
                                        </label>
                                        {errors.description && (
                                            <p className="text-[15px] leading-[15px] text-[#EF6262]">
                                                {errors.description.message}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex w-full items-start rounded-[7px] bg-[#262626] p-[13px] border border-[#404040] focus-within:border-[#F87171] transition-all duration-200">
                                        <textarea
                                            {...register("description", {
                                                maxLength: { value: 200, message: "Description must be 200 characters or less" }
                                            })}
                                            id="description-input"
                                            placeholder="Add a brief description of the course..."
                                            rows={4}
                                            maxLength={200}
                                            className="w-full bg-transparent text-[17px] text-[#F1F5F9] outline-none placeholder:text-[#8E8E8E] resize-none"
                                        />
                                    </div>
                                </div>

                                {/* Buttons */}
                                <div className="flex justify-end gap-[10px] pt-4 border-t border-[#404040]">
                                    <button
                                        type="button"
                                        onClick={handleCancel}
                                        className="h-[35px] px-[13px] rounded-[7px] text-[15px] text-[#F1F5F9] bg-[#404040] hover:bg-[#525252] transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        disabled={isSubmitting}
                                        type="submit"
                                        className={`h-[35px] px-[13px] rounded-[7px] min-w-[120px] text-[15px] text-white bg-[#F87171] transition-all duration-200 ${
                                            isSubmitting
                                                ? "opacity-70 cursor-not-allowed"
                                                : "hover:ring-2 hover:ring-[#FCA5A5] hover:ring-offset-2 hover:ring-offset-[#0F0F0F] hover:scale-105"
                                        }`}
                                    >
                                        {isSubmitting ? "Creating..." : "Create Course"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}