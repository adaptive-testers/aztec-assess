import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { privateApi } from "../../api/axios";
import type { Quiz, QuizAttempt } from "../../types/quiz";

export default function StudentQuizList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts] = useState<Record<number, QuizAttempt>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const courseId = searchParams.get("course");
  const chapterId = searchParams.get("chapter");

  useEffect(() => {
    fetchQuizzes();
  }, [courseId, chapterId]);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (courseId) params.append("course", courseId);
      if (chapterId) params.append("chapter", chapterId);

      const response = await privateApi.get(`/quizzes/?${params.toString()}`);
      setQuizzes(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load quizzes");
      console.error("Error fetching quizzes:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuizClick = (quizId: number) => {
    navigate(`/quiz-landing/${quizId}`);
  };

  const getQuizStatus = (quiz: Quiz) => {
    const attempt = attempts[quiz.id];
    if (attempt?.status === "COMPLETED") return "completed";
    if (attempt?.status === "IN_PROGRESS") return "in-progress";
    return "available";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  return (
    <section className="flex w-full justify-center bg-[#0A0A0A] text-[#F1F5F9]">
      <div className="flex w-full flex-col gap-4 md:gap-[26px]">
        {/* Page header */}
        <div className="flex flex-col items-start gap-[4px]">
          <h1 className="font-medium text-[26px] leading-[39px] tracking-wider">
            Available Quizzes
          </h1>
          <p className="text-[17px] leading-[26px] tracking-[0px] text-[#A1A1AA]">
            Track your quizzes
          </p>
        </div>

        {/* Quiz list container */}
        <div className="w-full rounded-[13px] border border-[#404040] bg-[#1A1A1A] shadow-[0_4px_6px_rgba(0,0,0,0.25)]">
          <div className="flex flex-col gap-4 px-[26px] py-6">
            {loading ? (
              <p className="text-[#A1A1AA]">Loading quizzes...</p>
            ) : error ? (
              <p className="text-[#EF4444]">{error}</p>
            ) : quizzes.length === 0 ? (
              <p className="text-[#A1A1AA]">No quizzes available yet.</p>
            ) : (
              quizzes.map((quiz) => {
                const status = getQuizStatus(quiz);
                return (
                  <div
                    key={quiz.id}
                    className="flex items-center justify-between rounded-[7px] border border-[#404040] bg-[#1A1A1A] p-4 transition-all duration-200 hover:border-white cursor-pointer"
                    onClick={() => handleQuizClick(quiz.id)}
                  >
                    {/* Quiz info/status */}
                    <div className="flex items-center gap-4">
                      {/* Status icon */}
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

                      {/* Quiz details */}
                      <div className="flex flex-col gap-1">
                        <h3 className="text-[15px] font-medium leading-[23px] text-[#F1F5F9]">
                          {quiz.title}
                        </h3>
                        <div className="flex items-center gap-3 text-[13px] text-[#A1A1AA]">
                          <div className="flex items-center gap-1">
                            <span>{quiz.chapter.title}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>{quiz.num_questions} Questions</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>Added: {formatDate(quiz.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quiz actions */}
                    <div className="flex items-center gap-3">
                      {/* Status badge */}
                      {status === "in-progress" && (
                        <span className="rounded-full bg-[#FB923C] px-4 py-1 text-[13px] font-medium text-white">
                          In Progress
                        </span>
                      )}

                      {/* Action button */}
                      <button 
                        className="flex items-center gap-2 rounded-[7px] border border-[#404040] bg-transparent px-5 py-2 text-[13px] font-medium text-[#F1F5F9] transition-all duration-200 hover:border-[#525252] hover:bg-[#404040]"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuizClick(quiz.id);
                        }}
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
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}