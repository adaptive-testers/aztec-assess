// Source (Manual/AI) is display-only; API has no source field.
import * as React from "react";
import {
  FiCheck,
  FiChevronDown,
  FiEdit2,
  FiFilter,
  FiSearch,
  FiSliders,
  FiTag,
  FiX,
} from "react-icons/fi";

import CreateQuestionModal from "./CreateQuestionModal";
import TopicModal from "./TopicModal";

type QuestionSource = "ai" | "manual";
type Difficulty = "easy" | "medium" | "hard";
type SortOption = "newest" | "oldest" | "difficulty-asc" | "difficulty-desc";

export interface ManageQuestionChoice {
  label: string;
  text: string;
  isCorrect?: boolean;
}

export interface ManageQuestionItem {
  id: string;
  source: QuestionSource;
  difficulty: Difficulty;
  prompt: string;
  topics?: string[];
  choices?: ManageQuestionChoice[];
  created_by?: number;
  created_by_name?: string;
  created_at?: string;
  is_active?: boolean;
}

export interface ManageQuestionsModalProps {
  open: boolean;
  onClose: () => void;

  /** Questions from API  */
  questions?: ManageQuestionItem[];
  loading?: boolean;
  loadingMore?: boolean;
  totalCount?: number;
  hasMore?: boolean;
  error?: string | null;

  /** Create question: called when user saves in CreateQuestionModal */
  onSaveQuestion?: (data: {
    prompt: string;
    choices: string[];
    correctIndex: number;
    difficulty: string;
    is_active?: boolean;
    topics?: string[];
  }) => void | Promise<void>;
  /** Update question: PATCH when saving in edit mode */
  onUpdateQuestion?: (
    questionId: number,
    data: {
      prompt: string;
      choices: string[];
      correctIndex: number;
      difficulty: string;
      is_active?: boolean;
      topics?: string[];
    },
  ) => void | Promise<void>;
  /** Delete question by ID (API soft-delete) */
  onDeleteQuestion?: (questionId: number) => void | Promise<void>;

  /** When set, open Create Question modal in edit mode */
  editingQuestion?: {
    id: number;
    prompt: string;
    choices: string[];
    correct_index: number;
    difficulty: string;
    is_active?: boolean;
  } | null;
  /** Edit question: parent fetches GET question then sets editingQuestion */
  onEditQuestion?: (questionId: number) => void | Promise<void>;
  /** Called when Create Question modal closes so parent can clear editingQuestion */
  onCloseCreateQuestion?: () => void;

  // Not in API – buttons left unclickable
  onCreateQuestion?: () => void;
  onGenerateQuestion?: () => void;
  onFilter?: () => void;
  onSort?: () => void;
  onLoadMore?: () => void | Promise<void>;
  onEnsureAllQuestionsLoaded?: () => void | Promise<void>;

  /** Optional topic list for Create Question modal and Topic filter modal (no API yet) */
  topicOptions?: string[];
  /** Optional topic creation handler (no API required). */
  onCreateTopic?: (topicName: string) => void | Promise<void>;
  /** Optional topic deletion handler (no API required). */
  onDeleteTopics?: (topicNames: string[]) => void | Promise<void>;
}

const DIFFICULTY_ORDER: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

function tagStylesForSource(source: QuestionSource) {
  if (source === "ai") {
    return "bg-emerald-500/10 text-emerald-400";
  }
  return "bg-red-400/10 text-red-300";
}

function tagStylesForDifficulty(d: Difficulty) {
  if (d === "easy") return "bg-emerald-500/10 text-emerald-400";
  if (d === "medium") return "bg-amber-500/10 text-amber-400";
  return "bg-red-400/10 text-red-300";
}

function labelForSource(source: QuestionSource) {
  return source === "ai" ? "AI Generated" : "Manual";
}

function labelForDifficulty(d: Difficulty) {
  if (d === "easy") return "Easy";
  if (d === "medium") return "Medium";
  return "Hard";
}

function formatQuestionDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function ManageQuestionsModal({
  open,
  onClose,
  questions = [],
  loading = false,
  loadingMore = false,
  totalCount,
  hasMore = false,
  error: questionsError = null,
  editingQuestion = null,
  onSaveQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onEditQuestion,
  onCloseCreateQuestion,
  onCreateQuestion,
  onLoadMore,
  onEnsureAllQuestionsLoaded,
  topicOptions = [],
  onCreateTopic,
  onDeleteTopics,
}: ManageQuestionsModalProps) {
  const items = questions;
  const filterDropdownRef = React.useRef<HTMLDivElement>(null);
  const sortDropdownRef = React.useRef<HTMLDivElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Keep items collapsed by default.
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [difficultyFilters, setDifficultyFilters] = React.useState<Set<Difficulty>>(new Set());
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [sortOpen, setSortOpen] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<SortOption>("newest");

  const [createQuestionOpen, setCreateQuestionOpen] = React.useState(false);
  const [topicFilterModalOpen, setTopicFilterModalOpen] = React.useState(false);
  const [selectedTopicFilters, setSelectedTopicFilters] = React.useState<string[]>([]);

  const hasActiveFilters = difficultyFilters.size > 0;
  const isLoadingMore = loadingMore && hasMore;

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const filteredAndSortedItems = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = items.filter((item) => {
      if (difficultyFilters.size > 0 && !difficultyFilters.has(item.difficulty)) {
        return false;
      }
      if (!normalizedQuery) return true;
      return item.prompt.toLowerCase().includes(normalizedQuery);
    });

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return (a.created_at ?? "").localeCompare(b.created_at ?? "");
        case "newest":
          return (b.created_at ?? "").localeCompare(a.created_at ?? "");
        case "difficulty-asc":
          return DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty];
        case "difficulty-desc":
          return DIFFICULTY_ORDER[b.difficulty] - DIFFICULTY_ORDER[a.difficulty];
        default:
          return 0;
      }
    });
  }, [items, query, difficultyFilters, sortBy]);

  const toggleDifficultyFilter = (difficulty: Difficulty) => {
    setDifficultyFilters((prev) => {
      const next = new Set(prev);
      if (next.has(difficulty)) {
        next.delete(difficulty);
      } else {
        next.add(difficulty);
      }
      return next;
    });
  };

  const clearFilters = () => {
    setDifficultyFilters(new Set());
  };

  React.useEffect(() => {
    if (open) {
      setExpandedId(null);
      setQuery("");
      setDebouncedQuery("");
      setDifficultyFilters(new Set());
      setSelectedTopicFilters([]);
      setFilterOpen(false);
      setSortOpen(false);
      setSortBy("newest");
    }
  }, [open]);

  React.useEffect(() => {
    const shouldEnsureAll =
      hasMore &&
      (debouncedQuery.trim().length > 0 || difficultyFilters.size > 0);
    if (shouldEnsureAll) {
      void onEnsureAllQuestionsLoaded?.();
    }
  }, [difficultyFilters.size, hasMore, onEnsureAllQuestionsLoaded, debouncedQuery]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target as Node)
      ) {
        setFilterOpen(false);
      }
      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(event.target as Node)
      ) {
        setSortOpen(false);
      }
    }

    if (filterOpen || sortOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [filterOpen, sortOpen]);

  // When parent sets editingQuestion, open Create Question modal in edit mode.
  React.useEffect(() => {
    if (editingQuestion) setCreateQuestionOpen(true);
  }, [editingQuestion]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Click outside to close */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close modal backdrop"
        className="fixed inset-0 z-0 cursor-default"
      />
      {/* Modal */}
      <div className="relative z-10 w-full max-w-[900px]">
        <div className="rounded-[12px] bg-[#1A1A1A] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)]">
          <div className="rounded-[12px] border-2 border-[#404040] bg-white/[0.01] p-[2px]">
            <div className="flex h-[min(717px,calc(100vh-64px))] flex-col overflow-hidden rounded-[10px] bg-[#1A1A1A]">
              {/* Header */}
              <div className="flex flex-col gap-4 border-b border-[#404040] px-6 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        onCreateQuestion?.();
                        setCreateQuestionOpen(true);
                      }}
                      className="h-[37px] rounded-[6px] bg-[#F87171] px-4 text-[14px] font-medium leading-[21px] text-white shadow-sm hover:bg-[#EF6262]"
                    >
                      Create Question
                    </button>

                    <button
                      type="button"
                      disabled
                      title="Not in API"
                      className="h-[39px] rounded-[6px] border border-[#404040] bg-transparent px-4 text-[14px] font-medium leading-[21px] text-[#A1A1AA] cursor-not-allowed opacity-60 pointer-events-none"
                    >
                      Generate Question
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Topic filter button */}
                    <button
                      type="button"
                      onClick={() => setTopicFilterModalOpen(true)}
                      className={
                        "inline-flex h-[39px] items-center gap-2 rounded-[6px] border px-4 text-[14px] font-medium leading-[21px] transition-colors " +
                        (selectedTopicFilters.length > 0
                          ? "border-[#F87171]/60 bg-[#F87171]/10 text-[#F1F5F9]"
                          : "border-[#404040] bg-transparent text-[#A1A1AA] hover:bg-[#202020]")
                      }
                    >
                      <FiTag className="h-4 w-4" />
                      Topic
                      {selectedTopicFilters.length > 0 && (
                        <span className="ml-1 rounded bg-[#F87171]/20 px-1.5 py-0.5 text-[11px] text-[#F87171]">
                          {selectedTopicFilters.length}
                        </span>
                      )}
                    </button>

                    {/* Filter dropdown */}
                    <div ref={filterDropdownRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setFilterOpen((prev) => !prev)}
                        className={
                          "inline-flex h-[39px] items-center gap-2 rounded-[6px] border px-4 text-[14px] font-medium leading-[21px] transition-colors " +
                          (filterOpen || hasActiveFilters
                            ? "border-[#F87171]/60 bg-[#F87171]/10 text-[#F1F5F9]"
                            : "border-[#404040] bg-transparent text-[#A1A1AA] hover:bg-[#202020]")
                        }
                      >
                        <FiFilter className="h-4 w-4" />
                        Filter
                        {hasActiveFilters && (
                          <span className="ml-1 rounded bg-[#F87171]/20 px-1.5 py-0.5 text-[11px] text-[#F87171]">
                            {difficultyFilters.size}
                          </span>
                        )}
                        <FiChevronDown
                          className={
                            "h-3.5 w-3.5 transition-transform " +
                            (filterOpen ? "rotate-180" : "")
                          }
                        />
                      </button>

                      {filterOpen && (
                        <div className="absolute right-0 top-full z-20 mt-2 min-w-[150px] rounded-[8px] border border-[#404040] bg-[#1A1A1A] py-1.5 shadow-lg">
                          <div className="flex items-center justify-between px-3 py-1.5">
                            <span className="text-[12px] font-medium uppercase tracking-wider text-[#71717A]">
                              Difficulty
                            </span>
                            {hasActiveFilters && (
                              <button
                                type="button"
                                onClick={clearFilters}
                                className="text-[12px] text-[#F87171] hover:text-[#F87171]/80"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                          {(["easy", "medium", "hard"] as const).map((difficulty) => {
                            const isSelected = difficultyFilters.has(difficulty);
                            return (
                              <button
                                key={difficulty}
                                type="button"
                                onClick={() => toggleDifficultyFilter(difficulty)}
                                className={
                                  "flex w-full items-center gap-2.5 px-3 py-2 text-[14px] hover:bg-[#262626] " +
                                  (isSelected ? "text-[#F1F5F9]" : "text-[#A1A1AA]")
                                }
                              >
                                <span
                                  className={
                                    "flex h-4 w-4 items-center justify-center rounded border " +
                                    (isSelected
                                      ? "border-[#F87171] bg-[#F87171]"
                                      : "border-[#404040] bg-transparent")
                                  }
                                >
                                  {isSelected && <FiCheck className="h-3 w-3 text-white" />}
                                </span>
                                <span>
                                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Sort dropdown */}
                    <div ref={sortDropdownRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setSortOpen((prev) => !prev)}
                        className={
                          "inline-flex h-[39px] items-center gap-2 rounded-[6px] border px-4 text-[14px] font-medium leading-[21px] transition-colors " +
                          (sortOpen
                            ? "border-[#F87171]/60 bg-[#F87171]/10 text-[#F1F5F9]"
                            : "border-[#404040] bg-transparent text-[#A1A1AA] hover:bg-[#202020]")
                        }
                      >
                        <FiSliders className="h-4 w-4" />
                        Sort
                        <FiChevronDown
                          className={
                            "h-3.5 w-3.5 transition-transform " +
                            (sortOpen ? "rotate-180" : "")
                          }
                        />
                      </button>

                      {sortOpen && (
                        <div className="absolute right-0 top-full z-20 mt-2 min-w-[150px] rounded-[8px] border border-[#404040] bg-[#1A1A1A] py-1.5 shadow-lg">
                          {(
                            [
                              { value: "newest", label: "Newest" },
                              { value: "oldest", label: "Oldest" },
                              { value: "difficulty-asc", label: "Easy → Hard" },
                              { value: "difficulty-desc", label: "Hard → Easy" },
                            ] as const
                          ).map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setSortBy(option.value);
                                setSortOpen(false);
                              }}
                              className={
                                "flex w-full items-center gap-2.5 px-3 py-2 text-[14px] hover:bg-[#262626] " +
                                (sortBy === option.value
                                  ? "text-[#F1F5F9]"
                                  : "text-[#A1A1AA]")
                              }
                            >
                              <span
                                className={
                                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border " +
                                  (sortBy === option.value
                                    ? "border-[#F87171] bg-[#F87171]"
                                    : "border-[#404040] bg-transparent")
                                }
                              >
                                {sortBy === option.value && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                                )}
                              </span>
                              <span>{option.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={onClose}
                      aria-label="Close"
                      className="grid h-9 w-9 place-items-center rounded-[8px] hover:bg-[#202020]"
                    >
                      <FiX className="h-5 w-5 text-[#A1A1AA]" />
                    </button>
                  </div>
                </div>

                {/* Always-visible search bar */}
                <label className="flex h-[39px] items-center gap-2 rounded-[6px] border border-[#404040] bg-[#151515] px-3">
                  <FiSearch className="h-4 w-4 text-[#71717A]" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search questions..."
                    className="w-full bg-transparent text-[14px] text-[#F1F5F9] outline-none placeholder:text-[#71717A]"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="text-[#71717A] hover:text-[#A1A1AA]"
                      aria-label="Clear search"
                    >
                      <FiX className="h-4 w-4" />
                    </button>
                  )}
                </label>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-hidden">
                <div ref={scrollContainerRef} className="h-full overflow-y-auto px-6 pb-6 pt-6">
                  {questionsError && (
                    <div className="mb-3 rounded-[8px] border border-[#F87171] bg-[#F87171]/10 px-3 py-2 text-[13px] text-[#F87171]">
                      {questionsError}
                    </div>
                  )}
                  {loading && (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="rounded-[8px] border border-[#404040] bg-[#151515] p-4"
                        >
                          <div className="flex gap-2">
                            <div className="h-[22px] w-16 animate-pulse rounded bg-[#262626]" />
                            <div className="h-[22px] w-14 animate-pulse rounded bg-[#262626]" />
                          </div>
                          <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-[#262626]" />
                          <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-[#262626]" />
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-col gap-3">
                    {!loading &&
                      filteredAndSortedItems.map((q) => {
                        const expanded = expandedId === q.id;
                        const hasChoices = (q.choices?.length ?? 0) > 0;

                        return (
                          <div
                            key={q.id}
                            className="rounded-[8px] border border-[#404040] bg-[#151515]"
                          >
                            <div className="flex items-start justify-between gap-4 p-4">
                              <div className="min-w-0 flex-1 pr-4">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={
                                      "inline-flex h-[26px] items-center rounded-[4px] px-2 text-[12px] font-medium leading-[18px] " +
                                      tagStylesForSource(q.source)
                                    }
                                  >
                                    {labelForSource(q.source)}
                                  </span>

                                  <span
                                    className={
                                      "inline-flex h-[26px] items-center rounded-[4px] px-2 text-[12px] font-medium leading-[18px] " +
                                      tagStylesForDifficulty(q.difficulty)
                                    }
                                  >
                                    {labelForDifficulty(q.difficulty)}
                                  </span>

                                  {(q.topics ?? []).map((t) => (
                                    <span
                                      key={t}
                                      className="inline-flex h-[26px] items-center rounded-[4px] bg-[#262626] px-2 text-[12px] font-medium leading-[18px] text-[#F1F5F9] border border-[#404040]"
                                      title={t}
                                    >
                                      {t}
                                    </span>
                                  ))}
                                  {q.is_active === false && (
                                    <span className="inline-flex h-[26px] items-center rounded-[4px] px-2 text-[12px] font-medium leading-[18px] bg-[#404040]/50 text-[#A1A1AA]">
                                      Inactive
                                    </span>
                                  )}
                                </div>

                                <p className="mt-2 truncate text-[14px] font-normal leading-[23px] tracking-[-0.1504px] text-[#F1F5F9] sm:whitespace-normal">
                                  {q.prompt}
                                </p>
                                {(q.created_by != null || q.created_at) && (
                                  <p className="mt-1.5 text-[12px] leading-[18px] text-[#71717A]">
                                    {q.created_at && (
                                      <span>
                                        Created {formatQuestionDate(q.created_at)}
                                      </span>
                                    )}
                                    {q.created_by != null && q.created_at && " · "}
                                    {q.created_by_name && (
                                      <span>By {q.created_by_name}</span>
                                    )}
                                    {!q.created_by_name && q.created_by != null && (
                                      <span>By user #{q.created_by}</span>
                                    )}
                                  </p>
                                )}
                              </div>

                              {/* Right actions  */}
                              <div className="flex flex-col gap-3">
                                <button
                                  type="button"
                                  aria-label="Edit question"
                                  onClick={() =>
                                    onEditQuestion?.(Number(q.id))
                                  }
                                  className="grid h-8 w-8 place-items-center rounded-[6px] hover:bg-[#202020]"
                                >
                                  <FiEdit2 className="h-4 w-4 text-[#A1A1AA]" />
                                </button>

                                <button
                                  type="button"
                                  aria-label={expanded ? "Collapse" : "Expand"}
                                  onClick={() =>
                                    setExpandedId(expanded ? null : q.id)
                                  }
                                  className="grid h-8 w-8 place-items-center rounded-[6px] hover:bg-[#202020]"
                                  disabled={!hasChoices}
                                  title={
                                    !hasChoices ? "No details yet" : undefined
                                  }
                                >
                                  <FiChevronDown
                                    className={
                                      "h-4 w-4 text-[#A1A1AA] transition-transform " +
                                      (expanded ? "rotate-180" : "") +
                                      (!hasChoices ? " opacity-40" : "")
                                    }
                                  />
                                </button>
                              </div>
                            </div>

                            {/* Expanded content */}
                            {expanded && hasChoices && (
                              <div className="border-t border-[#404040]/50 px-4 pb-4 pt-3">
                                <p className="text-[13px] font-medium leading-[20px] text-[#A1A1AA]">
                                  Answer Choices:
                                </p>

                                <div className="mt-2 flex flex-col gap-2">
                                  {q.choices!.map((c) => {
                                    const isCorrect = !!c.isCorrect;

                                    return (
                                      <div
                                        key={c.label}
                                        className={
                                          "flex items-center gap-3 rounded-[6px] border px-3 py-2 text-[13px] leading-[20px] " +
                                          (isCorrect
                                            ? "border-emerald-500/30 bg-emerald-500/10"
                                            : "border-[#404040]/30 bg-[#0A0A0A]")
                                        }
                                      >
                                        <span className="w-6 text-[#A1A1AA]">
                                          {c.label}.
                                        </span>
                                        <span
                                          className={
                                            "truncate sm:whitespace-normal " +
                                            (isCorrect
                                              ? "text-emerald-400"
                                              : "text-[#F1F5F9]")
                                          }
                                        >
                                          {c.text}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    {!loading && filteredAndSortedItems.length === 0 && !isLoadingMore && (
                      <div className="rounded-[8px] border border-[#404040] bg-[#151515] p-4 text-[14px] text-[#A1A1AA]">
                        {query.trim() || hasActiveFilters
                          ? "No questions match the current filters."
                          : "No questions yet."}
                      </div>
                    )}
                    {!loading && filteredAndSortedItems.length === 0 && isLoadingMore && (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="rounded-[8px] border border-[#404040] bg-[#151515] p-4"
                          >
                            <div className="flex gap-2">
                              <div className="h-[22px] w-16 animate-pulse rounded bg-[#262626]" />
                              <div className="h-[22px] w-14 animate-pulse rounded bg-[#262626]" />
                            </div>
                            <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-[#262626]" />
                            <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-[#262626]" />
                          </div>
                        ))}
                      </div>
                    )}
                    {!loading && items.length > 0 && hasMore && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            const container = scrollContainerRef.current;
                            const scrollTop = container?.scrollTop ?? 0;
                            void onLoadMore?.();
                            requestAnimationFrame(() => {
                              if (container) container.scrollTop = scrollTop;
                            });
                          }}
                          disabled={loadingMore}
                          className="inline-flex h-[41px] w-full items-center justify-center gap-2 rounded-[8px] border border-[#404040] bg-[#151515] px-4 text-[14px] font-medium leading-[21px] text-[#F1F5F9] hover:bg-[#202020] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {loadingMore ? (
                            <>
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#404040] border-t-[#F87171]" />
                              Loading more...
                            </>
                          ) : (
                            "Load More"
                          )}
                        </button>
                        <p className="mt-2 text-[12px] leading-[18px] text-[#71717A]">
                          Showing {items.length}
                          {typeof totalCount === "number" ? ` of ${totalCount}` : ""} questions
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Create Question modal (opens on top; backdrop closes only this modal). Edit mode when editingQuestion is set. */}
      <CreateQuestionModal
        key={
          createQuestionOpen
            ? editingQuestion
              ? `edit-${editingQuestion.id}`
              : "new"
            : "closed"
        }
        open={createQuestionOpen}
        onClose={() => {
          setCreateQuestionOpen(false);
          onCloseCreateQuestion?.();
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
                correctIndex: Math.max(
                  0,
                  Math.min(3, editingQuestion.correct_index ?? 0),
                ),
                difficulty: (editingQuestion.difficulty ?? "MEDIUM").toLowerCase() as "easy" | "medium" | "hard",
                is_active: editingQuestion.is_active ?? true,
              }
            : undefined
        }
        onSave={async (data, editId) => {
          if (editId != null && onUpdateQuestion) {
            await onUpdateQuestion(editId, data);
          } else {
            await onSaveQuestion?.(data);
          }
          setCreateQuestionOpen(false);
          onCloseCreateQuestion?.();
        }}
        onDelete={
          onDeleteQuestion && editingQuestion
            ? async (questionId) => {
                await onDeleteQuestion(questionId);
                setCreateQuestionOpen(false);
                onCloseCreateQuestion?.();
              }
            : undefined
        }
        topicOptions={topicOptions}
        onCreateTopic={onCreateTopic}
        onDeleteTopics={onDeleteTopics}
      />

      <TopicModal
        open={topicFilterModalOpen}
        mode="filter"
        topics={topicOptions}
        initialSelectedTopics={selectedTopicFilters}
        onClose={() => setTopicFilterModalOpen(false)}
        onApply={(selected) => {
          setSelectedTopicFilters(selected);
          setTopicFilterModalOpen(false);
        }}
        onClearAll={() => setSelectedTopicFilters([])}
        onCreateTopic={onCreateTopic}
        onDeleteTopics={onDeleteTopics}
      />
    </div>
  );
}
