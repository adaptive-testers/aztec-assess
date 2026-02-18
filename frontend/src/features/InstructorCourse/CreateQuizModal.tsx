import { useEffect, useMemo, useState } from "react";
import { FiX } from "react-icons/fi";

/** Payload for create/update quiz (Guide §3.2: adaptive_enabled, selection_mode BANK|FIXED, is_published) */
export interface CreateQuizPayload {
  title: string;
  num_questions?: number;
  adaptive_enabled?: boolean;
  selection_mode?: "BANK" | "FIXED";
  is_published?: boolean;
}

export interface CreateQuizModalProps {
  isOpen: boolean;
  isSubmitting?: boolean;
  apiError?: string | null;
  onClose: () => void;

  /** create = new quiz, edit = existing quiz (pre-populated via initialValues) */
  mode?: "create" | "edit";
  initialValues?: Partial<CreateQuizPayload>;
  primaryLabel?: string;

  onPrimaryAction: (payload: CreateQuizPayload) => Promise<void>;
}

export default function CreateQuizModal(props: CreateQuizModalProps) {
  const {
    isOpen,
    onClose,
    mode = "create",
    initialValues,
    primaryLabel,
    onPrimaryAction,
    isSubmitting = false,
    apiError,
  } = props;

  const [title, setTitle] = useState("");
  const [numQuestionsRaw, setNumQuestionsRaw] = useState("10");
  const [adaptiveEnabled, setAdaptiveEnabled] = useState(true);
  const [selectionMode, setSelectionMode] = useState<"BANK" | "FIXED">("BANK");
  const [publishImmediately, setPublishImmediately] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    window.setTimeout(() => {
      setTitle(initialValues?.title ?? "");
      setNumQuestionsRaw(String(initialValues?.num_questions ?? 10));
      setAdaptiveEnabled(initialValues?.adaptive_enabled ?? true);
      setSelectionMode(initialValues?.selection_mode ?? "BANK");
      setPublishImmediately(initialValues?.is_published ?? true);
      setLocalError(null);
    }, 0);
  }, [isOpen, initialValues]);

  const numQuestions = useMemo(() => {
    const n = Number(numQuestionsRaw);
    return Number.isFinite(n) && n > 0 ? n : 10;
  }, [numQuestionsRaw]);

  const showError = localError ?? apiError ?? null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (!title.trim()) return setLocalError("Quiz title is required.");
    await onPrimaryAction({
      title: title.trim(),
      num_questions: numQuestions,
      adaptive_enabled: adaptiveEnabled,
      selection_mode: selectionMode,
      is_published: publishImmediately,
    });
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close modal backdrop"
        className="fixed inset-0 z-0 cursor-default"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={mode === "edit" ? "Edit Quiz" : "Create New Quiz"}
        className="relative z-10 w-full max-w-[560px] overflow-hidden rounded-[8px] border border-[#404040] bg-[#1A1A1A]"
      >
        {/* Header */}
        <div className="flex h-[69px] items-center justify-between border-b border-[#404040] px-5">
          <h2 className="text-[18px] font-medium leading-[27px] text-[#F1F5F9]">
            {mode === "edit" ? "Edit Quiz" : "Create New Quiz"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-[#A1A1AA] hover:bg-white/5"
            aria-label="Close"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col">
          {showError ? (
            <div className="mx-5 mt-4 rounded-[6px] border border-[#F87171] bg-[#F87171]/10 px-3 py-2 text-[13px] text-[#F87171]">
              {showError}
            </div>
          ) : null}

          <div className="flex max-h-[calc(100vh-180px)] flex-col gap-5 overflow-auto p-5">
            {/* Quiz Title */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="create-quiz-title"
                className="text-[14px] font-medium leading-[21px] text-[#F1F5F9]"
              >
                Quiz Title <span className="text-[#F87171]">*</span>
              </label>
              <input
                id="create-quiz-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Math Quiz #4"
                className="h-[39px] w-full rounded-[6px] border border-[#404040] bg-[#262626] px-3 text-[14px] text-[#F1F5F9] placeholder:text-[#A1A1AA] focus:outline-none"
              />
            </div>

            {/* Number of Questions */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="create-quiz-num-questions"
                className="text-[14px] font-medium leading-[21px] text-[#F1F5F9]"
              >
                Number of Questions
              </label>
              <input
                id="create-quiz-num-questions"
                type="number"
                min={1}
                value={numQuestionsRaw}
                onChange={(e) => setNumQuestionsRaw(e.target.value)}
                placeholder="10"
                className="h-[39px] w-full rounded-[6px] border border-[#404040] bg-[#262626] px-3 text-[14px] text-[#F1F5F9] placeholder:text-[#A1A1AA] focus:outline-none"
              />
            </div>

            {/* Question Selection */}
            <div className="flex flex-col gap-2">
              <div className="text-[14px] font-medium leading-[21px] text-[#F1F5F9]">
                Question Selection
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <label className="inline-flex cursor-pointer items-center gap-2 text-[14px] leading-[21px] text-[#F1F5F9]">
                  <input
                    type="radio"
                    name="questionSelection"
                    checked={selectionMode === "BANK"}
                    onChange={() => setSelectionMode("BANK")}
                    className="h-5 w-5 accent-[#F87171]"
                  />
                  From Question Bank
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 text-[14px] leading-[21px] text-[#F1F5F9]">
                  <input
                    type="radio"
                    name="questionSelection"
                    checked={selectionMode === "FIXED"}
                    onChange={() => setSelectionMode("FIXED")}
                    className="h-5 w-5 accent-[#F87171]"
                  />
                  Fixed Questions
                </label>
              </div>
            </div>

            {/* Toggles */}
            <div className="flex flex-col gap-3 pt-1">
              <label className="inline-flex cursor-pointer items-center gap-2 text-[14px] leading-[21px] text-[#F1F5F9]">
                <input
                  type="checkbox"
                  checked={adaptiveEnabled}
                  onChange={(e) => setAdaptiveEnabled(e.target.checked)}
                  className="h-4 w-4 rounded-[4px] accent-[#F87171]"
                />
                Enable adaptive difficulty
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 text-[14px] leading-[21px] text-[#F1F5F9]">
                <input
                  type="checkbox"
                  checked={publishImmediately}
                  onChange={(e) => setPublishImmediately(e.target.checked)}
                  className="h-4 w-4 rounded-[4px] accent-[#F87171]"
                />
                Publish quiz immediately
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="flex h-[58px] items-center justify-end gap-2 border-t border-[#404040] px-5">
            <button
              type="button"
              onClick={onClose}
              className="h-[37px] rounded-[6px] border border-[#404040] bg-transparent px-4 text-[13px] font-medium leading-[20px] text-[#F1F5F9] hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-[37px] rounded-[6px] bg-[#F87171] px-4 text-[13px] font-medium leading-[20px] text-[#0A0A0A] hover:brightness-95 disabled:opacity-50"
            >
              {isSubmitting
                ? "Saving..."
                : (primaryLabel ??
                    (mode === "edit" ? "Save Changes" : "Create Quiz"))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
