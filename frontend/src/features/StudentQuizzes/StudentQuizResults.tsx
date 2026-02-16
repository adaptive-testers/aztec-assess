import { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { privateApi } from "../../api/axios";
import type { Quiz } from "../../types/quiz";

interface AttemptResult {
  id: number;
  quiz: number;
  student: number;
  status: "COMPLETED";
  started_at: string;
  ended_at: string;
  num_answered: number;
  num_correct: number;
  score_percent: number | null;
  current_difficulty: string;
}

export default function StudentQuizResults() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const fromCourseId = (location.state as { fromCourseId?: string } | null)?.fromCourseId;
  const backToQuizzesPath = fromCourseId ? `/courses/${fromCourseId}/quizzes` : "/dashboard";

  const [attempt, setAttempt] = useState<AttemptResult | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (attemptId) {
      fetchAttemptResults();
    }
  }, [attemptId]);

  const fetchAttemptResults = async () => {
    try {
      setLoading(true);
      setError(null);

      const attemptResponse = await privateApi.get(`/attempts/${attemptId}/`);
      setAttempt(attemptResponse.data);

      const quizResponse = await privateApi.get(`/quizzes/${attemptResponse.data.quiz}/`);
      setQuiz(quizResponse.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load quiz results");
    } finally {
      setLoading(false);
    }
  };

  const getLetterGrade = (score: number): string => {
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
    return (
      <section className="flex w-full justify-center bg-[#0A0A0A] text-[#F1F5F9]">
        <div className="flex w-full max-w-[800px] items-center justify-center py-20">
          <p className="text-[#A1A1AA]">Loading quiz results...</p>
        </div>
      </section>
    );
  }

  if (error || !attempt || !quiz) {
    return (
      <section className="flex w-full justify-center bg-[#0A0A0A] text-[#F1F5F9]">
        <div className="flex w-full max-w-[800px] flex-col items-center justify-center gap-4 py-20">
          <p className="text-[#EF4444]">{error || "Results not found"}</p>
          <button
            onClick={() => navigate(backToQuizzesPath)}
            className="rounded-[7px] border border-[#404040] bg-transparent px-5 py-2 text-[13px] font-medium text-[#F1F5F9] transition-all duration-200 hover:border-[#525252] hover:bg-[#404040]"
          >
            {fromCourseId ? "Back to Quizzes" : "Back to Dashboard"}
          </button>
        </div>
      </section>
    );
  }

  const score = attempt.score_percent ?? 0;

  return (
    <section className="flex w-full justify-center bg-[#0A0A0A] text-[#F1F5F9]">
      <div className="flex w-full max-w-[800px] flex-col gap-6">
        {/* Page header */}
        <div className="flex flex-col items-start gap-1">
          <h1 className="text-[28px] font-medium leading-tight tracking-wide">
            {quiz.title}
          </h1>
          <p className="text-[15px] text-[#A1A1AA]">Quiz Results</p>
        </div>

        {/* Score Card */}
        <div className="w-full rounded-[13px] border border-[#404040] bg-[#1A1A1A] shadow-[0_4px_6px_rgba(0,0,0,0.25)]">
          <div className="flex items-center justify-between px-8 py-8">
            <div className="flex flex-col gap-1">
              <p className="text-[14px] text-[#A1A1AA]">Your Score</p>
              <div className="flex items-baseline gap-2">
                <span className="text-[64px] font-semibold leading-none">
                  {Math.round(score)}
                </span>
                <span className="text-[24px] text-[#A1A1AA]">/ 100</span>
              </div>
              <p className="text-[15px] text-[#10B981]">
                {getPerformanceText(score)}
              </p>
            </div>
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#FF7A7A]">
              <span className="text-[32px] font-bold text-[#FF7A7A]">
                {getLetterGrade(score)}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="w-full rounded-[13px] border border-[#404040] bg-[#1A1A1A] shadow-[0_4px_6px_rgba(0,0,0,0.25)]">
          <div className="px-8 py-6">
            <h2 className="text-[17px] font-medium text-[#F1F5F9] mb-4">Stats</h2>
            <div className="flex flex-col gap-3 text-[15px] text-[#F1F5F9]">
              <p>
                <span className="text-[#A1A1AA]">Correct answers: </span>
                <span className="font-medium">{attempt.num_correct}</span>
                <span className="text-[#A1A1AA]"> / {attempt.num_answered}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="pb-8">
          <button
            onClick={() => navigate(backToQuizzesPath)}
            className="w-full rounded-[7px] bg-[#FF7A7A] px-8 py-3 text-[15px] font-medium text-white transition-all duration-200 hover:bg-[#FF8F8F] hover:shadow-lg"
          >
            {fromCourseId ? "Back to Quizzes" : "Back to Dashboard"}
          </button>
        </div>
      </div>
    </section>
  );
}
