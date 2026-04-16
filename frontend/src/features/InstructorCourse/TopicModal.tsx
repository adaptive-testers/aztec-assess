import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiPlus, FiX } from "react-icons/fi";

import { type Topic } from "../../types/quizTypes";

export type TopicModalMode = "select" | "filter";

export interface TopicModalProps {
  open: boolean;
  topics: Topic[];
  initialSelectedTopics?: string[];
  onClose: () => void;
  onApply: (selectedTopics: string[]) => void;
  onClearAll?: () => void;
  onCreateTopic?: (topicName: string) => void | Promise<void>;
  onDeleteTopics?: (topicIds: string[]) => void | Promise<void>;
  mode: TopicModalMode;
  title?: string;
}

function uniq(items: string[]): string[] {
  return Array.from(new Set(items));
}

export default function TopicModal(props: TopicModalProps) {
  const {
    open,
    topics,
    initialSelectedTopics,
    onClose,
    onApply,
    onClearAll,
    onCreateTopic,
    onDeleteTopics,
    mode,
    title: titleProp,
  } = props;

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const newTopicInputRef = useRef<HTMLInputElement | null>(null);
  const deleteTimeoutRef = useRef<number | null>(null);

  const [selected, setSelected] = useState<string[]>([]);
  const [localTopics, setLocalTopics] = useState<Topic[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [deleteConfirmFor, setDeleteConfirmFor] = useState<string[] | null>(null);

  const topicList = useMemo(() => localTopics, [localTopics]);

  const defaultTitle =
    mode === "select"
      ? "Select topics"
      : "Select topics to filter questions";
  const title = titleProp ?? defaultTitle;

  const [prevOpen, setPrevOpen] = useState(false);
  const [prevInitial, setPrevInitial] = useState(initialSelectedTopics);
  const [prevTopics, setPrevTopics] = useState(topics);

  if (open && !prevOpen) {
    setPrevOpen(true);
    setSelected(uniq(initialSelectedTopics ?? []));
    setShowAdd(false);
    setNewTopicName("");
    setDeleteConfirmFor(null);
    setLocalTopics(topics);
  } else if (!open && prevOpen) {
    setPrevOpen(false);
  }

  if (open && initialSelectedTopics !== prevInitial) {
    setPrevInitial(initialSelectedTopics);
    setSelected(uniq(initialSelectedTopics ?? []));
  }

  if (open && topics !== prevTopics) {
    setPrevTopics(topics);
    setLocalTopics(topics);
  }

  useEffect(() => {
    if (!open) return;
    return () => {
      if (deleteTimeoutRef.current != null) window.clearTimeout(deleteTimeoutRef.current);
      deleteTimeoutRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !showAdd) return;
    const t = window.setTimeout(() => newTopicInputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open, showAdd]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleBackdropMouseDown: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    if (e.currentTarget === e.target) onClose();
  };

  const toggleTopic = (topic: string) => {
    setSelected((prev) => {
      if (prev.includes(topic)) return prev.filter((t) => t !== topic);
      return [...prev, topic];
    });
  };

  const addTopic = async () => {
    const cleaned = newTopicName.trim();
    if (!cleaned) return;

    const alreadyExists = localTopics.some(
      (t) => t.name.trim().toLowerCase() === cleaned.toLowerCase(),
    );

    const match = localTopics.find((t) => t.name.trim().toLowerCase() === cleaned.toLowerCase());

    if (!alreadyExists) {
      await onCreateTopic?.(cleaned);
    } else if (match) {
      setSelected((prev) => (prev.includes(match.id) ? prev : [...prev, match.id]));
    }
    setNewTopicName("");
    setShowAdd(false);
  };

  const beginDelete = () => {
    const snapshot = [...selected];
    if (snapshot.length === 0) return;
    if (deleteTimeoutRef.current != null) window.clearTimeout(deleteTimeoutRef.current);
    setDeleteConfirmFor(snapshot);

    deleteTimeoutRef.current = window.setTimeout(() => {
      setDeleteConfirmFor(null);
      deleteTimeoutRef.current = null;
    }, 3000);
  };

  const confirmDelete = async () => {
    const toDelete = deleteConfirmFor ?? [];
    if (toDelete.length === 0) return;

    if (deleteTimeoutRef.current != null) window.clearTimeout(deleteTimeoutRef.current);
    deleteTimeoutRef.current = null;

    try {
      await onDeleteTopics?.(toDelete);
      setLocalTopics((prev) => prev.filter((t) => !toDelete.includes(t.id)));
      setSelected((prev) => prev.filter((t) => !toDelete.includes(t)));
    } catch {
      // Keep local state unchanged when delete fails.
    } finally {
      setDeleteConfirmFor(null);
    }
  };

  const clearAll = () => {
    setSelected([]);
    onClearAll?.();
  };

  const apply = () => {
    onApply(selected);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Close modal backdrop"
        className="fixed inset-0 z-0 cursor-default"
        onMouseDown={handleBackdropMouseDown}
      />

      <div
        ref={dialogRef}
        className="relative z-10 w-full max-w-[600px] overflow-hidden rounded-[12px] border-2 border-[#404040] bg-[#1A1A1A] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)]"
      >
        <div className="flex h-[75px] items-center justify-between border-b border-[#404040] px-6">
          <h2 className="text-[20px] font-medium leading-[30px] tracking-[-0.4492px] text-[#F1F5F9]">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-[8px] text-[#A1A1AA] hover:bg-[#202020]"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(100vh-240px)] overflow-y-auto px-6 py-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {topicList.map((t) => {
                const active = selected.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTopic(t.id)}
                    className={[
                      "rounded-full border px-4 py-2 text-[14px] font-medium leading-[21px] transition-colors",
                      active
                        ? "border-[#F87171] bg-[#F87171]/10 text-[#F1F5F9]"
                        : "border-[#404040] bg-[#151515] text-[#F1F5F9] hover:bg-[#202020]",
                    ].join(" ")}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>

            <div>
              {!showAdd ? (
                <button
                  type="button"
                  onClick={() => setShowAdd(true)}
                  className="inline-flex h-[39px] items-center gap-2 rounded-[6px] border border-[#404040] bg-transparent px-4 text-[14px] font-medium leading-[21px] text-[#F1F5F9] hover:bg-[#202020]"
                >
                  <FiPlus className="h-4 w-4" />
                  Add Topic
                </button>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    ref={newTopicInputRef}
                    value={newTopicName}
                    onChange={(e) => setNewTopicName(e.target.value)}
                    placeholder="New topic name..."
                    className="h-[39px] w-full flex-1 rounded-[6px] border border-[#404040] bg-[#262626] px-3 text-[14px] leading-[21px] text-[#F1F5F9] outline-none placeholder:text-[#71717A] focus:border-[#6B6B6B]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void addTopic();
                      if (e.key === "Escape") {
                        setShowAdd(false);
                        setNewTopicName("");
                      }
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAdd(false);
                        setNewTopicName("");
                      }}
                      className="h-[39px] rounded-[6px] border border-[#404040] bg-transparent px-4 text-[14px] font-medium leading-[21px] text-[#F1F5F9] hover:bg-[#202020]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void addTopic()}
                      className="h-[39px] rounded-[6px] bg-[#F87171] px-4 text-[14px] font-medium leading-[21px] text-white hover:bg-[#EF6262]"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex h-[88px] items-start justify-between gap-3 border-t border-[#404040] px-6 pt-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={selected.length === 0}
              onClick={() => {
                if (deleteConfirmFor) void confirmDelete();
                else beginDelete();
              }}
              className={
                "h-[39px] w-[110px] rounded-[6px] border text-[14px] font-medium leading-[21px] disabled:cursor-not-allowed disabled:opacity-60 " +
                (deleteConfirmFor
                  ? "border-[#F87171] bg-[#F87171] text-white hover:bg-[#EF6262]"
                  : "border-[#F87171] bg-transparent text-[#F87171] hover:bg-[#F87171]/10")
              }
            >
              {deleteConfirmFor ? "Confirm?" : "Delete"}
            </button>

            {mode === "filter" ? (
              <button
                type="button"
                onClick={clearAll}
                className="h-[39px] rounded-[6px] border border-[#404040] bg-transparent px-4 text-[14px] font-medium leading-[21px] text-[#F1F5F9] hover:bg-[#202020]"
              >
                Clear All
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-[39px] rounded-[6px] border border-[#404040] bg-transparent px-4 text-[14px] font-medium leading-[21px] text-[#F1F5F9] hover:bg-[#202020]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={apply}
              className="h-[39px] rounded-[6px] bg-[#F87171] px-4 text-[14px] font-medium leading-[21px] text-white hover:bg-[#EF6262]"
            >
              {mode === "select" ? "Save" : "Apply Filter"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
