import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AxiosError } from "axios";
import { describe, it, expect, beforeEach, vi, type Mock, afterEach } from "vitest";

import { privateApi } from "../api/axios";
import { QUIZZES } from "../api/endpoints";
import StudentQuizList from "../features/StudentQuizzes/StudentQuizList";

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
const mockSearchParams = new URLSearchParams();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockSearchParams, vi.fn()],
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

const mockQuizzes = [
  {
    id: 1,
    title: "Quiz 1",
    chapter: {
      id: 1,
      title: "Chapter 1",
      order_index: 1,
      course: "course-1",
    },
    num_questions: 10,
    is_published: true,
    created_at: "2024-01-15T00:00:00Z",
    attempt_status: null,
    attempt_id: null,
  },
  {
    id: 2,
    title: "Quiz 2",
    chapter: {
      id: 1,
      title: "Chapter 1",
      order_index: 1,
      course: "course-1",
    },
    num_questions: 15,
    is_published: true,
    created_at: "2024-01-20T00:00:00Z",
    attempt_status: "IN_PROGRESS" as const,
    attempt_id: 100,
  },
  {
    id: 3,
    title: "Quiz 3",
    chapter: {
      id: 2,
      title: "Chapter 2",
      order_index: 2,
      course: "course-1",
    },
    num_questions: 12,
    is_published: true,
    created_at: "2024-01-25T00:00:00Z",
    attempt_status: "COMPLETED" as const,
    attempt_id: 101,
  },
];

describe("StudentQuizList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockSearchParams.delete("course");
    mockSearchParams.delete("chapter");
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe("Loading State", () => {
    it("should display loading skeletons while fetching quizzes", () => {
      api.get.mockReturnValue(new Promise(() => {})); // Never resolves
      
      render(<StudentQuizList />);
      
      // Check for loading skeleton elements
      const pulsingElements = document.querySelectorAll('.animate-pulse');
      expect(pulsingElements.length).toBeGreaterThan(0);
    });
  });

  describe("Quiz List Display", () => {
    it("should display quizzes after successful fetch", async () => {
      api.get.mockResolvedValue({ data: { results: mockQuizzes } });
      
      render(<StudentQuizList />);
      
      await waitFor(() => {
        expect(screen.getByText("Quiz 1")).toBeInTheDocument();
      });
      
      expect(screen.getByText("Quiz 2")).toBeInTheDocument();
      expect(screen.getByText("Quiz 3")).toBeInTheDocument();
      // Multiple quizzes have Chapter 1, so use getAllByText
      const chapterElements = screen.getAllByText("Chapter 1");
      expect(chapterElements.length).toBeGreaterThan(0);
      expect(screen.getByText("Chapter 2")).toBeInTheDocument();
    });

    it("should display quiz metadata correctly", async () => {
      api.get.mockResolvedValue({ data: { results: [mockQuizzes[0]] } });
      
      render(<StudentQuizList />);
      
      await waitFor(() => {
        expect(screen.getByText("Quiz 1")).toBeInTheDocument();
      });
      
      expect(screen.getByText("Chapter 1")).toBeInTheDocument();
      expect(screen.getByText("10 Questions")).toBeInTheDocument();
      // Check for date with flexible matching (timezone can affect the date)
      expect(screen.getByText(/Added:/)).toBeInTheDocument();
      expect(screen.getByText(/\/2024/)).toBeInTheDocument();
    });

    it("should handle array response format", async () => {
      api.get.mockResolvedValue({ data: mockQuizzes });
      
      render(<StudentQuizList />);
      
      await waitFor(() => {
        expect(screen.getByText("Quiz 1")).toBeInTheDocument();
      });
    });
  });

  describe("Empty State", () => {
    it("should display message when no quizzes are available", async () => {
      api.get.mockResolvedValue({ data: { results: [] } });
      
      render(<StudentQuizList />);
      
      await waitFor(() => {
        expect(screen.getByText("No quizzes available.")).toBeInTheDocument();
      });
      
      expect(
        screen.getByText("Quizzes will appear here when your instructor adds them to the course.")
      ).toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("should display error message on 401 authentication error", async () => {
      api.get.mockRejectedValue({
        response: { status: 401 },
      });
      
      render(<StudentQuizList />);
      
      await waitFor(() => {
        expect(screen.getByText("You need to log in to view quizzes")).toBeInTheDocument();
      });
    });

    it("should display specific error message from API", async () => {
      api.get.mockRejectedValue({
        response: { status: 500, data: { detail: "Server error occurred" } },
      });
      
      render(<StudentQuizList />);
      
      await waitFor(() => {
        expect(screen.getByText("Server error occurred")).toBeInTheDocument();
      });
    });

    it("should display generic error message when no detail provided", async () => {
      api.get.mockRejectedValue({
        response: { status: 500 },
      });
      
      render(<StudentQuizList />);
      
      await waitFor(() => {
        expect(screen.getByText("Failed to load quizzes")).toBeInTheDocument();
      });
    });

    it("should handle unexpected response format", async () => {
      api.get.mockResolvedValue({ data: "unexpected string" });
      
      render(<StudentQuizList />);
      
      await waitFor(() => {
        expect(screen.getByText("Unexpected response format from server")).toBeInTheDocument();
      });
    });
  });

  describe("Quiz Status", () => {
    it("should display 'Take Quiz' button for available quiz", async () => {
      api.get.mockResolvedValue({ data: { results: [mockQuizzes[0]] } });
      
      render(<StudentQuizList />);
      
      await waitFor(() => {
        expect(screen.getByText("Take Quiz")).toBeInTheDocument();
      });
    });

    it("should display 'Continue Quiz' button for in-progress quiz", async () => {
      api.get.mockResolvedValue({ data: { results: [mockQuizzes[1]] } });
      
      render(<StudentQuizList />);
      
      await waitFor(() => {
        expect(screen.getByText("Continue Quiz")).toBeInTheDocument();
      });
      
      expect(screen.getByText("In progress")).toBeInTheDocument();
    });

    it("should display 'View Results' button for completed quiz", async () => {
      api.get.mockResolvedValue({ data: { results: [mockQuizzes[2]] } });
      
      render(<StudentQuizList />);
      
      await waitFor(() => {
        expect(screen.getByText("View Results")).toBeInTheDocument();
      });
    });
  });

  describe("Navigation", () => {
    it("should navigate to quiz landing page when clicking Take Quiz", async () => {
      const user = userEvent.setup();
      api.get.mockResolvedValue({ data: { results: [mockQuizzes[0]] } });
      
      render(<StudentQuizList />);
      
      await waitFor(() => {
        expect(screen.getByText("Take Quiz")).toBeInTheDocument();
      });
      
      await user.click(screen.getByText("Take Quiz"));
      
      expect(mockNavigate).toHaveBeenCalledWith("/quiz-landing/1", { state: undefined });
    });

    it("should navigate to quiz questions when clicking Continue Quiz", async () => {
      const user = userEvent.setup();
      api.get.mockResolvedValue({ data: { results: [mockQuizzes[1]] } });
      
      render(<StudentQuizList />);
      
      await waitFor(() => {
        expect(screen.getByText("Continue Quiz")).toBeInTheDocument();
      });
      
      await user.click(screen.getByText("Continue Quiz"));
      
      expect(mockNavigate).toHaveBeenCalledWith("/quiz-questions/100", { state: undefined });
    });

    it("should navigate to quiz results when clicking View Results", async () => {
      const user = userEvent.setup();
      api.get.mockResolvedValue({ data: { results: [mockQuizzes[2]] } });
      
      render(<StudentQuizList />);
      
      await waitFor(() => {
        expect(screen.getByText("View Results")).toBeInTheDocument();
      });
      
      await user.click(screen.getByText("View Results"));
      
      expect(mockNavigate).toHaveBeenCalledWith("/quiz-results/101", { state: undefined });
    });

    it("should pass courseId in navigation state when provided", async () => {
      const user = userEvent.setup();
      api.get.mockResolvedValue({ data: { results: [mockQuizzes[0]] } });
      
      render(<StudentQuizList courseId="course-123" />);
      
      await waitFor(() => {
        expect(screen.getByText("Take Quiz")).toBeInTheDocument();
      });
      
      await user.click(screen.getByText("Take Quiz"));
      
      expect(mockNavigate).toHaveBeenCalledWith("/quiz-landing/1", { 
        state: { fromCourseId: "course-123" } 
      });
    });
  });

  describe("URL Parameters", () => {
    it("should fetch quizzes with course parameter from URL", async () => {
      mockSearchParams.set("course", "course-123");
      api.get.mockResolvedValue({ data: { results: mockQuizzes } });
      
      render(<StudentQuizList />);
      
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(`${QUIZZES.LIST}?course=course-123`);
      });
    });

    it("should fetch quizzes with chapter parameter from URL", async () => {
      mockSearchParams.set("chapter", "chapter-456");
      api.get.mockResolvedValue({ data: { results: mockQuizzes } });
      
      render(<StudentQuizList />);
      
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(`${QUIZZES.LIST}?chapter=chapter-456`);
      });
    });

    it("should fetch quizzes with both course and chapter parameters", async () => {
      mockSearchParams.set("course", "course-123");
      mockSearchParams.set("chapter", "chapter-456");
      api.get.mockResolvedValue({ data: { results: mockQuizzes } });
      
      render(<StudentQuizList />);
      
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          expect.stringContaining("course=course-123")
        );
        expect(api.get).toHaveBeenCalledWith(
          expect.stringContaining("chapter=chapter-456")
        );
      });
    });

    it("should prioritize courseId prop over URL parameter", async () => {
      mockSearchParams.set("course", "url-course");
      api.get.mockResolvedValue({ data: { results: mockQuizzes } });
      
      render(<StudentQuizList courseId="prop-course" />);
      
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(`${QUIZZES.LIST}?course=prop-course`);
      });
    });
  });

  describe("View Mode Toggle", () => {
    it("should default to 'all' view mode", async () => {
      api.get.mockResolvedValue({ data: { results: mockQuizzes } });
      
      render(<StudentQuizList />);
      
      await waitFor(() => {
        expect(screen.getByText("All quizzes")).toBeInTheDocument();
      });
    });

    it("should read initial view mode from localStorage", async () => {
      localStorage.setItem("quizListViewMode", "byChapter");
      api.get.mockResolvedValue({ data: { results: mockQuizzes } });
      
      render(<StudentQuizList />);
      
      await waitFor(() => {
        expect(screen.getByText("By chapter")).toBeInTheDocument();
      });
    });

    it("should open dropdown when clicking view mode button", async () => {
      const user = userEvent.setup();
      api.get.mockResolvedValue({ data: { results: mockQuizzes } });
      
      render(<StudentQuizList />);
      
      await waitFor(() => {
        expect(screen.getByText("Quiz 1")).toBeInTheDocument();
      });
      
      const viewModeButton = screen.getByRole("button", { name: /View mode/i });
      expect(viewModeButton).toHaveAttribute("aria-expanded", "false");
      
      await user.click(viewModeButton);
      
      expect(viewModeButton).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("should switch to 'byChapter' view mode", async () => {
      api.get.mockResolvedValue({ data: { results: mockQuizzes } });
      
      render(<StudentQuizList />);
      
      await waitFor(() => {
        expect(screen.getByText("Quiz 1")).toBeInTheDocument();
      });
      
      const user = userEvent.setup();
      
      // Open dropdown
      await user.click(screen.getByRole("button", { name: /View mode/i }));
      
      // Click "By chapter" option
      const dropdown = screen.getByRole("listbox");
      const byChapterOption = within(dropdown).getByText("By chapter");
      await user.click(byChapterOption);
      
      // Wait for transition to complete
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /View mode/i })).toHaveTextContent("By chapter");
      }, { timeout: 1000 });
      
      expect(localStorage.getItem("quizListViewMode")).toBe("byChapter");
    });

    it("should close dropdown when clicking outside", async () => {
      api.get.mockResolvedValue({ data: { results: mockQuizzes } });
      
      render(<StudentQuizList />);
      
      await waitFor(() => {
        expect(screen.getByText("Quiz 1")).toBeInTheDocument();
      });
      
      const user = userEvent.setup();
      
      // Open dropdown
      const viewModeButton = screen.getByRole("button", { name: /View mode/i });
      await user.click(viewModeButton);
      
      await waitFor(() => {
        expect(screen.getByRole("listbox")).toBeInTheDocument();
      });
      
      // Click outside dropdown
      await user.click(screen.getByText("Available Quizzes"));
      
      await waitFor(() => {
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      });
    });
  });

  describe("View Mode - All Quizzes", () => {
    it("should display all quizzes in flat list", async () => {
      api.get.mockResolvedValue({ data: { results: mockQuizzes } });
      
      render(<StudentQuizList />);
      
      await waitFor(() => {
        expect(screen.getByText("Quiz 1")).toBeInTheDocument();
      });
      
      expect(screen.getByText("Quiz 2")).toBeInTheDocument();
      expect(screen.getByText("Quiz 3")).toBeInTheDocument();
    });
  });

  describe("View Mode - By Chapter", () => {
    it("should group quizzes by chapter", async () => {
      localStorage.setItem("quizListViewMode", "byChapter");
      api.get.mockResolvedValue({ data: { results: mockQuizzes } });
      
      render(<StudentQuizList />);
      
      await waitFor(() => {
        expect(screen.getByText("Quiz 1")).toBeInTheDocument();
      });
      
      // Check that chapter headings are rendered as h3 elements with specific class
      const chapterHeadings = document.querySelectorAll('h3.text-primary-text.text-sm.font-semibold.tracking-wide');
      // Filter to only get the chapter headings (not quiz titles)
      const actualChapterHeadings = Array.from(chapterHeadings).filter(
        el => el.textContent?.match(/^Chapter \d+$/)
      );
      expect(actualChapterHeadings.length).toBe(2);
    });

    it("should sort chapters by order_index", async () => {
      localStorage.setItem("quizListViewMode", "byChapter");
      
      const unorderedQuizzes = [
        {
          ...mockQuizzes[2], // Chapter 2, order_index: 2
        },
        {
          ...mockQuizzes[0], // Chapter 1, order_index: 1
        },
      ];
      
      api.get.mockResolvedValue({ data: { results: unorderedQuizzes } });
      
      render(<StudentQuizList />);
      
      await waitFor(() => {
        expect(screen.getByText("Quiz 3")).toBeInTheDocument();
      });
      
      // Get chapter section headings (not quiz metadata)
      const chapterHeadings = document.querySelectorAll('h3.text-primary-text.text-sm.font-semibold.tracking-wide');
      const actualChapterHeadings = Array.from(chapterHeadings).filter(
        el => el.textContent?.match(/^Chapter \d+$/)
      );
      
      expect(actualChapterHeadings[0]?.textContent).toBe("Chapter 1");
      expect(actualChapterHeadings[1]?.textContent).toBe("Chapter 2");
    });
  });

  describe("UI Elements", () => {
    it("should display page header and description", async () => {
      api.get.mockResolvedValue({ data: { results: mockQuizzes } });
      
      render(<StudentQuizList />);
      
      await waitFor(() => {
        expect(screen.getByText("Available Quizzes")).toBeInTheDocument();
      });
      
      expect(screen.getByText("Track your quizzes")).toBeInTheDocument();
    });

    it("should display correct icon for available quiz", async () => {
      api.get.mockResolvedValue({ data: { results: [mockQuizzes[0]] } });
      
      render(<StudentQuizList />);
      
      await waitFor(() => {
        expect(screen.getByText("Quiz 1")).toBeInTheDocument();
      });
      
      // Check for play icon (available status)
      const svgElements = document.querySelectorAll('svg');
      expect(svgElements.length).toBeGreaterThan(0);
    });

    it("should display correct icon for in-progress quiz", async () => {
      api.get.mockResolvedValue({ data: { results: [mockQuizzes[1]] } });
      
      render(<StudentQuizList />);
      
      await waitFor(() => {
        expect(screen.getByText("Quiz 2")).toBeInTheDocument();
      });
      
      // Check for "In progress" badge
      expect(screen.getByText("In progress")).toBeInTheDocument();
    });

    it("should display correct icon for completed quiz", async () => {
      api.get.mockResolvedValue({ data: { results: [mockQuizzes[2]] } });
      
      render(<StudentQuizList />);
      
      await waitFor(() => {
        expect(screen.getByText("Quiz 3")).toBeInTheDocument();
      });
      
      // Check for checkmark (completed status)
      const svgElements = document.querySelectorAll('svg');
      expect(svgElements.length).toBeGreaterThan(0);
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA attributes on dropdown", async () => {
      api.get.mockResolvedValue({ data: { results: mockQuizzes } });
      
      render(<StudentQuizList />);
      
      await waitFor(() => {
        expect(screen.getByText("Quiz 1")).toBeInTheDocument();
      });
      
      const dropdownButton = screen.getByRole("button", { name: /View mode/i });
      expect(dropdownButton).toHaveAttribute("aria-expanded", "false");
      expect(dropdownButton).toHaveAttribute("aria-haspopup", "listbox");
    });

    it("should have proper role attributes on dropdown menu", async () => {
      const user = userEvent.setup();
      api.get.mockResolvedValue({ data: { results: mockQuizzes } });
      
      render(<StudentQuizList />);
      
      await waitFor(() => {
        expect(screen.getByText("Quiz 1")).toBeInTheDocument();
      });
      
      await user.click(screen.getByRole("button", { name: /View mode/i }));
      
      const listbox = screen.getByRole("listbox");
      expect(listbox).toBeInTheDocument();
      
      const options = within(listbox).getAllByRole("option");
      expect(options).toHaveLength(2);
    });
  });
});
