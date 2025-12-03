import axios from "axios";
import { useState } from "react";
import { FaMagnifyingGlass } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";

import { privateApi } from "../../api/axios";
import { AUTH } from "../../api/endpoints";
import { Toast } from "../../components/Toast";

interface CoursePreview {
  id: string;
  title: string;
  status: string;
  join_code: string | null;
  member_count: number;
  created_at: string;
  owner_id: string;
  is_member: boolean;
}

interface JoinResponse {
  course_id: string;
  course_slug: string;
  role: string;
  created: boolean;
}

export default function JoinCoursePage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [previewCourse, setPreviewCourse] = useState<CoursePreview | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const validateCourseCode = (code: string): string | null => {
    const trimmed = code.trim();
    if (!trimmed) {
      return "Course code is required.";
    }
    if (trimmed.length < 4) {
      return "Course code must be at least 4 characters.";
    }
    if (trimmed.length > 16) {
      return "Course code must be no more than 16 characters.";
    }
    if (!/^[A-Z0-9]+$/.test(trimmed)) {
      return "Course code can only contain letters and numbers.";
    }
    return null;
  };

  const handlePreview = async () => {
    const validationError = validateCourseCode(courseCode);
    if (validationError) {
      setMessage(validationError);
      return;
    }

    setMessage("");
    setIsLoading(true);

    try {
      const res = await privateApi.post<CoursePreview>(AUTH.ENROLLMENT_PREVIEW, {
        join_code: courseCode.trim().toUpperCase(),
      });

      setPreviewCourse(res.data);
      setMessage("");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const errorMessage =
          err.response?.data?.detail || "Invalid or disabled join code. Please try again.";
        setMessage(errorMessage);
      } else {
        setMessage("Network error. Please try again.");
      }
      setPreviewCourse(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!previewCourse) return;

    setMessage("");
    setIsJoining(true);

    try {
      const res = await privateApi.post<JoinResponse>(AUTH.ENROLLMENT_JOIN, {
        join_code: courseCode.trim().toUpperCase(),
      });

      setToast({
        message: res.data.created
          ? "Successfully joined the course!"
          : "You are already a member of this course.",
        type: "success",
      });

      const coursePath = res.data.course_slug || res.data.course_id;
      if (!coursePath) {
        setToast({ message: "Joined successfully, but unable to redirect.", type: "info" });
        setIsJoining(false);
        return;
      }

      setTimeout(() => {
        navigate(`/courses/${coursePath}`);
        window.location.reload();
      }, 1500);
    } catch (err) {
      setIsJoining(false);
      if (axios.isAxiosError(err)) {
        const errorMessage =
          err.response?.data?.detail || "Failed to join course. Please try again.";
        setMessage(errorMessage);
        setToast({ message: errorMessage, type: "error" });
      } else {
        const errorMessage = "Network error. Please try again.";
        setMessage(errorMessage);
        setToast({ message: errorMessage, type: "error" });
      }
    }
  };

  const handleCancel = () => {
    setPreviewCourse(null);
    setCourseCode("");
    setMessage("");
  };

  return (
    <section className="flex w-full justify-center bg-[#0A0A0A] text-[#F1F5F9] px-4 py-6 md:py-10">
      <div className="flex w-full max-w-[887px] flex-col gap-4 md:gap-[26px]">
        <div className="flex flex-col items-start gap-[4px]">
          <h1 className="font-medium text-[26px] leading-[39px] tracking-[0px]">
            Join Course
          </h1>
          <p className="text-[17px] leading-[26px] tracking-[0px] text-[#A1A1AA]">
            Enter the course code provided by your instructor
          </p>
        </div>

        <div className="w-full rounded-[13px] border border-[#404040] bg-[#1A1A1A] shadow-[0_4px_6px_rgba(0,0,0,0.25)]">
          <div className="flex flex-wrap items-center justify-between gap-[10px] border-b border-[#404040] px-[26px] py-4 md:py-[22px]">
            <h2 className="text-[17px] leading-[17px] tracking-[0px]">
              {previewCourse ? "Course Details" : "Enter Course Code"}
            </h2>
          </div>

          <div className="flex flex-col gap-4 md:gap-[26px] px-[26px] py-4 md:py-[26px]">
            {!previewCourse ? (
              <>
                <form
                      className="w-full flex flex-col gap-4"
                      onSubmit={(e) => {
                        e.preventDefault();
                        handlePreview();
                      }}
                    >
                      <div className="flex flex-col gap-[9px]">
                        <div className="flex items-center justify-between">
                          <label htmlFor="courseCode" className="text-[15px] leading-[15px]">
                            Course Code
                          </label>
                          {message && (
                            <span className="text-[15px] leading-[15px] text-[#EF6262]">
                              {message}
                            </span>
                          )}
                        </div>
                        <input
                          id="courseCode"
                          type="text"
                          placeholder="e.g., A7X9K2M"
                          value={courseCode}
                          onChange={(e) => {
                            const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                            setCourseCode(value);
                            if (message) setMessage("");
                          }}
                          className="h-[52px] w-full rounded-[7px] bg-[#262626] border border-[#404040] px-[13px] text-[17px] text-white placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#F87171] transition-colors"
                          maxLength={16}
                        />
                      </div>

                      <button
                        type="submit"
                        className="h-[40px] w-fit px-4 rounded-[7px] bg-[#F87171] flex items-center justify-center gap-2 hover:ring-2 hover:ring-[#FCA5A5] hover:ring-offset-2 hover:ring-offset-[#0F0F0F] hover:scale-105 transition-all duration-200 text-[15px] text-white disabled:opacity-70 self-center"
                        disabled={isLoading}
                      >
                        <FaMagnifyingGlass className="w-4 h-4" />
                        {isLoading ? "Searching..." : "Search"}
                      </button>
                </form>
              </>
            ) : (
              <>
                {previewCourse.is_member && (
                      <div className="rounded-[7px] border border-yellow-500/50 bg-yellow-900/20 p-4">
                        <p className="text-[15px] text-yellow-400">
                          You are already a member of this course.
                        </p>
                      </div>
                    )}

                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-1 rounded-[5px] border border-[#F87171] text-xs font-medium text-[#F87171] bg-[#0A0A0A]">
                            {previewCourse.join_code}
                          </code>
                        </div>
                        <h3 className="text-[22px] leading-[33px] font-medium text-white">
                          {previewCourse.title}
                        </h3>
                      </div>

                      <div className="flex flex-col gap-2 text-[15px] text-[#A1A1AA]">
                        <div className="flex items-center gap-2">
                          <span className="text-white">Members:</span>
                          <span>{previewCourse.member_count}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-white">Created:</span>
                          <span>
                            {new Date(previewCourse.created_at).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                </div>

                <div className="flex justify-end gap-[10px] pt-4 border-t border-[#404040]">
                      <button
                        type="button"
                        className="h-[35px] px-[13px] rounded-[7px] text-[15px] text-white bg-[#404040] hover:bg-[#525252] transition disabled:opacity-70 disabled:cursor-not-allowed"
                        onClick={handleCancel}
                        disabled={isJoining}
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        className="h-[35px] px-[13px] rounded-[7px] min-w-[75px] text-[15px] text-white bg-[#F87171] transition-all duration-200 hover:ring-2 hover:ring-[#FCA5A5] hover:ring-offset-2 hover:ring-offset-[#0F0F0F] hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed"
                        onClick={handleJoin}
                        disabled={isJoining || previewCourse.is_member}
                      >
                        {isJoining ? "Joining..." : "Join Course"}
                </button>
              </div>
              </>
            )}
          </div>
        </div>
      </div>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </section>
  );
}
