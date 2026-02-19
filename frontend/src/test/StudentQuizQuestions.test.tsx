import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AxiosError } from "axios";
import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

import { privateApi } from "../api/axios";
import { QUIZZES } from "../api/endpoints";
import StudentQuizQuestions from "../features/StudentQuizzes/StudentQuizQuestions";

import { render } from "./utils";

// Mock the API
vi.mock("../api/axios", () => ({
  privateApi: {
    get: vi.fn(),
    post: vi.fn(),
  },
  publicApi: { post: vi.fn(() => Promise.reject(new Error("No refresh token"))) },
}));

vi.mock("@azure/msal-react", () => ({
  useMsal: () => ({ instance: {}, accounts: [], inProgress: 0 }),
}));

const mockNavigate = vi.fn();
const mockParams = { attemptId: "123" };
const mockLocation: { state: { fromCourseId?: string; firstQuestion?: unknown; initialState?: unknown } | null } = { 
  state: null 
};

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
    useLocation: () => mockLocation,
  };
});

vi.mock("axios", async () => {
  const actual = await vi.importActual<typeof import("axios")>("axios");
  const isAxiosErrorMock = (error: unknown): error is AxiosError => {
    return (
      typeof error === "object" &&
      error !== null &&
      "response" in error &&
      typeof (error as { response?: unknown }).response === "object"
    );
  };
  return {
    ...actual,
    default: {
      ...actual.default,
      isAxiosError: isAxiosErrorMock,
    },
    isAxiosError: isAxiosErrorMock,
  };
});

const api = privateApi as unknown as {
  get: Mock;
  post: Mock;
};

const mockQuestion = {
  id: 1,
  prompt: "What is the capital of France?",
  choices: ["London", "Paris", "Berlin", "Madrid"],
  difficulty: "MEDIUM" as const,
};

const mockAttemptState = {
  id: 123,
  status: "IN_PROGRESS",
  num_answered: 0,
  num_correct: 0,
  current_difficulty: "MEDIUM",
  current_question: mockQuestion,
};

describe("StudentQuizQuestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockLocation.state = null;
    mockParams.attemptId = "123";
  });

  describe("Loading State", () => {
    it("should display loading skeleton while fetching attempt state", () => {
      api.get.mockReturnValue(new Promise(() => {})); // Never resolves
      
      render(<StudentQuizQuestions />);
      
      // Check for loading skeleton elements
      const pulsingElements = document.querySelectorAll('.animate-pulse');
      expect(pulsingElements.length).toBeGreaterThan(0);
    });

    it("should fetch attempt state on mount when no initial state provided", async () => {
      api.get.mockResolvedValue({ data: mockAttemptState });
      
      render(<StudentQuizQuestions />);
      
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(QUIZZES.ATTEMPT_DETAIL("123"));
      });
    });
  });

  describe("Initial State from Location", () => {
    it("should use initial state from location if provided", async () => {
      mockLocation.state = {
        firstQuestion: mockQuestion,
        initialState: {
          attempt_id: 123,
          status: "IN_PROGRESS",
          num_answered: 0,
          num_correct: 0,
          current_difficulty: "MEDIUM",
        },
      };

      render(<StudentQuizQuestions />);

      await waitFor(() => {
        expect(screen.getByText("What is the capital of France?")).toBeInTheDocument();
      });

      // Should not fetch from API when initial state is provided
      expect(api.get).not.toHaveBeenCalled();
    });
  });

  describe("Question Display", () => {
    it("should display question prompt and choices", async () => {
      api.get.mockResolvedValue({ data: mockAttemptState });
      
      render(<StudentQuizQuestions />);
      
      await waitFor(() => {
        expect(screen.getByText("What is the capital of France?")).toBeInTheDocument();
      });
      
      expect(screen.getByText("London")).toBeInTheDocument();
      expect(screen.getByText("Paris")).toBeInTheDocument();
      expect(screen.getByText("Berlin")).toBeInTheDocument();
      expect(screen.getByText("Madrid")).toBeInTheDocument();
    });

    it("should display question counter", async () => {
      api.get.mockResolvedValue({ data: mockAttemptState });
      
      render(<StudentQuizQuestions />);
      
      await waitFor(() => {
        expect(screen.getByText("Question 1")).toBeInTheDocument();
      });
    });

    it("should display correct question counter for subsequent questions", async () => {
      api.get.mockResolvedValue({ 
        data: { 
          ...mockAttemptState, 
          num_answered: 5 
        } 
      });
      
      render(<StudentQuizQuestions />);
      
      await waitFor(() => {
        expect(screen.getByText("Question 6")).toBeInTheDocument();
      });
    });

    it("should display choice labels A, B, C, D", async () => {
      api.get.mockResolvedValue({ data: mockAttemptState });
      
      render(<StudentQuizQuestions />);
      
      await waitFor(() => {
        expect(screen.getByText("What is the capital of France?")).toBeInTheDocument();
      });
      
      expect(screen.getByText("A")).toBeInTheDocument();
      expect(screen.getByText("B")).toBeInTheDocument();
      expect(screen.getByText("C")).toBeInTheDocument();
      expect(screen.getByText("D")).toBeInTheDocument();
    });
  });

  describe("Answer Selection", () => {
    it("should allow selecting an answer choice", async () => {
      const user = userEvent.setup();
      api.get.mockResolvedValue({ data: mockAttemptState });
      
      render(<StudentQuizQuestions />);
      
      await waitFor(() => {
        expect(screen.getByText("Paris")).toBeInTheDocument();
      });
      
      const parisButton = screen.getByText("Paris").closest("button");
      await user.click(parisButton!);
      
      // Check if the button has the selected styling
      expect(parisButton).toHaveClass("border-primary-accent");
    });

    it("should enable submit button when choice is selected", async () => {
      const user = userEvent.setup();
      api.get.mockResolvedValue({ data: mockAttemptState });
      
      render(<StudentQuizQuestions />);
      
      await waitFor(() => {
        expect(screen.getByText("Submit Answer")).toBeInTheDocument();
      });
      
      const submitButton = screen.getByText("Submit Answer");
      expect(submitButton).toBeDisabled();
      
      const parisButton = screen.getByText("Paris").closest("button");
      await user.click(parisButton!);
      
      expect(submitButton).not.toBeDisabled();
    });

    it("should change selected choice when different option clicked", async () => {
      const user = userEvent.setup();
      api.get.mockResolvedValue({ data: mockAttemptState });
      
      render(<StudentQuizQuestions />);
      
      await waitFor(() => {
        expect(screen.getByText("Paris")).toBeInTheDocument();
      });
      
      const londonButton = screen.getByText("London").closest("button");
      await user.click(londonButton!);
      expect(londonButton).toHaveClass("border-primary-accent");
      
      const parisButton = screen.getByText("Paris").closest("button");
      await user.click(parisButton!);
      expect(parisButton).toHaveClass("border-primary-accent");
      expect(londonButton).not.toHaveClass("border-primary-accent");
    });
  });

  describe("Submit Answer", () => {
    it("should submit answer and display next question", async () => {
      const user = userEvent.setup();
      const nextQuestion = {
        id: 2,
        prompt: "What is 2 + 2?",
        choices: ["3", "4", "5", "6"],
        difficulty: "EASY" as const,
      };

      api.get.mockResolvedValue({ data: mockAttemptState });
      api.post.mockResolvedValue({
        data: {
          attempt_id: 123,
          status: "IN_PROGRESS",
          num_answered: 1,
          num_correct: 1,
          current_difficulty: "EASY",
          next_question: nextQuestion,
        },
      });
      
      render(<StudentQuizQuestions />);
      
      await waitFor(() => {
        expect(screen.getByText("What is the capital of France?")).toBeInTheDocument();
      });
      
      // Select answer and submit
      const parisButton = screen.getByText("Paris").closest("button");
      await user.click(parisButton!);
      await user.click(screen.getByText("Submit Answer"));
      
      // Check API call
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          QUIZZES.SUBMIT_ANSWER("123"),
          {
            question_id: 1,
            selected_index: 1,
          }
        );
      });
      
      // Check next question is displayed
      await waitFor(() => {
        expect(screen.getByText("What is 2 + 2?")).toBeInTheDocument();
      });
      expect(screen.getByText("Question 2")).toBeInTheDocument();
    });

    it("should display submitting state while posting answer", async () => {
      const user = userEvent.setup();
      api.get.mockResolvedValue({ data: mockAttemptState });
      api.post.mockReturnValue(new Promise(() => {})); // Never resolves
      
      render(<StudentQuizQuestions />);
      
      await waitFor(() => {
        expect(screen.getByText("What is the capital of France?")).toBeInTheDocument();
      });
      
      // Select answer and submit
      const parisButton = screen.getByText("Paris").closest("button");
      await user.click(parisButton!);
      await user.click(screen.getByText("Submit Answer"));
      
      // Check submitting state
      await waitFor(() => {
        expect(screen.getByText("Submitting...")).toBeInTheDocument();
      });
      
      // Submit button should be disabled
      expect(screen.getByText("Submitting...")).toBeDisabled();
    });

    it("should clear selected choice after successful submission", async () => {
      const user = userEvent.setup();
      const nextQuestion = {
        id: 2,
        prompt: "What is 2 + 2?",
        choices: ["3", "4", "5", "6"],
        difficulty: "EASY" as const,
      };

      api.get.mockResolvedValue({ data: mockAttemptState });
      api.post.mockResolvedValue({
        data: {
          attempt_id: 123,
          status: "IN_PROGRESS",
          num_answered: 1,
          num_correct: 1,
          current_difficulty: "EASY",
          next_question: nextQuestion,
        },
      });
      
      render(<StudentQuizQuestions />);
      
      await waitFor(() => {
        expect(screen.getByText("What is the capital of France?")).toBeInTheDocument();
      });
      
      // Select answer and submit
      const parisButton = screen.getByText("Paris").closest("button");
      await user.click(parisButton!);
      await user.click(screen.getByText("Submit Answer"));
      
      // Wait for next question
      await waitFor(() => {
        expect(screen.getByText("What is 2 + 2?")).toBeInTheDocument();
      });
      
      // Submit button should be disabled again (no selection)
      expect(screen.getByText("Submit Answer")).toBeDisabled();
    });

    it("should navigate to results when quiz is completed", async () => {
      const user = userEvent.setup();
      api.get.mockResolvedValue({ data: mockAttemptState });
      api.post.mockResolvedValue({
        data: {
          attempt_id: 123,
          status: "COMPLETED",
          num_answered: 10,
          num_correct: 8,
          current_difficulty: "HARD",
          next_question: null,
        },
      });
      
      render(<StudentQuizQuestions />);
      
      await waitFor(() => {
        expect(screen.getByText("What is the capital of France?")).toBeInTheDocument();
      });
      
      // Select answer and submit
      const parisButton = screen.getByText("Paris").closest("button");
      await user.click(parisButton!);
      await user.click(screen.getByText("Submit Answer"));
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/quiz-results/123", { state: undefined });
      });
    });

    it("should pass fromCourseId in navigation state when completing quiz", async () => {
      const user = userEvent.setup();
      mockLocation.state = { fromCourseId: "course-123" };
      
      api.get.mockResolvedValue({ data: mockAttemptState });
      api.post.mockResolvedValue({
        data: {
          attempt_id: 123,
          status: "COMPLETED",
          num_answered: 10,
          num_correct: 8,
          current_difficulty: "HARD",
          next_question: null,
        },
      });
      
      render(<StudentQuizQuestions />);
      
      await waitFor(() => {
        expect(screen.getByText("What is the capital of France?")).toBeInTheDocument();
      });
      
      // Select answer and submit
      const parisButton = screen.getByText("Paris").closest("button");
      await user.click(parisButton!);
      await user.click(screen.getByText("Submit Answer"));
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/quiz-results/123", { 
          state: { fromCourseId: "course-123" } 
        });
      });
    });

    it("should display error when submission fails", async () => {
      const user = userEvent.setup();
      api.get.mockResolvedValue({ data: mockAttemptState });
      api.post.mockRejectedValue({
        response: {
          data: { detail: "Answer submission failed" },
        },
      });
      
      render(<StudentQuizQuestions />);
      
      await waitFor(() => {
        expect(screen.getByText("What is the capital of France?")).toBeInTheDocument();
      });
      
      // Select answer and submit
      const parisButton = screen.getByText("Paris").closest("button");
      await user.click(parisButton!);
      await user.click(screen.getByText("Submit Answer"));
      
      await waitFor(() => {
        expect(screen.getByText("Answer submission failed")).toBeInTheDocument();
      });
    });

    it("should display generic error when no detail provided on submission failure", async () => {
      const user = userEvent.setup();
      api.get.mockResolvedValue({ data: mockAttemptState });
      api.post.mockRejectedValue({
        response: {},
      });
      
      render(<StudentQuizQuestions />);
      
      await waitFor(() => {
        expect(screen.getByText("What is the capital of France?")).toBeInTheDocument();
      });
      
      // Select answer and submit
      const parisButton = screen.getByText("Paris").closest("button");
      await user.click(parisButton!);
      await user.click(screen.getByText("Submit Answer"));
      
      await waitFor(() => {
        expect(screen.getByText("Failed to submit answer")).toBeInTheDocument();
      });
    });

    it("should display error when no next question received", async () => {
      const user = userEvent.setup();
      api.get.mockResolvedValue({ data: mockAttemptState });
      api.post.mockResolvedValue({
        data: {
          attempt_id: 123,
          status: "IN_PROGRESS",
          num_answered: 1,
          num_correct: 1,
          current_difficulty: "MEDIUM",
          next_question: null,
        },
      });
      
      render(<StudentQuizQuestions />);
      
      await waitFor(() => {
        expect(screen.getByText("What is the capital of France?")).toBeInTheDocument();
      });
      
      // Select answer and submit
      const parisButton = screen.getByText("Paris").closest("button");
      await user.click(parisButton!);
      await user.click(screen.getByText("Submit Answer"));
      
      await waitFor(() => {
        expect(screen.getByText("No next question received")).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("should display error message when attempt fetch fails", async () => {
      api.get.mockRejectedValue({
        response: {
          data: { detail: "Attempt not found" },
        },
      });
      
      render(<StudentQuizQuestions />);
      
      await waitFor(() => {
        expect(screen.getByText("Attempt not found")).toBeInTheDocument();
      });
    });

    it("should display generic error message when no detail provided", async () => {
      api.get.mockRejectedValue({
        response: {},
      });
      
      render(<StudentQuizQuestions />);
      
      await waitFor(() => {
        expect(screen.getByText("Failed to load quiz")).toBeInTheDocument();
      });
    });

    it("should display error when no current question available", async () => {
      api.get.mockResolvedValue({
        data: {
          id: 123,
          status: "IN_PROGRESS",
          num_answered: 0,
          num_correct: 0,
          current_difficulty: "MEDIUM",
          current_question: null,
        },
      });
      
      render(<StudentQuizQuestions />);
      
      await waitFor(() => {
        expect(screen.getByText("No question to show. Please start a new attempt from the quiz list.")).toBeInTheDocument();
      });
    });

    it("should display Back to Dashboard button when error occurs without courseId", async () => {
      api.get.mockRejectedValue({
        response: {
          data: { detail: "Error occurred" },
        },
      });
      
      render(<StudentQuizQuestions />);
      
      await waitFor(() => {
        expect(screen.getByText("Back to Dashboard")).toBeInTheDocument();
      });
    });

    it("should display Back to Quizzes button when error occurs with courseId", async () => {
      mockLocation.state = { fromCourseId: "course-123" };
      api.get.mockRejectedValue({
        response: {
          data: { detail: "Error occurred" },
        },
      });
      
      render(<StudentQuizQuestions />);
      
      await waitFor(() => {
        expect(screen.getByText("Back to Quizzes")).toBeInTheDocument();
      });
    });

    it("should navigate to dashboard when back button clicked without courseId", async () => {
      const user = userEvent.setup();
      api.get.mockRejectedValue({
        response: {
          data: { detail: "Error occurred" },
        },
      });
      
      render(<StudentQuizQuestions />);
      
      await waitFor(() => {
        expect(screen.getByText("Back to Dashboard")).toBeInTheDocument();
      });
      
      await user.click(screen.getByText("Back to Dashboard"));
      
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });

    it("should navigate to course quizzes when back button clicked with courseId", async () => {
      const user = userEvent.setup();
      mockLocation.state = { fromCourseId: "course-123" };
      api.get.mockRejectedValue({
        response: {
          data: { detail: "Error occurred" },
        },
      });
      
      render(<StudentQuizQuestions />);
      
      await waitFor(() => {
        expect(screen.getByText("Back to Quizzes")).toBeInTheDocument();
      });
      
      await user.click(screen.getByText("Back to Quizzes"));
      
      expect(mockNavigate).toHaveBeenCalledWith("/courses/course-123/quizzes");
    });
  });

  describe("Completed Quiz Redirect", () => {
    it("should redirect to results if attempt is already completed on load", async () => {
      api.get.mockResolvedValue({
        data: {
          id: 123,
          status: "COMPLETED",
          num_answered: 10,
          num_correct: 8,
          current_difficulty: "HARD",
          current_question: null,
        },
      });
      
      render(<StudentQuizQuestions />);
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/quiz-results/123", { state: undefined });
      });
    });

    it("should pass fromCourseId when redirecting completed attempt", async () => {
      mockLocation.state = { fromCourseId: "course-123" };
      api.get.mockResolvedValue({
        data: {
          id: 123,
          status: "COMPLETED",
          num_answered: 10,
          num_correct: 8,
          current_difficulty: "HARD",
          current_question: null,
        },
      });
      
      render(<StudentQuizQuestions />);
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/quiz-results/123", { 
          state: { fromCourseId: "course-123" } 
        });
      });
    });
  });

  describe("UI State", () => {
    it("should disable answer choices while submitting", async () => {
      const user = userEvent.setup();
      api.get.mockResolvedValue({ data: mockAttemptState });
      api.post.mockReturnValue(new Promise(() => {})); // Never resolves
      
      render(<StudentQuizQuestions />);
      
      await waitFor(() => {
        expect(screen.getByText("What is the capital of France?")).toBeInTheDocument();
      });
      
      // Select answer and submit
      const parisButton = screen.getByText("Paris").closest("button");
      await user.click(parisButton!);
      await user.click(screen.getByText("Submit Answer"));
      
      await waitFor(() => {
        expect(screen.getByText("Submitting...")).toBeInTheDocument();
      });
      
      // All choice buttons should be disabled during submission
      const londonButton = screen.getByText("London").closest("button");
      expect(londonButton).toBeDisabled();
      expect(parisButton).toBeDisabled();
    });

    it("should disable submit button when no choice selected", async () => {
      api.get.mockResolvedValue({ data: mockAttemptState });
      
      render(<StudentQuizQuestions />);
      
      await waitFor(() => {
        expect(screen.getByText("Submit Answer")).toBeInTheDocument();
      });
      
      expect(screen.getByText("Submit Answer")).toBeDisabled();
    });

    it("should apply correct styling to selected choice", async () => {
      const user = userEvent.setup();
      api.get.mockResolvedValue({ data: mockAttemptState });
      
      render(<StudentQuizQuestions />);
      
      await waitFor(() => {
        expect(screen.getByText("Paris")).toBeInTheDocument();
      });
      
      // Find the button containing "B" label
      const choiceLabels = screen.getAllByText("B");
      const labelB = choiceLabels.find(el => 
        el.className.includes("bg-primary-border")
      );
      
      expect(labelB).toBeInTheDocument();
      
      // Click Paris (choice B)
      const parisButton = screen.getByText("Paris").closest("button");
      await user.click(parisButton!);
      
      // Now label B should have selected styling
      await waitFor(() => {
        const selectedLabel = screen.getAllByText("B").find(el => 
          el.className.includes("bg-primary-accent")
        );
        expect(selectedLabel).toBeInTheDocument();
      });
    });
  });

  describe("Accessibility", () => {
    it("should have buttons for answer choices", async () => {
      api.get.mockResolvedValue({ data: mockAttemptState });
      
      render(<StudentQuizQuestions />);
      
      await waitFor(() => {
        expect(screen.getByText("What is the capital of France?")).toBeInTheDocument();
      });
      
      const londonButton = screen.getByText("London").closest("button");
      expect(londonButton).toBeInTheDocument();
      expect(londonButton?.tagName).toBe("BUTTON");
    });

    it("should have button for submit", async () => {
      api.get.mockResolvedValue({ data: mockAttemptState });
      
      render(<StudentQuizQuestions />);
      
      await waitFor(() => {
        expect(screen.getByText("Submit Answer")).toBeInTheDocument();
      });
      
      const submitButton = screen.getByText("Submit Answer");
      expect(submitButton.tagName).toBe("BUTTON");
    });
  });
});
