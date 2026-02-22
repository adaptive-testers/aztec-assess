import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { privateApi } from "../api/axios";
import { COURSES, QUIZZES } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import Quiz from "../features/InstructorCourse/Quiz";

vi.mock("../api/axios", () => ({
  privateApi: {
    delete: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const COURSE_ID = "123e4567-e89b-12d3-a456-426614174000";
const COURSE_SLUG = "course-slug";

const setupGetMock = () => {
  (privateApi.get as Mock).mockImplementation((url: string) => {
    if (url === COURSES.LIST) {
      return Promise.resolve({
        data: [{ id: COURSE_ID, slug: COURSE_SLUG, title: "Course" }],
      });
    }
    if (url === `${COURSES.LIST}?status=ARCHIVED`) {
      return Promise.resolve({ data: [] });
    }
    if (url === COURSES.DETAIL(COURSE_ID)) {
      return Promise.resolve({ data: { id: COURSE_ID, title: "Course" } });
    }
    if (url === QUIZZES.CHAPTERS_BY_COURSE(COURSE_ID)) {
      return Promise.resolve({
        data: [{ id: 1, title: "Ch 1", order_index: 1, course: COURSE_ID }],
      });
    }
    if (url === QUIZZES.QUIZZES_BY_CHAPTER(1)) {
      return Promise.resolve({ data: [] });
    }
    if (url === QUIZZES.QUESTIONS_BY_CHAPTER(1)) {
      return Promise.resolve({ data: [] });
    }
    return Promise.resolve({ data: [] });
  });
};

const renderPage = () => {
  return render(
    <MemoryRouter initialEntries={[`/courses/${COURSE_SLUG}`]}>
      <Routes>
        <Route path="/courses/:courseId" element={<Quiz />} />
      </Routes>
    </MemoryRouter>,
  );
};

describe("Instructor Quiz Page", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (useAuth as unknown as Mock).mockReturnValue({
      accessToken: "token",
      checkingRefresh: false,
      setAccessToken: vi.fn(),
    });
    setupGetMock();
    (privateApi.post as Mock).mockResolvedValue({ data: {} });
    (privateApi.patch as Mock).mockResolvedValue({ data: {} });
    (privateApi.delete as Mock).mockResolvedValue({ data: {} });
  });

  it("creates chapter without sending course in body", async () => {
    const user = userEvent.setup();
    renderPage();

    const chapterSelector = await screen.findByRole("button", {
      name: /ch 1/i,
    });
    await user.click(chapterSelector);
    await user.click(screen.getByRole("button", { name: /add chapter/i }));

    await user.type(screen.getByLabelText(/chapter title/i), "New Chapter");
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    await waitFor(() =>
      expect(privateApi.post).toHaveBeenCalledWith(
        QUIZZES.CHAPTERS_BY_COURSE(COURSE_ID),
        expect.objectContaining({
          title: "New Chapter",
        }),
      ),
    );

    const chapterCreateCall = (privateApi.post as Mock).mock.calls.find(
      ([url]) => url === QUIZZES.CHAPTERS_BY_COURSE(COURSE_ID),
    );
    expect(chapterCreateCall).toBeTruthy();
    expect(chapterCreateCall?.[1]).not.toHaveProperty("course");
  });

  it("creates quiz without sending chapter in body", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole("button", { name: /create new quiz/i });
    await user.click(screen.getByRole("button", { name: /create new quiz/i }));
    await user.type(screen.getByLabelText(/quiz title/i), "Quiz A");
    await user.click(screen.getByRole("button", { name: /create quiz/i }));

    await waitFor(() =>
      expect(privateApi.post).toHaveBeenCalledWith(
        QUIZZES.QUIZZES_BY_CHAPTER(1),
        expect.objectContaining({
          title: "Quiz A",
        }),
      ),
    );

    const quizCreateCall = (privateApi.post as Mock).mock.calls.find(
      ([url]) => url === QUIZZES.QUIZZES_BY_CHAPTER(1),
    );
    expect(quizCreateCall).toBeTruthy();
    expect(quizCreateCall?.[1]).not.toHaveProperty("chapter");
  });

  it("shows total count from first page and loads next page on demand", async () => {
    const firstPage = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      chapter: 1,
      prompt: `Q${i + 1}`,
      choices: ["A", "B", "C", "D"],
      correct_index: 0,
      difficulty: "EASY",
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
    }));
    const secondPage = Array.from({ length: 2 }, (_, i) => ({
      id: i + 11,
      chapter: 1,
      prompt: `Q${i + 11}`,
      choices: ["A", "B", "C", "D"],
      correct_index: 0,
      difficulty: "EASY",
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
    }));

    (privateApi.get as Mock).mockImplementation((url: string) => {
      if (url === COURSES.LIST) {
        return Promise.resolve({
          data: [{ id: COURSE_ID, slug: COURSE_SLUG, title: "Course" }],
        });
      }
      if (url === `${COURSES.LIST}?status=ARCHIVED`) {
        return Promise.resolve({ data: [] });
      }
      if (url === COURSES.DETAIL(COURSE_ID)) {
        return Promise.resolve({ data: { id: COURSE_ID, title: "Course" } });
      }
      if (url === COURSES.MEMBERS(COURSE_ID)) {
        return Promise.resolve({ data: [] });
      }
      if (url === QUIZZES.CHAPTERS_BY_COURSE(COURSE_ID)) {
        return Promise.resolve({
          data: [{ id: 1, title: "Ch 1", order_index: 1, course: COURSE_ID }],
        });
      }
      if (url === QUIZZES.QUIZZES_BY_CHAPTER(1)) {
        return Promise.resolve({ data: [] });
      }
      if (url === QUIZZES.QUESTIONS_BY_CHAPTER(1)) {
        return Promise.resolve({
          data: {
            count: 12,
            next: `${QUIZZES.QUESTIONS_BY_CHAPTER(1)}?page=2`,
            results: firstPage,
          },
        });
      }
      if (url === `${QUIZZES.QUESTIONS_BY_CHAPTER(1)}?page=2`) {
        return Promise.resolve({
          data: { count: 12, next: null, results: secondPage },
        });
      }
      return Promise.resolve({ data: [] });
    });

    renderPage();

    expect(await screen.findByText(/12 questions available/i)).toBeInTheDocument();
    expect(privateApi.get).not.toHaveBeenCalledWith(
      `${QUIZZES.QUESTIONS_BY_CHAPTER(1)}?page=2`,
    );

    await userEvent.click(screen.getByRole("button", { name: /manage questions/i }));
    await screen.findByRole("button", { name: /load more/i });
    await userEvent.click(screen.getByRole("button", { name: /load more/i }));

    await waitFor(() =>
      expect(privateApi.get).toHaveBeenCalledWith(
        `${QUIZZES.QUESTIONS_BY_CHAPTER(1)}?page=2`,
      ),
    );
  });
});
