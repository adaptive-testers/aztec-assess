import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { privateApi } from "../../api/axios";
import { QUIZZES } from "../../api/endpoints";
import type { Quiz } from "../../types/quizTypes";

interface StudentQuizListProps {
  /** When provided (e.g. from /courses/:courseId/quizzes), scope list to this course and pass in nav state for "Back to Quizzes". */
  courseId?: string;
}

type ViewMode = "all" | "byChapter";

function groupQuizzesByChapter(quizzes: Quiz[]): Map<string, { title: string; orderIndex: number; quizzes: Quiz[] }> {
  const map = new Map<string, { title: string; orderIndex: number; quizzes: Quiz[] }>();
  for (const q of quizzes) {
    const key = String(q.chapter.id);
    const existing = map.get(key);
    const orderIndex = q.chapter.order_index ?? 0;
    if (existing) {
      existing.quizzes.push(q);
    } else {
      map.set(key, { title: q.chapter.title, orderIndex, quizzes: [q] });
    }
  }
  return map;
}

export default function StudentQuizList({ courseId: courseIdProp }: StudentQuizListProps = {}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(
    () => (localStorage.getItem("quizListViewMode") as ViewMode | null) ?? "all"
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [viewTransitioning, setViewTransitioning] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const viewTransitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const courseId = courseIdProp ?? searchParams.get("course");
  const chapterId = searchParams.get("chapter");

  const chaptersGrouped = useMemo(() => groupQuizzesByChapter(quizzes), [quizzes]);

  const fetchQuizzes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (courseId) params.append("course", courseId);
      if (chapterId) params.append("chapter", chapterId);
      const query = params.toString();
      const url = query ? `${QUIZZES.LIST}?${query}` : QUIZZES.LIST;
      const response = await privateApi.get(url);

      if (response.data.results && Array.isArray(response.data.results)) {
        setQuizzes(response.data.results);
      } else if (Array.isArray(response.data)) {
        setQuizzes(response.data);
      } else {
        setQuizzes([]);
        setError("Unexpected response format from server");
      }
    } catch (err: unknown) {
      setQuizzes([]);
      const ax = err as { response?: { status?: number; data?: { detail?: string } } };
      if (ax.response?.status === 401) {
        setError("You need to log in to view quizzes");
      } else {
        setError(ax.response?.data?.detail || "Failed to load quizzes");
      }
    } finally {
      setLoading(false);
    }
  }, [courseId, chapterId]);

  useEffect(() => {
    fetchQuizzes();
  }, [courseId, chapterId, fetchQuizzes]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const setViewModeWithTransition = (mode: ViewMode) => {
    if (viewTransitionTimeoutRef.current) clearTimeout(viewTransitionTimeoutRef.current);
    setViewTransitioning(true);
    setDropdownOpen(false);
    viewTransitionTimeoutRef.current = setTimeout(() => {
      viewTransitionTimeoutRef.current = null;
      setViewMode(mode);
      localStorage.setItem("quizListViewMode", mode);
      setViewTransitioning(false);
    }, 120);
  };

  useEffect(() => {
    return () => {
      if (viewTransitionTimeoutRef.current) clearTimeout(viewTransitionTimeoutRef.current);
    };
  }, []);

  const navState = courseId ? { fromCourseId: courseId } : undefined;

  const handleQuizAction = (quiz: Quiz) => {
    const status = quiz.attempt_status;
    const attemptId = quiz.attempt_id;
    if (status === "COMPLETED" && attemptId != null) {
      navigate(`/quiz-results/${attemptId}`, { state: navState });
      return;
    }
    if (status === "IN_PROGRESS" && attemptId != null) {
      navigate(`/quiz-questions/${attemptId}`, { state: navState });
      return;
    }
    navigate(`/quiz-landing/${quiz.id}`, { state: navState });
  };

  const getQuizStatus = (quiz: Quiz): "completed" | "in-progress" | "available" => {
    const status = quiz.attempt_status;
    if (status === "COMPLETED") return "completed";
    if (status === "IN_PROGRESS") return "in-progress";
    return "available";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  const rowClass =
    "flex items-center justify-between p-4 bg-secondary-background border-2 border-primary-border rounded-lg hover:border-primary-accent/25 transition-colors";
  const actionButtonClass =
    "flex items-center gap-2 rounded-lg border border-primary-border px-4 py-2 text-sm font-medium text-secondary-text transition-colors hover:bg-primary-accent/10 hover:border-primary-accent/50 hover:text-primary-accent";

  const renderQuizRow = (quiz: Quiz) => {
    const status = getQuizStatus(quiz);
    return (
      <div key={quiz.id} className={rowClass}>
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center">
            {status === "completed" ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#10B981]/10">
                <svg
                  className="h-6 w-6 text-[#10B981]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            ) : status === "in-progress" ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FB923C]/10">
                <svg
                  className="h-5 w-5 text-[#FB923C]"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#10B981]/10">
                <svg
                  className="h-5 w-5 text-[#10B981]"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            )}
          </div>
          <div>
            <h3 className="text-primary-text font-semibold text-sm">{quiz.title}</h3>
            <div className="flex items-center gap-3 text-secondary-text text-xs mt-0.5">
              <span>{quiz.chapter.title}</span>
              <span>{quiz.num_questions} Questions</span>
              <span>Added: {formatDate(quiz.created_at)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {status === "in-progress" && (
            <span className="rounded border border-[#FB923C]/25 bg-[#FB923C]/5 px-2 py-0.5 text-[#FB923C]/90 text-xs">
              In progress
            </span>
          )}
          <button
            type="button"
            className={actionButtonClass}
            onClick={() => handleQuizAction(quiz)}
          >
            {status === "completed" ? (
              <>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                View Results
              </>
            ) : status === "in-progress" ? (
              "Continue Quiz"
            ) : (
              "Take Quiz"
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-primary-text text-lg font-semibold tracking-wide">
            Available Quizzes
          </h2>
          <p className="text-secondary-text text-sm mt-1">
            Track your quizzes
          </p>
        </div>
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2 px-4 py-2 bg-secondary-background border-2 border-primary-border rounded-lg text-primary-text text-sm font-medium tracking-wide hover:border-primary-accent/50 transition-colors"
            aria-expanded={dropdownOpen}
            aria-haspopup="listbox"
            aria-label="View mode"
          >
            {viewMode === "all" ? "All quizzes" : "By chapter"}
            <svg
              className={`h-4 w-4 text-secondary-text transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {dropdownOpen && (
            <ul
              className="absolute right-0 top-full mt-1 z-20 min-w-[140px] rounded-lg border-2 border-primary-border bg-secondary-background py-1 shadow-lg"
              role="listbox"
            >
              <li role="option" aria-selected={viewMode === "all"}>
                <button
                  type="button"
                  onClick={() => setViewModeWithTransition("all")}
                  className={`w-full px-4 py-2 text-left text-sm transition-colors duration-150 ${
                    viewMode === "all"
                      ? "bg-primary-accent/10 text-primary-accent font-medium"
                      : "text-primary-text hover:bg-primary-border hover:text-primary-text"
                  }`}
                >
                  All quizzes
                </button>
              </li>
              <li role="option" aria-selected={viewMode === "byChapter"}>
                <button
                  type="button"
                  onClick={() => setViewModeWithTransition("byChapter")}
                  className={`w-full px-4 py-2 text-left text-sm transition-colors duration-150 ${
                    viewMode === "byChapter"
                      ? "bg-primary-accent/10 text-primary-accent font-medium"
                      : "text-primary-text hover:bg-primary-border hover:text-primary-text"
                  }`}
                >
                  By chapter
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between p-4 bg-secondary-background border-2 border-primary-border rounded-lg animate-pulse"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary-border" />
                <div className="flex flex-col gap-2">
                  <div className="h-4 w-32 rounded bg-primary-border" />
                  <div className="h-3 w-48 rounded bg-primary-border" />
                </div>
              </div>
              <div className="h-9 w-24 rounded bg-primary-border" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-4 bg-secondary-background border-2 border-primary-border rounded-lg">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      ) : quizzes.length === 0 ? (
        <div className="p-4 bg-secondary-background border-2 border-primary-border rounded-lg">
          <p className="text-secondary-text text-sm">No quizzes available.</p>
          <p className="text-secondary-text text-xs mt-1">
            Quizzes will appear here when your instructor adds them to the course.
          </p>
        </div>
      ) : (
        <div
          className={`transition-opacity duration-150 ease-out ${viewTransitioning ? "opacity-0" : "opacity-100"}`}
        >
          {viewMode === "all" ? (
            <div className="space-y-4">
              {quizzes.map((quiz) => renderQuizRow(quiz))}
            </div>
          ) : (
            <div className="space-y-6">
              {Array.from(chaptersGrouped.entries())
                .sort(([, a], [, b]) => a.orderIndex - b.orderIndex)
                .map(([chapterIdKey, { title, quizzes: chapterQuizzes }]) => (
                  <div key={chapterIdKey}>
                    <h3 className="text-primary-text text-sm font-semibold tracking-wide mb-3">{title}</h3>
                    <div className="space-y-4">
                      {chapterQuizzes.map((quiz) => renderQuizRow(quiz))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
