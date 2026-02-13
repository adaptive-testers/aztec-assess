// Source (Manual/AI) is display-only; API has no source field.
import * as React from "react";
import {
  FiChevronDown,
  FiFilter,
  FiSliders,
  FiTrash2,
  FiX,
} from "react-icons/fi";

import CreateQuestionModal from "./CreateQuestionModal";

type QuestionSource = "ai" | "manual";
type Difficulty = "easy" | "medium" | "hard";

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
  choices?: ManageQuestionChoice[];
}

export interface ManageQuestionsModalProps {
  open: boolean;
  onClose: () => void;

  /** Questions from API (chapter question bank) */
  questions?: ManageQuestionItem[];
  loading?: boolean;
  error?: string | null;

  /** Create question: called when user saves in CreateQuestionModal */
  onSaveQuestion?: (data: {
    prompt: string;
    choices: string[];
    correctIndex: number;
    difficulty: string;
  }) => void | Promise<void>;
  /** Delete question by ID (API soft-delete) */
  onDeleteQuestion?: (questionId: number) => void | Promise<void>;

  // Not in API – buttons left unclickable
  onCreateQuestion?: () => void;
  onGenerateQuestion?: () => void;
  onFilter?: () => void;
  onSort?: () => void;
}

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

export default function ManageQuestionsModal({
  open,
  onClose,
  questions = [],
  loading = false,
  error: questionsError = null,
  onSaveQuestion,
  onDeleteQuestion,
  onCreateQuestion,
}: ManageQuestionsModalProps) {
  const items = questions;

  // Keep items collapsed by default.
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const [createQuestionOpen, setCreateQuestionOpen] = React.useState(false);

  React.useEffect(() => {
    if (open) setExpandedId(null);
  }, [open]);

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
              <div className="flex h-[88px] items-center justify-between gap-6 border-b border-[#404040] px-6">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      onCreateQuestion?.();
                      setCreateQuestionOpen(true);
                    }}
                    className="h-[37px] rounded-[6px] bg-[#F87171] px-4 text-[14px] font-medium leading-[21px] text-[#0A0A0A] shadow-sm hover:brightness-110"
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
                  <button
                    type="button"
                    disabled
                    title="Not in API"
                    className="inline-flex h-[39px] items-center gap-2 rounded-[6px] border border-[#404040] bg-transparent px-4 text-[14px] font-medium leading-[21px] text-[#A1A1AA] cursor-not-allowed opacity-60 pointer-events-none"
                  >
                    <FiFilter className="h-4 w-4" />
                    Filter
                  </button>

                  <button
                    type="button"
                    disabled
                    title="Not in API"
                    className="inline-flex h-[39px] items-center gap-2 rounded-[6px] border border-[#404040] bg-transparent px-4 text-[14px] font-medium leading-[21px] text-[#A1A1AA] cursor-not-allowed opacity-60 pointer-events-none"
                  >
                    <FiSliders className="h-4 w-4" />
                    Sort
                  </button>

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

              {/* Body */}
              <div className="flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto px-6 pb-6 pt-6">
                  {questionsError && (
                    <div className="mb-3 rounded-[8px] border border-[#F87171] bg-[#F87171]/10 px-3 py-2 text-[13px] text-[#F87171]">
                      {questionsError}
                    </div>
                  )}
                  {loading && (
                    <div className="text-[14px] text-[#A1A1AA]">
                      Loading questions...
                    </div>
                  )}
                  <div className="flex flex-col gap-3">
                    {!loading &&
                      items.map((q) => {
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
                                </div>

                                <p className="mt-2 truncate text-[14px] font-normal leading-[23px] tracking-[-0.1504px] text-[#F1F5F9] sm:whitespace-normal">
                                  {q.prompt}
                                </p>
                              </div>

                              {/* Right actions  */}
                              <div className="flex flex-col gap-1">
                                <button
                                  type="button"
                                  aria-label="Delete question"
                                  onClick={() =>
                                    onDeleteQuestion?.(Number(q.id))
                                  }
                                  className="grid h-8 w-8 place-items-center rounded-[6px] hover:bg-[#202020]"
                                >
                                  <FiTrash2 className="h-4 w-4 text-[#F87171]" />
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
                  </div>
                </div>
              </div>

              {/* Footer placeholder */}
              {/* <div className="border-t border-[#404040] px-6 py-4">Footer</div> */}
            </div>
          </div>
        </div>
      </div>

      {/* Create Question modal (opens on top; backdrop closes only this modal) */}
      <CreateQuestionModal
        key={createQuestionOpen ? "open" : "closed"}
        open={createQuestionOpen}
        onClose={() => setCreateQuestionOpen(false)}
        onSave={async (data) => {
          await onSaveQuestion?.(data);
          setCreateQuestionOpen(false);
        }}
      />
    </div>
  );
}
