import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios, { type AxiosError } from "axios";
import { MemoryRouter, Route, Routes, useParams } from "react-router-dom";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { privateApi } from "../../api/axios";
import { COURSES, QUIZZES } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";
import Quiz from "../../features/InstructorCourse/Quiz";

vi.mock("../../api/axios", () => ({
  privateApi: {
    delete: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock("../../context/AuthContext", () => ({
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
      return Promise.resolve({ data: [] });
    }
    return Promise.resolve({ data: [] });
  });
};

const SettingsPage = () => {
  const { courseId } = useParams();
  return <div>Settings Page for {courseId}</div>;
};

const renderPageAt = (entry: string) => {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/courses/:courseId" element={<Quiz />} />
        <Route path="/courses/:courseId/settings" element={<SettingsPage />} />
      </Routes>
    </MemoryRouter>,
  );
};

const renderPage = () => renderPageAt(`/courses/${COURSE_SLUG}`);

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

  it("renders course title in the header (from COURSES.DETAIL)", async () => {
    renderPage();
    expect(
      await screen.findByRole("heading", { name: "Course" }),
    ).toBeInTheDocument();
  });

  it("navigates to Settings using resolved UUID when clicking Settings", async () => {
    const user = userEvent.setup();
    renderPage();

    // wait for page hydration
    await screen.findByRole("button", { name: /create new quiz/i });

    await user.click(screen.getByRole("button", { name: /^settings$/i }));
    expect(await screen.findByText(`Settings Page for ${COURSE_ID}`)).toBeInTheDocument();
  });

  it("when courseId route param is already a UUID, it does not call COURSES.LIST slug lookup", async () => {
    renderPageAt(`/courses/${COURSE_ID}`);

    await screen.findByRole("button", { name: /create new quiz/i });

    expect(privateApi.get).not.toHaveBeenCalledWith(COURSES.LIST);
    expect(privateApi.get).not.toHaveBeenCalledWith(`${COURSES.LIST}?status=ARCHIVED`);
    expect(privateApi.get).toHaveBeenCalledWith(QUIZZES.CHAPTERS_BY_COURSE(COURSE_ID));
  });

  it("falls back to archived courses when slug is not found in active courses list", async () => {
    const ARCHIVED_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

    (privateApi.get as Mock).mockImplementation((url: string) => {
      if (url === COURSES.LIST) {
        return Promise.resolve({ data: [{ id: COURSE_ID, slug: "different-slug" }] });
      }
      if (url === `${COURSES.LIST}?status=ARCHIVED`) {
        return Promise.resolve({
          data: [{ id: ARCHIVED_ID, slug: COURSE_SLUG, title: "Archived Course" }],
        });
      }
      if (url === COURSES.DETAIL(ARCHIVED_ID)) {
        return Promise.resolve({ data: { id: ARCHIVED_ID, title: "Archived Course" } });
      }
      if (url === COURSES.MEMBERS(ARCHIVED_ID)) return Promise.resolve({ data: [] });
      if (url === QUIZZES.CHAPTERS_BY_COURSE(ARCHIVED_ID)) {
        return Promise.resolve({
          data: [{ id: 1, title: "Ch 1", order_index: 1, course: ARCHIVED_ID }],
        });
      }
      if (url === QUIZZES.QUIZZES_BY_CHAPTER(1)) return Promise.resolve({ data: [] });
      if (url === QUIZZES.QUESTIONS_BY_CHAPTER(1)) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });

    renderPage();

    expect(
      await screen.findByRole("heading", { name: "Archived Course" }),
    ).toBeInTheDocument();
    expect(privateApi.get).toHaveBeenCalledWith(QUIZZES.CHAPTERS_BY_COURSE(ARCHIVED_ID));
  });

  it("shows 'Course not found.' when slug is not in active or archived lists", async () => {
    (privateApi.get as Mock).mockImplementation((url: string) => {
      if (url === COURSES.LIST) return Promise.resolve({ data: [] });
      if (url === `${COURSES.LIST}?status=ARCHIVED`) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });

    renderPage();
    expect(await screen.findByText("Course not found.")).toBeInTheDocument();
  });

  it("shows Loading... while quizzes are fetching, then shows empty state", async () => {
    const deferred = (() => {
      let resolve!: (value: unknown) => void;
      const promise = new Promise((r) => (resolve = r));
      return { promise, resolve };
    })();

    (privateApi.get as Mock).mockImplementation((url: string) => {
      if (url === COURSES.DETAIL(COURSE_ID)) return Promise.resolve({ data: { title: "Course" } });
      if (url === COURSES.MEMBERS(COURSE_ID)) return Promise.resolve({ data: [] });
      if (url === QUIZZES.CHAPTERS_BY_COURSE(COURSE_ID)) return deferred.promise;
      return Promise.resolve({ data: [] });
    });

    renderPageAt(`/courses/${COURSE_ID}`);

    expect(await screen.findByText("Loading...")).toBeInTheDocument();

    deferred.resolve({
      data: [{ id: 1, title: "Ch 1", order_index: 1, course: COURSE_ID }],
    });

    expect(await screen.findByText("No quizzes yet.")).toBeInTheDocument();
  });

  it("renders API error detail message in the list area when fetchAllQuizzes fails", async () => {
    const err = new axios.AxiosError(
      "Forbidden",
      "403",
      undefined,
      undefined,
      { data: { detail: "Not allowed." } } as AxiosError["response"],
    );

    (privateApi.get as Mock).mockImplementation((url: string) => {
      if (url === COURSES.DETAIL(COURSE_ID)) return Promise.resolve({ data: { title: "Course" } });
      if (url === COURSES.MEMBERS(COURSE_ID)) return Promise.resolve({ data: [] });
      if (url === QUIZZES.CHAPTERS_BY_COURSE(COURSE_ID)) {
        return Promise.resolve({
          data: [{ id: 1, title: "Ch 1", order_index: 1, course: COURSE_ID }],
        });
      }
      if (url === QUIZZES.QUIZZES_BY_CHAPTER(1)) return Promise.reject(err);
      if (url === QUIZZES.QUESTIONS_BY_CHAPTER(1)) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });

    renderPageAt(`/courses/${COURSE_ID}`);

    expect(await screen.findByText("Not allowed.")).toBeInTheDocument();
  });

  it("formats 400 field errors into a readable message (e.g. title: msg)", async () => {
    const err = new axios.AxiosError(
      "Bad Request",
      "400",
      undefined,
      undefined,
      { data: { title: ["This field is required."] } } as AxiosError["response"],
    );

    (privateApi.get as Mock).mockImplementation((url: string) => {
      if (url === COURSES.DETAIL(COURSE_ID)) return Promise.resolve({ data: { title: "Course" } });
      if (url === COURSES.MEMBERS(COURSE_ID)) return Promise.resolve({ data: [] });
      if (url === QUIZZES.CHAPTERS_BY_COURSE(COURSE_ID)) {
        return Promise.resolve({
          data: [{ id: 1, title: "Ch 1", order_index: 1, course: COURSE_ID }],
        });
      }
      if (url === QUIZZES.QUIZZES_BY_CHAPTER(1)) return Promise.reject(err);
      if (url === QUIZZES.QUESTIONS_BY_CHAPTER(1)) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });

    renderPageAt(`/courses/${COURSE_ID}`);

    expect(await screen.findByText("title: This field is required.")).toBeInTheDocument();
  });

  it("chapter selector: selecting a different chapter updates visible quizzes and refetches chapter questions", async () => {
    const user = userEvent.setup();

    (privateApi.get as Mock).mockImplementation((url: string) => {
      if (url === COURSES.LIST) {
        return Promise.resolve({ data: [{ id: COURSE_ID, slug: COURSE_SLUG, title: "Course" }] });
      }
      if (url === `${COURSES.LIST}?status=ARCHIVED`) return Promise.resolve({ data: [] });
      if (url === COURSES.DETAIL(COURSE_ID)) return Promise.resolve({ data: { title: "Course" } });
      if (url === COURSES.MEMBERS(COURSE_ID)) return Promise.resolve({ data: [] });

      if (url === QUIZZES.CHAPTERS_BY_COURSE(COURSE_ID)) {
        return Promise.resolve({
          data: [
            { id: 1, title: "Ch 1", order_index: 1, course: COURSE_ID },
            { id: 2, title: "Ch 2", order_index: 2, course: COURSE_ID },
          ],
        });
      }

      if (url === QUIZZES.QUIZZES_BY_CHAPTER(1)) {
        return Promise.resolve({
          data: [{ id: 101, chapter: 1, title: "Quiz 1", is_published: false, created_at: "2026-01-01T00:00:00Z" }],
        });
      }
      if (url === QUIZZES.QUIZZES_BY_CHAPTER(2)) {
        return Promise.resolve({
          data: [{ id: 202, chapter: 2, title: "Quiz 2", is_published: false, created_at: "2026-01-01T00:00:00Z" }],
        });
      }

      if (url === QUIZZES.QUESTIONS_BY_CHAPTER(1)) return Promise.resolve({ data: [] });
      if (url === QUIZZES.QUESTIONS_BY_CHAPTER(2)) {
        return Promise.resolve({ data: { count: 0, next: null, results: [] } });
      }

      return Promise.resolve({ data: [] });
    });

    renderPage();

    expect(await screen.findByText("Quiz 1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /ch 1/i }));
    await user.click(screen.getByRole("button", { name: /ch 2/i }));

    await waitFor(() =>
      expect(privateApi.get).toHaveBeenCalledWith(QUIZZES.QUESTIONS_BY_CHAPTER(2)),
    );

    expect(await screen.findByText("Quiz 2")).toBeInTheDocument();
  });

  it("creates chapter with next order_index = max(existing) + 1", async () => {
    const user = userEvent.setup();

    (privateApi.get as Mock).mockImplementation((url: string) => {
      if (url === COURSES.LIST) {
        return Promise.resolve({ data: [{ id: COURSE_ID, slug: COURSE_SLUG, title: "Course" }] });
      }
      if (url === `${COURSES.LIST}?status=ARCHIVED`) return Promise.resolve({ data: [] });
      if (url === COURSES.DETAIL(COURSE_ID)) return Promise.resolve({ data: { title: "Course" } });
      if (url === COURSES.MEMBERS(COURSE_ID)) return Promise.resolve({ data: [] });

      if (url === QUIZZES.CHAPTERS_BY_COURSE(COURSE_ID)) {
        return Promise.resolve({
          data: [
            { id: 1, title: "Ch 1", order_index: 7, course: COURSE_ID },
            { id: 2, title: "Ch 2", order_index: 9, course: COURSE_ID },
          ],
        });
      }
      if (url === QUIZZES.QUIZZES_BY_CHAPTER(1)) return Promise.resolve({ data: [] });
      if (url === QUIZZES.QUIZZES_BY_CHAPTER(2)) return Promise.resolve({ data: [] });
      if (url === QUIZZES.QUESTIONS_BY_CHAPTER(1)) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });

    renderPage();

    await user.click(await screen.findByRole("button", { name: /ch 1/i }));
    await user.click(screen.getByRole("button", { name: /add chapter/i }));

    await user.type(screen.getByLabelText(/chapter title/i), "  New Chapter  ");
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    await waitFor(() =>
      expect(privateApi.post).toHaveBeenCalledWith(
        QUIZZES.CHAPTERS_BY_COURSE(COURSE_ID),
        expect.objectContaining({
          title: "New Chapter",
          order_index: 10,
        }),
      ),
    );
  });

  it("does not call API when creating chapter with empty title", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: /ch 1/i }));
    await user.click(screen.getByRole("button", { name: /add chapter/i }));

    const input = screen.getByLabelText(/chapter title/i);
    await user.clear(input);
    await user.type(input, "   ");

    await user.click(screen.getByRole("button", { name: /^add$/i }));

    expect(privateApi.post).not.toHaveBeenCalledWith(
      QUIZZES.CHAPTERS_BY_COURSE(COURSE_ID),
      expect.anything(),
    );
  });

  it("edit chapter: clicking edit icon loads chapter detail and Save Changes PATCHes only title", async () => {
    const user = userEvent.setup();

    (privateApi.get as Mock).mockImplementation((url: string) => {
      if (url === COURSES.LIST) return Promise.resolve({ data: [{ id: COURSE_ID, slug: COURSE_SLUG }] });
      if (url === `${COURSES.LIST}?status=ARCHIVED`) return Promise.resolve({ data: [] });
      if (url === COURSES.DETAIL(COURSE_ID)) return Promise.resolve({ data: { title: "Course" } });
      if (url === COURSES.MEMBERS(COURSE_ID)) return Promise.resolve({ data: [] });

      if (url === QUIZZES.CHAPTERS_BY_COURSE(COURSE_ID)) {
        return Promise.resolve({ data: [{ id: 1, title: "Ch 1", order_index: 1, course: COURSE_ID }] });
      }
      if (url === QUIZZES.QUIZZES_BY_CHAPTER(1)) return Promise.resolve({ data: [] });
      if (url === QUIZZES.QUESTIONS_BY_CHAPTER(1)) return Promise.resolve({ data: [] });

      if (url === QUIZZES.CHAPTER_DETAIL(1)) {
        return Promise.resolve({ data: { id: 1, title: "Ch 1", order_index: 1, course: COURSE_ID } });
      }

      return Promise.resolve({ data: [] });
    });

    renderPage();

    await user.click(await screen.findByRole("button", { name: /ch 1/i }));
    await user.click(screen.getByRole("button", { name: /edit chapter/i }));

    await waitFor(() => expect(privateApi.get).toHaveBeenCalledWith(QUIZZES.CHAPTER_DETAIL(1)));

    const titleInput = await screen.findByLabelText(/chapter title/i);
    await user.clear(titleInput);
    await user.type(titleInput, "Updated Chapter");

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(privateApi.patch).toHaveBeenCalledWith(
        QUIZZES.CHAPTER_DETAIL(1),
        { title: "Updated Chapter" },
      ),
    );

    const patchCall = (privateApi.patch as Mock).mock.calls.find(
      ([url]) => url === QUIZZES.CHAPTER_DETAIL(1),
    );
    expect(patchCall).toBeTruthy();
    expect(patchCall?.[1]).not.toHaveProperty("course");
    expect(patchCall?.[1]).not.toHaveProperty("order_index");
  });

  it("delete chapter: Delete -> Yes calls API delete on CHAPTER_DETAIL(id)", async () => {
    const user = userEvent.setup();

    (privateApi.get as Mock).mockImplementation((url: string) => {
      if (url === COURSES.LIST) return Promise.resolve({ data: [{ id: COURSE_ID, slug: COURSE_SLUG }] });
      if (url === `${COURSES.LIST}?status=ARCHIVED`) return Promise.resolve({ data: [] });
      if (url === COURSES.DETAIL(COURSE_ID)) return Promise.resolve({ data: { title: "Course" } });
      if (url === COURSES.MEMBERS(COURSE_ID)) return Promise.resolve({ data: [] });

      if (url === QUIZZES.CHAPTERS_BY_COURSE(COURSE_ID)) {
        return Promise.resolve({ data: [{ id: 1, title: "Ch 1", order_index: 1, course: COURSE_ID }] });
      }
      if (url === QUIZZES.QUIZZES_BY_CHAPTER(1)) return Promise.resolve({ data: [] });
      if (url === QUIZZES.QUESTIONS_BY_CHAPTER(1)) return Promise.resolve({ data: [] });

      if (url === QUIZZES.CHAPTER_DETAIL(1)) {
        return Promise.resolve({ data: { id: 1, title: "Ch 1", order_index: 1, course: COURSE_ID } });
      }

      return Promise.resolve({ data: [] });
    });

    renderPage();

    await user.click(await screen.findByRole("button", { name: /ch 1/i }));
    await user.click(screen.getByRole("button", { name: /edit chapter/i }));

    await screen.findByRole("button", { name: "Delete" });
    await user.click(screen.getByRole("button", { name: "Delete" }));

    // confirm UI is in CreateChapterModal
    await user.click(screen.getByRole("button", { name: "Yes" }));

    await waitFor(() =>
      expect(privateApi.delete).toHaveBeenCalledWith(QUIZZES.CHAPTER_DETAIL(1)),
    );
  });

  it("creates quiz with default body fields (adaptive_enabled, selection_mode, num_questions, is_published) and no chapter", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole("button", { name: /create new quiz/i });
    await user.click(screen.getByRole("button", { name: /create new quiz/i }));

    await user.type(screen.getByLabelText(/quiz title/i), "  Quiz Defaults  ");
    await user.click(screen.getByRole("button", { name: /create quiz/i }));

    await waitFor(() =>
      expect(privateApi.post).toHaveBeenCalledWith(
        QUIZZES.QUIZZES_BY_CHAPTER(1),
        expect.objectContaining({
          title: "Quiz Defaults",
          adaptive_enabled: true,
          selection_mode: "BANK",
          num_questions: 10,
          is_published: true,
        }),
      ),
    );

    const quizCreateCall = (privateApi.post as Mock).mock.calls.find(
      ([url]) => url === QUIZZES.QUIZZES_BY_CHAPTER(1),
    );
    expect(quizCreateCall).toBeTruthy();
    expect(quizCreateCall?.[1]).not.toHaveProperty("chapter");
  });

  it("edit quiz: clicking Edit loads quiz detail and Save Changes PATCHes without chapter", async () => {
    const user = userEvent.setup();

    (privateApi.get as Mock).mockImplementation((url: string) => {
      if (url === COURSES.LIST) return Promise.resolve({ data: [{ id: COURSE_ID, slug: COURSE_SLUG }] });
      if (url === `${COURSES.LIST}?status=ARCHIVED`) return Promise.resolve({ data: [] });
      if (url === COURSES.DETAIL(COURSE_ID)) return Promise.resolve({ data: { title: "Course" } });
      if (url === COURSES.MEMBERS(COURSE_ID)) return Promise.resolve({ data: [] });

      if (url === QUIZZES.CHAPTERS_BY_COURSE(COURSE_ID)) {
        return Promise.resolve({ data: [{ id: 1, title: "Ch 1", order_index: 1, course: COURSE_ID }] });
      }
      if (url === QUIZZES.QUIZZES_BY_CHAPTER(1)) {
        return Promise.resolve({
          data: [{ id: 9, chapter: 1, title: "Draft Quiz", is_published: false, created_at: "2026-01-01T00:00:00Z", num_questions: 10, adaptive_enabled: true, selection_mode: "BANK" }],
        });
      }
      if (url === QUIZZES.QUESTIONS_BY_CHAPTER(1)) return Promise.resolve({ data: [] });

      if (url === QUIZZES.QUIZ_DETAIL(9)) {
        return Promise.resolve({
          data: {
            id: 9,
            chapter: 1,
            title: "Draft Quiz",
            is_published: false,
            created_at: "2026-01-01T00:00:00Z",
            num_questions: 10,
            adaptive_enabled: true,
            selection_mode: "BANK",
          },
        });
      }

      return Promise.resolve({ data: [] });
    });

    renderPage();

    expect(await screen.findByText("Draft Quiz")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^edit$/i }));

    await waitFor(() => expect(privateApi.get).toHaveBeenCalledWith(QUIZZES.QUIZ_DETAIL(9)));

    const quizTitleInput = await screen.findByLabelText(/quiz title/i);
    await user.clear(quizTitleInput);
    await user.type(quizTitleInput, "Updated Quiz");

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(privateApi.patch).toHaveBeenCalledWith(
        QUIZZES.QUIZ_DETAIL(9),
        expect.objectContaining({ title: "Updated Quiz" }),
      ),
    );

    const quizPatchCall = (privateApi.patch as Mock).mock.calls.find(
      ([url]) => url === QUIZZES.QUIZ_DETAIL(9),
    );
    expect(quizPatchCall).toBeTruthy();
    expect(quizPatchCall?.[1]).not.toHaveProperty("chapter");
  });
});
