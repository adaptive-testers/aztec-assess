export default function StudentQuizLanding() {
  // Mock quiz data for demonstration
  const quizData = {
    title: "Binary Tree & Traversal",
    subtitle: "Module 4 Assessment",
    questions: 15,
    duration: 25,
    attemptsLeft: 3,
    topics: [
      "Binary Tree Basics",
      "Inorder Traversal",
      "Preorder Traversal",
      "Preorder Traversal",
      "Preorder Traversal",
      "Tree Height",
      "Balanced Trees",
    ],
    description:
      "A brief description of what this quiz covers and what learners can expect.",
    instructions: [
      "Read each question carefully before selecting your answer",
      "You cannot go back to previous questions once answered",
      "The timer will start once you begin the quiz",
      "Your progress will be saved if you need to exit",
    ],
  };

  return (
    <section className="flex w-full justify-center bg-[#0A0A0A] text-[#F1F5F9]">
      <div className="flex w-full max-w-[800px] flex-col gap-6">
        {/* Page header */}
        <div className="flex flex-col items-start gap-1">
          <h1 className="text-[28px] font-medium leading-tight tracking-wide">
            {quizData.title}
          </h1>
          <p className="text-[15px] text-[#A1A1AA]">{quizData.subtitle}</p>
        </div>

        {/* Stats container */}
        <div className="w-full rounded-[13px] border border-[#404040] bg-[#1A1A1A] shadow-[0_4px_6px_rgba(0,0,0,0.25)]">
          <div className="grid grid-cols-3 gap-6 px-8 py-8">
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
                {quizData.questions} Questions
              </p>
            </div>

            {/* Duration stat */}
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
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-[14px] text-[#F1F5F9]">
                {quizData.duration} Minutes
              </p>
            </div>

            {/* Attempts stat */}
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
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </div>
              <p className="text-[14px] text-[#F1F5F9]">
                {quizData.attemptsLeft} Attempts Left
              </p>
            </div>
          </div>
        </div>

        {/* Topics Covered */}
        <div className="w-full rounded-[13px] border border-[#404040] bg-[#1A1A1A] shadow-[0_4px_6px_rgba(0,0,0,0.25)]">
          <div className="flex flex-col gap-4 px-6 py-6">
            <h2 className="text-[17px] font-medium text-[#F1F5F9]">
              Topics Covered
            </h2>
            <div className="flex flex-wrap gap-2">
              {quizData.topics.map((topic, index) => (
                <span
                  key={index}
                  className="rounded-full bg-[#404040] px-4 py-2 text-[13px] text-[#F1F5F9]"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="w-full rounded-[13px] border border-[#404040] bg-[#1A1A1A] shadow-[0_4px_6px_rgba(0,0,0,0.25)]">
          <div className="flex flex-col gap-3 px-6 py-6">
            <h2 className="text-[17px] font-medium text-[#F1F5F9]">
              Description
            </h2>
            <p className="text-[14px] leading-relaxed text-[#A1A1AA]">
              {quizData.description}
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="w-full rounded-[13px] border border-[#404040] bg-[#1A1A1A] shadow-[0_4px_6px_rgba(0,0,0,0.25)]">
          <div className="flex flex-col gap-4 px-6 py-6">
            <h2 className="text-[17px] font-medium text-[#F1F5F9]">
              Instructions
            </h2>
            <ul className="flex flex-col gap-3">
              {quizData.instructions.map((instruction, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 text-[14px] leading-relaxed text-[#A1A1AA]"
                >
                  <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#EF4444]"></span>
                  <span>{instruction}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Start Quiz Button */}
        <div className="flex w-full justify-center pb-8">
          <button className="w-full max-w-[340px] rounded-[7px] bg-[#FF7A7A] px-8 py-3 text-[15px] font-medium text-white transition-all duration-200 hover:bg-[#FF6565]">
            Start Quiz
          </button>
        </div>
      </div>
    </section>
  );
}
