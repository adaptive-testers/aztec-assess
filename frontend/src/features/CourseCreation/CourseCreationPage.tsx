import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { publicApi } from "../../api/axios";
import { AUTH } from "../../api/endpoints";

interface FormFields {
  courseName: string;
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
            const response = await publicApi.post(AUTH.REGISTER, data);
            console.log(data);
        }
        catch (error) {
            setError("root", { message: "An unexpected error occurred" });
            console.log(error);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-8 geist-font">
            <div className="w-full max-w-4xl">
                <div className="mb-8">
                    <h1 className="text-primary-text text-4xl font-medium mb-2">Create New Course</h1>
                    <p className="text-secondary-text text-base">Add a new course to your college.</p>
                </div>

                <div className="bg-secondary-background border-2 border-primary-border rounded-2xl p-8">
                    <h2 className="text-primary-text text-xl font-medium mb-6">Course Information</h2>
                    
                    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
                        <div className="relative">
                            <label htmlFor="courseName-input" className="block text-secondary-text text-sm mb-2">
                                Course Name
                            </label>
                            <input
                                {...register("courseName", { required: "Course name is required" })}
                                id="courseName-input"
                                type="text"
                                placeholder="e.g., Introduction to Psychology"
                                className="text-primary-text text-sm px-4 py-3 w-full bg-black border-2 border-primary-border rounded-lg focus:border-primary-accent focus:outline-none placeholder:text-secondary-text placeholder:opacity-50"
                            />
                            {errors.courseName && (
                                <p className="absolute left-0 -bottom-5 tracking-wider text-error-text text-xs">
                                    {errors.courseName.message}
                                </p>
                            )}
                        </div>

                        <div className="relative">
                            <label htmlFor="description-input" className="block text-secondary-text text-sm mb-2">
                                Description (Optional)
                            </label>
                            <textarea
                                {...register("description")}
                                id="description-input"
                                placeholder="Add a brief description of the course..."
                                rows={4}
                                className="text-primary-text text-sm px-4 py-3 w-full bg-black border-2 border-primary-border rounded-lg focus:border-primary-accent focus:outline-none placeholder:text-secondary-text placeholder:opacity-50 resize-none"
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

                        <div className="h-6 mt-2" role="alert">
                            {errors.root && (
                                <p className="tracking-wider text-error-text text-xs text-center" aria-live="polite">
                                    {errors.root.message}
                                </p>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}