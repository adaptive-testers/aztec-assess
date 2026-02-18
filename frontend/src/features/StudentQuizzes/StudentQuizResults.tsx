import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { privateApi } from "../../api/axios";
import { QUIZZES } from "../../api/endpoints";
import type { Quiz, QuizAttempt } from "../../types/quizTypes";

function formatDuration(started: string, ended: string | null): string {
  if (!ended) return "—";
  const totalSec = Math.round((new Date(ended).getTime() - new Date(started).getTime()) / 1000);
  if (totalSec < 60) return `${totalSec} sec`;
  const totalMin = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (totalMin < 60) return sec > 0 ? `${totalMin} min ${sec} sec` : `${totalMin} min`;
  const hr = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  return min > 0 ? `${hr} hr ${min} min` : `${hr} hr`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function ResultsLoadingSkeleton() {
  return (
    <section className="flex w-full justify-center bg-primary-background text-primary-text min-h-[60vh]">
      <div className="flex w-full max-w-[800px] flex-col gap-6 py-8">
        <div className="flex flex-col gap-2">
          <div className="h-8 w-3/4 max-w-md rounded bg-primary-border animate-pulse" />
          <div className="h-4 w-32 rounded bg-primary-border animate-pulse" />
        </div>
        <div className="w-full rounded-[13px] border-2 border-primary-border bg-secondary-background overflow-hidden">
          <div className="flex items-center justify-between px-8 py-8">
            <div className="flex flex-col gap-2">
              <div className="h-4 w-24 rounded bg-primary-border animate-pulse" />
              <div className="h-14 w-28 rounded bg-primary-border animate-pulse" />
              <div className="h-5 w-36 rounded bg-primary-border animate-pulse" />
            </div>
            <div className="h-24 w-24 rounded-full border-4 border-primary-border bg-secondary-background animate-pulse" />
          </div>
        </div>
        <div className="w-full rounded-[13px] border-2 border-primary-border bg-secondary-background px-8 py-6">
          <div className="h-5 w-16 rounded bg-primary-border animate-pulse mb-4" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="h-3 w-20 rounded bg-primary-border animate-pulse" />
                <div className="h-6 w-12 rounded bg-primary-border animate-pulse" />
              </div>
            ))}
          </div>
        </div>
        <div className="h-12 w-full max-w-sm rounded-lg bg-primary-border animate-pulse" />
      </div>
    </section>
  );
}

export default function StudentQuizResults() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const fromCourseId = (location.state as { fromCourseId?: string } | null)?.fromCourseId;
  const backToQuizzesPath = fromCourseId ? `/courses/${fromCourseId}/quizzes` : "/dashboard";

  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAttemptResults = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const attemptResponse = await privateApi.get(QUIZZES.ATTEMPT_DETAIL(attemptId!));
      const attemptData: QuizAttempt = attemptResponse.data;

      const [quizResponse] = await Promise.all([
        privateApi.get(QUIZZES.DETAIL(attemptData.quiz)),
      ]);

      setAttempt(attemptData);
      setQuiz(quizResponse.data);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { detail?: string } } };
      setError(ax.response?.data?.detail || "Failed to load quiz results");
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    if (attemptId) {
      fetchAttemptResults();
    }
  }, [attemptId, fetchAttemptResults]);

  const getLetterGrade = (score: number): string => {
    if (score === 100) return "A+";
    if (score >= 90) return "A";
    if (score >= 80) return "B+";
    if (score >= 70) return "B";
    if (score >= 60) return "C+";
    if (score >= 50) return "C";
    return "F";
  };

  const getPerformanceText = (score: number): string => {
    if (score >= 90) return "Excellent Work!";
    if (score >= 80) return "Great Performance!";
    if (score >= 70) return "Good Job!";
    if (score >= 60) return "Nice Effort!";
    return "Keep Practicing!";
  };

  if (loading) {
    return <ResultsLoadingSkeleton />;
  }

  if (error || !attempt || !quiz) {
    return (
      <section className="flex w-full justify-center bg-primary-background text-primary-text min-h-[40vh]">
        <div className="flex w-full max-w-[800px] flex-col items-center justify-center gap-4 py-20">
          <p className="text-error-text">{error || "Results not found"}</p>
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

  const score = attempt.score_percent ?? 0;
  const totalQuestions = quiz.num_questions ?? attempt.num_answered;
  const timeTaken = formatDuration(attempt.started_at, attempt.ended_at);

  return (
    <section className="flex w-full justify-center bg-primary-background text-primary-text min-h-[60vh]">
      <div className="flex w-full max-w-[800px] flex-col gap-6 py-8">
        {/* Page header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-wide text-primary-text">
            {quiz.title}
          </h1>
          <p className="text-sm text-secondary-text">Quiz Results</p>
        </div>

        {/* Score Card */}
        <div className="w-full rounded-[13px] border-2 border-primary-border bg-secondary-background shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 px-6 py-8 sm:px-8">
            <div className="flex flex-col gap-1">
              <p className="text-sm text-secondary-text">Your Score</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl sm:text-6xl font-semibold leading-none text-primary-text">
                  {Math.round(score)}
                </span>
                <span className="text-xl text-secondary-text">/ 100</span>
              </div>
              <p className="text-base text-[#10B981] font-medium">
                {getPerformanceText(score)}
              </p>
            </div>
            <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full border-4 border-primary-accent shrink-0">
              <span className="text-2xl sm:text-3xl font-bold text-primary-accent">
                {getLetterGrade(score)}
              </span>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="w-full rounded-[13px] border-2 border-primary-border bg-secondary-background px-6 py-6 sm:px-8">
          <h2 className="text-base font-semibold text-primary-text mb-4">Summary</h2>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <div>
              <p className="text-xs text-secondary-text uppercase tracking-wide">Correct</p>
              <p className="text-lg font-semibold text-primary-text mt-1">
                {attempt.num_correct} <span className="text-secondary-text font-normal">/ {attempt.num_answered}</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-secondary-text uppercase tracking-wide">Total questions</p>
              <p className="text-lg font-semibold text-primary-text mt-1">{totalQuestions}</p>
            </div>
            <div>
              <p className="text-xs text-secondary-text uppercase tracking-wide">Time taken</p>
              <p className="text-lg font-semibold text-primary-text mt-1">{timeTaken}</p>
            </div>
            <div>
              <p className="text-xs text-secondary-text uppercase tracking-wide">Completed</p>
              {attempt.ended_at ? (
                <>
                  <p className="text-lg font-semibold text-primary-text mt-1">{formatDate(attempt.ended_at)}</p>
                  <p className="text-xs text-secondary-text mt-0.5">{formatTime(attempt.ended_at)}</p>
                </>
              ) : (
                <p className="text-lg font-semibold text-primary-text mt-1">—</p>
              )}
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="pt-2">
          <button
            onClick={() => navigate(backToQuizzesPath)}
            className="w-full rounded-lg bg-primary-accent px-8 py-3 text-base font-medium text-primary-text transition-colors hover:bg-primary-accent-hover sm:max-w-xs"
          >
            {fromCourseId ? "Back to Quizzes" : "Back to Dashboard"}
          </button>
        </div>
      </div>
    </section>
  );
}
