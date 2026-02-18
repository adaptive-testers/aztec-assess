import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { privateApi } from "../../api/axios";
import { QUIZZES } from "../../api/endpoints";
import type { Quiz } from "../../types/quizTypes";

export default function StudentQuizLanding() {
  const { quizId } = useParams<{ quizId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const fromCourseId = (location.state as { fromCourseId?: string } | null)?.fromCourseId;
  const backToQuizzesPath = fromCourseId ? `/courses/${fromCourseId}/quizzes` : "/dashboard";
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuizDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await privateApi.get(QUIZZES.DETAIL(quizId!));
      setQuiz(response.data);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { detail?: string } } };
      setError(ax.response?.data?.detail || "Failed to load quiz details");
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    if (quizId) {
      fetchQuizDetails();
    }
  }, [quizId, fetchQuizDetails]);

  const handleStartQuiz = async () => {
    try {
      setError(null);
      setStarting(true);
      const response = await privateApi.post(QUIZZES.START_ATTEMPT(quizId!));

      const attemptId = response.data.attempt_id ?? response.data.id;
      const firstQuestion = response.data.question;

      if (!attemptId) {
        setError("Invalid response from server - no attempt ID returned");
        setStarting(false);
        return;
      }

      // 200 = no questions (completed immediately); 201 = started with first question
      if (response.status === 200 || response.data.status === "COMPLETED") {
        navigate(`/quiz-results/${attemptId}`, { state: fromCourseId ? { fromCourseId } : undefined });
        return;
      }

      navigate(`/quiz-questions/${attemptId}`, {
        state: {
          ...(fromCourseId ? { fromCourseId } : {}),
          firstQuestion,
          initialState: {
            attempt_id: attemptId,
            status: response.data.status,
            num_answered: response.data.num_answered ?? 0,
            num_correct: response.data.num_correct ?? 0,
            current_difficulty: response.data.current_difficulty ?? "MEDIUM",
          },
        },
      });
    } catch (err: unknown) {
      const ax = err as { response?: { status?: number; data?: { detail?: string; error?: string; attempt_id?: number } } };
      if (ax.response?.status === 409) {
        const existingAttemptId = ax.response.data?.attempt_id;
        if (existingAttemptId != null) {
          navigate(`/quiz-questions/${existingAttemptId}`, { state: fromCourseId ? { fromCourseId } : undefined });
          return;
        }
        setError("You have an in-progress attempt. Go back and click Continue Quiz.");
      } else if (ax.response?.status === 401) {
        setError("Your session has expired. Please log in again.");
      } else if (ax.response?.status === 404) {
        setError("Quiz not found. It may have been deleted.");
      } else {
        setError(ax.response?.data?.detail || ax.response?.data?.error || "Failed to start quiz");
      }
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <section className="flex w-full justify-center bg-primary-background text-primary-text">
        <div className="flex w-full max-w-[800px] flex-col gap-6 py-8">
          <div className="flex flex-col gap-2">
            <div className="h-8 w-2/3 max-w-sm rounded bg-primary-border animate-pulse" />
            <div className="h-4 w-40 rounded bg-primary-border animate-pulse" />
          </div>
          <div className="w-full rounded-[13px] border-2 border-primary-border bg-secondary-background">
            <div className="grid grid-cols-2 gap-6 px-8 py-8">
              {[1, 2].map((i) => (
                <div key={i} className="flex flex-col items-center gap-3">
                  <div className="h-16 w-16 rounded-full bg-primary-border animate-pulse" />
                  <div className="h-4 w-24 rounded bg-primary-border animate-pulse" />
                </div>
              ))}
            </div>
          </div>
          <div className="w-full rounded-[13px] border-2 border-primary-border bg-secondary-background px-6 py-6">
            <div className="h-5 w-28 rounded bg-primary-border animate-pulse mb-4" />
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-4 w-full rounded bg-primary-border animate-pulse" />
              ))}
            </div>
          </div>
          <div className="flex gap-4">
            <div className="h-12 w-32 rounded-lg bg-primary-border animate-pulse" />
            <div className="h-12 flex-1 max-w-[200px] rounded-lg bg-primary-border animate-pulse" />
          </div>
        </div>
      </section>
    );
  }

  if (error || !quiz) {
    return (
      <section className="flex w-full justify-center bg-primary-background text-primary-text">
        <div className="flex w-full max-w-[800px] flex-col items-center justify-center gap-4 py-20">
          <p className="text-error-text">{error || "Quiz not found"}</p>
          <button
            onClick={() => navigate(backToQuizzesPath)}
            className="rounded-lg border-2 border-primary-border bg-transparent px-5 py-2 text-sm font-medium text-primary-text transition-colors hover:border-primary-accent/50 hover:bg-primary-accent/10"
          >
            {fromCourseId ? "Back to Quizzes" : "Back to Dashboard"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="flex w-full justify-center bg-primary-background text-primary-text">
      <div className="flex w-full max-w-[800px] flex-col gap-6">
        {/* Page header */}
        <div className="flex flex-col items-start gap-1">
          <h1 className="text-2xl font-semibold leading-tight tracking-wide text-primary-text">
            {quiz.title}
          </h1>
          <p className="text-sm text-secondary-text">{quiz.chapter.title}</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="w-full rounded-[13px] border border-error-text bg-error-text/10 px-6 py-4">
            <p className="text-error-text">{error}</p>
          </div>
        )}

        {/* Stats container */}
        <div className="w-full rounded-[13px] border-2 border-primary-border bg-secondary-background shadow-sm">
          <div className="grid grid-cols-2 gap-6 px-8 py-8">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-accent/15">
                <svg
                  className="h-8 w-8 text-primary-accent"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="text-sm text-primary-text">
                {quiz.num_questions} Questions
              </p>
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-accent/15">
                <svg
                  className="h-8 w-8 text-primary-accent"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <p className="text-sm text-primary-text">
                Adaptive Testing
              </p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="w-full rounded-[13px] border-2 border-primary-border bg-secondary-background shadow-sm">
          <div className="flex flex-col gap-4 px-6 py-6">
            <h2 className="text-base font-semibold text-primary-text">
              Instructions
            </h2>
            <ul className="flex flex-col gap-3">
              <li className="flex items-start gap-3 text-sm leading-relaxed text-secondary-text">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-accent"></span>
                <span>Read each question carefully before selecting your answer</span>
              </li>
              <li className="flex items-start gap-3 text-sm leading-relaxed text-secondary-text">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-accent"></span>
                <span>Questions adapt based on your performance</span>
              </li>
              <li className="flex items-start gap-3 text-sm leading-relaxed text-secondary-text">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-accent"></span>
                <span>Answer all questions to complete the quiz</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-4 pb-8">
          <button
            onClick={() => navigate(backToQuizzesPath)}
            className="rounded-lg border-2 border-primary-border bg-transparent px-6 py-3 text-[15px] font-medium text-primary-text transition-colors hover:border-primary-accent/50 hover:bg-primary-accent/10"
            disabled={starting}
          >
            {fromCourseId ? "Back to Quizzes" : "Back to Dashboard"}
          </button>
          <button
            onClick={handleStartQuiz}
            disabled={starting}
            className="flex-1 rounded-lg bg-primary-accent px-8 py-3 text-[15px] font-medium text-primary-text transition-colors hover:bg-primary-accent-hover hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {starting ? "Starting..." : "Start Quiz"}
          </button>
        </div>
      </div>
    </section>
  );
}
