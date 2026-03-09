import { Progress } from '@mantine/core';
import { useCallback, useEffect, useState } from 'react';
import { privateApi } from '../../api/axios';
import { AUTH, QUIZZES } from '../../api/endpoints';
import type { Quiz, QuizAttempt } from '../../types/quizTypes';

interface UserProfile {
  first_name?: string;
  last_name?: string;
  email?: string;
}


function getPerformanceLabel(percentage: number): string {
  if (percentage >= 90) return 'Excellent';
  if (percentage >= 80) return 'Very Good';
  if (percentage >= 70) return 'Good';
  if (percentage >= 60) return 'Fair';
  return 'Needs Improvement';
}

function getScoreColor(percentage: number): string {
  if (percentage >= 80) return 'text-green-500';
  if (percentage >= 60) return 'text-yellow-500';
  return 'text-red-500';
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export default function StudentDashboardPage() {
  const [userName, setUserName] = useState<string>('student');

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [completedAttempts, setCompletedAttempts] = useState<QuizAttempt[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data - wrapped in useCallback so it can be called from multiple places
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const quizzesResponse = await privateApi.get(QUIZZES.LIST);
      console.log('[Dashboard] Raw quiz list response:', quizzesResponse.data);
      const rawResults = quizzesResponse.data?.results || quizzesResponse.data;
      if (Array.isArray(rawResults) && rawResults.length > 0) {
        console.log('[Dashboard] First raw quiz object keys:', Object.keys(rawResults[0]));
        console.log('[Dashboard] First raw quiz object:', JSON.stringify(rawResults[0]));
      }

      let allQuizzes: Quiz[];
      if (Array.isArray(quizzesResponse.data)) {
        allQuizzes = quizzesResponse.data;
      } else if (quizzesResponse.data?.results && Array.isArray(quizzesResponse.data.results)) {
        allQuizzes = quizzesResponse.data.results;
      } else {
        throw new Error('Invalid response format from quiz API');
      }

      console.log('[Dashboard] Parsed quizzes:', allQuizzes.map(q => ({ id: q.id, title: q.title, attempt_id: q.attempt_id, attempt_status: q.attempt_status })));
      setQuizzes(allQuizzes);

      // Fetch all attempts for quizzes that have been started
      const quizzesWithAttempt = allQuizzes.filter(
        (quiz) => quiz.attempt_id !== null && quiz.attempt_id !== undefined
      );
      console.log('[Dashboard] Quizzes with attempt_id:', quizzesWithAttempt.length);

      if (quizzesWithAttempt.length === 0) {
        setCompletedAttempts([]);
        return;
      }

      const attemptPromises = quizzesWithAttempt.map((quiz) =>
        privateApi.get(QUIZZES.ATTEMPT_DETAIL(quiz.attempt_id!))
      );

      const attemptResponses = await Promise.all(attemptPromises);
      const allAttempts: QuizAttempt[] = attemptResponses.map((res) => res.data);
      console.log('[Dashboard] Fetched attempts:', allAttempts.map(a => ({ id: a.id, quiz: a.quiz, status: a.status, score_percent: a.score_percent })));

      // Filter for completed attempts based on QuizAttempt.status
      const completedAttempts = allAttempts.filter(
        (attempt) => attempt.status === 'COMPLETED'
      );
      console.log('[Dashboard] Completed attempts:', completedAttempts.length);
      setCompletedAttempts(completedAttempts);

    } catch (err) {
      console.error('[Dashboard] Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await privateApi.get(AUTH.PROFILE);
        const profile: UserProfile = response.data;
        if (profile.first_name) {
          setUserName(profile.first_name);
        }
      } catch (error) {
        // Silent fail for profile fetch
      }
    };

    fetchProfile();
  }, []);

  useEffect(() => {
    fetchDashboardData();
    // Re-fetch whenever the user navigates to the dashboard (location.key changes on every navigation)
  }, [fetchDashboardData]);

  const totalQuizzes = quizzes.length;

  // Create a Set of quiz IDs that have completed attempts
  const completedQuizIds = new Set(completedAttempts.map(attempt => attempt.quiz));
  const completedQuizzesCount = completedQuizIds.size;

  const overallAverage = completedAttempts.length > 0
    ? completedAttempts.reduce((sum, attempt) => sum + (attempt.score_percent || 0), 0) / completedAttempts.length
    : 0;

  const completionPercentage = totalQuizzes > 0
    ? (completedQuizzesCount / totalQuizzes) * 100
    : 0;

  // Filter out quizzes that have been completed (based on QuizAttempt status)
  const upcomingQuizzes = quizzes
    .filter((q) => !completedQuizIds.has(q.id))
    .slice(0, 5);

  const recentAttempts = [...completedAttempts]
    .sort((a, b) => new Date(b.ended_at || b.started_at).getTime() - new Date(a.ended_at || a.started_at).getTime())
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-primary-background">
        <div className="text-primary-text text-xl">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-primary-background">
        <div className="text-red-500 text-xl">{error}</div>
      </div>
    );
  }

  return <>
    <div className="grid grid-rows-[auto_auto_1fr_auto] grid-cols-2 min-h-screen w-full gap-4 geist-font">

      <div className="row-span-1 col-span-2 text-primary-text flex flex-col items-center">
        <div className="tracking-wide font-medium text-3xl">Welcome Back, {userName}!</div>
        <div className="tracking-wide text-secondary-text text-lg"> Here's what's happening in your courses.</div>
      </div>

      <div className="flex flex-col row-span-2 col-span-1 bg-secondary-background w-full h-full border-2 border-primary-border rounded-2xl p-6 gap-8">

        <div className="text-primary-text text-xl font-semibold tracking-wide">
          Performance Overview
        </div>

        <div className="flex flex-col gap-1">

          <div className="flex flex-row justify-between items-center">
            <div className="text-secondary-text text-sm font-medium tracking-wide">
              Overall Average
            </div>
            <div className="text-primary-text text-lg font-bold">
              {completedAttempts.length > 0 ? `${Math.round(overallAverage)}%` : 'N/A'}
            </div>

          </div>

          <div className="text-primary-text">
            <Progress value={overallAverage} color="green" size="md" bg="#262626" className="w-full" />
          </div>
        </div>

        <div className="flex flex-col gap-1">

          <div className="flex flex-row justify-between items-center">
            <div className="text-secondary-text text-sm font-medium tracking-wide">
              Quizzes Completed
            </div>
            <div className="text-primary-text text-lg font-bold">
              {completedQuizzesCount}/{totalQuizzes}
            </div>

          </div>

          <div className="text-primary-text">
            <Progress
              value={completionPercentage}
              color="red"
              size="md"
              bg="#262626"
              className="w-full"
            />
          </div>
        </div>


        <div className="flex flex-col gap-1">

          <div className="flex flex-row justify-between items-center">
            <div className="text-secondary-text text-sm font-medium tracking-wide">
              Course Progress
            </div>
            <div className="text-primary-text text-lg font-bold">
              {Math.round(completionPercentage)}%
            </div>

          </div>

          <div className="text-primary-text">
            <Progress
              value={completionPercentage}
              color="grape"
              size="md"
              bg="#262626"
              className="w-full"
            />
          </div>
        </div>
      </div>


      <div className="row-span-2 col-span-1 bg-secondary-background w-full h-full border-2 border-primary-border rounded-2xl p-6">
        <div className="flex flex-col gap-7">
          <div className="flex flex-row justify-between items-center">
            <div className="text-primary-text text-xl font-semibold tracking-wide">
              Upcoming Quizzes
            </div>
            <div className="text-secondary-text text-sm font-medium">
              {upcomingQuizzes.length} available
            </div>
          </div>

          {upcomingQuizzes.length === 0 ? (
            <div className="text-secondary-text text-center py-8">
              No upcoming quizzes available
            </div>
          ) : (
            <div className="flex flex-col gap-4 overflow-y-auto max-h-[500px] scrollbar-hide">
              {upcomingQuizzes.map((quiz) => (
                <div key={quiz.id} className="bg-secondary-background w-full border-2 border-primary-border rounded-2xl">
                  <div className="flex flex-col gap-2 p-4">
                    <div className="text-primary-text text-lg font-semibold">
                      {quiz.chapter.title}
                    </div>
                    <div className="text-secondary-text text-sm font-medium">
                      {quiz.title}
                    </div>
                    <div className="p-2 text-primary-text text-xs px-3 py-1.5 tracking-wide font-medium bg-secondary-background border-2 border-primary-border rounded-md w-fit mt-2">
                      {quiz.num_questions} Questions
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>


      <div className="row-span-1 col-span-2 bg-secondary-background w-full h-full border-2 border-primary-border rounded-2xl p-6">
        <div className="flex flex-col gap-7">
          <div className="text-primary-text text-xl font-semibold tracking-wide">
            Recent Quiz History
          </div>

          {recentAttempts.length === 0 ? (
            <div className="text-secondary-text text-center py-8">
              No completed quizzes yet
            </div>
          ) : (
            <div className="flex flex-col gap-4 overflow-y-auto max-h-[400px]">
              {recentAttempts.map((attempt) => {
                // Find the corresponding quiz for this attempt
                const quiz = quizzes.find((q) => q.id === attempt.quiz);
                const scorePercent = attempt.score_percent || 0;
                const performanceLabel = getPerformanceLabel(scorePercent);
                const scoreColor = getScoreColor(scorePercent);

                return (
                  <div key={attempt.id} className="bg-secondary-background w-full border-2 border-primary-border rounded-2xl">
                    <div className="flex justify-between p-4 items-center">
                      <div className="flex flex-col gap-1.5 p-2">
                        <div className="text-primary-text text-lg font-semibold">
                          {quiz?.title || 'Quiz'}
                        </div>
                        <div className="text-secondary-text text-sm font-medium">
                          {quiz?.chapter.title || 'Chapter'}
                        </div>
                        <div className="text-secondary-text text-sm">
                          Completed {formatDate(attempt.ended_at || attempt.started_at)}
                        </div>
                        <div className="text-secondary-text text-xs">
                          {attempt.num_correct}/{attempt.num_answered} correct
                        </div>
                      </div>
                      <div className="flex flex-col justify-center items-end gap-3">
                        <div className={`${scoreColor} text-2xl font-bold`}>
                          {Math.round(scorePercent)}%
                        </div>
                        <div className="bg-secondary-background border-2 border-primary-border rounded-md text-primary-text text-xs px-4 py-1.5 tracking-wide font-semibold">
                          {performanceLabel}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>


    </div>
  </>
}