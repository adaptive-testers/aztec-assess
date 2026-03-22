import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { FiArrowRight, FiBookOpen, FiMessageSquare, FiPlus } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

import { privateApi } from "../../api/axios";
import { AUTH, COURSES } from "../../api/endpoints";

interface UserProfile {
  first_name: string;
  role: "student" | "instructor" | "admin";
}

interface CourseItem {
  id: string | number;
  slug?: string;
  title?: string;
  name?: string;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
}

interface ParsedCourse {
  id: string | number;
  path: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  title: string;
}

const FEEDBACK_FORM_URL = "https://forms.gle/SnDByxCY3zveU9cj7";

function parseCourses(data: unknown): CourseItem[] {
  if (Array.isArray(data)) return data as CourseItem[];
  if (data && typeof data === "object") {
    const payload = data as { results?: unknown[]; courses?: unknown[] };
    if (Array.isArray(payload.results)) return payload.results as CourseItem[];
    if (Array.isArray(payload.courses)) return payload.courses as CourseItem[];
  }
  return [];
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [courses, setCourses] = useState<ParsedCourse[]>([]);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [profileRes, coursesRes] = await Promise.all([
          privateApi.get<UserProfile>(AUTH.PROFILE),
          privateApi.get(COURSES.LIST),
        ]);

        if (!mounted) return;

        const parsed = parseCourses(coursesRes.data).map((course) => ({
          id: course.id,
          path: course.slug ? `/courses/${course.slug}` : `/courses/${course.id}`,
          status: course.status ?? "ACTIVE",
          title: course.title || course.name || "Untitled Course",
        }));

        setProfile(profileRes.data);
        setCourses(parsed);
      } catch (err: unknown) {
        if (!mounted) return;
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          setError("Your session expired. Please sign in again.");
        } else {
          setError("Failed to load dashboard data.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void fetchData();

    return () => {
      mounted = false;
    };
  }, []);

  const activeCourses = useMemo(
    () => courses.filter((course) => course.status !== "ARCHIVED"),
    [courses]
  );
  const archivedCourses = useMemo(
    () => courses.filter((course) => course.status === "ARCHIVED"),
    [courses]
  );

  return (
    <section className="w-full bg-[#0A0A0A] text-[#F1F5F9]">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 pb-10 pt-4 sm:px-6 lg:px-10">
        <header className="rounded-xl border border-[#404040] bg-[#1A1A1A] p-5">
          <h1 className="text-[24px] font-medium leading-8">
            {loading
              ? "Loading dashboard..."
              : `Welcome${profile?.first_name ? `, ${profile.first_name}` : ""}`}
          </h1>
          {!loading && !error && (
            <p className="mt-2 text-sm text-[#A1A1AA]">
              Role: {profile?.role ?? "unknown"} • {activeCourses.length} active course
              {activeCourses.length === 1 ? "" : "s"}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            {(profile?.role === "instructor" || profile?.role === "admin") ? (
              <button
                type="button"
                onClick={() => navigate("/courses/create")}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-[#F87171] px-4 text-sm font-medium text-white hover:bg-[#ef6666]"
              >
                <FiPlus className="h-4 w-4" />
                Create Course
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate("/join-course")}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-[#F87171] px-4 text-sm font-medium text-white hover:bg-[#ef6666]"
              >
                <FiPlus className="h-4 w-4" />
                Join Course
              </button>
            )}

            <a
              href={FEEDBACK_FORM_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-[#404040] px-4 text-sm font-medium text-[#F1F5F9] hover:bg-[#202020]"
            >
              <FiMessageSquare className="h-4 w-4" />
              Share Feedback
            </a>
          </div>
        </header>

        {error ? (
          <div className="rounded-xl border border-red-500/50 bg-red-900/20 p-4 text-sm text-red-300">
            {error}
          </div>
        ) : (
          <>
            <section className="rounded-xl border border-[#404040] bg-[#1A1A1A] p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[18px] font-medium">Your Courses</h2>
                <span className="text-xs text-[#A1A1AA]">{activeCourses.length} active</span>
              </div>

              {loading ? (
                <div className="space-y-3">
                  <div className="skeleton-shimmer h-[70px] rounded-lg" />
                  <div className="skeleton-shimmer h-[70px] rounded-lg" />
                </div>
              ) : activeCourses.length === 0 ? (
                <p className="text-sm text-[#A1A1AA]">No active courses yet.</p>
              ) : (
                <div className="space-y-3">
                  {activeCourses.map((course) => (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() => navigate(course.path)}
                      className="flex w-full items-center justify-between rounded-lg border border-[#404040] bg-[#131313] p-4 text-left hover:bg-[#1d1d1d]"
                    >
                      <div className="flex items-center gap-3">
                        <FiBookOpen className="h-5 w-5 text-[#F87171]" />
                        <div>
                          <div className="text-sm font-medium text-[#F1F5F9]">{course.title}</div>
                          <div className="text-xs text-[#A1A1AA]">Status: {course.status}</div>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-2 text-xs text-[#F1F5F9]">
                        Open
                        <FiArrowRight className="h-4 w-4" />
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {!loading && archivedCourses.length > 0 && (
              <section className="rounded-xl border border-[#404040] bg-[#1A1A1A] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-[18px] font-medium">Archived Courses</h2>
                  <span className="text-xs text-[#A1A1AA]">{archivedCourses.length}</span>
                </div>

                <div className="space-y-2">
                  {archivedCourses.map((course) => (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() => navigate(course.path)}
                      className="flex w-full items-center justify-between rounded-lg border border-[#404040] bg-[#131313] p-3 text-left opacity-80 hover:bg-[#1d1d1d]"
                    >
                      <span className="text-sm text-[#F1F5F9]">{course.title}</span>
                      <FiArrowRight className="h-4 w-4 text-[#A1A1AA]" />
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </section>
  );
}
