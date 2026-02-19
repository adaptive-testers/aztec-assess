import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { privateApi } from "../../api/axios";
import { QUIZZES } from "../../api/endpoints";
import type { AttemptStatus, Difficulty, Question } from "../../types/quizTypes";

interface AttemptState {
  attempt_id: number;
  status: AttemptStatus | string;
  num_answered: number;
  num_correct: number;
  current_difficulty: Difficulty | string;
  current_question?: Question;
}

export default function StudentQuizQuestions() {
  const navigate = useNavigate();
  const location = useLocation();
  const { attemptId } = useParams<{ attemptId: string }>();
  const fromCourseId = (location.state as { fromCourseId?: string } | null)?.fromCourseId;
  const backToQuizzesPath = fromCourseId ? `/courses/${fromCourseId}/quizzes` : "/dashboard";
  
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [attemptState, setAttemptState] = useState<AttemptState | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choiceLabels = ["A", "B", "C", "D"];

  const fetchAttemptState = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await privateApi.get(QUIZZES.ATTEMPT_DETAIL(attemptId!));

      if (response.data.status === "COMPLETED") {
        navigate(`/quiz-results/${attemptId}`, { state: fromCourseId ? { fromCourseId } : undefined });
        return;
      }

      const current = response.data.current_question;
      if (current) {
        setCurrentQuestion(current);
        setAttemptState({
          attempt_id: response.data.id,
          status: response.data.status,
          num_answered: response.data.num_answered ?? 0,
          num_correct: response.data.num_correct ?? 0,
          current_difficulty: response.data.current_difficulty ?? "MEDIUM",
        });
      } else {
        setError("No question to show. Please start a new attempt from the quiz list.");
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { detail?: string } } };
      setError(ax.response?.data?.detail || "Failed to load quiz");
    } finally {
      setLoading(false);
    }
  }, [attemptId, fromCourseId, navigate]);

  useEffect(() => {
    if (attemptId) {
      const state = location.state as { firstQuestion?: Question; initialState?: AttemptState } | null;
      if (state?.firstQuestion && state?.initialState) {
        setCurrentQuestion(state.firstQuestion);
        setAttemptState(state.initialState);
        setLoading(false);
      } else {
        fetchAttemptState();
      }
    }
  }, [attemptId, location.state, fetchAttemptState]);

  const handleChoiceSelect = (index: number) => {
    setSelectedChoice(index);
  };

  const handleSubmitAnswer = async () => {
    if (selectedChoice === null || !currentQuestion) return;

    try {
      setSubmitting(true);
      setError(null);

      const response = await privateApi.post(QUIZZES.SUBMIT_ANSWER(attemptId!), {
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
        navigate(`/quiz-results/${attemptId}`, { state: fromCourseId ? { fromCourseId } : undefined });
      } else if (response.data.next_question) {
        // Move to next question
        setCurrentQuestion(response.data.next_question);
        setSelectedChoice(null);
      } else {
        setError("No next question received");
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { detail?: string } } };
      setError(ax.response?.data?.detail || "Failed to submit answer");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className="flex w-full justify-center bg-primary-background text-primary-text">
        <div className="flex w-full max-w-[680px] flex-col px-4 py-6">
          <div className="mb-6">
            <div className="h-4 w-24 rounded bg-primary-border animate-pulse" />
          </div>
          <div className="mb-8">
            <div className="h-7 w-full max-w-md rounded bg-primary-border animate-pulse" />
          </div>
          <div className="flex flex-col gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-14 w-full rounded-[10px] border-2 border-primary-border bg-secondary-background animate-pulse"
              />
            ))}
          </div>
          <div className="h-12 w-full rounded-lg bg-primary-border animate-pulse pt-3" />
        </div>
      </section>
    );
  }

  if (error || !currentQuestion || !attemptState) {
    return (
      <section className="flex w-full justify-center bg-primary-background text-primary-text">
        <div className="flex w-full max-w-[680px] flex-col items-center justify-center py-8 px-4">
          <p className="text-error-text mb-4">{error || "Failed to load quiz"}</p>
          <button
            onClick={() => navigate(backToQuizzesPath)}
            className="rounded-lg border-2 border-primary-border bg-transparent px-6 py-3 text-[15px] font-medium text-primary-text transition-colors hover:border-primary-accent/50 hover:bg-primary-accent/10"
          >
            {fromCourseId ? "Back to Quizzes" : "Back to Dashboard"}
          </button>
        </div>
      </section>
    );
  }


  return (
    <section className="flex w-full justify-center bg-primary-background text-primary-text">
      <div className="flex w-full max-w-[680px] flex-col px-4 py-6">
        {/* Question counter */}
        <div className="mb-6">
          <p className="text-sm text-secondary-text">
            Question {attemptState.num_answered + 1}
          </p>
        </div>

        {/* Question prompt */}
        <div className="mb-8">
          <h2 className="text-2xl font-normal leading-relaxed text-primary-text">
            {currentQuestion.prompt}
          </h2>
        </div>

        {/* Answer choices */}
        <div className="flex flex-col gap-4 mb-8">
          {currentQuestion.choices.map((choice, index) => (
            <button
              key={index}
              onClick={() => handleChoiceSelect(index)}
              disabled={submitting}
              className={`
                w-full rounded-[10px] border-2 bg-secondary-background px-6 py-4 text-left
                transition-all duration-200
                ${
                  selectedChoice === index
                    ? "border-primary-accent"
                    : "border-primary-border hover:border-secondary-text hover:bg-secondary-accent-hover"
                }
                ${submitting ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              <div className="flex items-center gap-4">
                <span
                  className={`
                    flex h-8 w-8 shrink-0 items-center justify-center rounded-md
                    text-sm font-medium
                    ${
                      selectedChoice === index
                        ? "bg-primary-accent text-white"
                        : "bg-primary-border text-secondary-text"
                    }
                  `}
                >
                  {choiceLabels[index]}
                </span>
                <span className="text-[15px] text-primary-text">{choice}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-[10px] border border-error-text bg-error-text/10 px-4 py-3">
            <p className="text-error-text text-sm">{error}</p>
          </div>
        )}

        {/* Submit button */}
        <div className="pt-3">
          <button
            onClick={handleSubmitAnswer}
            disabled={selectedChoice === null || submitting}
            className={`
              w-full rounded-lg px-8 py-3 text-[15px] font-medium text-primary-text
              transition-all duration-200
              ${
                selectedChoice === null || submitting
                  ? "bg-primary-border cursor-not-allowed opacity-50"
                  : "bg-primary-accent hover:bg-primary-accent-hover hover:shadow-lg"
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
