import axios from "axios";
import { useState } from "react";
import { FaMagnifyingGlass } from "react-icons/fa6";

import { privateApi } from "../../api/axios";
import { AUTH } from "../../api/endpoints";

interface Course {
  id: number;
  title: string;
  status: string;
  join_code: string | null;
  member_count: number;
  created_at: string;
  description?: string;
}

// placeholder values
const tempCourse: Course = {
  id: 1,
  title: "Advanced Math",
  status: "ACTIVE",
  join_code: "A7X9K2M",
  member_count: 45,
  created_at: "2025-11-24T08:30:00Z",
  description: "Course about math and stuff",
};

export default function JoinCoursePage() {
  const [message, setMessage] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [previewCourse, setPreviewCourse] = useState<Course | null>(null);

  const handleSearch = async () => {
    // empty input check
    if (!courseCode.trim()) {
      setMessage("Course code is required.");
      return;
    }

    setMessage(""); // clear previous errors
    setIsLoading(true);

    try {
      const res = await privateApi.post(AUTH.COURSES, {
        code: courseCode,
      });

      setPreviewCourse(res.data);
      setShowPreview(true);
      setMessage("");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setMessage("Request failed. Please try again.");
      } else {
        setMessage("Network error. Please try again.");
      }

      // stay on search UI if failed
      setPreviewCourse(null);
      setShowPreview(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setPreviewCourse(null);
    setShowPreview(false);
    setCourseCode("");
    setMessage("");
  };

  const handleJoin = async () => {
    if (!previewCourse) return;

    setMessage("");
    setIsLoading(true);

    try {
      await privateApi.post(AUTH.COURSES, {
        code: courseCode,
      });

      // switch UI to the "joined/success" view (not implemented yet)
      setShowPreview(false);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setMessage("Request failed. Please try again.");
      } else {
        setMessage("Network error. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="w-[448px] rounded-xl border border-gray-800 bg-[#1A1A1A] p-6 flex flex-col gap-6">
      {!showPreview ? (
        <>
          {/* Enter course code */}
          <header className="flex flex-col gap-1">
            <h2 className="text-white text-lg font-medium">Join Course</h2>
            <p className="text-sm text-gray-400">
              Enter the course code provided by your instructor
            </p>
          </header>

          <form
            className="w-full flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
          >
            <label className="flex flex-col gap-1 w-full">
              <div className="flex items-center justify-between w-full">
                <span className="text-sm text-gray-400">Course Code</span>

                {message && (
                  <span className="text-sm text-[#EF6262]">{message}</span>
                )}
              </div>

              <input
                type="text"
                placeholder="E.G., A7X9K2M"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                className="uppercase w-full h-10 px-3 bg-[#0A0A0A] border 
                  border-[#282828] rounded-md text-white text-sm placeholder-gray-500
                  focus:outline-none focus:border-[rgba(174,58,58,0.6)]"
              />
            </label>

            <button
              type="submit"
              className="w-full h-10 rounded-[8px] bg-[#EF6262] flex items-center 
                justify-center gap-2 hover:border hover:border-white hover:scale-[1.01]
                transition-all duration-300 text-[14px] tracking-[0.5px] text-white 
                disabled:opacity-70 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              <FaMagnifyingGlass className="w-4 h-4" />
              {isLoading ? "Searching..." : "Search"}
            </button>
          </form>
        </>
      ) : (
        <>
          {/* Course description */}
          <header className="flex flex-col gap-1">
            <h2 className="text-white text-base font-normal">Course Details</h2>
            <p className="text-sm text-[#99A1AF]">
              Review the course information before joining
            </p>
          </header>

          <section className="flex flex-col gap-6">
            {/* Course Card */}
            <article className="w-full rounded-lg border border-[#1E2939] bg-[#0A0A0A] p-4 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <code className="w-fit px-2 py-[2px] rounded-md border border-[#F87171] text-xs font-medium text-[#F87171]">
                  {tempCourse?.join_code}
                </code>

                <h3 className="text-white text-xl font-normal">
                  {tempCourse?.title}
                </h3>

                <p className="text-sm text-[#99A1AF]">[Instructor Name]</p>
              </div>

              {/* Optional Field */}
              {tempCourse?.description && (
                <p className="text-sm text-[#D1D5DC] leading-5">
                  {tempCourse.description}
                </p>
              )}

              <footer className="flex items-center gap-4 text-sm text-[#99A1AF]">
                <span>{tempCourse?.member_count} students</span>
                <span>
                  {" "}
                  Created:{" "}
                  {tempCourse?.created_at &&
                    new Date(tempCourse.created_at).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                </span>
              </footer>
            </article>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="h-10 rounded-[8px] bg-[rgba(26,26,26,0.3)] flex items-center justify-center gap-2 
                  hover:border hover:border-white hover:scale-[1.01] transition-all duration-200 
                  text-[14px] text-white p-4 disabled:opacity-70 disabled:cursor-not-allowed"
                onClick={handleCancel}
              >
                Cancel
              </button>

              <button
                type="button"
                className="h-10 rounded-[8px] bg-[#EF6262] flex items-center justify-center gap-2 hover:border 
                  hover:border-white hover:scale-[1.01] transition-all duration-200 text-[14px]
                  text-white p-4 disabled:opacity-70 disabled:cursor-not-allowed"
                onClick={handleJoin}
                disabled={isLoading}
              >
                {isLoading ? "Joining..." : "Join Course"}
              </button>
            </div>
          </section>
        </>
      )}
    </section>
  );
}
