import { useState } from "react";
import { FiX } from "react-icons/fi";

export interface CreateChapterPayload {
  title: string;
}

export interface CreateChapterModalProps {
  /** "Add Chapter" or "Edit Chapter" */
  title?: string;
  onClose?: () => void;
  onCancel?: () => void;
  /** Create: POST /courses/<id>/chapters/ */
  onAdd?: (title: string) => void | Promise<void>;
  /** Edit: PATCH /chapters/<id>/ */
  mode?: "create" | "edit";
  initialValues?: Partial<CreateChapterPayload>;
  editChapterId?: number;
  onUpdate?: (
    chapterId: number,
    data: CreateChapterPayload,
  ) => void | Promise<void>;
  /** Edit only: DELETE /chapters/<id>/ */
  onDelete?: (chapterId: number) => void | Promise<void>;
}

export default function CreateChapterModal({
  title: titleProp,
  onClose,
  onCancel,
  onAdd,
  mode = "create",
  initialValues,
  editChapterId,
  onUpdate,
  onDelete,
}: CreateChapterModalProps) {
  const isEdit = mode === "edit" && editChapterId != null;

  const [chapterTitle, setChapterTitle] = useState(
    initialValues?.title ?? "",
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const title = titleProp ?? (isEdit ? "Edit Chapter" : "Add Chapter");

  const handleSubmit = async () => {
    const trimmed = chapterTitle.trim();
    if (!trimmed) return;
    if (isEdit) {
      await onUpdate?.(editChapterId!, { title: trimmed });
      return;
    }
    await onAdd?.(trimmed);
  };

  const handleDelete = async () => {
    if (!isEdit) return;
    await onDelete?.(editChapterId!);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close modal backdrop"
        className="absolute inset-0 cursor-default bg-black/60"
      />

      <div className="relative z-10 w-full max-w-[420px] rounded-[8px] border border-[#404040] bg-[#1A1A1A] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)]">
        <div className="flex h-[61px] items-center justify-between border-b border-[#404040] px-4">
          <h2 className="text-[16px] font-medium leading-[24px] text-[#F1F5F9]">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-7 w-7 place-items-center rounded-[6px] text-[#A1A1AA] hover:bg-white/5"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-5">
          <label
            htmlFor="chapter-title"
            className="mb-2 block text-[14px] font-medium leading-[21px] text-[#F1F5F9]"
          >
            Chapter title <span className="text-[#F87171]">*</span>
          </label>
          <input
            id="chapter-title"
            type="text"
            value={chapterTitle}
            onChange={(e) => setChapterTitle(e.target.value)}
            placeholder="Enter chapter title..."
            className="h-[42px] w-full rounded-[6px] border border-[#404040] bg-[#262626] px-3 text-[14px] leading-[21px] text-[#F1F5F9] outline-none placeholder:text-[#A1A1AA] focus:border-[#F87171]/60"
          />
        </div>

        <div className="flex h-[56px] items-center justify-between border-t border-[#404040] px-5">
          <div>
            {isEdit && onDelete && editChapterId != null ? (
              confirmingDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-[#F87171]">Delete?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="h-[33px] rounded-[6px] bg-[#F87171] px-3 text-[13px] font-medium leading-[20px] text-white hover:bg-[#EF6262]"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="h-[33px] rounded-[6px] border border-[#404040] px-3 text-[13px] font-medium leading-[20px] text-[#F1F5F9] hover:bg-white/5"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="h-[33px] rounded-[6px] border border-[#F87171] bg-transparent px-3 text-[13px] font-medium leading-[20px] text-[#F87171] hover:bg-[#F87171]/10"
                >
                  Delete
                </button>
              )
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCancel ?? onClose}
              className="h-[33px] rounded-[6px] border border-[#404040] px-3 text-[13px] font-medium leading-[20px] text-[#F1F5F9] hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="h-[33px] rounded-[6px] bg-[#F87171] px-3 text-[13px] font-medium leading-[20px] text-white hover:bg-[#EF6262]"
            >
              {isEdit ? "Save Changes" : "Add"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
