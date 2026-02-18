import { useEffect, useMemo, useRef, useState } from "react";
import { FiX } from "react-icons/fi";

export type QuestionDifficulty = "easy" | "medium" | "hard";

export interface CreateQuestionFormState {
  prompt: string;
  choices: string[];
  correctIndex: number;
  difficulty: QuestionDifficulty;
  /** (optional, defaults to true) */
  is_active: boolean;
}

export interface CreateQuestionModalProps {
  open: boolean;
  onClose: () => void;
  onSave?: (
    data: CreateQuestionFormState,
    editQuestionId?: number,
  ) => void | Promise<void>;
  initialValue?: Partial<CreateQuestionFormState>;
  /** When set, modal is in edit mode; onSave will be called with this id. */
  editQuestionId?: number;
  /** When in edit mode, called when user clicks Delete; parent should delete then close/clear. */
  onDelete?: (questionId: number) => void | Promise<void>;
}

function clampIndex(value: number, max: number) {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(max, value));
}

export default function CreateQuestionModal({
  open,
  onClose,
  onSave,
  initialValue,
  editQuestionId,
  onDelete,
}: CreateQuestionModalProps) {
  const [prompt, setPrompt] = useState(initialValue?.prompt ?? "");
  const [choices, setChoices] = useState<string[]>(
    initialValue?.choices?.length ? initialValue.choices : ["", "", "", ""],
  );
  const [correctIndex, setCorrectIndex] = useState(
    clampIndex(initialValue?.correctIndex ?? 0, 3),
  );
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>(
    initialValue?.difficulty ?? "easy",
  );
  const [isActive, setIsActive] = useState(
    initialValue?.is_active ?? true,
  );
  const isEditMode = editQuestionId != null;

  const firstFieldRef = useRef<HTMLTextAreaElement | null>(null);

  const state: CreateQuestionFormState = useMemo(
    () => ({ prompt, choices, correctIndex, difficulty, is_active: isActive }),
    [prompt, choices, correctIndex, difficulty, isActive],
  );

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => firstFieldRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!open) return null;

  const difficultyButton = (key: QuestionDifficulty, label: string) => {
    const isActive = difficulty === key;

    const base =
      "h-[39px] w-full rounded-[6px] border px-4 text-[14px] font-medium leading-[21px] transition-colors";
    const inactive =
      "border-[#404040] bg-[#262626] text-[#A1A1AA] hover:bg-[#2A2A2A]";
    const activeEasy =
      "border-[#10B981] bg-[rgba(16,185,129,0.20)] text-[#10B981]";
    const activeMedium =
      "border-[#F59E0B] bg-[rgba(245,158,11,0.18)] text-[#F59E0B]";
    const activeHard =
      "border-[#F87171] bg-[rgba(248,113,113,0.16)] text-[#F87171]";

    const active =
      key === "easy"
        ? activeEasy
        : key === "medium"
          ? activeMedium
          : activeHard;

    return (
      <button
        type="button"
        onClick={() => setDifficulty(key)}
        className={[base, isActive ? active : inactive].join(" ")}
      >
        {label}
      </button>
    );
  };

  const updateChoice = (index: number, value: string) => {
    setChoices((prev) => prev.map((c, i) => (i === index ? value : c)));
  };

  const submit = async () => {
    if (!onSave) return;
    await onSave(state, editQuestionId);
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4"
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
      <div className="relative z-10 w-full max-w-[700px] overflow-hidden rounded-[12px] border-2 border-[#404040] bg-[#1A1A1A] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)]">
        {/* Header */}
        <div className="flex h-[75px] items-center justify-between border-b border-[#404040] px-6">
          <h2 className="text-[20px] font-medium leading-[30px] tracking-[-0.4492px] text-[#F1F5F9]">
            {isEditMode ? "Edit Question" : "Create Question"}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-[8px] text-[#A1A1AA] hover:bg-[#202020]"
            aria-label="Close"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[calc(100vh-240px)] overflow-y-auto px-6 py-6">
          <div className="flex flex-col gap-6">
            {/* Prompt */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="prompt"
                className="text-[14px] font-medium leading-[21px] text-[#F1F5F9]"
              >
                Prompt
              </label>
              <textarea
                ref={firstFieldRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your question here..."
                className="h-[89px] w-full resize-none rounded-[6px] border border-[#404040] bg-[#262626] p-3 text-[14px] leading-[21px] text-[#F1F5F9] outline-none placeholder:text-[#71717A] focus:border-[#6B6B6B]"
              />
            </div>

            {/* Answer Choices */}
            <div className="flex flex-col gap-3">
              <label
                htmlFor="choices"
                className="text-[14px] font-medium leading-[21px] text-[#F1F5F9]"
              >
                Answer Choices
              </label>

              <div className="flex flex-col gap-3">
                {choices.map((value, i) => {
                  const isCorrect = correctIndex === i;

                  const wrapper =
                    "flex h-[47px] w-full items-center rounded-[6px] border px-3 transition-colors";
                  const inactive = "border-[#404040] bg-[#262626]";
                  const active = "border-[#10B981] bg-[#183A2F]";

                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCorrectIndex(i)}
                      className={[wrapper, isCorrect ? active : inactive].join(
                        " ",
                      )}
                      aria-pressed={isCorrect}
                      title="Click to mark as correct"
                    >
                      <span className="sr-only">
                        Mark choice {i + 1} as correct
                      </span>

                      <input
                        value={value}
                        onChange={(e) => updateChoice(i, e.target.value)}
                        placeholder={`Choice ${i + 1}`}
                        className="w-full bg-transparent text-[14px] leading-[21px] text-[#F1F5F9] outline-none placeholder:text-[#71717A]"
                      />
                    </button>
                  );
                })}
              </div>

              <p className="text-[12px] leading-[18px] text-[#71717A]">
                Select the choice to mark the correct answer
              </p>
            </div>

            {/* Difficulty */}
            <div className="flex flex-col gap-3">
              <label
                htmlFor="difficulty"
                className="text-[14px] font-medium leading-[21px] text-[#F1F5F9]"
              >
                Difficulty
              </label>

              <div className="grid grid-cols-3 gap-3">
                {difficultyButton("easy", "Easy")}
                {difficultyButton("medium", "Medium")}
                {difficultyButton("hard", "Hard")}
              </div>
            </div>

            {/* Active (Guide: is_active, optional, default true) */}
            <div className="flex flex-col gap-2">
              <div className="text-[14px] font-medium leading-[21px] text-[#F1F5F9]">
                Status
              </div>
              <label className="inline-flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-[#404040] bg-[#262626] text-[#F87171] focus:ring-[#F87171]"
                />
                <span className="text-[14px] leading-[21px] text-[#F1F5F9]">
                  Active (included in question bank)
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex h-[88px] items-start justify-end gap-3 border-t border-[#404040] px-6 pt-6">
          {isEditMode && onDelete && editQuestionId != null ? (
            <button
              type="button"
              onClick={async () => {
                await onDelete(editQuestionId);
              }}
              className="h-[39px] rounded-[6px] border border-[#F87171] bg-transparent px-4 text-[14px] font-medium leading-[21px] text-[#F87171] hover:bg-[#F87171]/10"
            >
              Delete
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="h-[39px] rounded-[6px] border border-[#404040] bg-transparent px-4 text-[14px] font-medium leading-[21px] text-[#F1F5F9] hover:bg-[#202020]"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={submit}
            className="h-[39px] rounded-[6px] bg-[#F87171] px-4 text-[14px] font-medium leading-[21px] text-[#0A0A0A] hover:brightness-95"
          >
            {isEditMode ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
