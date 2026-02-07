export default function StudentQuizList() {
  // Mock quiz data for demonstration
  const quizzes = [
    {
      id: 1,
      title: "Basic Algebra Review",
      startDate: "11/15/2024",
      dueDate: "11/20/2024",
      status: "completed",
    },
    {
      id: 2,
      title: "Linear Equations",
      startDate: "11/22/2024",
      dueDate: "11/27/2024",
      status: "completed",
    },
    {
      id: 3,
      title: "Quadratic Functions",
      startDate: "12/1/2024",
      dueDate: "12/6/2024",
      status: "available",
    },
    {
      id: 4,
      title: "Polynomial Operations",
      startDate: "12/15/2024",
      dueDate: "12/20/2024",
      status: "due-soon",
    },
    {
      id: 5,
      title: "Polynomial Operations",
      startDate: "12/15/2024",
      dueDate: "12/20/2024",
      status: "past-due",
    },
  ];

  return (
    <section className="flex w-full justify-center bg-[#0A0A0A] text-[#F1F5F9]">
      <div className="flex w-full flex-col gap-4 md:gap-[26px]">
        {/* Page header */}
        <div className="flex flex-col items-start gap-[4px]">
          <h1 className="font-medium text-[26px] leading-[39px] tracking-wider">
            Class Name
          </h1>
          <p className="text-[17px] leading-[26px] tracking-[0px] text-[#A1A1AA]">
            Track your quizzes
          </p>
        </div>

        {/* Quiz list container */}
        <div className="w-full rounded-[13px] border border-[#404040] bg-[#1A1A1A] shadow-[0_4px_6px_rgba(0,0,0,0.25)]">
          <div className="flex flex-col gap-4 px-[26px] py-6">
            {quizzes.length === 0 ? (
              <p className="text-[#A1A1AA]">No quizzes available yet.</p>
            ) : (
              quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="flex items-center justify-between rounded-[7px] border border-[#404040] bg-[#1A1A1A] p-4 transition-all duration-200 hover:border-white"
                >
                  {/* Quiz info/status */}
                  <div className="flex items-center gap-4">
                    {/* Status icon */}
                    <div className="flex h-10 w-10 items-center justify-center">
                      {quiz.status === "completed" ? (
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
                      ) : quiz.status === "available" ? (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#10B981]/10">
                          <svg
                            className="h-5 w-5 text-[#10B981]"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      ) : quiz.status === "due-soon" ? (
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
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EF4444]/10">
                          <svg
                            className="h-5 w-5 text-[#EF4444]"
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
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <rect
                              x="3"
                              y="4"
                              width="18"
                              height="18"
                              rx="2"
                              ry="2"
                              strokeWidth={2}
                            />
                            <line x1="16" y1="2" x2="16" y2="6" strokeWidth={2} />
                            <line x1="8" y1="2" x2="8" y2="6" strokeWidth={2} />
                            <line x1="3" y1="10" x2="21" y2="10" strokeWidth={2} />
                          </svg>
                          <span>Start: {quiz.startDate}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <circle cx="12" cy="12" r="10" strokeWidth={2} />
                            <polyline
                              points="12 6 12 12 16 14"
                              strokeWidth={2}
                            />
                          </svg>
                          <span>Due: {quiz.dueDate}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quiz actions */}
                  <div className="flex items-center gap-3">
                    {/* Status badge */}
                    {quiz.status === "due-soon" && (
                      <span className="rounded-full bg-[#FB923C] px-4 py-1 text-[13px] font-medium text-white">
                        Due Soon
                      </span>
                    )}
                    {quiz.status === "past-due" && (
                      <span className="rounded-full bg-[#EF4444] px-4 py-1 text-[13px] font-medium text-white">
                        Past Due
                      </span>
                    )}

                    {/* Action button */}
                    <button className="flex items-center gap-2 rounded-[7px] border border-[#404040] bg-transparent px-5 py-2 text-[13px] font-medium text-[#F1F5F9] transition-all duration-200 hover:border-[#525252] hover:bg-[#404040]">
                      {quiz.status === "completed" ? (
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
                      ) : (
                        "Take Quiz"
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}