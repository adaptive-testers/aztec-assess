import { useState } from "react";
import { FiTrash2, FiX } from "react-icons/fi";

export interface DraftQuiz {
  id: string;
  title: string;
  createdDate?: string;
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
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

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
                      className="flex items-center justify-between gap-4 rounded-[8px] border border-[#404040] bg-[#151515] px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[16px] font-medium leading-[24px] tracking-[-0.3125px] text-[#F1F5F9]">
                          {d.title || "Untitled draft"}
                        </div>
                        <div className="mt-0.5 text-[13px] leading-[20px] text-[#A1A1AA]">
                          {d.createdDate
                            ? `Created ${d.createdDate}`
                            : "No date"}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {confirmingDeleteId === d.id ? (
                          <>
                            <span className="text-[13px] text-[#F87171]">Delete?</span>
                            <button
                              type="button"
                              onClick={() => {
                                void onDeleteDraft(d.id);
                                setConfirmingDeleteId(null);
                              }}
                              className="h-[36px] rounded-[6px] bg-[#F87171] px-3 text-[13px] font-medium leading-[20px] text-white hover:bg-[#EF6262] transition"
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmingDeleteId(null)}
                              className="h-[36px] rounded-[6px] border border-[#404040] px-3 text-[13px] font-medium leading-[20px] text-[#F1F5F9] hover:bg-white/5 transition"
                            >
                              No
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => onEditDraft(d)}
                              className="h-[36px] rounded-[6px] border border-[#404040] px-4 text-[14px] font-medium leading-[21px] text-[#F1F5F9] hover:bg-[#262626] transition"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => setConfirmingDeleteId(d.id)}
                              className="inline-flex h-[36px] w-[36px] items-center justify-center rounded-[6px] hover:bg-[#262626] transition"
                              aria-label={`Delete ${d.title}`}
                            >
                              <FiTrash2 className="h-4 w-4 text-[#F87171]" />
                            </button>
                          </>
                        )}
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
