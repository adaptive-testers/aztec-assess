import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { privateApi } from "../../api/axios";

interface Question {
  id: number;
  prompt: string;
  choices: string[];
  difficulty: "EASY" | "MEDIUM" | "HARD";
}

interface AttemptState {
  attempt_id: number;
  status: string;
  num_answered: number;
  num_correct: number;
  current_difficulty: string;
  current_question?: Question;
}

export default function StudentQuizQuestions() {
  const navigate = useNavigate();
  const location = useLocation();
  const { attemptId } = useParams<{ attemptId: string }>();
  
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [attemptState, setAttemptState] = useState<AttemptState | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choiceLabels = ["A", "B", "C", "D"];

  useEffect(() => {
    if (attemptId) {
      // Check if we have first question from navigation state (fresh start)
      const state = location.state as any;
      if (state?.firstQuestion && state?.initialState) {
        setCurrentQuestion(state.firstQuestion);
        setAttemptState(state.initialState);
        setLoading(false);
      } else {
        // Trying to resume - backend doesn't support this yet
        fetchAttemptState();
      }
    }
  }, [attemptId]);

  const fetchAttemptState = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await privateApi.get(`/attempts/${attemptId}/`);
      
      // If already completed, navigate to results
      if (response.data.status === "COMPLETED") {
        navigate(`/quiz-results/${attemptId}`);
        return;
      }
      
      // Backend doesn't return current_question, cannot resume
      setError("Cannot resume quiz. Please start a new quiz attempt.");
      
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load quiz");
    } finally {
      setLoading(false);
    }
  };

  const handleChoiceSelect = (index: number) => {
    setSelectedChoice(index);
  };

  const handleSubmitAnswer = async () => {
    if (selectedChoice === null || !currentQuestion) return;

    try {
      setSubmitting(true);
      setError(null);

      const response = await privateApi.post(`/attempts/${attemptId}/answer/`, {
        question_id: currentQuestion.id,
        selected_index: selectedChoice,
      });

      // Update attempt state
      setAttemptState({
        attempt_id: response.data.attempt_id,
        status: response.data.status,
        num_answered: response.data.num_answered,
        num_correct: response.data.num_correct,
        current_difficulty: response.data.current_difficulty,
        current_question: response.data.next_question,
      });

      // Check if quiz is completed
      if (response.data.status === "COMPLETED") {
        navigate(`/quiz-results/${attemptId}`);
      } else if (response.data.next_question) {
        // Move to next question
        setCurrentQuestion(response.data.next_question);
        setSelectedChoice(null);
      } else {
        setError("No next question received");
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to submit answer");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className="flex w-full justify-center bg-[#0A0A0A] text-[#F1F5F9] min-h-screen items-center">
        <p className="text-[#A1A1AA]">Loading quiz...</p>
      </section>
    );
  }

  if (error || !currentQuestion || !attemptState) {
    return (
      <section className="flex w-full justify-center bg-[#0A0A0A] text-[#F1F5F9] min-h-screen">
        <div className="flex w-full max-w-[680px] flex-col items-center justify-center py-8 px-4">
          <p className="text-[#EF4444] mb-4">{error || "Failed to load quiz"}</p>
          <button
            onClick={() => navigate("/student-quizzes")}
            className="rounded-[7px] border border-[#404040] bg-transparent px-6 py-3 text-[15px] font-medium text-[#F1F5F9] transition-all duration-200 hover:border-[#525252] hover:bg-[#404040]"
          >
            Back to Quizzes
          </button>
        </div>
      </section>
    );
  };


  return (
    <section className="flex w-full justify-center bg-[#0A0A0A] text-[#F1F5F9] min-h-screen">
      <div className="flex w-full max-w-[680px] flex-col py-8 px-4">
        {/* Question counter */}
        <div className="mb-12">
          <p className="text-[14px] text-[#A1A1AA]">
            Question {attemptState.num_answered + 1}
          </p>
          <p className="text-[12px] text-[#71717A] mt-1">
            Difficulty: {attemptState.current_difficulty}
          </p>
        </div>

        {/* Question prompt */}
        <div className="mb-12">
          <h2 className="text-[24px] font-normal leading-relaxed text-[#F1F5F9]">
            {currentQuestion.prompt}
          </h2>
        </div>

        {/* Answer choices */}
        <div className="flex flex-col gap-4 mb-12">
          {currentQuestion.choices.map((choice, index) => (
            <button
              key={index}
              onClick={() => handleChoiceSelect(index)}
              disabled={submitting}
              className={`
                w-full rounded-[10px] border-2 bg-[#1A1A1A] px-6 py-4 text-left 
                transition-all duration-200
                ${
                  selectedChoice === index
                    ? "border-[#FF7A7A]"
                    : "border-[#404040] hover:border-[#A1A1AA] hover:bg-[#252525]"
                }
                ${submitting ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              <div className="flex items-center gap-4">
                <span
                  className={`
                    flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md
                    text-[14px] font-medium
                    ${
                      selectedChoice === index
                        ? "bg-[#FF7A7A] text-white"
                        : "bg-[#2A2A2A] text-[#A1A1AA]"
                    }
                  `}
                >
                  {choiceLabels[index]}
                </span>
                <span className="text-[15px] text-[#F1F5F9]">{choice}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-[10px] border border-[#EF4444] bg-[#7C3030]/20 px-4 py-3">
            <p className="text-[#EF4444] text-[14px]">{error}</p>
          </div>
        )}

        {/* Submit button */}
        <div className="mt-auto pt-8">
          <button
            onClick={handleSubmitAnswer}
            disabled={selectedChoice === null || submitting}
            className={`
              w-full rounded-[7px] px-8 py-3 text-[15px] font-medium text-white
              transition-all duration-200
              ${
                selectedChoice === null || submitting
                  ? "bg-[#404040] cursor-not-allowed opacity-50"
                  : "bg-[#FF7A7A] hover:bg-[#FF8F8F] hover:shadow-lg"
              }
            `}
          >
            {submitting ? "Submitting..." : "Submit Answer"}
          </button>
        </div>
      </div>
    </section>
  );
}
