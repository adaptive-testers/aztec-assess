import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiArrowDown,
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiEdit2,
  FiEye,
  FiFileText,
} from "react-icons/fi";
import { IoAddOutline } from "react-icons/io5";
import { useNavigate, useParams } from "react-router-dom";

import { privateApi } from "../../api/axios";
import { COURSES } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";

import CreateChapterModal from "./CreateChapterModal";
import CreateQuizModal, { type CreateQuizPayload } from "./CreateQuizModal";
import DraftQuizzesModal, { type DraftQuiz } from "./DraftQuizzesModal";
import ManageQuestionsModal, {
  type ManageQuestionItem,
} from "./ManageQuestionsModal";

// =============================================================================
// TYPES
// =============================================================================

/** Chapter shape (List/Create Chapters) */
interface Chapter {
  id: number;
  course?: string;
  title: string;
  order_index: number | null;
}

// API response shapes
interface ApiQuiz {
  id: number;
  chapter: number;
  title: string;
  adaptive_enabled: boolean;
  selection_mode: "BANK" | "FIXED";
  num_questions: number;
  is_published: boolean;
  created_at: string;
}

interface ApiQuestion {
  id: number;
  chapter: number;
  prompt: string;
  choices: string[];
  correct_index: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  created_by?: number;
  is_active: boolean;
  created_at: string;
}

interface UiQuiz {
  id: number;
  chapterId: number;
  title: string;
  startDate: string;
  dueDate: string;
  description: string;
  is_published: boolean;
}

// =============================================================================
// API & HELPERS
// =============================================================================

function endpoints(courseId: string) {
  return {
    chapters: `/courses/${courseId}/chapters/`,
    chapterDetail: (chapterId: number) => `/chapters/${chapterId}/`,
    chapterQuizzes: (chapterId: number) => `/chapters/${chapterId}/quizzes/`,
    chapterQuestions: (chapterId: number) =>`/chapters/${chapterId}/questions/`,
    quiz: (quizId: number) => `/quizzes/${quizId}/`,
    question: (questionId: number) => `/questions/${questionId}/`,
  };
}

function humanDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

/** Format API error per guide: 400 field-level (field_name: ["msg"]), 403/404 detail, or fallback. */
function formatApiError(err: unknown, fallback: string): string {
  if (!(err instanceof axios.AxiosError)) return fallback;
  const data = err.response?.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const d = data as Record<string, unknown>;
    if (typeof d.detail === "string") return d.detail;
    const parts: string[] = [];
    for (const [key, value] of Object.entries(d)) {
      if (key === "detail") continue;
      if (Array.isArray(value) && value.every((v) => typeof v === "string"))
        parts.push(`${key}: ${(value as string[]).join(" ")}`);
      else if (typeof value === "string") parts.push(`${key}: ${value}`);
    }
    if (parts.length > 0) return parts.join("; ");
  }
  return (err.response?.data as { message?: string })?.message ?? err.message ?? fallback;
}

function toUiQuiz(q: ApiQuiz): UiQuiz {
  return {
    id: q.id,
    chapterId: q.chapter,
    title: q.title,
    startDate: humanDate(q.created_at),
    dueDate: "—",
    description: "",
    is_published: q.is_published,
  };
}

/** Map API question to ManageQuestionsModal display shape. Guide has no source field -> use "manual" for list UI. */
function apiQuestionToManageItem(q: ApiQuestion): ManageQuestionItem {
  const labels = ["A", "B", "C", "D"] as const;
  const choices = (q.choices ?? []).slice(0, 4).map((text, i) => ({
    label: labels[i] ?? String(i + 1),
    text,
    isCorrect: q.correct_index === i,
  }));
  const difficulty = q.difficulty.toLowerCase() as "easy" | "medium" | "hard";
  return {
    id: String(q.id),
    source: "manual",
    difficulty,
    prompt: q.prompt,
    choices,
    created_by: q.created_by,
    created_at: q.created_at,
    is_active: q.is_active,
  };
}

function chapterLabel(chapter: Chapter) {
  const n = chapter.order_index ?? chapter.id;
  return `Chapter ${n}: ${chapter.title}`;
}

// =============================================================================
// SUBCOMPONENTS (ChapterSelector, RowAction)
// =============================================================================

function ChapterSelector({
  chapters,
  value,
  onChange,
  onAddChapter,
  onEditChapter,
}: {
  chapters: Chapter[];
  value: number | null;
  onChange: (chapterId: number) => void;
  onAddChapter?: () => void;
  onEditChapter?: (chapter: Chapter) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const active = useMemo(() => {
    if (!Array.isArray(chapters) || chapters.length === 0) return null;
    return chapters.find((c) => c.id === value) ?? chapters[0];
  }, [chapters, value]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onMouseDown = (e: MouseEvent) => {
      const el = wrapperRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onMouseDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onMouseDown);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative w-full max-w-[420px]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-10 w-full items-center gap-0 rounded-[8px] border border-[#404040] bg-[#1A1A1A] px-4 text-[#F1F5F9] shadow-sm hover:bg-[#202020]"
      >
        <span aria-hidden className="w-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-center text-[15px] font-medium leading-[22px]">
          {active ? chapterLabel(active) : "Select chapter"}
        </span>
        <FiChevronDown
          className={
            "ml-1 h-4 w-4 shrink-0 text-[#A1A1AA] transition-transform duration-150" +
            (open ? " rotate-180" : "")
          }
        />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-full overflow-hidden rounded-[8px] border border-[#404040] bg-[#1A1A1A] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]">
          <div role="listbox" className="max-h-[216px] overflow-auto">
            {chapters.length > 0 ? (
              chapters.map((c) => {
                const isActive = c.id === active?.id;
                return (
                  <div
                    key={c.id}
                    role="option"
                    aria-selected={isActive}
                    className={
                      "flex h-[41px] w-full items-center justify-between gap-2 px-4 text-[14px] leading-[21px] text-[#F1F5F9] hover:bg-[#151515]" +
                      (isActive ? " bg-[#151515]" : "")
                    }
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onChange(c.id);
                        setOpen(false);
                      }}
                      className="min-w-0 flex-1 truncate text-left"
                    >
                      {chapterLabel(c)}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpen(false);
                        onEditChapter?.(c);
                      }}
                      aria-label="Edit chapter"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-[6px] text-[#A1A1AA] hover:bg-[#202020]"
                    >
                      <FiEdit2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-3 text-sm text-[#A1A1AA]">
                No chapters yet
              </div>
            )}
            <div className="border-t border-[#404040]" />
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onAddChapter?.();
              }}
              className="flex h-[41px] w-full items-center gap-2 px-4 text-left text-[14px] font-medium leading-[21px] text-[#F87171] hover:bg-[#151515]"
            >
              <IoAddOutline className="h-4 w-4" />
              Add Chapter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RowAction({
  onEdit,
  onView,
}: {
  onEdit: () => void;
  onView: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        onClick={onView}
        className="inline-flex h-[32px] items-center gap-2 rounded-[6px] border border-[#1A1A1A] bg-[#1A1A1A]/30 px-3 text-[14px] font-medium leading-[20px] text-[#F1F5F9] transition hover:bg-[#262626]"
      >
        <span className="inline-flex h-4 w-4 items-center justify-center">
          <FiEye className="h-4 w-4" />
        </span>
        View Quiz
      </button>
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex h-[32px] items-center gap-2 rounded-[6px] border border-[#1A1A1A] bg-[#1A1A1A]/30 px-3 text-[14px] font-medium leading-[20px] text-[#F1F5F9] transition hover:bg-[#262626]"
      >
        <span className="inline-flex h-4 w-4 items-center justify-center">
          <FiEdit2 className="h-4 w-4" />
        </span>
        Edit
      </button>
    </div>
  );
}

// =============================================================================
// MOCK DATA SECTION - REMOVE BEFORE DEPLOYMENT
// =============================================================================
// Set to true to use mock data instead of API calls
const USE_MOCK_DATA = false;

const MOCK_CHAPTERS: Chapter[] = [
  { id: 1, title: "Introduction to React", order_index: 1 },
  { id: 2, title: "State Management", order_index: 2 },
  { id: 3, title: "API Integration", order_index: 3 },
];

const MOCK_QUIZZES: ApiQuiz[] = [
  {
    id: 1,
    chapter: 1,
    title: "React Basics Quiz",
    adaptive_enabled: true,
    selection_mode: "BANK",
    num_questions: 10,
    is_published: true,
    created_at: "2024-01-15T10:00:00Z",
  },
  {
    id: 2,
    chapter: 1,
    title: "Components and Props",
    adaptive_enabled: false,
    selection_mode: "FIXED",
    num_questions: 5,
    is_published: false,
    created_at: "2024-01-16T14:30:00Z",
  },
  {
    id: 3,
    chapter: 2,
    title: "State and Hooks",
    adaptive_enabled: true,
    selection_mode: "BANK",
    num_questions: 15,
    is_published: true,
    created_at: "2024-01-17T09:15:00Z",
  },
];

const MOCK_QUESTIONS: ApiQuestion[] = [
  {
    id: 1,
    chapter: 1,
    prompt: "What is React?",
    choices: [
      "A JavaScript library for building user interfaces",
      "A database management system",
      "A CSS framework",
      "A programming language",
    ],
    correct_index: 0,
    difficulty: "EASY",
    is_active: true,
    created_at: "2024-01-15T10:00:00Z",
  },
  {
    id: 2,
    chapter: 1,
    prompt: "What is JSX?",
    choices: [
      "A syntax extension for JavaScript",
      "A new programming language",
      "A database query language",
      "A CSS preprocessor",
    ],
    correct_index: 0,
    difficulty: "MEDIUM",
    is_active: true,
    created_at: "2024-01-15T11:00:00Z",
  },
  {
    id: 3,
    chapter: 1,
    prompt: "What is the purpose of useState hook?",
    choices: [
      "To manage component state",
      "To fetch data from API",
      "To style components",
      "To handle routing",
    ],
    correct_index: 0,
    difficulty: "HARD",
    is_active: true,
    created_at: "2024-01-15T12:00:00Z",
  },
  {
    id: 4,
    chapter: 2,
    prompt: "What is Redux used for?",
    choices: ["State management", "API calls", "Styling", "Routing"],
    correct_index: 0,
    difficulty: "MEDIUM",
    is_active: true,
    created_at: "2024-01-16T10:00:00Z",
  },
];
// =============================================================================
// END MOCK DATA SECTION
// =============================================================================

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function Quiz() {
  // ---------- ROUTE & API ----------
  const { courseId = "" } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { accessToken, setAccessToken, checkingRefresh } = useAuth();

  const effectiveCourseId = courseId || null;
  const api = useMemo(() => endpoints(effectiveCourseId ?? ""), [effectiveCourseId]);

  // ---------- PAGE STATE (chapters, quizzes, loading) ----------
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeChapterId, setActiveChapterId] = useState<number | null>(null);
  const [quizzes, setQuizzes] = useState<UiQuiz[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courseTitle, setCourseTitle] = useState<string | null>(null);

  // ---------- CREATE QUIZ MODAL (state + handlers in one block) ----------
  const [createOpen, setCreateOpen] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState<number | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [initialValues, setInitialValues] = useState<
    Partial<CreateQuizPayload>
  >({});

  // ---------- DRAFTS MODAL (state + handlers in one block) ----------
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftsError, setDraftsError] = useState<string | null>(null);

  // ---------- MANAGE QUESTIONS MODAL (questions for current chapter) ----------
  const [manageQuestionsOpen, setManageQuestionsOpen] = useState(false);
  const [chapterQuestions, setChapterQuestions] = useState<ApiQuestion[]>([]);
  const [chapterQuestionsLoading, setChapterQuestionsLoading] = useState(false);
  const [chapterQuestionsError, setChapterQuestionsError] = useState<
    string | null
  >(null);
  /** When set, Create Question modal opens in edit mode (Guide §2.3 + §2.4). */
  const [editingQuestion, setEditingQuestion] = useState<ApiQuestion | null>(
    null,
  );

  // ---------- ADD CHAPTER MODAL ----------
  const [addChapterOpen, setAddChapterOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);

  // ---------- DERIVED DATA ----------
  const manageQuestionItems: ManageQuestionItem[] = useMemo(
    () => chapterQuestions.map(apiQuestionToManageItem),
    [chapterQuestions],
  );

  const drafts: DraftQuiz[] = useMemo(
    () =>
      quizzes
        .filter((q) => !q.is_published)
        .map((q) => ({
          id: String(q.id),
          title: q.title,
          description: q.description || undefined,
        })),
    [quizzes],
  );

  const visibleQuizzes = useMemo(() => {
    if (!activeChapterId) return quizzes;
    return quizzes.filter((q) => q.chapterId === activeChapterId);
  }, [activeChapterId, quizzes]);

  /** Question bank counts from API (AI/Manual not in API → show total only, badges unclickable) */
  const questionBankCounts = useMemo(
    () => ({
      total: chapterQuestions.length,
      ai: 0,
      manual: chapterQuestions.length,
    }),
    [chapterQuestions.length],
  );

  // ---------- COURSE TITLE (for header) ----------
  useEffect(() => {
    if (!effectiveCourseId) {
      setCourseTitle(null);
      return;
    }

    const fetchCourseTitle = async () => {
      try {
        const response = await privateApi.get(COURSES.DETAIL(effectiveCourseId));
        const title = response.data?.title ?? null;
        setCourseTitle(title);
      } catch {
        setCourseTitle(null);
      }
    };

    void fetchCourseTitle();
  }, [effectiveCourseId]);

  // ---------- API: FETCH QUIZZES (used by page + Drafts modal) ----------
  const fetchAllQuizzes = useCallback(async () => {
    if (!effectiveCourseId) return;
    setLoading(true);
    setError(null);
    try {
      const chaptersRes = await privateApi.get(api.chapters);
      const chapterData = chaptersRes.data as unknown;
      const chapterList: Chapter[] = Array.isArray(chapterData)
        ? (chapterData as Chapter[])
        : Array.isArray((chapterData as { chapters?: Chapter[] })?.chapters)
          ? (chapterData as { chapters: Chapter[] }).chapters
          : [];
      setChapters(chapterList);

      const chapterIds = chapterList.map((c) => c.id);
      if (chapterIds.length === 0) {
        setActiveChapterId(null);
        setQuizzes([]);
        return;
      }
      if (!activeChapterId) setActiveChapterId(chapterIds[0]);

      const quizResponses = await Promise.all(
        chapterIds.map((id) =>
          privateApi.get<ApiQuiz[]>(api.chapterQuizzes(id)),
        ),
      );
      const combined = quizResponses
        .flatMap((r) => (Array.isArray(r.data) ? r.data : []))
        .map(toUiQuiz);
      combined.sort((a, b) => b.id - a.id);
      setQuizzes(combined);
    } catch (err) {
      setError(formatApiError(err, "Failed to load quizzes."));
    } finally {
      setLoading(false);
    }
  }, [effectiveCourseId, api, activeChapterId]);

  // ---------- EFFECTS ----------
  useEffect(() => {
    if (!checkingRefresh && !accessToken) {
      setAccessToken(null);
    }
  }, [checkingRefresh, accessToken, setAccessToken]);

  useEffect(() => {
    // MOCK DATA FOR DEBUGGING - REMOVE BEFORE DEPLOYMENT
    if (USE_MOCK_DATA) {
      // Use mock data instead of API calls (don't overwrite activeChapterId so chapter switching works)
      setChapters(MOCK_CHAPTERS);
      const validChapterIds = MOCK_CHAPTERS.map((c) => c.id);
      setActiveChapterId((prev) =>
        prev !== null && validChapterIds.includes(prev)
          ? prev
          : (MOCK_CHAPTERS[0]?.id ?? null),
      );
      const mockUiQuizzes = MOCK_QUIZZES.map(toUiQuiz);
      mockUiQuizzes.sort((a, b) => b.id - a.id);
      setQuizzes(mockUiQuizzes);
      setLoading(false);
      setError(null);
      return;
    }

    if (!checkingRefresh && accessToken) {
      void fetchAllQuizzes();
    }
  }, [checkingRefresh, accessToken, fetchAllQuizzes]);

  // ---------- API: FETCH CHAPTER QUESTIONS (for Manage Questions modal + question bank) ----------
  const fetchChapterQuestions = useCallback(
    async (chapterId: number) => {
      setChapterQuestionsLoading(true);
      setChapterQuestionsError(null);

      // MOCK DATA FOR DEBUGGING - REMOVE BEFORE DEPLOYMENT
      if (USE_MOCK_DATA) {
        // Use mock data instead of API call
        setTimeout(() => {
          const mockQuestionsForChapter = MOCK_QUESTIONS.filter(
            (q) => q.chapter === chapterId,
          );
          setChapterQuestions(mockQuestionsForChapter);
          setChapterQuestionsLoading(false);
        }, 300); // Simulate API delay
        return;
      }

      try {
        const res = await privateApi.get<ApiQuestion[]>(
          api.chapterQuestions(chapterId),
        );
        const list = Array.isArray(res.data) ? res.data : [];
        setChapterQuestions(list);
      } catch (err) {
        setChapterQuestionsError(
          formatApiError(err, "Failed to load questions."),
        );
        setChapterQuestions([]);
      } finally {
        setChapterQuestionsLoading(false);
      }
    },
    [api],
  );

  // Keep question bank in sync with selected chapter
  useEffect(() => {
    if (activeChapterId !== null) {
      void fetchChapterQuestions(activeChapterId);
    } else {
      setChapterQuestions([]);
      setChapterQuestionsLoading(false);
      setChapterQuestionsError(null);
    }
  }, [activeChapterId, fetchChapterQuestions]);

  // ---------- API: CHAPTERS ----------
  async function createChapter(title: string, orderIndex?: number | null) {
    if (!effectiveCourseId) return;
    try {
      // Server sets from URL /courses/<course_id>/chapters/
      await privateApi.post(api.chapters, {
        title: title.trim(),
        order_index: orderIndex ?? null,
      });
      await fetchAllQuizzes();
    } catch (err) {
      setError(formatApiError(err, "Failed to create chapter."));
    }
  }

  async function updateChapter(
    chapterId: number,
    data: { title: string; order_index?: number | null },
  ) {
    try {
      if (USE_MOCK_DATA) {
        setChapters((prev) =>
          prev.map((c) =>
            c.id === chapterId
              ? {
                  ...c,
                  title: data.title.trim(),
                  order_index: data.order_index ?? c.order_index,
                }
              : c,
          ),
        );
        setAddChapterOpen(false);
        setEditingChapter(null);
        return;
      }
      await privateApi.patch(api.chapterDetail(chapterId), {
        title: data.title.trim(),
        order_index: data.order_index ?? null,
      });
      await fetchAllQuizzes();
      setAddChapterOpen(false);
      setEditingChapter(null);
    } catch (err) {
      setError(formatApiError(err, "Failed to update chapter."));
    }
  }

  async function deleteChapter(chapterId: number) {
    try {
      if (USE_MOCK_DATA) {
        const remaining = chapters.filter((c) => c.id !== chapterId);
        setChapters(remaining);
        if (activeChapterId === chapterId) {
          setActiveChapterId(remaining[0]?.id ?? null);
        }
        setAddChapterOpen(false);
        setEditingChapter(null);
        return;
      }
      await privateApi.delete(api.chapterDetail(chapterId));
      if (activeChapterId === chapterId) {
        const remaining = chapters.filter((c) => c.id !== chapterId);
        setActiveChapterId(remaining[0]?.id ?? null);
      }
      await fetchAllQuizzes();
      setAddChapterOpen(false);
      setEditingChapter(null);
    } catch (err) {
      setError(formatApiError(err, "Failed to delete chapter."));
    }
  }

  /** Fetch single chapter by ID then open edit modal (keeps form in sync with server). */
  async function openEditChapterModal(chapterId: number) {
    setError(null);
    if (USE_MOCK_DATA) {
      const mockChapter = MOCK_CHAPTERS.find((c) => c.id === chapterId);
      if (mockChapter) {
        setEditingChapter(mockChapter);
        setAddChapterOpen(true);
      } else {
        setError("Chapter not found in mock data.");
      }
      return;
    }
    try {
      const res = await privateApi.get<{
        id: number;
        course?: string;
        title: string;
        order_index: number | null;
      }>(api.chapterDetail(chapterId));
      const data = res.data;
      setEditingChapter({
        id: data.id,
        title: data.title,
        order_index: data.order_index ?? null,
        course: data.course,
      });
      setAddChapterOpen(true);
    } catch (err) {
      setError(formatApiError(err, "Failed to load chapter."));
    }
  }

  // ---------- HANDLERS: CREATE QUIZ MODAL ----------
  function openCreateModal() {
    setModalError(null);
    setEditingDraftId(null);
    setInitialValues({ title: "", num_questions: 10 });
    setCreateOpen(true);
  }

  /** Fetch single quiz by ID then open edit modal (keeps form in sync with server). */
  async function openEditQuizModal(quizId: number) {
    setModalError(null);

    // MOCK DATA: open edit modal from in-memory quiz (no API call)
    if (USE_MOCK_DATA) {
      const mockQuiz = MOCK_QUIZZES.find((q) => q.id === quizId);
      if (mockQuiz) {
        setEditingDraftId(quizId);
        setInitialValues({
          title: mockQuiz.title,
          num_questions: mockQuiz.num_questions ?? 10,
          adaptive_enabled: mockQuiz.adaptive_enabled ?? true,
          selection_mode: mockQuiz.selection_mode ?? "BANK",
          is_published: mockQuiz.is_published,
        });
        setCreateOpen(true);
      } else {
        setModalError("Quiz not found in mock data.");
      }
      return;
    }

    try {
      const res = await privateApi.get<ApiQuiz>(api.quiz(quizId));
      const data = res.data;
      setEditingDraftId(quizId);
      setInitialValues({
        title: data.title,
        num_questions: data.num_questions ?? 10,
        adaptive_enabled: data.adaptive_enabled ?? true,
        selection_mode: data.selection_mode ?? "BANK",
        is_published: data.is_published,
      });
      setCreateOpen(true);
    } catch (err) {
      setModalError(formatApiError(err, "Failed to load quiz."));
    }
  }

  async function handleEditDraft(draft: DraftQuiz) {
    setDraftsOpen(false);
    await openEditQuizModal(Number(draft.id));
  }

  async function handlePrimaryAction(payload: CreateQuizPayload) {
    if (!activeChapterId && editingDraftId === null) {
      setModalError("No chapter found for this course.");
      return;
    }
    setModalSubmitting(true);
    setModalError(null);
    try {
      // Title (required), adaptive_enabled, selection_mode (BANK|FIXED), num_questions, is_published. Do not send chapter in body; server sets from URL.
      const body = {
        title: payload.title.trim(),
        adaptive_enabled: payload.adaptive_enabled ?? true,
        selection_mode: payload.selection_mode ?? "BANK",
        num_questions: payload.num_questions ?? 10,
        is_published:
          payload.is_published ?? (editingDraftId ? false : true),
      };
      if (editingDraftId) {
        await privateApi.patch(api.quiz(editingDraftId), body);
      } else {
        await privateApi.post(api.chapterQuizzes(activeChapterId!), body);
      }
      setCreateOpen(false);
      await fetchAllQuizzes();
    } catch (err) {
      setModalError(formatApiError(err, "Failed to save quiz."));
    } finally {
      setModalSubmitting(false);
    }
  }

  // ---------- HANDLERS: DRAFTS MODAL ----------
  function handleCloseDrafts() {
    setDraftsOpen(false);
  }

  async function handleDeleteDraft(draftId: string) {
    setDraftsError(null);
    try {
      await privateApi.delete(api.quiz(Number(draftId)));
      setQuizzes((prev) => prev.filter((q) => String(q.id) !== draftId));
    } catch (err) {
      setDraftsError(formatApiError(err, "Failed to delete draft."));
    }
  }

  async function openDraftsModal() {
    setDraftsError(null);
    setDraftsLoading(true);
    setDraftsOpen(true);
    try {
      await fetchAllQuizzes();
    } finally {
      setDraftsLoading(false);
    }
  }

  // ---------- HANDLERS: MANAGE QUESTIONS ----------
  async function handleCreateQuestion(data: {
    prompt: string;
    choices: string[];
    correctIndex: number;
    difficulty: string;
    is_active?: boolean;
  }) {
    if (!activeChapterId) return;
    const difficulty =
      data.difficulty.toUpperCase() === "EASY"
        ? "EASY"
        : data.difficulty.toUpperCase() === "HARD"
          ? "HARD"
          : "MEDIUM";
    // Choices = array of exactly 4 strings; correct_index 0–3; difficulty EASY|MEDIUM|HARD; is_active optional (default true).
    const choices = [...data.choices.slice(0, 4)];
    while (choices.length < 4) choices.push("");
    const body = {
      prompt: data.prompt.trim(),
      choices,
      correct_index: Math.max(0, Math.min(3, data.correctIndex)),
      difficulty,
      is_active: data.is_active ?? true,
    };
    try {
      await privateApi.post(api.chapterQuestions(activeChapterId), body);
      await fetchChapterQuestions(activeChapterId);
    } catch (err) {
      setChapterQuestionsError(
        formatApiError(err, "Failed to create question."),
      );
    }
  }

  async function handleDeleteQuestion(questionId: number) {
    try {
      await privateApi.delete(api.question(questionId));
      if (activeChapterId) await fetchChapterQuestions(activeChapterId);
    } catch (err) {
      setChapterQuestionsError(
        formatApiError(err, "Failed to delete question."),
      );
    }
  }

  /** Fetch single question by ID, then open Create Question modal in edit mode. */
  async function handleEditQuestion(questionId: number) {
    setChapterQuestionsError(null);

    // MOCK DATA: open edit modal from in-memory question (no API call)
    if (USE_MOCK_DATA) {
      const mockQuestion = MOCK_QUESTIONS.find((q) => q.id === questionId);
      if (mockQuestion) {
        setEditingQuestion(mockQuestion);
      } else {
        setChapterQuestionsError("Question not found in mock data.");
      }
      return;
    }

    try {
      const res = await privateApi.get<ApiQuestion>(api.question(questionId));
      setEditingQuestion(res.data);
    } catch (err) {
      setChapterQuestionsError(
        formatApiError(err, "Failed to load question."),
      );
    }
  }

  /** PATCH question (same body shape as create). */
  async function handleUpdateQuestion(
    questionId: number,
    data: {
      prompt: string;
      choices: string[];
      correctIndex: number;
      difficulty: string;
      is_active?: boolean;
    },
  ) {
    const difficulty =
      data.difficulty.toUpperCase() === "EASY"
        ? "EASY"
        : data.difficulty.toUpperCase() === "HARD"
          ? "HARD"
          : "MEDIUM";
    const choices = [...data.choices.slice(0, 4)];
    while (choices.length < 4) choices.push("");
    const body = {
      prompt: data.prompt.trim(),
      choices,
      correct_index: Math.max(0, Math.min(3, data.correctIndex)),
      difficulty,
      is_active: data.is_active ?? true,
    };
    try {
      await privateApi.patch(api.question(questionId), body);
      if (activeChapterId) await fetchChapterQuestions(activeChapterId);
      setEditingQuestion(null);
    } catch (err) {
      setChapterQuestionsError(
        formatApiError(err, "Failed to update question."),
      );
    }
  }

  function openManageQuestionsModal() {
    setManageQuestionsOpen(true);
    setChapterQuestionsError(null);
    if (activeChapterId) void fetchChapterQuestions(activeChapterId);
    else setChapterQuestions([]);
  }

  // ---------- RENDER ----------
  return (
    <section className="w-full bg-[#0A0A0A] text-[#F1F5F9]">
      <div className="mx-auto w-full max-w-[1400px] px-4 pb-10 pt-6 sm:px-6 lg:px-10">
        {/* Page header */}
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[24px] font-normal leading-9 tracking-[0.0703px] text-[#F1F5F9]">
            {courseTitle ?? "Course"}
          </h1>
        </div>

        {/* Top nav */}
        <div className="mt-4 rounded-2xl border border-[#404040] bg-gradient-to-b from-[#1A1A1A] via-[#1F1F1F] to-[#1A1A1A] p-1 shadow-[0px_4px_12px_rgba(0,0,0,0.3)]">
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
            <button
              type="button"
              className="h-12 rounded-xl bg-[#F87171] text-[16px] font-normal leading-6 tracking-[-0.3125px] text-white shadow-[0px_10px_15px_rgba(0,0,0,0.1),0px_4px_6px_rgba(0,0,0,0.1)]"
            >
              Quizzes
            </button>
            <button
              type="button"
              className="h-12 rounded-xl text-[16px] font-normal leading-6 tracking-[-0.3125px] text-[#A1A1AA] hover:bg-[#151515] transition"
            >
              Students
            </button>
            <button
              type="button"
              className="h-12 rounded-xl text-[16px] font-normal leading-6 tracking-[-0.3125px] text-[#A1A1AA] hover:bg-[#151515] transition"
            >
              Grades
            </button>
            <button
              type="button"
              onClick={() => {
                if (effectiveCourseId) {
                  navigate(`/courses/${effectiveCourseId}/settings`);
                }
              }}
              className="h-12 rounded-xl text-[16px] font-normal leading-6 tracking-[-0.3125px] text-[#A1A1AA] hover:bg-[#151515] transition"
            >
              Settings
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 grid grid-cols-1 items-center gap-2 sm:grid-cols-3">
          <div className="flex justify-start">
            <button
              type="button"
              onClick={openDraftsModal}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#404040] bg-[#1A1A1A] px-3 text-[13px] font-normal leading-5 text-[#A1A1AA] transition hover:bg-[#151515]"
            >
              <FiFileText className="h-4 w-4" />
              Drafts
            </button>
          </div>
          <div className="flex justify-center">
            <ChapterSelector
              chapters={chapters}
              value={activeChapterId}
              onChange={(chapterId) => setActiveChapterId(chapterId)}
              onAddChapter={() => {
                setEditingChapter(null);
                setAddChapterOpen(true);
              }}
              onEditChapter={(chapter) => {
                void openEditChapterModal(chapter.id);
              }}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              disabled
              title="Not in API"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#404040] bg-[#1A1A1A] px-3 text-[13px] font-normal leading-5 text-[#A1A1AA] cursor-not-allowed opacity-60 pointer-events-none"
            >
              <FiArrowDown className="h-4 w-4" />
              Sort
            </button>
          </div>
        </div>

        {/* Question Bank */}
        <div className="mt-6 rounded-xl border border-[#404040] bg-[#1A1A1A] p-5 shadow-[0px_4px_12px_rgba(0,0,0,0.3)] sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-[20px] font-normal leading-7 tracking-[-0.3125px] text-[#F1F5F9]">
              Question Bank
            </h3>
            <button
              type="button"
              onClick={openManageQuestionsModal}
              className="inline-flex h-10 items-center justify-center rounded-md border border-[#404040] bg-[#151515] px-4 text-[14px] font-normal leading-5 text-[#F1F5F9] hover:bg-[#262626] transition"
            >
              Manage Questions
            </button>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[18px] font-normal leading-[24px] tracking-[-0.1504px] text-[#F87171]">
              {questionBankCounts.total} questions available
            </div>
            <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
              <div
                title="Source not in API"
                className="inline-flex h-[37px] items-center rounded-md border border-[#404040] bg-[#151515] px-4 text-[13px] leading-5 text-[#A1A1AA] cursor-not-allowed pointer-events-none opacity-80"
              >
                {questionBankCounts.ai} AI Generated
              </div>
              <div
                title="Source not in API"
                className="inline-flex h-[37px] items-center rounded-md border border-[#404040] bg-[#151515] px-4 text-[13px] leading-5 text-[#A1A1AA] cursor-not-allowed pointer-events-none opacity-80"
              >
                {questionBankCounts.manual} Manual
              </div>
            </div>
          </div>
        </div>

        {/* Quizzes list */}
        <div className="mt-6 rounded-xl border border-[#404040] bg-[#1A1A1A] p-5 sm:p-6">
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={openCreateModal}
              className="flex h-[76px] w-full items-center justify-center gap-2 rounded-lg border-2 border-[#F87171] bg-[#F87171]/5 px-4 text-[16px] font-normal leading-6 tracking-[-0.3125px] text-[#F87171] hover:bg-[#F87171]/10 transition"
            >
              <IoAddOutline className="h-5 w-5" />
              Create New Quiz
            </button>

            {loading ? (
              <div className="text-[#A1A1AA]">Loading...</div>
            ) : error ? (
              <div className="text-[#F87171]">{error}</div>
            ) : visibleQuizzes.length === 0 ? (
              <div className="text-[#A1A1AA]">No quizzes yet.</div>
            ) : (
              visibleQuizzes.map((q) => (
                <div
                  key={q.id}
                  className="rounded-lg border-2 border-[#404040] bg-[#1A1A1A] p-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={
                          q.is_published
                            ? "flex h-5 w-5 items-center justify-center rounded-full border border-[#10B981] text-[#10B981]"
                            : "flex h-5 w-5 items-center justify-center rounded-full border border-[#A1A1AA] text-[#A1A1AA]"
                        }
                      >
                        {q.is_published ? (
                          <FiCheck className="h-3.5 w-3.5" />
                        ) : (
                          <FiFileText className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[16px] font-normal leading-6 tracking-[-0.3125px] text-[#F1F5F9]">
                          {q.title}
                        </div>
                        {(q.startDate || q.dueDate) && (
                          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] leading-5 tracking-[-0.1504px] text-[#A1A1AA]">
                            {q.startDate && (
                              <span className="inline-flex items-center gap-2">
                                <FiCalendar className="h-4 w-4" />
                                Start: {q.startDate}
                              </span>
                            )}
                            {q.dueDate && (
                              <span className="inline-flex items-center gap-2">
                                <FiCalendar className="h-4 w-4" />
                                Due: {q.dueDate}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <RowAction
                      onEdit={() => openEditQuizModal(q.id)}
                      onView={() => undefined}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modals (each modal: state + handlers grouped above; add new modals here) */}
        <CreateQuizModal
          isOpen={createOpen}
          onClose={() => setCreateOpen(false)}
          mode={editingDraftId !== null ? "edit" : "create"}
          initialValues={initialValues}
          isSubmitting={modalSubmitting}
          apiError={modalError}
          primaryLabel={editingDraftId !== null ? "Save Changes" : "Create Quiz"}
          onPrimaryAction={handlePrimaryAction}
        />
        <DraftQuizzesModal
          isOpen={draftsOpen}
          onClose={handleCloseDrafts}
          drafts={drafts}
          loading={draftsLoading}
          error={draftsError}
          onEditDraft={handleEditDraft}
          onDeleteDraft={handleDeleteDraft}
        />
        <ManageQuestionsModal
          open={manageQuestionsOpen}
          onClose={() => {
            setManageQuestionsOpen(false);
            setEditingQuestion(null);
          }}
          questions={manageQuestionItems}
          loading={chapterQuestionsLoading}
          error={chapterQuestionsError}
          editingQuestion={editingQuestion}
          onEditQuestion={handleEditQuestion}
          onSaveQuestion={handleCreateQuestion}
          onUpdateQuestion={handleUpdateQuestion}
          onDeleteQuestion={handleDeleteQuestion}
          onCloseCreateQuestion={() => setEditingQuestion(null)}
        />
        {addChapterOpen && (
          <CreateChapterModal
            key={editingChapter ? `edit-${editingChapter.id}` : "create"}
            mode={editingChapter ? "edit" : "create"}
            editChapterId={editingChapter?.id}
            initialValues={
              editingChapter
                ? {
                    title: editingChapter.title,
                    order_index: editingChapter.order_index ?? undefined,
                  }
                : undefined
            }
            onClose={() => {
              setAddChapterOpen(false);
              setEditingChapter(null);
            }}
            onCancel={() => {
              setAddChapterOpen(false);
              setEditingChapter(null);
            }}
            onAdd={async (chapterTitle, order_index) => {
              await createChapter(
                chapterTitle,
                order_index ?? (chapters.length + 1),
              );
              setAddChapterOpen(false);
              setEditingChapter(null);
            }}
            onUpdate={updateChapter}
            onDelete={editingChapter ? deleteChapter : undefined}
          />
        )}
      </div>
    </section>
  );
}
