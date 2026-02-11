import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { privateApi } from "../../api/axios";
import type { Quiz } from "../../types/quiz";

export default function StudentQuizLanding() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (quizId) {
      fetchQuizDetails();
    }
  }, [quizId]);

  const fetchQuizDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await privateApi.get(`/quizzes/${quizId}/`);
      setQuiz(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load quiz details");
      console.error("Error fetching quiz:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = async () => {
    try {
      const response = await privateApi.post(`/quizzes/${quizId}/attempts/`);
      // Navigate to quiz attempt page with the attempt ID
      navigate(`/quiz-attempt/${response.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to start quiz");
      console.error("Error starting quiz:", err);
    }
  };

  if (loading) {
    return (
      <section className="flex w-full justify-center bg-[#0A0A0A] text-[#F1F5F9]">
        <div className="flex w-full max-w-[800px] items-center justify-center py-20">
          <p className="text-[#A1A1AA]">Loading quiz details...</p>
        </div>
      </section>
    );
  }

  if (error || !quiz) {
    return (
      <section className="flex w-full justify-center bg-[#0A0A0A] text-[#F1F5F9]">
        <div className="flex w-full max-w-[800px] flex-col items-center justify-center gap-4 py-20">
          <p className="text-[#EF4444]">{error || "Quiz not found"}</p>
          <button
            onClick={() => navigate("/student-quizzes")}
            className="rounded-[7px] border border-[#404040] bg-transparent px-5 py-2 text-[13px] font-medium text-[#F1F5F9] transition-all duration-200 hover:border-[#525252] hover:bg-[#404040]"
          >
            Back to Quizzes
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="flex w-full justify-center bg-[#0A0A0A] text-[#F1F5F9]">
      <div className="flex w-full max-w-[800px] flex-col gap-6">
        {/* Page header */}
        <div className="flex flex-col items-start gap-1">
          <h1 className="text-[28px] font-medium leading-tight tracking-wide">
            {quiz.title}
          </h1>
          <p className="text-[15px] text-[#A1A1AA]">{quiz.chapter.title}</p>
        </div>

        {/* Stats container */}
        <div className="w-full rounded-[13px] border border-[#404040] bg-[#1A1A1A] shadow-[0_4px_6px_rgba(0,0,0,0.25)]">
          <div className="grid grid-cols-2 gap-6 px-8 py-8">
            {/* Questions stat */}
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#7C3030]">
                <svg
                  className="h-8 w-8 text-[#F1F5F9]"
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
              <p className="text-[14px] text-[#F1F5F9]">
                {quiz.num_questions} Questions
              </p>
            </div>

            {/* Adaptive Mode stat */}
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#7C3030]">
                <svg
                  className="h-8 w-8 text-[#F1F5F9]"
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
              <p className="text-[14px] text-[#F1F5F9]">
                Adaptive Testing
              </p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="w-full rounded-[13px] border border-[#404040] bg-[#1A1A1A] shadow-[0_4px_6px_rgba(0,0,0,0.25)]">
          <div className="flex flex-col gap-4 px-6 py-6">
            <h2 className="text-[17px] font-medium text-[#F1F5F9]">
              Instructions
            </h2>
            <ul className="flex flex-col gap-3">
              <li className="flex items-start gap-3 text-[14px] leading-relaxed text-[#A1A1AA]">
                <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#EF4444]"></span>
                <span>Read each question carefully before selecting your answer</span>
              </li>
              <li className="flex items-start gap-3 text-[14px] leading-relaxed text-[#A1A1AA]">
                <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#EF4444]"></span>
                <span>Questions adapt based on your performance</span>
              </li>
              <li className="flex items-start gap-3 text-[14px] leading-relaxed text-[#A1A1AA]">
                <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#EF4444]"></span>
                <span>Answer all questions to complete the quiz</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-4 pb-8">
          <button
            onClick={() => navigate("/student-quizzes")}
            className="rounded-[7px] border border-[#404040] bg-transparent px-6 py-3 text-[15px] font-medium text-[#F1F5F9] transition-all duration-200 hover:border-[#525252] hover:bg-[#404040]"
          >
            Back to Quizzes
          </button>
          <button
            onClick={handleStartQuiz}
            className="flex-1 rounded-[7px] bg-[#FF7A7A] px-8 py-3 text-[15px] font-medium text-white transition-all duration-200 hover:bg-[#FF8F8F] hover:shadow-lg"
          >
            Start Quiz
          </button>
        </div>
      </div>
    </section>
  );
}
