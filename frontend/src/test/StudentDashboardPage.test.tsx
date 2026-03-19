import { screen, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

import { privateApi } from "../api/axios";
import { AUTH, QUIZZES } from "../api/endpoints";
import StudentDashboardPage from "../features/Dashboard/StudentDashboardPage";

import { render } from "./utils";

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

vi.mock("@mantine/core", () => ({
  Progress: (props: { value?: number }) => (
    <div data-testid="mantine-progress" data-value={props.value} />
  ),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ key: "default" }),
  };
});

const api = privateApi as unknown as {
  get: Mock;
};

const mockProfile = { first_name: "Alice", last_name: "Smith", email: "alice@example.com" };

const makeQuiz = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  title: "Quiz Alpha",
  chapter: { id: 10, title: "Chapter 1: Intro", order_index: 1, course: "course-slug" },
  num_questions: 5,
  is_published: true,
  created_at: "2024-06-01T00:00:00Z",
  attempt_status: null as string | null,
  attempt_id: null as number | null,
  ...overrides,
});

const makeAttempt = (overrides: Record<string, unknown> = {}) => ({
  id: 100,
  quiz: 1,
  student: 1,
  status: "COMPLETED",
  started_at: "2024-06-01T10:00:00Z",
  ended_at: "2024-06-01T11:00:00Z",
  score_percent: 85,
  num_answered: 5,
  num_correct: 4,
  current_difficulty: "MEDIUM",
  current_question: null,
  ...overrides,
});

function setupApiResponses(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    [AUTH.PROFILE]: { data: mockProfile },
    [QUIZZES.LIST]: { data: [] },
    ...overrides,
  };

  api.get.mockImplementation((url: string) => {
    if (url in defaults) {
      const value = defaults[url];
      if (value instanceof Error) return Promise.reject(value);
      return Promise.resolve(value);
    }
    for (const [key, val] of Object.entries(defaults)) {
      if (key.startsWith("/attempts/") && url === key) {
        return Promise.resolve(val);
      }
    }
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
}

describe("StudentDashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Loading State", () => {
    it("should display 'Loading dashboard...' while fetching", () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      api.get.mockReturnValue(new Promise(() => {}));

      render(<StudentDashboardPage />);

      expect(screen.getByText("Loading dashboard...")).toBeInTheDocument();
    });
  });

  describe("Error State", () => {
    it("should display error message when quiz list API fails", async () => {
      setupApiResponses({
        [QUIZZES.LIST]: new Error("Network error"),
      });

      render(<StudentDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Failed to load dashboard data")).toBeInTheDocument();
      });
    });
  });

  describe("Welcome Section", () => {
    it("should display the user's first name from the profile API", async () => {
      setupApiResponses();

      render(<StudentDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/Welcome Back, Alice!/)).toBeInTheDocument();
      });
    });

    it("should fall back to 'student' when profile API fails", async () => {
      setupApiResponses({
        [AUTH.PROFILE]: new Error("401"),
      });

      render(<StudentDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/Welcome Back, student!/)).toBeInTheDocument();
      });
    });

    it("should display the subtitle text", async () => {
      setupApiResponses();

      render(<StudentDashboardPage />);

      await waitFor(() => {
        expect(
          screen.getByText(/Here's what's happening in your courses\./)
        ).toBeInTheDocument();
      });
    });
  });

  describe("Performance Overview", () => {
    it("should show 'N/A' for overall average when no completed attempts", async () => {
      setupApiResponses({
        [QUIZZES.LIST]: { data: [makeQuiz()] },
      });

      render(<StudentDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("N/A")).toBeInTheDocument();
      });
    });

    it("should show correct overall average with completed attempts", async () => {
      const quiz = makeQuiz({ attempt_id: 100, attempt_status: "COMPLETED" });
      const attempt = makeAttempt({ score_percent: 75 });

      setupApiResponses({
        [QUIZZES.LIST]: { data: [quiz] },
        [QUIZZES.ATTEMPT_DETAIL(100)]: { data: attempt },
      });

      render(<StudentDashboardPage />);

      await waitFor(() => {
        const matches = screen.getAllByText("75%");
        expect(matches.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("should compute average across multiple completed attempts", async () => {
      const quiz1 = makeQuiz({ id: 1, attempt_id: 100, attempt_status: "COMPLETED" });
      const quiz2 = makeQuiz({ id: 2, title: "Quiz Beta", attempt_id: 101, attempt_status: "COMPLETED" });

      const attempt1 = makeAttempt({ id: 100, quiz: 1, score_percent: 80 });
      const attempt2 = makeAttempt({ id: 101, quiz: 2, score_percent: 60 });

      setupApiResponses({
        [QUIZZES.LIST]: { data: [quiz1, quiz2] },
        [QUIZZES.ATTEMPT_DETAIL(100)]: { data: attempt1 },
        [QUIZZES.ATTEMPT_DETAIL(101)]: { data: attempt2 },
      });

      render(<StudentDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("70%")).toBeInTheDocument();
      });
    });
  });

  describe("Quizzes Completed", () => {
    it("should show completed/total count", async () => {
      const quiz1 = makeQuiz({ id: 1, attempt_id: 100, attempt_status: "COMPLETED" });
      const quiz2 = makeQuiz({ id: 2, title: "Quiz Beta" });

      const attempt = makeAttempt({ id: 100, quiz: 1 });

      setupApiResponses({
        [QUIZZES.LIST]: { data: [quiz1, quiz2] },
        [QUIZZES.ATTEMPT_DETAIL(100)]: { data: attempt },
      });

      render(<StudentDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("1/2")).toBeInTheDocument();
      });
    });

    it("should show 0/0 when there are no quizzes", async () => {
      setupApiResponses({
        [QUIZZES.LIST]: { data: [] },
      });

      render(<StudentDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("0/0")).toBeInTheDocument();
      });
    });
  });

  describe("Course Progress", () => {
    it("should show 0% when no quizzes are completed", async () => {
      setupApiResponses({
        [QUIZZES.LIST]: { data: [makeQuiz()] },
      });

      render(<StudentDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("0%")).toBeInTheDocument();
      });
    });

    it("should show correct completion percentage", async () => {
      const quiz1 = makeQuiz({ id: 1, attempt_id: 100, attempt_status: "COMPLETED" });
      const quiz2 = makeQuiz({ id: 2, title: "Quiz Beta" });

      const attempt = makeAttempt({ id: 100, quiz: 1 });

      setupApiResponses({
        [QUIZZES.LIST]: { data: [quiz1, quiz2] },
        [QUIZZES.ATTEMPT_DETAIL(100)]: { data: attempt },
      });

      render(<StudentDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("50%")).toBeInTheDocument();
      });
    });
  });

  describe("Upcoming Quizzes", () => {
    it("should display 'No upcoming quizzes available' when all quizzes are complete", async () => {
      const quiz = makeQuiz({ id: 1, attempt_id: 100, attempt_status: "COMPLETED" });
      const attempt = makeAttempt({ id: 100, quiz: 1 });

      setupApiResponses({
        [QUIZZES.LIST]: { data: [quiz] },
        [QUIZZES.ATTEMPT_DETAIL(100)]: { data: attempt },
      });

      render(<StudentDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("No upcoming quizzes available")).toBeInTheDocument();
      });
    });

    it("should list upcoming quizzes with chapter title, quiz title and question count", async () => {
      const quiz = makeQuiz({ id: 1, title: "Quiz Alpha" });

      setupApiResponses({
        [QUIZZES.LIST]: { data: [quiz] },
      });

      render(<StudentDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Chapter 1: Intro")).toBeInTheDocument();
      });

      expect(screen.getByText("Quiz Alpha")).toBeInTheDocument();
      expect(screen.getByText("5 Questions")).toBeInTheDocument();
    });

    it("should show the number of available upcoming quizzes", async () => {
      const quiz = makeQuiz();

      setupApiResponses({
        [QUIZZES.LIST]: { data: [quiz] },
      });

      render(<StudentDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("1 available")).toBeInTheDocument();
      });
    });

    it("should show at most 5 upcoming quizzes", async () => {
      const quizzes = Array.from({ length: 7 }, (_, i) =>
        makeQuiz({
          id: i + 1,
          title: `Quiz ${i + 1}`,
          chapter: { id: i + 10, title: `Chapter ${i + 1}`, order_index: i + 1, course: "slug" },
        })
      );

      setupApiResponses({
        [QUIZZES.LIST]: { data: quizzes },
      });

      render(<StudentDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("5 available")).toBeInTheDocument();
      });

      expect(screen.getByText("Quiz 1")).toBeInTheDocument();
      expect(screen.getByText("Quiz 5")).toBeInTheDocument();
      expect(screen.queryByText("Quiz 6")).not.toBeInTheDocument();
      expect(screen.queryByText("Quiz 7")).not.toBeInTheDocument();
    });
  });

  describe("Recent Quiz History", () => {
    it("should display 'No completed quizzes yet' when there are no completed attempts", async () => {
      setupApiResponses({
        [QUIZZES.LIST]: { data: [makeQuiz()] },
      });

      render(<StudentDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("No completed quizzes yet")).toBeInTheDocument();
      });
    });

    it("should display completed attempt with score, performance label, and correct count", async () => {
      const quiz = makeQuiz({ id: 1, attempt_id: 100, attempt_status: "COMPLETED" });
      const attempt = makeAttempt({
        id: 100,
        quiz: 1,
        score_percent: 92,
        num_answered: 5,
        num_correct: 5,
        ended_at: "2024-06-15T12:00:00Z",
      });

      setupApiResponses({
        [QUIZZES.LIST]: { data: [quiz] },
        [QUIZZES.ATTEMPT_DETAIL(100)]: { data: attempt },
      });

      render(<StudentDashboardPage />);

      await waitFor(() => {
        const matches = screen.getAllByText("92%");
        expect(matches.length).toBeGreaterThanOrEqual(1);
      });

      expect(screen.getByText("Excellent")).toBeInTheDocument();
      expect(screen.getByText("5/5 correct")).toBeInTheDocument();
      expect(screen.getByText(/Jun 15, 2024/)).toBeInTheDocument();
    });

    it("should show 'Very Good' label for score >= 80", async () => {
      const quiz = makeQuiz({ id: 1, attempt_id: 100, attempt_status: "COMPLETED" });
      const attempt = makeAttempt({ id: 100, quiz: 1, score_percent: 85 });

      setupApiResponses({
        [QUIZZES.LIST]: { data: [quiz] },
        [QUIZZES.ATTEMPT_DETAIL(100)]: { data: attempt },
      });

      render(<StudentDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Very Good")).toBeInTheDocument();
      });
    });

    it("should show 'Good' label for score >= 70", async () => {
      const quiz = makeQuiz({ id: 1, attempt_id: 100, attempt_status: "COMPLETED" });
      const attempt = makeAttempt({ id: 100, quiz: 1, score_percent: 72 });

      setupApiResponses({
        [QUIZZES.LIST]: { data: [quiz] },
        [QUIZZES.ATTEMPT_DETAIL(100)]: { data: attempt },
      });

      render(<StudentDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Good")).toBeInTheDocument();
      });
    });

    it("should show 'Fair' label for score >= 60", async () => {
      const quiz = makeQuiz({ id: 1, attempt_id: 100, attempt_status: "COMPLETED" });
      const attempt = makeAttempt({ id: 100, quiz: 1, score_percent: 65 });

      setupApiResponses({
        [QUIZZES.LIST]: { data: [quiz] },
        [QUIZZES.ATTEMPT_DETAIL(100)]: { data: attempt },
      });

      render(<StudentDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Fair")).toBeInTheDocument();
      });
    });

    it("should show 'Needs Improvement' label for score < 60", async () => {
      const quiz = makeQuiz({ id: 1, attempt_id: 100, attempt_status: "COMPLETED" });
      const attempt = makeAttempt({ id: 100, quiz: 1, score_percent: 45 });

      setupApiResponses({
        [QUIZZES.LIST]: { data: [quiz] },
        [QUIZZES.ATTEMPT_DETAIL(100)]: { data: attempt },
      });

      render(<StudentDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Needs Improvement")).toBeInTheDocument();
      });
    });

    it("should only show completed attempts (not in-progress ones)", async () => {
      const quiz1 = makeQuiz({ id: 1, attempt_id: 100, attempt_status: "COMPLETED" });
      const quiz2 = makeQuiz({ id: 2, title: "Quiz Beta", attempt_id: 101, attempt_status: "IN_PROGRESS" });

      const completedAttempt = makeAttempt({ id: 100, quiz: 1, score_percent: 90 });
      const inProgressAttempt = makeAttempt({ id: 101, quiz: 2, status: "IN_PROGRESS", score_percent: null, ended_at: null });

      setupApiResponses({
        [QUIZZES.LIST]: { data: [quiz1, quiz2] },
        [QUIZZES.ATTEMPT_DETAIL(100)]: { data: completedAttempt },
        [QUIZZES.ATTEMPT_DETAIL(101)]: { data: inProgressAttempt },
      });

      render(<StudentDashboardPage />);

      await waitFor(() => {
        const matches = screen.getAllByText("90%");
        expect(matches.length).toBeGreaterThanOrEqual(1);
      });

      expect(screen.getByText("Quiz Beta")).toBeInTheDocument();
      expect(screen.getByText("1/2")).toBeInTheDocument();
    });
  });

  describe("API Response Formats", () => {
    it("should handle paginated response format { results: [...] }", async () => {
      const quiz = makeQuiz();

      setupApiResponses({
        [QUIZZES.LIST]: { data: { results: [quiz] } },
      });

      render(<StudentDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Quiz Alpha")).toBeInTheDocument();
      });
    });

    it("should handle array response format directly", async () => {
      const quiz = makeQuiz();

      setupApiResponses({
        [QUIZZES.LIST]: { data: [quiz] },
      });

      render(<StudentDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Quiz Alpha")).toBeInTheDocument();
      });
    });

    it("should show error for invalid response format", async () => {
      setupApiResponses({
        [QUIZZES.LIST]: { data: "not an array" },
      });

      render(<StudentDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Failed to load dashboard data")).toBeInTheDocument();
      });
    });
  });

  describe("Section Headers", () => {
    it("should show all section headers", async () => {
      setupApiResponses();

      render(<StudentDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Performance Overview")).toBeInTheDocument();
      });
      expect(screen.getByText("Upcoming Quizzes")).toBeInTheDocument();
      expect(screen.getByText("Recent Quiz History")).toBeInTheDocument();
      expect(screen.getByText("Overall Average")).toBeInTheDocument();
      expect(screen.getByText("Quizzes Completed")).toBeInTheDocument();
      expect(screen.getByText("Course Progress")).toBeInTheDocument();
    });
  });
});
