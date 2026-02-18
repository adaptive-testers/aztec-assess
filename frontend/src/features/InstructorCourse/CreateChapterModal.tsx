import { useState } from "react";
import { FiX } from "react-icons/fi";

/** title (required), order_index (integer, optional) */
export interface CreateChapterPayload {
  title: string;
  order_index?: number | null;
}

export interface CreateChapterModalProps {
  /** "Add Chapter" or "Edit Chapter" */
  title?: string;
  onClose?: () => void;
  onCancel?: () => void;
  /** Create: POST /courses/<id>/chapters/ */
  onAdd?: (title: string, order_index?: number | null) => void | Promise<void>;
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
  const [orderIndexRaw, setOrderIndexRaw] = useState(
    initialValues?.order_index != null
      ? String(initialValues.order_index)
      : "",
  );

  const orderIndex =
    orderIndexRaw.trim() === ""
      ? null
      : (() => {
          const n = Number(orderIndexRaw);
          return Number.isFinite(n) && n >= 0 ? n : null;
        })();

  const title = titleProp ?? (isEdit ? "Edit Chapter" : "Add Chapter");

  const handleSubmit = async () => {
    const trimmed = chapterTitle.trim();
    if (!trimmed) return;
    if (isEdit && onUpdate && editChapterId != null) {
      await onUpdate(editChapterId, { title: trimmed, order_index: orderIndex });
    } else {
      await onAdd?.(trimmed, orderIndex);
    }
  };

  const handleDelete = async () => {
    if (isEdit && onDelete && editChapterId != null) {
      await onDelete(editChapterId);
    }
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

        <div className="flex flex-col gap-3 px-4 pt-4">
          <div>
            <label
              htmlFor="chapter-title"
              className="mb-1 block text-[13px] font-medium leading-[20px] text-[#F1F5F9]"
            >
              Chapter title <span className="text-[#F87171]">*</span>
            </label>
            <input
              id="chapter-title"
              type="text"
              value={chapterTitle}
              onChange={(e) => setChapterTitle(e.target.value)}
              placeholder="Enter chapter title..."
              className="h-[39px] w-full rounded-[6px] border border-[#614949] bg-[#262626] px-3 text-[14px] leading-[21px] text-[#F1F5F9] outline-none placeholder:text-[#A1A1AA] focus:border-[#F87171]/60"
            />
          </div>
          <div>
            <label
              htmlFor="chapter-order-index"
              className="mb-1 block text-[13px] font-medium leading-[20px] text-[#F1F5F9]"
            >
              Display order <span className="text-[#71717A]">(optional)</span>
            </label>
            <input
              id="chapter-order-index"
              type="number"
              min={0}
              value={orderIndexRaw}
              onChange={(e) => setOrderIndexRaw(e.target.value)}
              placeholder="e.g. 1"
              className="h-[39px] w-full rounded-[6px] border border-[#404040] bg-[#262626] px-3 text-[14px] leading-[21px] text-[#F1F5F9] outline-none placeholder:text-[#A1A1AA] focus:border-[#F87171]/60"
            />
            <p className="mt-1 text-[12px] text-[#71717A]">
              Lower numbers appear first; leave empty for no order.
            </p>
          </div>
        </div>

        <div className="flex h-[49px] items-center justify-end gap-2 px-4 py-3">
          {isEdit && onDelete && editChapterId != null ? (
            <button
              type="button"
              onClick={handleDelete}
              className="h-[33px] rounded-[6px] border border-[#F87171] bg-transparent px-3 text-[13px] font-medium leading-[20px] text-[#F87171] hover:bg-[#F87171]/10"
            >
              Delete
            </button>
          ) : null}
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
            className="h-[33px] rounded-[6px] bg-[#F87171] px-3 text-[13px] font-medium leading-[20px] text-[#0A0A0A] hover:brightness-95"
          >
            {isEdit ? "Save Changes" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
