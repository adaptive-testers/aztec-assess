import { FiTrash2, FiX } from "react-icons/fi";

export interface DraftQuiz {
  id: string;
  title: string;
  description?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  time_limit_minutes?: number | null;
}

export interface DraftQuizzesModalProps {
  isOpen: boolean;
  onClose: () => void;
  drafts: DraftQuiz[];
  loading?: boolean;
  error?: string | null;
  onEditDraft: (draft: DraftQuiz) => void;
  onDeleteDraft: (draftId: string) => void | Promise<void>;
}

export default function DraftQuizzesModal({
  isOpen,
  onClose,
  drafts,
  loading = false,
  error,
  onEditDraft,
  onDeleteDraft,
}: DraftQuizzesModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Draft quizzes"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-[700px]">
        <div className="rounded-[12px] bg-[#1A1A1A]">
          <div className="rounded-[12px] border-2 border-[#404040] bg-white/[0.00001] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]">
            {/* Header */}
            <div className="flex h-[85px] items-center justify-between border-b border-[#404040] px-6">
              <h2 className="text-[20px] font-medium leading-[30px] tracking-[-0.4492px] text-[#F1F5F9]">
                Draft Quizzes
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

            {/* Body */}
            <div className="px-6 pt-6">
              <div className="flex max-h-[273px] flex-col gap-3 overflow-auto pb-6">
                {loading ? (
                  <div className="space-y-3">
                    <div className="h-[83px] w-full rounded-[8px] border border-[#404040] bg-[#151515]" />
                    <div className="h-[83px] w-full rounded-[8px] border border-[#404040] bg-[#151515]" />
                    <div className="h-[83px] w-full rounded-[8px] border border-[#404040] bg-[#151515]" />
                  </div>
                ) : error ? (
                  <div className="rounded-[8px] border border-red-500/50 bg-red-900/20 p-4 text-red-300">
                    {error}
                  </div>
                ) : drafts.length === 0 ? (
                  <div className="rounded-[8px] border border-[#404040] bg-[#151515] p-4 text-[#A1A1AA]">
                    No drafts yet.
                  </div>
                ) : (
                  drafts.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-start justify-between gap-4 rounded-[8px] border border-[#404040] bg-[#151515] px-4 pb-4 pt-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[16px] font-medium leading-[24px] tracking-[-0.3125px] text-[#F1F5F9]">
                          {d.title || "Untitled draft"}
                        </div>
                        <div className="mt-1 line-clamp-1 text-[14px] leading-[21px] tracking-[-0.1504px] text-[#A1A1AA]">
                          {d.description?.trim()
                            ? d.description
                            : "No description"}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onEditDraft(d)}
                          className="h-[39px] rounded-[6px] border border-[#404040] px-4 text-[14px] font-medium leading-[21px] text-[#F1F5F9] hover:bg-[#262626] transition"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteDraft(d.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] hover:bg-[#262626] transition"
                          aria-label={`Delete ${d.title}`}
                        >
                          <FiTrash2 className="h-4 w-4 text-[#F87171]" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
