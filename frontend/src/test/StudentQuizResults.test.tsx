import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AxiosError } from "axios";
import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

import { privateApi } from "../api/axios";
import { QUIZZES } from "../api/endpoints";
import StudentQuizResults from "../features/StudentQuizzes/StudentQuizResults";

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
const mockLocation: { state: { fromCourseId?: string } | null } = { 
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
  attempt_status: "COMPLETED" as const,
  attempt_id: 123,
};

const mockAttempt = {
  id: 123,
  quiz: 1,
  student: 1,
  status: "COMPLETED" as const,
  started_at: "2024-01-15T10:00:00Z",
  ended_at: "2024-01-15T10:15:30Z",
  score_percent: 85,
  num_answered: 10,
  num_correct: 9,
  current_difficulty: "MEDIUM" as const,
  current_question: null,
};

describe("StudentQuizResults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockLocation.state = null;
    mockParams.attemptId = "123";
  });

  describe("Loading State", () => {
    it("should display loading skeleton while fetching results", () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      api.get.mockReturnValue(new Promise(() => {})); // Never resolves
      
      render(<StudentQuizResults />);
      
      // Check for loading skeleton elements
      const pulsingElements = document.querySelectorAll('.animate-pulse');
      expect(pulsingElements.length).toBeGreaterThan(0);
    });

    it("should fetch attempt and quiz data on mount", async () => {
      api.get.mockImplementation((url: string) => {
        if (url.includes("/attempts/")) {
          return Promise.resolve({ data: mockAttempt });
        }
        return Promise.resolve({ data: mockQuiz });
      });
      
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(QUIZZES.ATTEMPT_DETAIL("123"));
        expect(api.get).toHaveBeenCalledWith(QUIZZES.DETAIL(1));
      });
    });
  });

  describe("Results Display", () => {
    beforeEach(() => {
      api.get.mockImplementation((url: string) => {
        if (url.includes("/attempts/")) {
          return Promise.resolve({ data: mockAttempt });
        }
        return Promise.resolve({ data: mockQuiz });
      });
    });

    it("should display quiz title and results heading", async () => {
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(screen.getByText("Introduction to Testing")).toBeInTheDocument();
      });
      
      expect(screen.getByText("Quiz Results")).toBeInTheDocument();
    });

    it("should display score percentage", async () => {
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(screen.getByText("85")).toBeInTheDocument();
      });
      
      expect(screen.getByText("/ 100")).toBeInTheDocument();
    });

    it("should display letter grade", async () => {
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(screen.getByText("B+")).toBeInTheDocument();
      });
    });

    it("should display performance text", async () => {
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(screen.getByText("Great Performance!")).toBeInTheDocument();
      });
    });

    it("should display correct answers count", async () => {
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(screen.getByText(/9/)).toBeInTheDocument();
      });
    });

    it("should display total questions", async () => {
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(screen.getByText("10")).toBeInTheDocument();
      });
    });

    it("should display time taken", async () => {
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(screen.getByText(/15 min 30 sec/)).toBeInTheDocument();
      });
    });

    it("should display completion date and time", async () => {
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        // Date formatting may vary by timezone/locale, just check it renders
        expect(screen.getByText(/Jan/)).toBeInTheDocument();
      });
    });

    it("should display summary section", async () => {
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(screen.getByText("Summary")).toBeInTheDocument();
      });
    });
  });

  describe("Letter Grades", () => {
    it("should display A+ for 100% score", async () => {
      api.get.mockImplementation((url: string) => {
        if (url.includes("/attempts/")) {
          return Promise.resolve({ 
            data: { ...mockAttempt, score_percent: 100, num_correct: 10 } 
          });
        }
        return Promise.resolve({ data: mockQuiz });
      });
      
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(screen.getByText("A+")).toBeInTheDocument();
      });
    });

    it("should display A for 90-99% score", async () => {
      api.get.mockImplementation((url: string) => {
        if (url.includes("/attempts/")) {
          return Promise.resolve({ 
            data: { ...mockAttempt, score_percent: 95 } 
          });
        }
        return Promise.resolve({ data: mockQuiz });
      });
      
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(screen.getByText("A")).toBeInTheDocument();
      });
    });

    it("should display B+ for 80-89% score", async () => {
      api.get.mockImplementation((url: string) => {
        if (url.includes("/attempts/")) {
          return Promise.resolve({ 
            data: { ...mockAttempt, score_percent: 85 } 
          });
        }
        return Promise.resolve({ data: mockQuiz });
      });
      
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(screen.getByText("B+")).toBeInTheDocument();
      });
    });

    it("should display B for 70-79% score", async () => {
      api.get.mockImplementation((url: string) => {
        if (url.includes("/attempts/")) {
          return Promise.resolve({ 
            data: { ...mockAttempt, score_percent: 75 } 
          });
        }
        return Promise.resolve({ data: mockQuiz });
      });
      
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(screen.getByText("B")).toBeInTheDocument();
      });
    });

    it("should display C+ for 60-69% score", async () => {
      api.get.mockImplementation((url: string) => {
        if (url.includes("/attempts/")) {
          return Promise.resolve({ 
            data: { ...mockAttempt, score_percent: 65 } 
          });
        }
        return Promise.resolve({ data: mockQuiz });
      });
      
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(screen.getByText("C+")).toBeInTheDocument();
      });
    });

    it("should display C for 50-59% score", async () => {
      api.get.mockImplementation((url: string) => {
        if (url.includes("/attempts/")) {
          return Promise.resolve({ 
            data: { ...mockAttempt, score_percent: 55 } 
          });
        }
        return Promise.resolve({ data: mockQuiz });
      });
      
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(screen.getByText("C")).toBeInTheDocument();
      });
    });

    it("should display F for scores below 50%", async () => {
      api.get.mockImplementation((url: string) => {
        if (url.includes("/attempts/")) {
          return Promise.resolve({ 
            data: { ...mockAttempt, score_percent: 40 } 
          });
        }
        return Promise.resolve({ data: mockQuiz });
      });
      
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(screen.getByText("F")).toBeInTheDocument();
      });
    });
  });

  describe("Performance Text", () => {
    it("should display 'Excellent Work!' for 90%+ score", async () => {
      api.get.mockImplementation((url: string) => {
        if (url.includes("/attempts/")) {
          return Promise.resolve({ 
            data: { ...mockAttempt, score_percent: 95 } 
          });
        }
        return Promise.resolve({ data: mockQuiz });
      });
      
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(screen.getByText("Excellent Work!")).toBeInTheDocument();
      });
    });

    it("should display 'Great Performance!' for 80-89% score", async () => {
      api.get.mockImplementation((url: string) => {
        if (url.includes("/attempts/")) {
          return Promise.resolve({ 
            data: { ...mockAttempt, score_percent: 85 } 
          });
        }
        return Promise.resolve({ data: mockQuiz });
      });
      
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(screen.getByText("Great Performance!")).toBeInTheDocument();
      });
    });

    it("should display 'Good Job!' for 70-79% score", async () => {
      api.get.mockImplementation((url: string) => {
        if (url.includes("/attempts/")) {
          return Promise.resolve({ 
            data: { ...mockAttempt, score_percent: 75 } 
          });
        }
        return Promise.resolve({ data: mockQuiz });
      });
      
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(screen.getByText("Good Job!")).toBeInTheDocument();
      });
    });

    it("should display 'Nice Effort!' for 60-69% score", async () => {
      api.get.mockImplementation((url: string) => {
        if (url.includes("/attempts/")) {
          return Promise.resolve({ 
            data: { ...mockAttempt, score_percent: 65 } 
          });
        }
        return Promise.resolve({ data: mockQuiz });
      });
      
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(screen.getByText("Nice Effort!")).toBeInTheDocument();
      });
    });

    it("should display 'Keep Practicing!' for scores below 60%", async () => {
      api.get.mockImplementation((url: string) => {
        if (url.includes("/attempts/")) {
          return Promise.resolve({ 
            data: { ...mockAttempt, score_percent: 45 } 
          });
        }
        return Promise.resolve({ data: mockQuiz });
      });
      
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(screen.getByText("Keep Practicing!")).toBeInTheDocument();
      });
    });
  });

  describe("Time Duration Formatting", () => {
    it("should display time in seconds for durations under 1 minute", async () => {
      api.get.mockImplementation((url: string) => {
        if (url.includes("/attempts/")) {
          return Promise.resolve({ 
            data: { 
              ...mockAttempt, 
              started_at: "2024-01-15T10:00:00Z",
              ended_at: "2024-01-15T10:00:45Z" // 45 seconds
            } 
          });
        }
        return Promise.resolve({ data: mockQuiz });
      });
      
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(screen.getByText("45 sec")).toBeInTheDocument();
      });
    });

    it("should display time in minutes for durations under 1 hour", async () => {
      api.get.mockImplementation((url: string) => {
        if (url.includes("/attempts/")) {
          return Promise.resolve({ 
            data: { 
              ...mockAttempt, 
              started_at: "2024-01-15T10:00:00Z",
              ended_at: "2024-01-15T10:05:00Z" // 5 minutes
            } 
          });
        }
        return Promise.resolve({ data: mockQuiz });
      });
      
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(screen.getByText("5 min")).toBeInTheDocument();
      });
    });

    it("should display time in hours for longer durations", async () => {
      api.get.mockImplementation((url: string) => {
        if (url.includes("/attempts/")) {
          return Promise.resolve({ 
            data: { 
              ...mockAttempt, 
              started_at: "2024-01-15T10:00:00Z",
              ended_at: "2024-01-15T12:30:00Z" // 2.5 hours
            } 
          });
        }
        return Promise.resolve({ data: mockQuiz });
      });
      
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(screen.getByText("2 hr 30 min")).toBeInTheDocument();
      });
    });

    it("should display dash when no end time", async () => {
      api.get.mockImplementation((url: string) => {
        if (url.includes("/attempts/")) {
          return Promise.resolve({ 
            data: { 
              ...mockAttempt, 
              ended_at: null
            } 
          });
        }
        return Promise.resolve({ data: mockQuiz });
      });
      
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(screen.getByText("Introduction to Testing")).toBeInTheDocument();
      });
      
      // Check for dash in multiple places where it might appear
      const dashElements = screen.getAllByText("—");
      expect(dashElements.length).toBeGreaterThan(0);
    });
  });

  describe("Navigation", () => {
    beforeEach(() => {
      api.get.mockImplementation((url: string) => {
        if (url.includes("/attempts/")) {
          return Promise.resolve({ data: mockAttempt });
        }
        return Promise.resolve({ data: mockQuiz });
      });
    });

    it("should display 'Back to Dashboard' button when no courseId provided", async () => {
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(screen.getByText("Back to Dashboard")).toBeInTheDocument();
      });
    });

    it("should display 'Back to Quizzes' button when courseId provided", async () => {
      mockLocation.state = { fromCourseId: "course-123" };
      
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(screen.getByText("Back to Quizzes")).toBeInTheDocument();
      });
    });

    it("should navigate to dashboard when back button clicked without courseId", async () => {
      const user = userEvent.setup();
      
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(screen.getByText("Back to Dashboard")).toBeInTheDocument();
      });
      
      await user.click(screen.getByText("Back to Dashboard"));
      
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });

    it("should navigate to course quizzes when back button clicked with courseId", async () => {
      const user = userEvent.setup();
      mockLocation.state = { fromCourseId: "course-123" };
      
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(screen.getByText("Back to Quizzes")).toBeInTheDocument();
      });
      
      await user.click(screen.getByText("Back to Quizzes"));
      
      expect(mockNavigate).toHaveBeenCalledWith("/courses/course-123/quizzes");
    });
  });

  describe("Error Handling", () => {
    it("should display error message when attempt fetch fails", async () => {
      api.get.mockRejectedValue({
        response: {
          data: { detail: "Attempt not found" },
        },
      });
      
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(screen.getByText("Attempt not found")).toBeInTheDocument();
      });
    });

    it("should display generic error message when no detail provided", async () => {
      api.get.mockRejectedValue({
        response: {},
      });
      
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(screen.getByText("Failed to load quiz results")).toBeInTheDocument();
      });
    });

    it("should display error message when data is missing", async () => {
      api.get.mockResolvedValue({ data: null });
      
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(screen.getByText("Failed to load quiz results")).toBeInTheDocument();
      });
    });

    it("should display Back to Dashboard button in error state without courseId", async () => {
      api.get.mockRejectedValue({
        response: {
          data: { detail: "Error occurred" },
        },
      });
      
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(screen.getByText("Back to Dashboard")).toBeInTheDocument();
      });
    });

    it("should display Back to Quizzes button in error state with courseId", async () => {
      mockLocation.state = { fromCourseId: "course-123" };
      api.get.mockRejectedValue({
        response: {
          data: { detail: "Error occurred" },
        },
      });
      
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(screen.getByText("Back to Quizzes")).toBeInTheDocument();
      });
    });

    it("should navigate when back button clicked in error state", async () => {
      const user = userEvent.setup();
      api.get.mockRejectedValue({
        response: {
          data: { detail: "Error occurred" },
        },
      });
      
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(screen.getByText("Back to Dashboard")).toBeInTheDocument();
      });
      
      await user.click(screen.getByText("Back to Dashboard"));
      
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });
  });

  describe("Summary Statistics", () => {
    beforeEach(() => {
      api.get.mockImplementation((url: string) => {
        if (url.includes("/attempts/")) {
          return Promise.resolve({ data: mockAttempt });
        }
        return Promise.resolve({ data: mockQuiz });
      });
    });

    it("should display correct number of questions answered", async () => {
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(screen.getByText("Introduction to Testing")).toBeInTheDocument();
      });
      
      // Find the element containing "Total questions" label and verify 10 appears nearby
      const totalQuestionsLabel = screen.getByText("Total questions", { selector: "p" });
      expect(totalQuestionsLabel).toBeInTheDocument();
      expect(totalQuestionsLabel.parentElement?.textContent).toContain("10");
    });

    it("should use num_answered when quiz num_questions is not available", async () => {
      api.get.mockImplementation((url: string) => {
        if (url.includes("/attempts/")) {
          return Promise.resolve({ data: mockAttempt });
        }
        return Promise.resolve({ data: { ...mockQuiz, num_questions: null } });
      });
      
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(screen.getByText("Introduction to Testing")).toBeInTheDocument();
      });
      
      // Should still display the number from attempt
      expect(screen.getByText("10")).toBeInTheDocument();
    });

    it("should display correct percentage when score_percent is 0", async () => {
      api.get.mockImplementation((url: string) => {
        if (url.includes("/attempts/")) {
          return Promise.resolve({ 
            data: { ...mockAttempt, score_percent: 0, num_correct: 0 } 
          });
        }
        return Promise.resolve({ data: mockQuiz });
      });
      
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(screen.getByText("Introduction to Testing")).toBeInTheDocument();
      });
      
      // Find the large score display (5xl text)
      const scoreElements = document.querySelectorAll('.text-5xl');
      const scoreElement = Array.from(scoreElements).find(el => el.textContent === "0");
      expect(scoreElement).toBeInTheDocument();
    });

    it("should round score percentage to nearest integer", async () => {
      api.get.mockImplementation((url: string) => {
        if (url.includes("/attempts/")) {
          return Promise.resolve({ 
            data: { ...mockAttempt, score_percent: 87.6 } 
          });
        }
        return Promise.resolve({ data: mockQuiz });
      });
      
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(screen.getByText("88")).toBeInTheDocument();
      });
    });
  });

  describe("Accessibility", () => {
    beforeEach(() => {
      api.get.mockImplementation((url: string) => {
        if (url.includes("/attempts/")) {
          return Promise.resolve({ data: mockAttempt });
        }
        return Promise.resolve({ data: mockQuiz });
      });
    });

    it("should have proper heading hierarchy", async () => {
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(screen.getByText("Introduction to Testing")).toBeInTheDocument();
      });
      
      // Check for h1
      const h1 = screen.getByRole("heading", { level: 1 });
      expect(h1).toHaveTextContent("Introduction to Testing");
      
      // Check for h2
      const h2 = screen.getByRole("heading", { level: 2 });
      expect(h2).toHaveTextContent("Summary");
    });

    it("should have button element for navigation", async () => {
      render(<StudentQuizResults />);
      
      await waitFor(() => {
        expect(screen.getByText("Back to Dashboard")).toBeInTheDocument();
      });
      
      const button = screen.getByText("Back to Dashboard");
      expect(button.tagName).toBe("BUTTON");
    });
  });
});
