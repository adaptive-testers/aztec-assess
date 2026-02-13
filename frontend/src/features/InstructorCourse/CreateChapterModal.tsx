import { useState } from "react";
import { FiX } from "react-icons/fi";

interface AddChapterModalProps {
  title?: string;
  onClose?: () => void;
  onCancel?: () => void;
  onAdd?: (title: string) => void | Promise<void>;
}

export default function AddChapterModal({
  title = "Add Chapter",
  onClose,
  onCancel,
  onAdd,
}: AddChapterModalProps) {
  const [chapterTitle, setChapterTitle] = useState("");

  const handleAdd = async () => {
    const trimmed = chapterTitle.trim();
    if (!trimmed) return;
    await onAdd?.(trimmed);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      {/* Click outside to close */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close modal backdrop"
        className="absolute inset-0 bg-black/60 cursor-default"
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-[420px] rounded-[8px] border border-[#404040] bg-[#1A1A1A] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)]">
        {/* Header */}
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

        {/* Body */}
        <div className="px-4 pt-4">
          <input
            type="text"
            value={chapterTitle}
            onChange={(e) => setChapterTitle(e.target.value)}
            placeholder="Enter chapter title..."
            className="h-[39px] w-full rounded-[6px] border border-[#614949] bg-[#262626] px-3 text-[14px] leading-[21px] text-[#F1F5F9] outline-none placeholder:text-[#A1A1AA] focus:border-[#F87171]/60"
          />
        </div>

        {/* Footer */}
        <div className="flex h-[49px] items-center justify-end gap-2 px-4">
          <button
            type="button"
            onClick={onCancel}
            className="h-[33px] rounded-[6px] border border-[#404040] px-3 text-[13px] font-medium leading-[20px] text-[#F1F5F9] hover:bg-white/5"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleAdd}
            className="h-[33px] rounded-[6px] bg-[#F87171] px-3 text-[13px] font-medium leading-[20px] text-[#0A0A0A] hover:brightness-95"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
