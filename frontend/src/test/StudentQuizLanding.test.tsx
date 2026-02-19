import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AxiosError } from "axios";
import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

import { privateApi } from "../api/axios";
import { QUIZZES } from "../api/endpoints";
import StudentQuizLanding from "../features/StudentQuizzes/StudentQuizLanding";

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
const mockParams = { quizId: "1" };
const mockLocation: { state: { fromCourseId?: string } | null } = { state: null };
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

const mockQuiz = {
  id: 1,
  title: "Introduction to Testing",
  chapter: {
    id: 1,
    title: "Chapter 1: Basics",
    order_index: 1,
    course: "course-slug",
  },
  num_questions: 10,
  is_published: true,
  created_at: "2024-01-01T00:00:00Z",
  attempt_status: null,
  attempt_id: null,
};

describe("StudentQuizLanding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.state = null;
    mockParams.quizId = "1";
    mockNavigate.mockClear();
  });

  describe("Loading State", () => {
    it("should display loading skeleton while fetching quiz details", () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      api.get.mockReturnValue(new Promise(() => {})); // Never resolves
      
      render(<StudentQuizLanding />);
      
      // Check for loading skeleton elements
      const pulsingElements = document.querySelectorAll('.animate-pulse');
      expect(pulsingElements.length).toBeGreaterThan(0);
    });
  });

  describe("Quiz Details Display", () => {
    it("should display quiz details after successful fetch", async () => {
      api.get.mockResolvedValue({ data: mockQuiz });
      
      render(<StudentQuizLanding />);
      
      await waitFor(() => {
        expect(screen.getByText("Introduction to Testing")).toBeInTheDocument();
      });
      
      expect(screen.getByText("Chapter 1: Basics")).toBeInTheDocument();
      expect(screen.getByText("10 Questions")).toBeInTheDocument();
      expect(screen.getByText("Adaptive Testing")).toBeInTheDocument();
      expect(screen.getByText("Instructions")).toBeInTheDocument();
    });

    it("should display instructions for taking the quiz", async () => {
      api.get.mockResolvedValue({ data: mockQuiz });
      
      render(<StudentQuizLanding />);
      
      await waitFor(() => {
        expect(screen.getByText("Introduction to Testing")).toBeInTheDocument();
      });
      
      expect(screen.getByText(/Read each question carefully/)).toBeInTheDocument();
      expect(screen.getByText(/Questions adapt based on your performance/)).toBeInTheDocument();
      expect(screen.getByText(/Answer all questions to complete the quiz/)).toBeInTheDocument();
    });
  });

  describe("Error Handling - Fetch Quiz", () => {
    it("should display error message when fetching quiz fails", async () => {
      api.get.mockRejectedValue({
        response: { data: { detail: "Failed to load quiz" } },
      });
      
      render(<StudentQuizLanding />);
      
      await waitFor(() => {
        expect(screen.getByText("Failed to load quiz")).toBeInTheDocument();
      });
      
      expect(screen.getByText("Back to Dashboard")).toBeInTheDocument();
    });

    it("should display generic error message when no detail provided", async () => {
      api.get.mockRejectedValue({
        response: { data: {} },
      });
      
      render(<StudentQuizLanding />);
      
      await waitFor(() => {
        expect(screen.getByText("Failed to load quiz details")).toBeInTheDocument();
      });
    });

    it("should display 'Quiz not found' when quiz is null", async () => {
      api.get.mockResolvedValue({ data: null });
      
      render(<StudentQuizLanding />);
      
      await waitFor(() => {
        expect(screen.getByText("Quiz not found")).toBeInTheDocument();
      });
    });
  });

  describe("Navigation", () => {
    it("should navigate back to dashboard when no fromCourseId", async () => {
      api.get.mockResolvedValue({ data: mockQuiz });
      const user = userEvent.setup();
      
      render(<StudentQuizLanding />);
      
      await waitFor(() => {
        expect(screen.getByText("Introduction to Testing")).toBeInTheDocument();
      });
      
      const backButton = screen.getByText("Back to Dashboard");
      await user.click(backButton);
      
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });

    it("should navigate back to course quizzes when fromCourseId present", async () => {
      api.get.mockResolvedValue({ data: mockQuiz });
      mockLocation.state = { fromCourseId: "course-123" };
      const user = userEvent.setup();
      
      render(<StudentQuizLanding />);
      
      await waitFor(() => {
        expect(screen.getByText("Introduction to Testing")).toBeInTheDocument();
      });
      
      const backButton = screen.getByText("Back to Quizzes");
      await user.click(backButton);
      
      expect(mockNavigate).toHaveBeenCalledWith("/courses/course-123/quizzes");
    });

    it("should navigate back to dashboard from error page when no fromCourseId", async () => {
      api.get.mockRejectedValue({
        response: { data: { detail: "Quiz not found" } },
      });
      const user = userEvent.setup();
      
      render(<StudentQuizLanding />);
      
      await waitFor(() => {
        expect(screen.getByText("Quiz not found")).toBeInTheDocument();
      });
      
      const backButton = screen.getByText("Back to Dashboard");
      await user.click(backButton);
      
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });
  });

  describe("Start Quiz", () => {
    it("should start quiz and navigate to first question on success", async () => {
      api.get.mockResolvedValue({ data: mockQuiz });
      api.post.mockResolvedValue({
        status: 201,
        data: {
          attempt_id: 42,
          id: 42,
          status: "IN_PROGRESS",
          num_answered: 0,
          num_correct: 0,
          current_difficulty: "MEDIUM",
          question: {
            id: 1,
            prompt: "What is 2 + 2?",
            choices: ["3", "4", "5", "6"],
            difficulty: "EASY",
          },
        },
      });
      const user = userEvent.setup();
      
      render(<StudentQuizLanding />);
      
      await waitFor(() => {
        expect(screen.getByText("Introduction to Testing")).toBeInTheDocument();
      });
      
      const startButton = screen.getByText("Start Quiz");
      await user.click(startButton);
      
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(QUIZZES.START_ATTEMPT("1"));
        expect(mockNavigate).toHaveBeenCalledWith(
          "/quiz-questions/42",
          expect.objectContaining({
            state: expect.objectContaining({
              firstQuestion: expect.objectContaining({
                id: 1,
                prompt: "What is 2 + 2?",
              }),
              initialState: expect.objectContaining({
                attempt_id: 42,
                status: "IN_PROGRESS",
              }),
            }),
          })
        );
      });
    });

    it("should navigate to results when quiz completes immediately (no questions)", async () => {
      api.get.mockResolvedValue({ data: mockQuiz });
      api.post.mockResolvedValue({
        status: 200,
        data: {
          attempt_id: 42,
          id: 42,
          status: "COMPLETED",
        },
      });
      const user = userEvent.setup();
      
      render(<StudentQuizLanding />);
      
      await waitFor(() => {
        expect(screen.getByText("Introduction to Testing")).toBeInTheDocument();
      });
      
      const startButton = screen.getByText("Start Quiz");
      await user.click(startButton);
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          "/quiz-results/42",
          expect.objectContaining({ state: undefined })
        );
      });
    });

    it("should pass fromCourseId in navigation state when present", async () => {
      mockLocation.state = { fromCourseId: "course-123" };
      api.get.mockResolvedValue({ data: mockQuiz });
      api.post.mockResolvedValue({
        status: 201,
        data: {
          attempt_id: 42,
          id: 42,
          status: "IN_PROGRESS",
          question: { id: 1, prompt: "Test?", choices: ["A", "B"], difficulty: "EASY" },
        },
      });
      const user = userEvent.setup();
      
      render(<StudentQuizLanding />);
      
      await waitFor(() => {
        expect(screen.getByText("Introduction to Testing")).toBeInTheDocument();
      });
      
      const startButton = screen.getByText("Start Quiz");
      await user.click(startButton);
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          "/quiz-questions/42",
          expect.objectContaining({
            state: expect.objectContaining({
              fromCourseId: "course-123",
            }),
          })
        );
      });
    });

    it("should display 'Starting...' and disable button while starting", async () => {
      api.get.mockResolvedValue({ data: mockQuiz });
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      api.post.mockImplementation(() => new Promise(() => {})); // Never resolves
      const user = userEvent.setup();
      
      render(<StudentQuizLanding />);
      
      await waitFor(() => {
        expect(screen.getByText("Introduction to Testing")).toBeInTheDocument();
      });
      
      const startButton = screen.getByText("Start Quiz");
      await user.click(startButton);
      
      await waitFor(() => {
        expect(screen.getByText("Starting...")).toBeInTheDocument();
      });
      
      const startingButton = screen.getByText("Starting...");
      expect(startingButton).toBeDisabled();
    });
  });

  describe("Start Quiz Error Handling", () => {
    it("should handle 409 conflict with existing attempt", async () => {
      api.get.mockResolvedValue({ data: mockQuiz });
      api.post.mockRejectedValue({
        response: {
          status: 409,
          data: {
            detail: "Attempt in progress",
            attempt_id: 99,
          },
        },
      });
      const user = userEvent.setup();
      
      render(<StudentQuizLanding />);
      
      await waitFor(() => {
        expect(screen.getByText("Introduction to Testing")).toBeInTheDocument();
      });
      
      const startButton = screen.getByText("Start Quiz");
      await user.click(startButton);
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          "/quiz-questions/99",
          expect.objectContaining({ state: undefined })
        );
      });
    });

    it("should display error message for 409 without attempt_id", async () => {
      api.get.mockResolvedValue({ data: mockQuiz });
      api.post.mockRejectedValue({
        response: {
          status: 409,
          data: {
            detail: "Attempt already exists",
          },
        },
      });
      const user = userEvent.setup();
      
      render(<StudentQuizLanding />);
      
      await waitFor(() => {
        expect(screen.getByText("Introduction to Testing")).toBeInTheDocument();
      });
      
      const startButton = screen.getByText("Start Quiz");
      await user.click(startButton);
      
      await waitFor(() => {
        expect(screen.getByText(/You have an in-progress attempt/)).toBeInTheDocument();
      });
    });

    it("should handle 401 unauthorized error", async () => {
      api.get.mockResolvedValue({ data: mockQuiz });
      api.post.mockRejectedValue({
        response: {
          status: 401,
          data: { detail: "Unauthorized" },
        },
      });
      const user = userEvent.setup();
      
      render(<StudentQuizLanding />);
      
      await waitFor(() => {
        expect(screen.getByText("Introduction to Testing")).toBeInTheDocument();
      });
      
      const startButton = screen.getByText("Start Quiz");
      await user.click(startButton);
      
      await waitFor(() => {
        expect(screen.getByText("Your session has expired. Please log in again.")).toBeInTheDocument();
      });
    });

    it("should handle 404 not found error", async () => {
      api.get.mockResolvedValue({ data: mockQuiz });
      api.post.mockRejectedValue({
        response: {
          status: 404,
          data: { detail: "Not found" },
        },
      });
      const user = userEvent.setup();
      
      render(<StudentQuizLanding />);
      
      await waitFor(() => {
        expect(screen.getByText("Introduction to Testing")).toBeInTheDocument();
      });
      
      const startButton = screen.getByText("Start Quiz");
      await user.click(startButton);
      
      await waitFor(() => {
        expect(screen.getByText("Quiz not found. It may have been deleted.")).toBeInTheDocument();
      });
    });

    it("should handle generic start quiz error", async () => {
      api.get.mockResolvedValue({ data: mockQuiz });
      api.post.mockRejectedValue({
        response: {
          status: 500,
          data: { detail: "Server error" },
        },
      });
      const user = userEvent.setup();
      
      render(<StudentQuizLanding />);
      
      await waitFor(() => {
        expect(screen.getByText("Introduction to Testing")).toBeInTheDocument();
      });
      
      const startButton = screen.getByText("Start Quiz");
      await user.click(startButton);
      
      await waitFor(() => {
        expect(screen.getByText("Server error")).toBeInTheDocument();
      });
    });

    it("should fallback to error field if detail not present", async () => {
      api.get.mockResolvedValue({ data: mockQuiz });
      api.post.mockRejectedValue({
        response: {
          status: 500,
          data: { error: "Something went wrong" },
        },
      });
      const user = userEvent.setup();
      
      render(<StudentQuizLanding />);
      
      await waitFor(() => {
        expect(screen.getByText("Introduction to Testing")).toBeInTheDocument();
      });
      
      const startButton = screen.getByText("Start Quiz");
      await user.click(startButton);
      
      await waitFor(() => {
        expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      });
    });

    it("should display generic error message when no detail or error field", async () => {
      api.get.mockResolvedValue({ data: mockQuiz });
      api.post.mockRejectedValue({
        response: {
          status: 500,
          data: {},
        },
      });
      const user = userEvent.setup();
      
      render(<StudentQuizLanding />);
      
      await waitFor(() => {
        expect(screen.getByText("Introduction to Testing")).toBeInTheDocument();
      });
      
      const startButton = screen.getByText("Start Quiz");
      await user.click(startButton);
      
      await waitFor(() => {
        expect(screen.getByText("Failed to start quiz")).toBeInTheDocument();
      });
    });

    it("should display error when no attempt_id in response", async () => {
      api.get.mockResolvedValue({ data: mockQuiz });
      api.post.mockResolvedValue({
        status: 201,
        data: {
          status: "IN_PROGRESS",
          question: { id: 1, prompt: "Test?", choices: ["A", "B"], difficulty: "EASY" },
        },
      });
      const user = userEvent.setup();
      
      render(<StudentQuizLanding />);
      
      await waitFor(() => {
        expect(screen.getByText("Introduction to Testing")).toBeInTheDocument();
      });
      
      const startButton = screen.getByText("Start Quiz");
      await user.click(startButton);
      
      await waitFor(() => {
        expect(screen.getByText("Invalid response from server - no attempt ID returned")).toBeInTheDocument();
      });
      
      // Should not navigate
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe("Button States", () => {
    it("should disable back button while starting quiz", async () => {
      api.get.mockResolvedValue({ data: mockQuiz });
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      api.post.mockImplementation(() => new Promise(() => {})); // Never resolves
      const user = userEvent.setup();
      
      render(<StudentQuizLanding />);
      
      await waitFor(() => {
        expect(screen.getByText("Introduction to Testing")).toBeInTheDocument();
      });
      
      const startButton = screen.getByText("Start Quiz");
      await user.click(startButton);
      
      await waitFor(() => {
        expect(screen.getByText("Starting...")).toBeInTheDocument();
      });
      
      const backButton = screen.getByText("Back to Dashboard");
      expect(backButton).toBeDisabled();
    });

    it("should show error page after start quiz failure", async () => {
      api.get.mockResolvedValue({ data: mockQuiz });
      api.post.mockRejectedValue({
        response: {
          status: 500,
          data: { detail: "Server error" },
        },
      });
      const user = userEvent.setup();
      
      render(<StudentQuizLanding />);
      
      await waitFor(() => {
        expect(screen.getByText("Introduction to Testing")).toBeInTheDocument();
      });
      
      const startButton = screen.getByText("Start Quiz");
      await user.click(startButton);
      
      await waitFor(() => {
        expect(screen.getByText("Server error")).toBeInTheDocument();
      });
      
      // After start quiz error, component shows error page with only back button
      expect(screen.queryByText("Start Quiz")).not.toBeInTheDocument();
      expect(screen.getByText("Back to Dashboard")).toBeInTheDocument();
    });
  });

  describe("Quiz ID Parameter", () => {
    it("should fetch quiz details using quizId from params", async () => {
      mockParams.quizId = "123";
      api.get.mockResolvedValue({ data: mockQuiz });
      
      render(<StudentQuizLanding />);
      
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(QUIZZES.DETAIL("123"));
      });
    });

    it("should refetch when quizId param changes", async () => {
      api.get.mockResolvedValue({ data: mockQuiz });
      
      const { rerender } = render(<StudentQuizLanding />);
      
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(QUIZZES.DETAIL("1"));
      });
      
      // Change the quizId
      mockParams.quizId = "999";
      rerender(<StudentQuizLanding />);
      
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(QUIZZES.DETAIL("999"));
      });
    });
  });
});
