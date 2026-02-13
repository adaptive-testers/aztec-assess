import { useEffect, useMemo, useState } from "react";
import { FiX } from "react-icons/fi";

/** Payload for create/update quiz */
export interface CreateQuizPayload {
  title: string;
  num_questions?: number;
}

export interface CreateQuizModalProps {
  isOpen: boolean;
  isSubmitting?: boolean;
  apiError?: string | null;
  onClose: () => void;

  mode?: "create" | "edit";
  initialValues?: Partial<CreateQuizPayload>;
  primaryLabel?: string;
  saveDraftLabel?: string;

  onPrimaryAction: (payload: CreateQuizPayload) => Promise<void>;
  onSaveDraft?: (payload: CreateQuizPayload) => Promise<void>;
}

export default function CreateQuizModal(props: CreateQuizModalProps) {
  const {
    isOpen,
    onClose,
    mode = "create",
    initialValues,
    primaryLabel,
    saveDraftLabel,
    onPrimaryAction,
    onSaveDraft,
    isSubmitting = false,
    apiError,
  } = props;

  const [title, setTitle] = useState("");
  const [numQuestionsRaw, setNumQuestionsRaw] = useState("10");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    window.setTimeout(() => {
      setTitle(initialValues?.title ?? "");
      setNumQuestionsRaw(String(initialValues?.num_questions ?? 10));
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
    });
  }

  async function handleSaveDraft() {
    if (!onSaveDraft) return;
    setLocalError(null);
    if (!title.trim()) return setLocalError("Quiz title is required.");
    await onSaveDraft({
      title: title.trim(),
      num_questions: numQuestions,
    });
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      {/* Click outside to close */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close modal backdrop"
        className="fixed inset-0 z-0 cursor-default"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={mode === "edit" ? "Edit Draft Quiz" : "Create New Quiz"}
        className="relative z-10 w-full max-w-[672px] rounded-[12px] border-2 border-[#404040] bg-[#1A1A1A] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]"
      >
        <div className="flex items-center justify-between px-6 pt-6">
          <h2 className="text-[20px] font-medium leading-[30px] tracking-[-0.4492px] text-[#F1F5F9]">
            {mode === "edit" ? "Edit Draft" : "Create New Quiz"}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] hover:bg-[#262626] transition"
            aria-label="Close"
          >
            <FiX className="h-5 w-5 text-[#A1A1AA]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-3">
          {showError ? (
            <div className="mb-3 rounded-[8px] border border-[#F87171] bg-[#F87171]/10 px-3 py-2 text-[13px] text-[#F87171]">
              {showError}
            </div>
          ) : null}

          <div className="rounded-[8px] border border-[#404040] bg-[#0A0A0A] p-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="title"
                  className="text-[14px] font-medium text-[#F1F5F9]"
                >
                  Quiz Title <span className="text-[#F87171]">*</span>
                </label>
                <input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Math Quiz #4"
                  className="h-9 w-full rounded-[6px] border border-[#404040] bg-[#1A1A1A]/30 px-3 text-[14px] leading-[20px] text-[#F1F5F9] outline-none placeholder:text-[#A1A1AA]"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="numQuestions"
                  className="text-[14px] font-medium text-[#F1F5F9]"
                >
                  Number of questions
                </label>
                <input
                  id="numQuestions"
                  type="number"
                  min={1}
                  value={numQuestionsRaw}
                  onChange={(e) => setNumQuestionsRaw(e.target.value)}
                  className="h-9 w-full rounded-[6px] border border-[#404040] bg-[#1A1A1A]/30 px-3 text-[14px] leading-[20px] text-[#F1F5F9] outline-none placeholder:text-[#A1A1AA]"
                />
              </div>

              {/* Not in API – shown as disabled */}
              <div className="space-y-2">
                <div className="text-[14px] font-medium text-[#A1A1AA]">
                  Description{" "}
                  <span className="text-[#71717A]">(Not in API)</span>
                </div>
                <div className="h-10 w-full rounded-[6px] border border-[#404040] bg-[#151515] px-3 flex items-center text-[14px] text-[#71717A] cursor-not-allowed pointer-events-none">
                  —
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-[14px] font-medium text-[#A1A1AA]">
                    Start / Due date{" "}
                    <span className="text-[#71717A]">(Not in API)</span>
                  </div>
                  <div className="h-9 w-full rounded-[6px] border border-[#404040] bg-[#151515] px-3 flex items-center text-[14px] text-[#71717A] cursor-not-allowed pointer-events-none">
                    —
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-[#404040] pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-9 rounded-[6px] border border-[#1A1A1A] bg-[#1A1A1A]/30 px-4 text-[14px] font-medium text-[#F1F5F9] hover:bg-[#262626] transition"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSubmitting || !onSaveDraft}
                  className="h-9 rounded-[6px] bg-[#F87171] px-4 text-[14px] font-medium text-white shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)] disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Saving..."
                    : mode === "edit"
                      ? (saveDraftLabel ?? "Update Draft")
                      : (saveDraftLabel ?? "Save Draft")}
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-9 rounded-[6px] bg-[#F87171] px-4 text-[14px] font-medium text-white shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)] disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Saving..."
                    : (primaryLabel ??
                      (mode === "edit" ? "Save Changes" : "Create Quiz"))}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
