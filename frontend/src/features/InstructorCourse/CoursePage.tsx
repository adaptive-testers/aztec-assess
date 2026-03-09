import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiEdit2,
  FiFileText,
} from "react-icons/fi";
import { IoAddOutline } from "react-icons/io5";
import { useNavigate, useParams } from "react-router-dom";

import { privateApi } from "../../api/axios";
import { AUTH, COURSES, QUIZZES } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";
import type {
  InstructorChapter,
  InstructorQuestion,
  InstructorQuiz,
} from "../../types/quizTypes";
import StudentQuizList from "../StudentQuizzes/StudentQuizList";

import CreateChapterModal from "./CreateChapterModal";
import CreateQuizModal, { type CreateQuizPayload } from "./CreateQuizModal";
import DraftQuizzesModal, { type DraftQuiz } from "./DraftQuizzesModal";
import ManageQuestionsModal, {
  type ManageQuestionItem,
} from "./ManageQuestionsModal";

// =============================================================================
// TYPES
// =============================================================================

type Chapter = InstructorChapter;
type ApiQuiz = InstructorQuiz;
type ApiQuestion = InstructorQuestion;

interface UiQuiz {
  id: number;
  chapterId: number;
  title: string;
  createdDate: string;
  is_published: boolean;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface CourseForSlugLookup {
  id: string;
  slug: string;
  title: string;
  status: string;
}

interface CourseMemberForDisplay {
  user_email?: string;
  user_first_name?: string;
  user_id: string;
  user_last_name?: string;
}

function parseListResponse<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const obj = data as { results?: unknown[]; items?: unknown[] };
    if (Array.isArray(obj.results)) return obj.results as T[];
    if (Array.isArray(obj.items)) return obj.items as T[];
  }
  return [];
}

function humanDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

/** Format API error: 400 field-level (field_name: ["msg"]), 403/404 detail, or fallback. */
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
    createdDate: humanDate(q.created_at),
    is_published: q.is_published,
  };
}

/** Map API question to ManageQuestionsModal display shape. API has no source field; use "manual" for list UI. */
function apiQuestionToManageItem(
  q: ApiQuestion,
  creatorNameById: Record<number, string>,
): ManageQuestionItem {
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
    topics: q.topics,
    choices,
    created_by: q.created_by,
    created_by_name: q.created_by != null ? creatorNameById[q.created_by] : undefined,
    created_at: q.created_at,
    is_active: q.is_active,
  };
}

function chapterLabel(chapter: Chapter) {
  return chapter.title;
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
                    className="flex h-[41px] w-full items-center justify-between gap-2 px-4 text-[14px] leading-[21px] text-[#F1F5F9] hover:bg-[#262626]"
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
}: {
  onEdit: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
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
// MAIN PAGE COMPONENT
// =============================================================================

export default function CoursePage() {
  // ---------- ROUTE & API ----------
  const { courseId = "" } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { accessToken, setAccessToken, checkingRefresh } = useAuth();

  const [resolvedCourseId, setResolvedCourseId] = useState<string | null>(null);
  const effectiveCourseId = resolvedCourseId ?? courseId ?? null;

  // ---------- COURSE ROLE (for student vs instructor content) ----------
  const [userCourseRole, setUserCourseRole] = useState<
    "OWNER" | "INSTRUCTOR" | "TA" | "STUDENT" | null
  >(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    if (!resolvedCourseId) return;

    const fetchProfile = async () => {
      try {
        const res = await privateApi.get(AUTH.PROFILE);
        setCurrentUserId(res.data?.id ?? null);
      } catch {
        setCurrentUserId(null);
      }
    };

    void fetchProfile();
  }, [resolvedCourseId]);

  useEffect(() => {
    if (!resolvedCourseId || currentUserId === null) return;

    const fetchMembersAndRole = async () => {
      try {
        const res = await privateApi.get<{ user_id: string; role: string }[]>(
          COURSES.MEMBERS(resolvedCourseId),
        );
        const members = Array.isArray(res.data) ? res.data : [];
        const normalizedCurrent = String(currentUserId).toLowerCase().trim();
        const member = members.find(
          (m) =>
            String(m.user_id).toLowerCase().trim() === normalizedCurrent,
        );
        if (member && ["OWNER", "INSTRUCTOR", "TA", "STUDENT"].includes(member.role)) {
          setUserCourseRole(member.role as "OWNER" | "INSTRUCTOR" | "TA" | "STUDENT");
        } else {
          setUserCourseRole(null);
        }
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 403) {
          setUserCourseRole("STUDENT");
        } else {
          setUserCourseRole(null);
        }
      } finally {
        setRoleLoading(false);
      }
    };

    void fetchMembersAndRole();
  }, [resolvedCourseId, currentUserId]);

  const isStaff =
    userCourseRole !== null &&
    ["OWNER", "INSTRUCTOR", "TA"].includes(userCourseRole);
  const isStudent = userCourseRole === "STUDENT";

  // ---------- PAGE STATE (chapters, quizzes, loading) ----------
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeChapterId, setActiveChapterId] = useState<number | null>(null);
  const [quizzes, setQuizzes] = useState<UiQuiz[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courseTitle, setCourseTitle] = useState<string | null>(null);
  const [courseStatus, setCourseStatus] = useState<string | null>(null);
  const [courseTitleLoading, setCourseTitleLoading] = useState(true);
  const [creatorNameById, setCreatorNameById] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!courseId) return;

    const parseCoursesArray = (data: unknown): CourseForSlugLookup[] => {
      if (Array.isArray(data)) return data as CourseForSlugLookup[];
      if (data && typeof data === "object") {
        const obj = data as { results?: unknown[]; courses?: unknown[] };
        if (Array.isArray(obj.results)) return obj.results as CourseForSlugLookup[];
        if (Array.isArray(obj.courses)) return obj.courses as CourseForSlugLookup[];
      }
      return [];
    };

    const resolveCourseId = async () => {
      if (UUID_REGEX.test(courseId)) {
        setResolvedCourseId(courseId);
        return;
      }
      try {
        const response = await privateApi.get(COURSES.LIST);
        const coursesArray = parseCoursesArray(response.data);
        let matchingCourse = coursesArray.find((course) => course.slug === courseId);

        if (!matchingCourse) {
          const archivedResponse = await privateApi.get(`${COURSES.LIST}?status=ARCHIVED`);
          const archivedArray = parseCoursesArray(archivedResponse.data);
          matchingCourse = archivedArray.find((course) => course.slug === courseId);
        }

        if (matchingCourse) {
          setResolvedCourseId(matchingCourse.id);
          setCourseTitle(matchingCourse.title);
          setCourseStatus(matchingCourse.status);
          setCourseTitleLoading(false);
          return;
        }

        setResolvedCourseId(null);
        setError("Course not found.");
        setRoleLoading(false);
      } catch (err) {
        setResolvedCourseId(null);
        setError(formatApiError(err, "Failed to resolve course."));
        setRoleLoading(false);
      }
    };

    void resolveCourseId();
  }, [courseId]);

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
  const [chapterQuestionsLoadingMore, setChapterQuestionsLoadingMore] = useState(false);
  const [chapterQuestionsTotalCount, setChapterQuestionsTotalCount] = useState(0);
  const [chapterQuestionsNextUrl, setChapterQuestionsNextUrl] = useState<string | null>(null);
  const [chapterQuestionsError, setChapterQuestionsError] = useState<
    string | null
  >(null);
  /** When set, Create Question modal opens in edit mode. */
  const [editingQuestion, setEditingQuestion] = useState<ApiQuestion | null>(
    null,
  );

  // ---------- MOCK TOPICS (remove when API ready) ----------
  const MOCK_TOPIC_OPTIONS = ["Algebra", "Geometry", "Calculus", "Statistics"];
  const [topicOptions, setTopicOptions] = useState<string[]>(MOCK_TOPIC_OPTIONS);
  // --------------------------------------------------------

  // ---------- ADD CHAPTER MODAL ----------
  const [addChapterOpen, setAddChapterOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);

  // ---------- DERIVED DATA ----------
  const manageQuestionItems: ManageQuestionItem[] = useMemo(
    () => {
      const apiQuestions = chapterQuestions.map((question) => apiQuestionToManageItem(question, creatorNameById));
      // Mock question to display topics since backend isn't ready
      const mockTopicQuestion: ManageQuestionItem = {
        id: "mock-with-topics",
        source: "manual",
        difficulty: "medium",
        prompt: "(Mock) What is the derivative of x^2?",
        topics: ["Calculus", "Algebra"],
        choices: [
          { label: "A", text: "x" },
          { label: "B", text: "2x", isCorrect: true },
          { label: "C", text: "x^2" },
          { label: "D", text: "2" },
        ],
        created_at: new Date().toISOString(),
        is_active: true,
      };
      return [...apiQuestions, mockTopicQuestion];
    },
    [chapterQuestions, creatorNameById],
  );

  const drafts: DraftQuiz[] = useMemo(
    () =>
      quizzes
        .filter((q) => !q.is_published)
        .map((q) => ({
          id: String(q.id),
          title: q.title,
          createdDate: q.createdDate || undefined,
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
      total: chapterQuestionsTotalCount,
      ai: 0,
      manual: chapterQuestionsTotalCount,
    }),
    [chapterQuestionsTotalCount],
  );

  // ---------- COURSE TITLE (for header) ----------
  useEffect(() => {
    // Only fetch when we have a resolved UUID (not slug)
    if (!effectiveCourseId || !UUID_REGEX.test(effectiveCourseId)) {
      if (!effectiveCourseId) setCourseTitle(null);
      return;
    }

    const fetchCourseTitle = async () => {
      try {
        const response = await privateApi.get(COURSES.DETAIL(effectiveCourseId));
        const title = response.data?.title ?? null;
        const status = response.data?.status ?? null;
        setCourseTitle(title);
        if (status) setCourseStatus(status);
      } catch {
        setCourseTitle(null);
      } finally {
        setCourseTitleLoading(false);
      }
    };

    void fetchCourseTitle();
  }, [effectiveCourseId]);

  useEffect(() => {
    // Only fetch when we have a resolved UUID (not slug)
    if (!effectiveCourseId || !UUID_REGEX.test(effectiveCourseId)) {
      if (!effectiveCourseId) setCreatorNameById({});
      return;
    }

    const fetchCourseMembers = async () => {
      try {
        const response = await privateApi.get(COURSES.MEMBERS(effectiveCourseId));
        const members = parseListResponse<CourseMemberForDisplay>(response.data);
        const nameById: Record<number, string> = {};
        for (const member of members) {
          const numericId = Number(member.user_id);
          if (!Number.isFinite(numericId)) continue;
          const fullName = [member.user_first_name, member.user_last_name]
            .filter((value) => value && value.trim().length > 0)
            .join(" ")
            .trim();
          nameById[numericId] = fullName || member.user_email || `user #${numericId}`;
        }
        setCreatorNameById(nameById);
      } catch {
        setCreatorNameById({});
      }
    };

    void fetchCourseMembers();
  }, [effectiveCourseId]);

  // ---------- API: FETCH QUIZZES (used by page + Drafts modal) ----------
  const fetchAllQuizzes = useCallback(async () => {
    if (!effectiveCourseId) return;
    setLoading(true);
    setError(null);
    try {
      const chaptersRes = await privateApi.get(
        QUIZZES.CHAPTERS_BY_COURSE(effectiveCourseId),
      );
      const chapterData = chaptersRes.data as unknown;
      const chapterList: Chapter[] = parseListResponse<Chapter>(chapterData);
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
          privateApi.get<ApiQuiz[]>(QUIZZES.QUIZZES_BY_CHAPTER(id)),
        ),
      );
      const combined = quizResponses
        .flatMap((r) => parseListResponse<ApiQuiz>(r.data))
        .map(toUiQuiz);
      combined.sort((a, b) => b.id - a.id);
      setQuizzes(combined);
    } catch (err) {
      setError(formatApiError(err, "Failed to load quizzes."));
    } finally {
      setLoading(false);
    }
  }, [effectiveCourseId, activeChapterId]);

  // ---------- EFFECTS ----------
  useEffect(() => {
    if (!checkingRefresh && !accessToken) {
      setAccessToken(null);
    }
  }, [checkingRefresh, accessToken, setAccessToken]);

  useEffect(() => {
    if (!checkingRefresh && accessToken && isStaff) {
      void fetchAllQuizzes();
    }
  }, [checkingRefresh, accessToken, fetchAllQuizzes, isStaff]);

  // ---------- API: FETCH CHAPTER QUESTIONS (for Manage Questions modal + question bank) ----------
  const fetchChapterQuestions = useCallback(
    async (
      chapterId: number,
      options?: {
        append?: boolean;
        url?: string | null;
      },
    ) => {
      const append = options?.append ?? false;
      if (append) setChapterQuestionsLoadingMore(true);
      else setChapterQuestionsLoading(true);
      setChapterQuestionsError(null);

      try {
        const fetchUrl = options?.url ?? QUIZZES.QUESTIONS_BY_CHAPTER(chapterId);
        const res = await privateApi.get(fetchUrl);
        const data = res.data as unknown;

        let pageItems: ApiQuestion[] = [];
        let nextUrl: string | null = null;
        let totalCount = 0;

        if (Array.isArray(data)) {
          pageItems = data as ApiQuestion[];
          totalCount = pageItems.length;
        } else if (data && typeof data === "object") {
          const paginated = data as {
            count?: number;
            next?: string | null;
            results?: unknown[];
          };
          if (Array.isArray(paginated.results)) {
            pageItems = paginated.results as ApiQuestion[];
            nextUrl = typeof paginated.next === "string" ? paginated.next : null;
            totalCount =
              typeof paginated.count === "number" ? paginated.count : pageItems.length;
          } else {
            pageItems = parseListResponse<ApiQuestion>(data);
            totalCount = pageItems.length;
          }
        }

        setChapterQuestions((prev) => (append ? [...prev, ...pageItems] : pageItems));
        setChapterQuestionsNextUrl(nextUrl);
        setChapterQuestionsTotalCount((prev) => {
          if (append) return totalCount || prev;
          return totalCount || pageItems.length;
        });
      } catch (err) {
        setChapterQuestionsError(
          formatApiError(err, "Failed to load questions."),
        );
        if (!append) {
          setChapterQuestions([]);
          setChapterQuestionsTotalCount(0);
          setChapterQuestionsNextUrl(null);
        }
      } finally {
        if (append) setChapterQuestionsLoadingMore(false);
        else setChapterQuestionsLoading(false);
      }
    },
    [],
  );

  // Keep question bank in sync with selected chapter
  useEffect(() => {
    if (activeChapterId !== null) {
      void fetchChapterQuestions(activeChapterId);
    } else {
      setChapterQuestions([]);
      setChapterQuestionsLoading(false);
      setChapterQuestionsLoadingMore(false);
      setChapterQuestionsTotalCount(0);
      setChapterQuestionsNextUrl(null);
      setChapterQuestionsError(null);
    }
  }, [activeChapterId, fetchChapterQuestions]);

  async function loadMoreChapterQuestions() {
    if (!activeChapterId || !chapterQuestionsNextUrl || chapterQuestionsLoadingMore) return;
    await fetchChapterQuestions(activeChapterId, {
      append: true,
      url: chapterQuestionsNextUrl,
    });
  }

  async function ensureAllChapterQuestionsLoaded() {
    if (!activeChapterId || !chapterQuestionsNextUrl || chapterQuestionsLoadingMore) return;

    setChapterQuestionsLoadingMore(true);
    setChapterQuestionsError(null);

    try {
      let nextUrl: string | null = chapterQuestionsNextUrl;
      const appended: ApiQuestion[] = [];
      let resolvedTotal = chapterQuestionsTotalCount;
      let pageCount = 0;

      while (nextUrl && pageCount < 50) {
        pageCount += 1;
        const response = await privateApi.get(nextUrl);
        const data = response.data as unknown;

        if (Array.isArray(data)) {
          appended.push(...(data as ApiQuestion[]));
          nextUrl = null;
          break;
        }

        if (data && typeof data === "object") {
          const paginated = data as { count?: number; next?: string | null; results?: unknown[] };
          if (Array.isArray(paginated.results)) {
            appended.push(...(paginated.results as ApiQuestion[]));
            nextUrl = typeof paginated.next === "string" ? paginated.next : null;
            if (typeof paginated.count === "number") resolvedTotal = paginated.count;
            continue;
          }
        }

        appended.push(...parseListResponse<ApiQuestion>(data));
        nextUrl = null;
      }

      if (appended.length > 0) {
        setChapterQuestions((prev) => [...prev, ...appended]);
      }
      setChapterQuestionsNextUrl(nextUrl);
      if (resolvedTotal > 0) setChapterQuestionsTotalCount(resolvedTotal);
    } catch (err) {
      setChapterQuestionsError(
        formatApiError(err, "Failed to load more questions."),
      );
    } finally {
      setChapterQuestionsLoadingMore(false);
    }
  }

  // ---------- API: CHAPTERS ----------
  async function createChapter(title: string): Promise<number | null> {
    if (!effectiveCourseId) return null;
    try {
      const nextOrderIndex = chapters.length > 0
        ? Math.max(...chapters.map((c) => c.order_index ?? 0)) + 1
        : 1;
      const response = await privateApi.post(QUIZZES.CHAPTERS_BY_COURSE(effectiveCourseId), {
        title: title.trim(),
        order_index: nextOrderIndex,
      });
      const newChapterId = response.data?.id as number | undefined;
      await fetchAllQuizzes();
      return newChapterId ?? null;
    } catch (err) {
      setError(formatApiError(err, "Failed to create chapter."));
      return null;
    }
  }

  async function updateChapter(
    chapterId: number,
    data: { title: string },
  ) {
    try {
      await privateApi.patch(QUIZZES.CHAPTER_DETAIL(chapterId), {
        title: data.title.trim(),
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
      await privateApi.delete(QUIZZES.CHAPTER_DETAIL(chapterId));
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
    try {
      const res = await privateApi.get<{
        id: number;
        course?: string;
        title: string;
        order_index: number | null;
      }>(QUIZZES.CHAPTER_DETAIL(chapterId));
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

    try {
      const res = await privateApi.get<ApiQuiz>(QUIZZES.QUIZ_DETAIL(quizId));
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
        await privateApi.patch(QUIZZES.QUIZ_DETAIL(editingDraftId), body);
      } else {
        await privateApi.post(QUIZZES.QUIZZES_BY_CHAPTER(activeChapterId!), body);
      }
      setCreateOpen(false);
      await fetchAllQuizzes();
    } catch (err) {
      setModalError(formatApiError(err, "Failed to save quiz."));
    } finally {
      setModalSubmitting(false);
    }
  }

  async function handleDeleteQuiz() {
    if (editingDraftId == null) return;
    try {
      await privateApi.delete(QUIZZES.QUIZ_DETAIL(editingDraftId));
      setQuizzes((prev) => prev.filter((q) => q.id !== editingDraftId));
      setCreateOpen(false);
      setEditingDraftId(null);
    } catch (err) {
      setModalError(formatApiError(err, "Failed to delete quiz."));
    }
  }

  // ---------- HANDLERS: DRAFTS MODAL ----------
  function handleCloseDrafts() {
    setDraftsOpen(false);
  }

  async function handleDeleteDraft(draftId: string) {
    setDraftsError(null);
    try {
      await privateApi.delete(QUIZZES.QUIZ_DETAIL(Number(draftId)));
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
    topics?: string[];
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
      topics: data.topics ?? [],
    };
    try {
      await privateApi.post(QUIZZES.QUESTIONS_BY_CHAPTER(activeChapterId), body);
      await fetchChapterQuestions(activeChapterId);
    } catch (err) {
      setChapterQuestionsError(
        formatApiError(err, "Failed to create question."),
      );
    }
  }

  async function handleDeleteQuestion(questionId: number) {
    try {
      await privateApi.delete(QUIZZES.QUESTION_DETAIL(questionId));
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

    try {
      const res = await privateApi.get<ApiQuestion>(QUIZZES.QUESTION_DETAIL(questionId));
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
      topics?: string[];
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
      topics: data.topics ?? [],
    };
    try {
      await privateApi.patch(QUIZZES.QUESTION_DETAIL(questionId), body);
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
          {courseTitleLoading ? (
            <div className="flex items-center gap-4 w-full">
              <div className="skeleton-shimmer h-9 w-32 rounded" />
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-4">
                <h1 className="text-[24px] font-normal leading-9 tracking-[0.0703px] text-[#F1F5F9]">
                  {courseTitle ?? "Course"}
                </h1>
                {isStaff && courseStatus && (
                  <span className={`inline-block px-3 py-1 rounded-md text-[13px] font-semibold tracking-wide ${
                    courseStatus === 'ACTIVE'
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                      : courseStatus === 'ARCHIVED'
                        ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                        : 'bg-[#262626] text-[#A1A1AA] border border-[#404040]'
                  }`}>
                    {courseStatus}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Top nav */}
        <div className="mt-4 mb-6 rounded-2xl border border-[#404040] bg-gradient-to-b from-[#1A1A1A] via-[#1F1F1F] to-[#1A1A1A] p-1 shadow-[0px_4px_12px_rgba(0,0,0,0.3)]">
          {roleLoading ? (
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-xl bg-[#232323]" />
              ))}
            </div>
          ) : (
          <div className={`grid grid-cols-2 gap-1 ${isStudent ? "sm:grid-cols-3" : "sm:grid-cols-4"}`}>
            <button
              type="button"
              className="h-12 rounded-xl bg-[#F87171] text-[16px] font-normal leading-6 tracking-[-0.3125px] text-white shadow-[0px_10px_15px_rgba(0,0,0,0.1),0px_4px_6px_rgba(0,0,0,0.1)]"
            >
              Quizzes
            </button>
            {!isStudent && (
              <button
                type="button"
                onClick={() => {
                  if (effectiveCourseId) {
                    navigate(`/courses/${effectiveCourseId}/students`);
                  }
                }}
                className="h-12 rounded-xl text-[16px] font-normal leading-6 tracking-[-0.3125px] text-[#A1A1AA] hover:bg-[#151515] transition"
              >
                Members
              </button>
            )}
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
              Course Info
            </button>
          </div>
          )}
        </div>

        {error ? (
          <div className="mt-4 text-[#A1A1AA]">{error}</div>
        ) : isStudent && !roleLoading ? (
          <div className="mt-4">
            <StudentQuizList courseId={resolvedCourseId ?? undefined} />
          </div>
        ) : isStaff || roleLoading ? (
          <>
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
            {roleLoading || loading ? (
              <div className="skeleton-shimmer h-10 w-full max-w-[420px] rounded-[8px]" />
            ) : (
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
            )}
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
            <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto">
              {roleLoading || loading ? (
                <>
                  <div className="skeleton-shimmer h-[37px] w-[120px] rounded-md" />
                  <div className="skeleton-shimmer h-[37px] w-[100px] rounded-md" />
                </>
              ) : (
                <>
                  <div className="inline-flex h-[37px] items-center rounded-md border border-[#404040] bg-[#151515] px-4 text-[13px] leading-5 text-[#F87171]">
                    {questionBankCounts.total} questions
                  </div>
                  <div className="inline-flex h-[37px] items-center rounded-md border border-[#404040] bg-[#151515] px-4 text-[13px] leading-5 text-[#F87171]">
                    {topicOptions.length} topics
                  </div>
                </>
              )}
            </div>
            </div>
            <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
              {roleLoading || loading ? (
                <>
                  <div className="skeleton-shimmer h-[37px] w-[140px] rounded-md" />
                  <div className="skeleton-shimmer h-[37px] w-[100px] rounded-md" />
                </>
              ) : (
                <>
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
                </>
              )}
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

            {loading || roleLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="skeleton-shimmer h-[72px] rounded-lg" />
                ))}
              </div>
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
                        {q.createdDate && (
                          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] leading-5 tracking-[-0.1504px] text-[#A1A1AA]">
                            <span className="inline-flex items-center gap-2">
                              <FiCalendar className="h-4 w-4" />
                              Created: {q.createdDate}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <RowAction onEdit={() => openEditQuizModal(q.id)} />
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
          onDelete={editingDraftId !== null ? handleDeleteQuiz : undefined}
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
          loadingMore={chapterQuestionsLoadingMore}
          totalCount={chapterQuestionsTotalCount}
          hasMore={chapterQuestionsNextUrl != null}
          onLoadMore={loadMoreChapterQuestions}
          onEnsureAllQuestionsLoaded={ensureAllChapterQuestionsLoaded}
          error={chapterQuestionsError}
          editingQuestion={editingQuestion}
          onEditQuestion={handleEditQuestion}
          onSaveQuestion={handleCreateQuestion}
          onUpdateQuestion={handleUpdateQuestion}
          onDeleteQuestion={handleDeleteQuestion}
          onCloseCreateQuestion={() => setEditingQuestion(null)}
          topicOptions={topicOptions}
          onCreateTopic={(topicName) => {
            const cleaned = topicName.trim();
            if (!cleaned) return;
            setTopicOptions((prev) => {
              const lower = cleaned.toLowerCase();
              if (prev.some((t) => t.trim().toLowerCase() === lower)) return prev;
              return [...prev, cleaned];
            });
          }}
          onDeleteTopics={(topicNames) => {
            if (!Array.isArray(topicNames) || topicNames.length === 0) return;
            setTopicOptions((prev) => prev.filter((t) => !topicNames.includes(t)));
          }}
        />
        {addChapterOpen && (
          <CreateChapterModal
            key={editingChapter ? `edit-${editingChapter.id}` : "create"}
            mode={editingChapter ? "edit" : "create"}
            editChapterId={editingChapter?.id}
            initialValues={
              editingChapter
                ? { title: editingChapter.title }
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
            onAdd={async (chapterTitle) => {
              const newChapterId = await createChapter(chapterTitle);
              setAddChapterOpen(false);
              setEditingChapter(null);
              if (newChapterId != null) {
                setActiveChapterId(newChapterId);
              }
            }}
            onUpdate={updateChapter}
            onDelete={editingChapter ? deleteChapter : undefined}
          />
        )}
          </>
        ) : (
          <div className="mt-4 text-[#A1A1AA]">Loading...</div>
        )}
      </div>
    </section>
  );
}
