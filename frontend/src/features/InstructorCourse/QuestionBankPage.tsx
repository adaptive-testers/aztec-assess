import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiChevronDown,
  FiEdit2,
  FiPlus,
  FiSearch,
  FiSliders,
  FiUpload,
  FiX,
  FiZap,
} from "react-icons/fi";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { privateApi } from "../../api/axios";
import { COURSES, QUIZZES } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";
import type { InstructorChapter, InstructorQuestion } from "../../types/quizTypes";

import CreateQuestionModal from "./CreateQuestionModal";

// =============================================================================
// TYPES
// =============================================================================

type ApiQuestion = InstructorQuestion;
type Chapter = InstructorChapter;
type Difficulty = "easy" | "medium" | "hard";

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

// =============================================================================
// BADGE HELPERS
// =============================================================================

function difficultyBadgeClass(d: Difficulty) {
  if (d === "easy") return "bg-emerald-500/10 text-emerald-400";
  if (d === "medium") return "bg-amber-500/10 text-amber-400";
  return "bg-red-400/10 text-red-400";
}

function difficultyLabel(d: Difficulty) {
  if (d === "easy") return "Easy";
  if (d === "medium") return "Medium";
  return "Hard";
}

function tagStylesForSource(source: "ai" | "manual") {
  if (source === "ai") return "bg-emerald-500/10 text-emerald-400";
  return "bg-red-400/10 text-red-300";
}

function labelForSource(source: "ai" | "manual") {
  return source === "ai" ? "AI Generated" : "Manual";
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

// =============================================================================
// SIDEBAR SUBCOMPONENTS
// =============================================================================

function SidebarAction({
  icon,
  label,
  primary = false,
  onClick,
  disabled = false,
  title,
}: {
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={[
        "flex h-[43px] w-full items-center justify-center gap-2 rounded-md border text-sm font-medium transition",
        primary
          ? "border-[#F87171] bg-[#F87171] text-[#0A0A0A] hover:bg-[#EF6262]"
          : "border-[#404040] bg-transparent text-[#F1F5F9] hover:bg-[#262626]",
        disabled ? "cursor-not-allowed opacity-50" : "",
      ].join(" ")}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// =============================================================================
// QUESTION ROW
// =============================================================================

function QuestionRow({
  item,
  creatorNameById,
  onEdit,
}: {
  item: ApiQuestion;
  creatorNameById: Record<number, string>;
  onEdit: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const difficulty = item.difficulty.toLowerCase() as Difficulty;
  const creatorName =
    item.created_by != null ? creatorNameById[item.created_by] : undefined;
  const hasChoices = Array.isArray(item.choices) && item.choices.length > 0;

  return (
    <div className="rounded-[8px] border border-[#404040] bg-[#151515]">
      <div className="flex items-start justify-between gap-4 p-4">
        <div className="min-w-0 flex-1 pr-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={
                "inline-flex h-[26px] items-center rounded-[4px] px-2 text-[12px] font-medium leading-[18px] " +
                tagStylesForSource("manual")
              }
            >
              {labelForSource("manual")}
            </span>
            <span
              className={
                "inline-flex h-[26px] items-center rounded-[4px] px-2 text-[12px] font-medium leading-[18px] " +
                difficultyBadgeClass(difficulty)
              }
            >
              {difficultyLabel(difficulty)}
            </span>
            {item.is_active === false && (
              <span className="inline-flex h-[26px] items-center rounded-[4px] px-2 text-[12px] font-medium leading-[18px] bg-[#404040]/50 text-[#A1A1AA]">
                Inactive
              </span>
            )}
          </div>

          <p className="mt-2 text-[14px] font-normal leading-[23px] tracking-[-0.1504px] text-[#F1F5F9] sm:whitespace-normal">
            {item.prompt}
          </p>

          {(item.created_at || creatorName) && (
            <p className="mt-1.5 text-[12px] leading-[18px] text-[#71717A]">
              {item.created_at && <span>Created {formatDate(item.created_at)}</span>}
              {item.created_at && creatorName && " · "}
              {creatorName && <span>By {creatorName}</span>}
            </p>
          )}
        </div>

        <div className="flex flex-col items-center gap-3 shrink-0">
          <button
            type="button"
            aria-label="Edit question"
            onClick={() => onEdit(item.id)}
            className="grid h-8 w-8 place-items-center rounded-[6px] hover:bg-[#202020] transition"
          >
            <FiEdit2 className="h-4 w-4 text-[#A1A1AA]" />
          </button>
          <button
            type="button"
            aria-label={expanded ? "Collapse" : "Expand"}
            onClick={() => setExpanded((v) => !v)}
            disabled={!hasChoices}
            title={!hasChoices ? "No choices available" : undefined}
            className="grid h-8 w-8 place-items-center rounded-[6px] hover:bg-[#202020] transition disabled:opacity-40"
          >
            <FiChevronDown className={["h-4 w-4 text-[#A1A1AA] transition-transform", expanded ? "rotate-180" : ""].join(" ")} />
          </button>
        </div>
      </div>
      
      {expanded && hasChoices && (
        <div className="mt-4 border-t border-[#404040]/50 pt-4 pb-4">
          <p className="px-2 text-[13px] font-medium text-[#A1A1AA] mb-3">Answer Choices:</p>
          <div className="flex flex-col gap-3 px-2 sm:px-6">
            {item.choices.map((choice, i) => {
              const isCorrect = item.correct_index === i;
              const labels = ["A", "B", "C", "D"];
              return (
                <div
                  key={i}
                  className={[
                    "flex items-center gap-4 rounded-md border px-4 py-3 text-[13px] leading-[20px]",
                    isCorrect ? "border-emerald-500/30 bg-emerald-500/10" : "border-[#404040]/30 bg-[#0A0A0A]",
                  ].join(" ")}
                >
                  <span className="w-6 text-[#A1A1AA] font-medium">{labels[i] ?? i + 1}.</span>
                  <span className={["flex-1 min-w-0 sm:whitespace-normal", isCorrect ? "text-emerald-400 font-medium" : "text-[#F1F5F9]"].join(" ")}>
                    {choice}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function QuestionBankPage() {
  const { courseId = "" } = useParams<{ courseId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { accessToken, checkingRefresh } = useAuth();
  const initialTopicId = searchParams.get("topic");

  // ---------- RESOLVE COURSE ID (slug → UUID) ----------
  const [resolvedCourseId, setResolvedCourseId] = useState<string | null>(null);
  const effectiveCourseId = resolvedCourseId ?? courseId ?? null;
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  useEffect(() => {
    if (!courseId) return;
    if (UUID_REGEX.test(courseId)) {
      setResolvedCourseId(courseId);
      return;
    }
    const resolve = async () => {
      try {
        const res = await privateApi.get(COURSES.LIST);
        let list = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
        let match = list.find((c: { slug: string }) => c.slug === courseId);
        if (!match) {
          const arcRes = await privateApi.get(`${COURSES.LIST}?status=ARCHIVED`);
          const arcList = Array.isArray(arcRes.data) ? arcRes.data : (arcRes.data?.results ?? []);
          match = arcList.find((c: { slug: string }) => c.slug === courseId);
        }
        setResolvedCourseId(match?.id ?? null);
      } catch {
        setResolvedCourseId(null);
      }
    };
    void resolve();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  // ---------- COURSE TITLE ----------
  const [courseTitle, setCourseTitle] = useState<string | null>(null);
  const [courseTitleLoading, setCourseTitleLoading] = useState(true);

  useEffect(() => {
    if (!effectiveCourseId) return;
    const fetch = async () => {
      try {
        const res = await privateApi.get(COURSES.DETAIL(effectiveCourseId));
        setCourseTitle(res.data?.title ?? null);
      } catch {
        setCourseTitle(null);
      } finally {
        setCourseTitleLoading(false);
      }
    };
    void fetch();
  }, [effectiveCourseId]);

  // ---------- CHAPTERS ----------
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeChapterId, setActiveChapterId] = useState<number | null>(null);

  useEffect(() => {
    if (!effectiveCourseId) return;
    const fetchChapters = async () => {
      try {
        const res = await privateApi.get(QUIZZES.CHAPTERS_BY_COURSE(effectiveCourseId));
        const list = parseListResponse<Chapter>(res.data);
        setChapters(list);
        if (list.length > 0) {
          if (initialTopicId) {
            const match = list.find((c) => String(c.id) === initialTopicId);
            setActiveChapterId(match ? match.id : list[0].id);
          } else {
            setActiveChapterId(list[0].id);
          }
        }
      } catch {
        setChapters([]);
      }
    };
    void fetchChapters();
  }, [effectiveCourseId, initialTopicId]);

  // ---------- CREATOR NAMES ----------
  const [creatorNameById, setCreatorNameById] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!effectiveCourseId) return;
    const fetchMembers = async () => {
      try {
        const res = await privateApi.get(COURSES.MEMBERS(effectiveCourseId));
        const members = parseListResponse<CourseMemberForDisplay>(res.data);
        const nameById: Record<number, string> = {};
        for (const m of members) {
          const id = Number(m.user_id);
          if (!Number.isFinite(id)) continue;
          const name = [m.user_first_name, m.user_last_name]
            .filter((v) => v && v.trim().length > 0)
            .join(" ")
            .trim();
          nameById[id] = name || m.user_email || `user #${id}`;
        }
        setCreatorNameById(nameById);
      } catch {
        setCreatorNameById({});
      }
    };
    void fetchMembers();
  }, [effectiveCourseId]);

  // ---------- QUESTIONS ----------
  const [questions, setQuestions] = useState<ApiQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsLoadingMore, setQuestionsLoadingMore] = useState(false);
  const [questionsTotalCount, setQuestionsTotalCount] = useState(0);
  const [questionsNextUrl, setQuestionsNextUrl] = useState<string | null>(null);
  const [questionsError, setQuestionsError] = useState<string | null>(null);

  const fetchQuestions = useCallback(
    async (chapterId: number, opts?: { append?: boolean; url?: string | null }) => {
      const append = opts?.append ?? false;
      if (append) setQuestionsLoadingMore(true);
      else setQuestionsLoading(true);
      setQuestionsError(null);

      try {
        const url = opts?.url ?? QUIZZES.QUESTIONS_BY_CHAPTER(chapterId);
        const res = await privateApi.get(url);
        const data = res.data as unknown;

        let items: ApiQuestion[] = [];
        let nextUrl: string | null = null;
        let total = 0;

        if (Array.isArray(data)) {
          items = data as ApiQuestion[];
          total = items.length;
        } else if (data && typeof data === "object") {
          const p = data as { count?: number; next?: string | null; results?: unknown[] };
          if (Array.isArray(p.results)) {
            items = p.results as ApiQuestion[];
            nextUrl = typeof p.next === "string" ? p.next : null;
            total = typeof p.count === "number" ? p.count : items.length;
          } else {
            items = parseListResponse<ApiQuestion>(data);
            total = items.length;
          }
        }

        setQuestions((prev) => (append ? [...prev, ...items] : items));
        setQuestionsNextUrl(nextUrl);
        setQuestionsTotalCount(append ? total || questionsTotalCount : total || items.length);
      } catch (err) {
        setQuestionsError(formatApiError(err, "Failed to load questions."));
        if (!append) {
          setQuestions([]);
          setQuestionsTotalCount(0);
          setQuestionsNextUrl(null);
        }
      } finally {
        if (append) setQuestionsLoadingMore(false);
        else setQuestionsLoading(false);
      }
    },
    [questionsTotalCount],
  );

  useEffect(() => {
    if (activeChapterId !== null) {
      void fetchQuestions(activeChapterId);
    } else {
      setQuestions([]);
      setQuestionsLoading(false);
      setQuestionsLoadingMore(false);
      setQuestionsTotalCount(0);
      setQuestionsNextUrl(null);
      setQuestionsError(null);
    }
  }, [activeChapterId, fetchQuestions]);

  // ---------- SEARCH + SORT ----------
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOpen, setSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "easy-first" | "hard-first">("newest");

  // ---------- FILTERS ----------
  const [activeDifficulty, setActiveDifficulty] = useState<Difficulty | null>(null);
  const [activeType, setActiveType] = useState<"ai" | "manual" | null>(null);

  const difficultyStats = useMemo(() => {
    const counts: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };
    for (const q of questions) {
      const d = q.difficulty.toLowerCase() as Difficulty;
      if (d in counts) counts[d]++;
    }
    return [
      { label: "Easy", value: "easy" as Difficulty, count: counts.easy },
      { label: "Medium", value: "medium" as Difficulty, count: counts.medium },
      { label: "Hard", value: "hard" as Difficulty, count: counts.hard },
    ];
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    let list = [...questions];
    if (activeType) {
      if (activeType === "ai") list = [];
    }
    if (activeDifficulty) {
      list = list.filter((q) => q.difficulty.toLowerCase() === activeDifficulty);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((item) => item.prompt.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      const DIFF_ORDER: Record<string, number> = { easy: 1, medium: 2, hard: 3 };
      switch (sortBy) {
        case "oldest":
          return (a.created_at ?? "").localeCompare(b.created_at ?? "");
        case "easy-first":
          return (DIFF_ORDER[a.difficulty.toLowerCase()] ?? 2) - (DIFF_ORDER[b.difficulty.toLowerCase()] ?? 2);
        case "hard-first":
          return (DIFF_ORDER[b.difficulty.toLowerCase()] ?? 2) - (DIFF_ORDER[a.difficulty.toLowerCase()] ?? 2);
        default: // newest
          return (b.created_at ?? "").localeCompare(a.created_at ?? "");
      }
    });
    return list;
  }, [questions, activeDifficulty, searchQuery, sortBy]);

  // ---------- EDITING ----------
  const [editingQuestion, setEditingQuestion] = useState<ApiQuestion | null>(null);
  const [createQuestionOpen, setCreateQuestionOpen] = useState(false);

  async function handleEditQuestion(questionId: number) {
    try {
      const res = await privateApi.get<ApiQuestion>(QUIZZES.QUESTION_DETAIL(questionId));
      setEditingQuestion(res.data);
      setCreateQuestionOpen(true);
    } catch (err) {
      setQuestionsError(formatApiError(err, "Failed to load question."));
    }
  }

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
      await privateApi.post(QUIZZES.QUESTIONS_BY_CHAPTER(activeChapterId), body);
      await fetchQuestions(activeChapterId);
    } catch (err) {
      setQuestionsError(formatApiError(err, "Failed to create question."));
    }
  }

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
      await privateApi.patch(QUIZZES.QUESTION_DETAIL(questionId), body);
      if (activeChapterId) await fetchQuestions(activeChapterId);
      setEditingQuestion(null);
    } catch (err) {
      setQuestionsError(formatApiError(err, "Failed to update question."));
    }
  }

  async function handleDeleteQuestion(questionId: number) {
    try {
      await privateApi.delete(QUIZZES.QUESTION_DETAIL(questionId));
      if (activeChapterId) await fetchQuestions(activeChapterId);
      setEditingQuestion(null);
    } catch (err) {
      setQuestionsError(formatApiError(err, "Failed to delete question."));
    }
  }

  // ---------- AUTH GUARD ----------
  useEffect(() => {
    if (!checkingRefresh && !accessToken) {
      navigate("/login");
    }
  }, [checkingRefresh, accessToken, navigate]);

  // ---------- BACK NAV ----------
  function handleBack() {
    if (effectiveCourseId) {
      navigate(`/courses/${courseId || effectiveCourseId}`);
    } else {
      navigate(-1);
    }
  }

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <section className="min-h-screen w-full bg-[#0A0A0A] text-[#F1F5F9]">
      <div className="mx-auto w-full px-4 pb-10 pt-6 sm:px-6 lg:px-8">

        <div className="flex h-12 items-center gap-3">
          <button
            type="button"
            aria-label="Go back"
            onClick={handleBack}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#A1A1AA] hover:bg-white/5 transition"
          >
            <FiArrowLeft className="h-4 w-4" />
          </button>

          <h1 className="flex items-center text-[24px] font-normal leading-9 tracking-[0.0703px] text-[#F1F5F9]">
             Question Bank 
             <span className="text-[#404040] mx-2">/</span> 
             {courseTitleLoading ? (
               <div className="skeleton-shimmer h-6 w-28 rounded mx-1" />
             ) : (
               <span>{courseTitle ?? "Course"}</span>
             )}
             <span className="text-[#404040] mx-2">/</span>
             <span className="truncate">{chapters.find((c) => c.id === activeChapterId)?.title ?? "Topic"}</span>
          </h1>
        </div>

        {/* ── Main layout ────────────────────────────────────────── */}
        <div className="mt-6 flex gap-5">

          {/* ── Sidebar ──────────────────────────────────────────── */}
          <aside className="w-[220px] shrink-0 space-y-3">

            {/* Add Questions */}
            <section className="rounded-xl border border-[#404040] bg-[#1A1A1A] p-4">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.08em] text-[#F1F5F9]">
                Add Questions
              </p>
              <div className="space-y-2">
                <SidebarAction
                  icon={<FiPlus className="h-4 w-4" />}
                  label="Create Question"
                  primary
                  onClick={() => {
                    setEditingQuestion(null);
                    setCreateQuestionOpen(true);
                  }}
                />
                <SidebarAction
                  icon={<FiZap className="h-4 w-4" />}
                  label="Generate with AI"
                  disabled
                  title="Coming soon"
                />
                <SidebarAction
                  icon={<FiUpload className="h-4 w-4" />}
                  label="Import Questions"
                  disabled
                  title="Coming soon"
                />
              </div>
            </section>

            {/* Difficulty filter */}
            <section className="flex flex-col items-start gap-3 rounded-xl border border-[#404040] bg-[#1A1A1A] p-[17px_17px_1px] w-[220px]">
              <p className="m-0 h-[18px] w-full font-['Geist'] text-[12px] font-medium uppercase leading-[18px] tracking-[0.96px] text-[#A1A1AA]">
                Difficulty
              </p>
              <div className="flex w-full flex-col items-start gap-[6px] pb-4">
                {difficultyStats.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() =>
                      setActiveDifficulty((prev) =>
                        prev === item.value ? null : item.value,
                      )
                    }
                    className={
                      "box-border flex h-[37px] w-full flex-row items-center justify-between rounded-[6px] border px-3 transition-colors " +
                      (activeDifficulty === item.value
                        ? "border-[#F87171] bg-[#F87171]/10"
                        : "border-[#404040] bg-[#151515] hover:bg-[#202020]")
                    }
                  >
                    <span className={"font-['Geist'] text-[13px] font-medium leading-[20px] " + (activeDifficulty === item.value ? "text-[#F1F5F9]" : "text-[#A1A1AA]")}>
                      {item.label}
                    </span>
                    <span className="font-['Geist'] text-[11px] font-medium leading-[16px] text-[#A1A1AA] opacity-60">
                      {item.count}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* Type filter */}
            <section className="flex flex-col items-start gap-3 rounded-xl border border-[#404040] bg-[#1A1A1A] p-[17px_17px_1px] w-[220px] h-[144px]">
              <p className="m-0 h-[18px] w-full font-['Geist'] text-[12px] font-medium uppercase leading-[18px] tracking-[0.96px] text-[#A1A1AA]">
                Type
              </p>
              <div className="flex w-full flex-col items-start gap-[6px]">
                <button
                  type="button"
                  onClick={() => setActiveType((prev) => prev === "ai" ? null : "ai")}
                  className={
                    "box-border flex h-[37px] w-full flex-row items-center justify-between rounded-[6px] border px-3 transition-colors " +
                    (activeType === "ai"
                      ? "border-[#F87171] bg-[#F87171]/10"
                      : "border-[#404040] bg-[#151515] hover:bg-[#202020]")
                  }
                >
                  <span className={"font-['Geist'] text-[13px] font-medium leading-[20px] " + (activeType === "ai" ? "text-[#F1F5F9]" : "text-[#A1A1AA]")}>
                    AI Generated
                  </span>
                  <span className="font-['Geist'] text-[11px] font-medium leading-[16px] text-[#A1A1AA] opacity-60">
                    0
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveType((prev) => prev === "manual" ? null : "manual")}
                  className={
                    "box-border flex h-[37px] w-full flex-row items-center justify-between rounded-[6px] border px-3 transition-colors " +
                    (activeType === "manual"
                      ? "border-[#F87171] bg-[#F87171]/10"
                      : "border-[#404040] bg-[#151515] hover:bg-[#202020]")
                  }
                >
                  <span className={"font-['Geist'] text-[13px] font-medium leading-[20px] " + (activeType === "manual" ? "text-[#F1F5F9]" : "text-[#A1A1AA]")}>
                    Manual
                  </span>
                  <span className="font-['Geist'] text-[11px] font-medium leading-[16px] text-[#A1A1AA] opacity-60">
                    {questionsTotalCount}
                  </span>
                </button>
              </div>
            </section>

            {/* Topic filter */}
            <section className="flex flex-col items-start gap-3 rounded-xl border border-[#404040] bg-[#1A1A1A] p-[17px_17px_1px] w-[220px]">
              <p className="m-0 h-[18px] w-full font-['Geist'] text-[12px] font-medium uppercase leading-[18px] tracking-[0.96px] text-[#A1A1AA]">
                Topics
              </p>
              <div className="flex w-full flex-col items-start gap-[6px] pb-4">
                {chapters.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveChapterId(c.id)}
                    className={
                      "box-border flex h-[37px] w-full flex-row items-center justify-between rounded-[6px] border px-3 transition-colors " +
                      (activeChapterId === c.id
                        ? "border-[#F87171] bg-[#F87171]/10"
                        : "border-[#404040] bg-[#151515] hover:bg-[#202020]")
                    }
                  >
                    <span className={"font-['Geist'] text-[13px] font-medium leading-[20px] truncate pr-2 " + (activeChapterId === c.id ? "text-[#F1F5F9]" : "text-[#A1A1AA]")}>
                      {c.title}
                    </span>
                    <span className="font-['Geist'] text-[11px] font-medium leading-[16px] text-[#A1A1AA] opacity-60">
                      {/* Count can be added if available per topic */}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </aside>

          {/* ── Questions panel ───────────────────────────────────── */}
          <section className="min-w-0 flex-1 rounded-xl border border-[#404040] bg-[#1A1A1A]">

            {/* Panel toolbar */}
            <div className="flex items-center gap-3 border-b border-[#404040] px-5 py-4">
              <div className="relative flex-1">
                <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717A]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search questions..."
                  className="h-[39px] w-full rounded-md border border-[#404040] bg-[#0A0A0A] pl-9 pr-4 text-sm text-[#F1F5F9] placeholder:text-[#71717A] focus:outline-none focus:border-[#F87171]/50 transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#A1A1AA]"
                  >
                    <FiX className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Sort dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSortOpen((v) => !v)}
                  className={[
                    "inline-flex h-[37px] items-center gap-1.5 rounded-md border px-4 text-[13px] font-medium transition",
                    sortOpen
                      ? "border-[#F87171]/60 bg-[#F87171]/10 text-[#F1F5F9]"
                      : "border-[#404040] text-[#A1A1AA] hover:bg-[#262626]",
                  ].join(" ")}
                >
                  <FiSliders className="h-3.5 w-3.5" />
                  Sort
                  <FiChevronDown
                    className={[
                      "h-3.5 w-3.5 transition-transform",
                      sortOpen ? "rotate-180" : "",
                    ].join(" ")}
                  />
                </button>
                {sortOpen && (
                  <div className="absolute right-0 top-full z-20 mt-2 min-w-[160px] rounded-[8px] border border-[#404040] bg-[#1A1A1A] py-1.5 shadow-lg">
                    {(
                      [
                        { value: "newest", label: "Newest first" },
                        { value: "oldest", label: "Oldest first" },
                        { value: "easy-first", label: "Easy → Hard" },
                        { value: "hard-first", label: "Hard → Easy" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setSortBy(opt.value);
                          setSortOpen(false);
                        }}
                        className={[
                          "flex w-full items-center gap-2.5 px-3 py-2 text-[14px] hover:bg-[#262626]",
                          sortBy === opt.value ? "text-[#F1F5F9]" : "text-[#A1A1AA]",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                            sortBy === opt.value
                              ? "border-[#F87171] bg-[#F87171]"
                              : "border-[#404040] bg-transparent",
                          ].join(" ")}
                        >
                          {sortBy === opt.value && (
                            <span className="h-1.5 w-1.5 rounded-full bg-white" />
                          )}
                        </span>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <span className="whitespace-nowrap text-[13px] font-medium text-[#F1F5F9]">
                {questionsLoading ? "—" : `${questionsTotalCount} question${questionsTotalCount !== 1 ? "s" : ""}`}
              </span>
            </div>

            {/* Questions list body */}
            <div className="space-y-2.5 p-5">
              {questionsError && (
                <div className="rounded-md border border-[#F87171] bg-[#F87171]/10 px-3 py-2 text-[13px] text-[#F87171]">
                  {questionsError}
                </div>
              )}

              {questionsLoading ? (
                <div className="space-y-2.5">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="skeleton-shimmer h-[88px] rounded-lg"
                    />
                  ))}
                </div>
              ) : filteredQuestions.length === 0 ? (
                <div className="rounded-lg border border-[#404040] bg-[#0A0A0A] p-4 text-[14px] text-[#A1A1AA]">
                  {searchQuery.trim() || activeDifficulty
                    ? "No questions match the current filters."
                    : "No questions yet. Create your first question using the sidebar."}
                </div>
              ) : (
                filteredQuestions.map((q) => (
                  <QuestionRow
                    key={q.id}
                    item={q}
                    creatorNameById={creatorNameById}
                    onEdit={handleEditQuestion}
                  />
                ))
              )}

              {/* Load more */}
              {!questionsLoading && questionsNextUrl && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeChapterId && questionsNextUrl && !questionsLoadingMore) {
                        void fetchQuestions(activeChapterId, { append: true, url: questionsNextUrl });
                      }
                    }}
                    disabled={questionsLoadingMore}
                    className="inline-flex h-[41px] w-full items-center justify-center gap-2 rounded-[8px] border border-[#404040] bg-[#151515] px-4 text-[14px] font-medium text-[#F1F5F9] hover:bg-[#202020] disabled:cursor-not-allowed disabled:opacity-60 transition"
                  >
                    {questionsLoadingMore ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#404040] border-t-[#F87171]" />
                        Loading...
                      </>
                    ) : (
                      "Load More"
                    )}
                  </button>
                  <p className="mt-2 text-[12px] text-[#71717A]">
                    Showing {questions.length} of {questionsTotalCount} questions
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* ── Create / Edit Question Modal ─────────────────────────── */}
      <CreateQuestionModal
        key={createQuestionOpen ? (editingQuestion ? `edit-${editingQuestion.id}` : "new") : "closed"}
        open={createQuestionOpen}
        onClose={() => {
          setCreateQuestionOpen(false);
          setEditingQuestion(null);
        }}
        editQuestionId={editingQuestion?.id}
        initialValue={
          editingQuestion
            ? {
                prompt: editingQuestion.prompt,
                choices:
                  editingQuestion.choices?.length === 4
                    ? editingQuestion.choices
                    : [...(editingQuestion.choices ?? []).slice(0, 4), "", "", ""].slice(0, 4),
                correctIndex: Math.max(0, Math.min(3, editingQuestion.correct_index ?? 0)),
                difficulty: (editingQuestion.difficulty ?? "MEDIUM").toLowerCase() as
                  | "easy"
                  | "medium"
                  | "hard",
                is_active: editingQuestion.is_active ?? true,
              }
            : undefined
        }
        onSave={async (data, editId) => {
          if (editId != null) {
            await handleUpdateQuestion(editId, data);
          } else {
            await handleCreateQuestion(data);
          }
          setCreateQuestionOpen(false);
          setEditingQuestion(null);
        }}
        onDelete={
          editingQuestion
            ? async (questionId) => {
                await handleDeleteQuestion(questionId);
                setCreateQuestionOpen(false);
                setEditingQuestion(null);
              }
            : undefined
        }
      />
    </section>
  );
}
