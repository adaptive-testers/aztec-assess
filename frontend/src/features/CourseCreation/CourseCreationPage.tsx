import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { privateApi } from "../../api/axios";
import { COURSES } from "../../api/endpoints";

interface FormFields {
  title: string;
  description: string;
}

export default function CourseCreationPage() {
    const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<FormFields>();
    const navigate = useNavigate();

    const handleCancel = () => {
        navigate("/");
    };

    const onSubmit: SubmitHandler<FormFields> = async (data) => {
        try {
            const response = await privateApi.post(COURSES.CREATE, {
                title: data.title,
                description: data.description,
            });
            console.log("Course created:", response.data);
            // Navigate to the course page or courses list after successful creation
            navigate("/");
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
        <div className="min-h-screen w-full flex items-center justify-center p-8 geist-font">
            <div className="w-full max-w-4xl">
                <div className="mb-8">
                    <h1 className="text-primary-text text-4xl font-medium mb-2">Create New Course</h1>
                    <p className="text-secondary-text text-base">Enter your course details</p>
                </div>

                <div className="bg-secondary-background border-2 border-primary-border rounded-2xl p-8">
                    <h2 className="text-primary-text text-xl font-medium mb-6">Course Information</h2>
                    
                    {/* Error message banner */}
                    {errors.root && (
                        <div
                            className="w-full px-4 py-2 mb-6 bg-[#2A1414] border border-[#EF6262] rounded-lg text-[#EF6262] text-sm text-center"
                            role="alert"
                            aria-live="polite"
                            aria-atomic="true"
                        >
                            {errors.root.message}
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
                        <div className="relative">
                            <div className="flex justify-between items-center mb-2">
                                <label htmlFor="title-input" className="block text-secondary-text text-sm">
                                    Course Name
                                </label>
                                {errors.title && (
                                    <p className="tracking-wider text-primary-accent text-xs">
                                        {errors.title.message}
                                    </p>
                                )}
                            </div>
                            <input
                                {...register("title", { 
                                    required: "Course name is required",
                                    maxLength: { value: 200, message: "Course name must be 200 characters or less" }
                                })}
                                id="title-input"
                                type="text"
                                placeholder="e.g., Introduction to Psychology"
                                maxLength={200}
                                className="text-primary-text text-sm px-4 py-3 w-full bg-secondary-background border-2 border-primary-border rounded-lg focus:border-primary-accent focus:outline-none placeholder:text-secondary-text placeholder:opacity-50"
                            />
                        </div>

                        <div className="relative">
                            <div className="flex justify-between items-center mb-2">
                                <label htmlFor="description-input" className="block text-secondary-text text-sm">
                                    Description (Optional)
                                </label>
                                {errors.description && (
                                    <p className="tracking-wider text-primary-accent text-xs">
                                        {errors.description.message}
                                    </p>
                                )}
                            </div>
                            <textarea
                                {...register("description", {
                                    maxLength: { value: 200, message: "Description must be 200 characters or less" }
                                })}
                                id="description-input"
                                placeholder="Add a brief description of the course..."
                                rows={4}
                                maxLength={200}
                                className="text-primary-text text-sm px-4 py-3 w-full bg-secondary-background border-2 border-primary-border rounded-lg focus:border-primary-accent focus:outline-none placeholder:text-secondary-text placeholder:opacity-50 resize-none"
                            />
                        </div>

                        <div className="flex justify-end gap-4 mt-6">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="px-6 py-2.5 text-primary-text border-2 border-primary-border rounded-lg geist-font text-sm hover:border-white hover:scale-101 transition-all duration-300 will-change-transform"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={isSubmitting}
                                type="submit"
                                className="px-6 py-2.5 text-white bg-primary-accent border-2 border-transparent rounded-lg geist-font text-sm hover:border-white hover:scale-101 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed will-change-transform"
                            >
                                {isSubmitting ? "Creating..." : "Create Course"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}