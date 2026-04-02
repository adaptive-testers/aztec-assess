import { Progress } from '@mantine/core';
import { useCallback, useEffect, useState } from 'react';

import { privateApi } from '../../api/axios';
import { QUIZZES } from '../../api/endpoints';
import type { Quiz, QuizAttempt } from '../../types/quizTypes';

import DashboardSkeleton from './DashboardSkeleton';

interface InstructorDashboardProps {
  userName: string;
}


function getPerformanceLabel(percentage: number): string {
  if (percentage >= 90) return 'Excellent';
  if (percentage >= 80) return 'Very Good';
  if (percentage >= 70) return 'Good';
  if (percentage >= 60) return 'Fair';
  return 'Needs Improvement';
}

function getScoreColor(percentage: number): string {
  if (percentage >= 80) return 'text-emerald-400';
  if (percentage >= 60) return 'text-amber-400';
  return 'text-[#F87171]';
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export default function InstructorDashboardPage({ userName: propUserName }: InstructorDashboardProps) {
  const displayName = propUserName || 'instructor';

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [completedAttempts, setCompletedAttempts] = useState<QuizAttempt[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch dashboard data - wrapped in useCallback so it can be called from multiple places
  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);

      const quizzesResponse = await privateApi.get(QUIZZES.LIST);
      const rawResults = quizzesResponse.data?.results || quizzesResponse.data;
      if (Array.isArray(rawResults) && rawResults.length > 0) {
        console.log('[InstructorDashboard] First raw quiz object keys:', Object.keys(rawResults[0]));
      }

      let allQuizzes: Quiz[];
      if (Array.isArray(quizzesResponse.data)) {
        allQuizzes = quizzesResponse.data;
      } else if (quizzesResponse.data?.results && Array.isArray(quizzesResponse.data.results)) {
        allQuizzes = quizzesResponse.data.results;
      } else {
        throw new Error('Invalid response format from quiz API');
      }



      // Fetch all attempts for quizzes that have been started
      const quizzesWithAttempt = allQuizzes.filter(
        (quiz) => quiz.attempt_id !== null && quiz.attempt_id !== undefined
      );

      if (quizzesWithAttempt.length === 0) {
        setQuizzes(allQuizzes);
        setCompletedAttempts([]);
        return;
      }

      const attemptPromises = quizzesWithAttempt.map((quiz) =>
        privateApi.get(QUIZZES.ATTEMPT_DETAIL(quiz.attempt_id!))
      );

      const attemptResponses = await Promise.all(attemptPromises);
      const allAttempts: QuizAttempt[] = attemptResponses.map((res) => res.data);

      // Filter for completed attempts based on QuizAttempt.status
      const completed = allAttempts.filter(
        (attempt) => attempt.status === 'COMPLETED'
      );
      setQuizzes(allQuizzes);
      setCompletedAttempts(completed);

    } catch (err) {
      console.error('[InstructorDashboard] Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const totalQuizzes = quizzes.length;

  // Create a Set of quiz IDs that have completed attempts
  const completedQuizIds = new Set(completedAttempts.map(attempt => attempt.quiz));
  const completedQuizzesCount = completedQuizIds.size;

  const overallAverage = completedAttempts.length > 0
    ? completedAttempts.reduce((sum, attempt) => sum + (attempt.score_percent || 0), 0) / completedAttempts.length : 0;

  const completionPercentage = totalQuizzes > 0
    ? (completedQuizzesCount / totalQuizzes) * 100 : 0;

  // Active quizzes (not yet completed)
  const activeQuizzes = quizzes
    .filter((q) => !completedQuizIds.has(q.id))
    .slice(0, 5);

  const recentAttempts = [...completedAttempts]
    .sort((a, b) => new Date(b.ended_at || b.started_at).getTime() - new Date(a.ended_at || a.started_at).getTime())
    .slice(0, 5);

  if (loading) {
    return <DashboardSkeleton userName={displayName} />;
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] w-full items-center justify-center">
        <div className="text-xl text-error-text">{error}</div>
      </div>
    );
  }

  const cardClass =
    'rounded-xl border-2 border-primary-border bg-secondary-background shadow-[0px_4px_12px_rgba(0,0,0,0.45)] p-5 sm:p-6';
  const rowClass =
    'rounded-lg border-2 border-primary-border bg-secondary-background p-4 transition-colors hover:border-primary-accent/25';
  const badgeClass =
    'rounded-md border border-primary-border bg-[#151515] px-2.5 py-1 text-[11px] font-medium leading-4 text-primary-text';

  return (
    <div className="geist-font flex min-h-0 w-full flex-1 flex-col gap-6 text-[#F1F5F9]">
      <div className="shrink-0">
        <h1 className="text-[24px] font-normal leading-9 tracking-[0.0703px] text-[#F1F5F9]">
          Welcome back, {displayName}
        </h1>
        <p className="mt-1 text-[15px] leading-[22px] text-[#A1A1AA]">Here&apos;s an overview of your courses.</p>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        <section className={`flex min-h-0 flex-col gap-4 ${cardClass}`}>
          <h2 className="text-[20px] font-normal leading-7 tracking-[-0.3125px] text-[#F1F5F9]">Class overview</h2>

          <div className="flex flex-col gap-1">
            <div className="flex flex-row items-center justify-between">
              <span className="text-[13px] font-normal text-[#A1A1AA]">Class average</span>
              <span className="text-[15px] font-semibold tabular-nums text-[#F1F5F9]">
                {completedAttempts.length > 0 ? `${Math.round(overallAverage)}%` : 'N/A'}
              </span>
            </div>
            <Progress value={overallAverage} color="cyan" size="sm" bg="#262626" className="w-full" />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex flex-row items-center justify-between">
              <span className="text-[13px] font-normal text-[#A1A1AA]">Quizzes graded</span>
              <span className="text-[15px] font-semibold tabular-nums text-[#F1F5F9]">
                {completedQuizzesCount}/{totalQuizzes}
              </span>
            </div>
            <Progress value={completionPercentage} color="orange" size="sm" bg="#262626" className="w-full" />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex flex-row items-center justify-between">
              <span className="text-[13px] font-normal text-[#A1A1AA]">Course engagement</span>
              <span className="text-[15px] font-semibold tabular-nums text-[#F1F5F9]">{Math.round(completionPercentage)}%</span>
            </div>
            <Progress value={completionPercentage} color="teal" size="sm" bg="#262626" className="w-full" />
          </div>
        </section>

        <section className={`flex min-h-0 flex-col overflow-hidden ${cardClass}`}>
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[20px] font-normal leading-7 tracking-[-0.3125px] text-[#F1F5F9]">Active quizzes</h2>
            <span className="text-[13px] text-[#A1A1AA]">{activeQuizzes.length} available</span>
          </div>

          {activeQuizzes.length === 0 ? (
            <div className="flex flex-1 items-center justify-center py-6 text-[15px] text-[#A1A1AA]">No active quizzes</div>
          ) : (
            <div className="scrollbar-dashboard mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
              <ul className="flex flex-col gap-3">
                {activeQuizzes.map((quiz) => (
                  <li key={quiz.id} className={rowClass}>
                    <div className="flex flex-col gap-1.5">
                      {quiz.chapter.course_title ? (
                        <div className="text-[12px] font-medium uppercase tracking-[0.06em] text-[#A1A1AA]">
                          {quiz.chapter.course_title}
                        </div>
                      ) : null}
                      <div className="text-[16px] font-normal leading-6 tracking-[-0.3125px] text-[#F1F5F9]">
                        {quiz.chapter.title}
                      </div>
                      <div className="text-[14px] leading-5 tracking-[-0.1504px] text-[#A1A1AA]">{quiz.title}</div>
                      <div className={`mt-1 w-fit ${badgeClass}`}>{quiz.num_questions} questions</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      <section className={`flex min-h-0 shrink-0 flex-col ${cardClass}`}>
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[20px] font-normal leading-7 tracking-[-0.3125px] text-[#F1F5F9]">Recent student activity</h2>
          <span className="text-[13px] text-[#A1A1AA]">{recentAttempts.length} shown</span>
        </div>

        {recentAttempts.length === 0 ? (
          <div className="py-6 text-center text-[15px] text-[#A1A1AA]">No completed quizzes yet</div>
        ) : (
          <div className="scrollbar-dashboard mt-3 max-h-[min(220px,32vh)] min-h-0 overflow-y-auto pr-1">
            <ul className="flex flex-col gap-3">
              {recentAttempts.map((attempt) => {
                const quiz = quizzes.find((q) => q.id === attempt.quiz);
                const scorePercent = attempt.score_percent || 0;
                const performanceLabel = getPerformanceLabel(scorePercent);
                const scoreColor = getScoreColor(scorePercent);

                return (
                  <li key={attempt.id}>
                    <div className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${rowClass}`}>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        {quiz?.chapter.course_title ? (
                          <div className="text-[12px] font-medium uppercase tracking-[0.06em] text-[#A1A1AA]">
                            {quiz.chapter.course_title}
                          </div>
                        ) : null}
                        <div className="truncate text-[16px] font-normal leading-6 tracking-[-0.3125px] text-[#F1F5F9]">
                          {quiz?.title || 'Quiz'}
                        </div>
                        <div className="truncate text-[14px] leading-5 text-[#A1A1AA]">{quiz?.chapter.title || 'Chapter'}</div>
                        <div className="text-[14px] leading-5 tracking-[-0.1504px] text-[#A1A1AA]">
                          {formatDate(attempt.ended_at || attempt.started_at)} · {attempt.num_correct}/{attempt.num_answered}{' '}
                          correct
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
                        <div className={`${scoreColor} text-xl font-semibold tabular-nums`}>{Math.round(scorePercent)}%</div>
                        <div className={badgeClass}>{performanceLabel}</div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
