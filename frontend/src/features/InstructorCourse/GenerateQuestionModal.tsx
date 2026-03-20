import { useEffect, useRef, useState } from "react";
import { FiChevronDown, FiEdit2, FiUploadCloud, FiX, FiTrash2 } from "react-icons/fi";
import type { ManageQuestionItem } from "./ManageQuestionsModal";
import CreateQuestionModal from "./CreateQuestionModal";
import { privateApi } from "../../api/axios";
import { QUIZZES } from "../../api/endpoints";

export type GenerateQuestionsModalProps = {
  open?: boolean;
  onClose?: () => void;
  chapterId?: number | null;
  onSuccess?: () => void;
};

type Difficulty = "Easy" | "Medium" | "Hard";

// MOCK DATA (DELETE ONCE BACKEND IS READY)
const MOCK_GENERATED_QUESTIONS: ManageQuestionItem[] = [
  {
    id: "mock-1",
    source: "ai",
    difficulty: "easy",
    prompt: "What is the primary purpose of this document?",
    choices: [
      { label: "A", text: "To explain calculus", isCorrect: false },
      { label: "B", text: "To teach web development", isCorrect: true },
      { label: "C", text: "To provide a recipe", isCorrect: false },
      { label: "D", text: "To describe history", isCorrect: false },
    ],
    is_active: true,
    created_at: new Date().toISOString(),
    created_by_name: "AI Assistant",
  },
  {
    id: "mock-2",
    source: "ai",
    difficulty: "medium",
    prompt: "Which of the following best describes the main concept?",
    choices: [
      { label: "A", text: "Photosynthesis", isCorrect: false },
      { label: "B", text: "React Hooks", isCorrect: true },
      { label: "C", text: "Newton's Laws", isCorrect: false },
      { label: "D", text: "Thermodynamics", isCorrect: false },
    ],
    is_active: true,
    created_at: new Date().toISOString(),
    created_by_name: "AI Assistant",
  },
];

export default function GenerateQuestionsModal({
  open = true,
  onClose,
  chapterId,
  onSuccess,
}: GenerateQuestionsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [instructions, setInstructions] = useState("");
  const [numQuestions, setNumQuestions] = useState("10");
  const [selectedDifficulties, setSelectedDifficulties] = useState<Set<Difficulty>>(
    new Set([]),
  );
  const [isDragging, setIsDragging] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  const [generatedQuestions, setGeneratedQuestions] = useState<ManageQuestionItem[]>(() => {
    try {
      const saved = sessionStorage.getItem("ai_generated_questions_draft");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse session draft", e);
    }
    return [];
  });
  
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const wasOpenRef = useRef(open);

  // Sync draft to sessionStorage
  useEffect(() => {
    if (generatedQuestions.length > 0) {
      sessionStorage.setItem("ai_generated_questions_draft", JSON.stringify(generatedQuestions));
    } else if (!isGenerating) {
      sessionStorage.removeItem("ai_generated_questions_draft");
    }
  }, [generatedQuestions, isGenerating]);

  // Reset state when modal is explicitly closed
  useEffect(() => {
    if (wasOpenRef.current && !open) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setFile(null);
      setInstructions("");
      setNumQuestions("10");
      setSelectedDifficulties(new Set([]));
      setIsDragging(false);
      setIsGenerating(false);
      setApiError(null);
      setGeneratedQuestions([]);
      setExpandedId(null);
      setEditingQuestionId(null);
    }
    wasOpenRef.current = open;
  }, [open]);

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFile(selectedFile);
    }
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const handleFile = (newFile: File | null) => {
    setApiError(null);
    if (!newFile) {
      removeFile();
      return;
    }

    const validExtensions = /\.(pdf|docx|txt|png|jpe?g)$/i;
    if (!validExtensions.test(newFile.name)) {
      setApiError("Invalid file type. Please upload a PDF, DOCX, TXT, PNG, or JPEG.");
      return;
    }

    if (newFile.size > 10 * 1024 * 1024) {
      setApiError("File is too large. Maximum size is 10MB.");
      return;
    }

    setFile(newFile);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFile(droppedFile);
    }
  };

  const toggleDifficulty = (d: Difficulty) => {
    setSelectedDifficulties((prev) => {
      const next = new Set(prev);
      if (next.has(d)) {
        next.delete(d);
      } else {
        next.add(d);
      }
      return next;
    });
  };

  const handleGenerate = async () => {
    setApiError(null);
    setIsGenerating(true);
    setGeneratedQuestions([]);

    if (chapterId) {
      try {
        abortControllerRef.current = new AbortController();
        const formData = new FormData();
        if (file) formData.append("file", file);
        formData.append("instructions", instructions);
        formData.append("num_questions", String(numQuestions));
        const diffs = Array.from(selectedDifficulties).map(d => d.toLowerCase());
        diffs.forEach(d => formData.append("difficulties", d));

        const response = await privateApi.post(QUIZZES.GENERATE_QUESTIONS(chapterId), formData, {
          headers: { "Content-Type": "multipart/form-data" },
          signal: abortControllerRef.current.signal,
        });

        setIsGenerating(false);
        setGeneratedQuestions(response.data as ManageQuestionItem[]);
        return;
      } catch (err: any) {
        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
          return;
        }
        setApiError(err.response?.data?.message || err.message || "Failed to generate questions.");
        setIsGenerating(false);
        // Fall back to Mock API for Demo if backend is absent
        // (REMOVE ONCE BACKEND IS DONE)
        setGeneratedQuestions(
          MOCK_GENERATED_QUESTIONS.map(q => ({ ...q, id: "mock-" + Math.random().toString(36).substring(2, 9) }))
        );
        return;
      }
    }

    // Mock API Call
    setTimeout(() => {
      setIsGenerating(false);
      setGeneratedQuestions(
        MOCK_GENERATED_QUESTIONS.map(q => ({ ...q, id: "mock-" + Math.random().toString(36).substring(2, 9) }))
      );
    }, 2500);
  };

  const handleAddQuestions = async () => {
    if (!chapterId) {
      onSuccess?.();
      onClose?.();
      return;
    }

    setIsGenerating(true);
    setApiError(null);
    try {
      await privateApi.post(QUIZZES.BULK_CREATE_QUESTIONS(chapterId), {
        questions: generatedQuestions,
      });
      onSuccess?.();
      onClose?.();
    } catch (err: any) {
      console.warn("Bulk add failed. Proceeding with onSuccess mock...", err);
      // Even if backend isn't there, trigger success locally for demo purposes
      onSuccess?.();
      onClose?.();
    } finally {
      setIsGenerating(false);
    }
  };

  const tagStylesForDifficulty = (d: string) => {
    if (d === "easy") return "bg-emerald-500/10 text-emerald-400";
    if (d === "medium") return "bg-amber-500/10 text-amber-400";
    return "bg-red-400/10 text-red-300";
  };

  const formatQuestionDate = (iso: string): string => {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return iso;
    }
  };

  const handleSaveEditedQuestion = (data: { prompt: string; choices: string[]; correctIndex: number; difficulty: string; is_active?: boolean }) => {
    if (!editingQuestionId) return;

    setGeneratedQuestions(prev => prev.map(q => {
      if (q.id === editingQuestionId) {
        return {
          ...q,
          prompt: data.prompt,
          difficulty: data.difficulty as "easy" | "medium" | "hard",
          is_active: data.is_active,
          choices: data.choices.map((c, i) => ({
            label: String.fromCharCode(65 + i),
            text: c,
            isCorrect: i === data.correctIndex
          }))
        };
      }
      return q;
    }));
    
    setEditingQuestionId(null);
  };

  const editingQuestionData = generatedQuestions.find(q => q.id === editingQuestionId);
  const formattedEditingQuestion = editingQuestionData ? {
    prompt: editingQuestionData.prompt,
    choices: editingQuestionData.choices?.map(c => c.text) || [],
    correctIndex: editingQuestionData.choices?.findIndex(c => c.isCorrect) || 0,
    difficulty: editingQuestionData.difficulty,
    is_active: editingQuestionData.is_active
  } : undefined;

  const difficultyPill = (d: Difficulty) => {
    const isSelected = selectedDifficulties.has(d);
    
    const base = "h-[47px] w-full rounded-[6px] border text-[14px] font-medium transition-all flex items-center justify-center";
    const inactive = "border-[#404040] bg-[#262626] text-[#71717A] hover:border-[#6B6B6B]";
    
    const activeEasy = "border-[#10B981] bg-[rgba(16,185,129,0.20)] text-[#10B981]";
    const activeMedium = "border-[#F59E0B] bg-[rgba(245,158,11,0.18)] text-[#F59E0B]";
    const activeHard = "border-[#F87171] bg-[rgba(248,113,113,0.16)] text-[#F87171]";

    const active = d === "Easy" ? activeEasy : d === "Medium" ? activeMedium : activeHard;

    return (
      <button
        key={d}
        type="button"
        onClick={() => toggleDifficulty(d)}
        className={`${base} ${isSelected ? active : inactive}`}
      >
        {d}
      </button>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        className="fixed inset-0 z-0 cursor-default"
        aria-label="Close backdrop"
      />

      <div className="relative z-10 w-full max-w-[700px] overflow-hidden rounded-[12px] border-2 border-[#404040] bg-[#1A1A1A] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)]">
        {/* Header */}
        <div className="flex h-[75px] items-center justify-between border-b border-[#404040] px-6">
          <h2 className="text-[20px] font-medium leading-[30px] tracking-[-0.4492px] text-[#F1F5F9]">
            {generatedQuestions.length > 0 ? "Review Questions" : "Generate Questions with AI"}
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
        <div className="flex min-h-[240px] flex-col overflow-hidden px-6 py-6 font-primary">
          {isGenerating ? (
            /* Loader State */
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              <div className="relative mb-8 h-20 w-20">
                {/* Background Pulse Layers */}
                <div className="absolute inset-0 animate-ping rounded-full bg-[#F87171]/20 opacity-55" style={{ animationDuration: '3s' }}></div>
                <div className="absolute inset-0 animate-pulse rounded-full bg-[#F87171]/30 opacity-58" style={{ animationDuration: '2s' }}></div>
                
                {/* Core Icon Container */}
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[#F87171] opacity-55 shadow-[0px_0px_40px_rgba(248,113,113,0.5)]">
                  {/* AI Vector Icon */}
                  <div className="relative h-10 w-10">
                    <div className="absolute inset-[8.33%_16.67%] border-[3.33333px] border-[#0A0A0A] rounded-sm"></div>
                    <div className="absolute right-[16.67%] top-[12.5%] bottom-[70.83%] left-[83.33%] border-[3.33333px] border-[#0A0A0A] bg-[#F87171]"></div>
                    <div className="absolute right-[8.33%] top-[20.83%] bottom-[79.17%] left-[75%] border-[3.33333px] border-[#0A0A0A]"></div>
                    <div className="absolute top-[70.83%] bottom-[20.83%] left-[16.67%] right-[83.33%] border-[3.33333px] border-[#0A0A0A]"></div>
                    <div className="absolute top-[75%] bottom-[25%] left-[12.5%] right-[79.17%] border-[3.33333px] border-[#0A0A0A]"></div>
                  </div>
                </div>
              </div>

              <p className="text-center text-[16px] font-medium leading-[24px] text-[#F1F5F9]">
                Analyzing your study material...
              </p>
            </div>
          ) : generatedQuestions.length > 0 ? (
            /* Review Questions State */
            <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {generatedQuestions.map((q) => {
                const expanded = expandedId === q.id;
                const hasChoices = (q.choices?.length ?? 0) > 0;
                
                return (
                  <div key={q.id} className="rounded-[8px] border border-[#404040] bg-[#151515]">
                    <div className="flex items-start justify-between gap-4 p-4">
                      <div className="min-w-0 flex-1 pr-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex h-[26px] items-center rounded-[4px] bg-emerald-500/10 px-2 text-[12px] font-medium leading-[18px] text-emerald-400">
                            AI Generated
                          </span>
                          <span className={`inline-flex h-[26px] items-center rounded-[4px] px-2 text-[12px] font-medium leading-[18px] ${tagStylesForDifficulty(q.difficulty)}`}>
                            {q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)}
                          </span>
                          {q.is_active === false && (
                            <span className="inline-flex h-[26px] items-center rounded-[4px] bg-[#404040]/50 px-2 text-[12px] font-medium leading-[18px] text-[#A1A1AA]">
                              Inactive
                            </span>
                          )}
                        </div>

                        <p className="mt-2 truncate text-[14px] font-normal leading-[23px] tracking-[-0.1504px] text-[#F1F5F9] sm:whitespace-normal">
                          {q.prompt}
                        </p>

                        {(q.created_by != null || q.created_at || q.created_by_name) && (
                          <p className="mt-1.5 text-[12px] leading-[18px] text-[#71717A]">
                            {q.created_at && (
                              <span>Created {formatQuestionDate(q.created_at)}</span>
                            )}
                            {(q.created_by != null || q.created_by_name) && q.created_at && " · "}
                            {q.created_by_name && (
                              <span>By {q.created_by_name}</span>
                            )}
                            {!q.created_by_name && q.created_by != null && (
                              <span>By user #{q.created_by}</span>
                            )}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-3">
                        <button
                          type="button"
                          aria-label="Delete question"
                          onClick={() => setGeneratedQuestions(prev => prev.filter(item => item.id !== q.id))}
                          className="grid h-8 w-8 place-items-center rounded-[6px] hover:bg-[#202020]"
                        >
                          <FiTrash2 className="h-4 w-4 text-[#F87171]" />
                        </button>

                        <button
                          type="button"
                          aria-label="Edit question"
                          onClick={() => setEditingQuestionId(q.id)}
                          className="grid h-8 w-8 place-items-center rounded-[6px] hover:bg-[#202020]"
                        >
                          <FiEdit2 className="h-4 w-4 text-[#A1A1AA]" />
                        </button>

                        <button
                          type="button"
                          aria-label={expanded ? "Collapse" : "Expand"}
                          onClick={() => setExpandedId(expanded ? null : q.id)}
                          className="grid h-8 w-8 place-items-center rounded-[6px] hover:bg-[#202020]"
                          disabled={!hasChoices}
                        >
                          <FiChevronDown
                            className={`h-4 w-4 text-[#A1A1AA] transition-transform ${expanded ? "rotate-180" : ""}`}
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
                          {q.choices!.map((c, i) => {
                            const isCorrect = !!c.isCorrect;

                            return (
                              <div
                                key={c.label || i}
                                className={
                                  "flex items-center gap-3 rounded-[6px] border px-3 py-2 text-[13px] leading-[20px] " +
                                  (isCorrect
                                    ? "border-emerald-500/30 bg-emerald-500/10"
                                    : "border-[#404040]/30 bg-[#0A0A0A]")
                                }
                              >
                                <span className="w-6 text-[#A1A1AA]">
                                  {c.label || String.fromCharCode(65 + i)}.
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
          ) : (
            /* Form State */
            <div className="flex flex-col gap-6">
            {/* Upload Material */}
            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-medium leading-[21px] text-[#F1F5F9]">
                Upload Material (PDF, DOCX, PNG)
              </label>

              {file ? (
                /* Uploaded State Styling */
                <div 
                  className="relative flex h-[91px] flex-col items-start rounded-[6px] border-2 border-dashed border-[#404040] p-[26px_26px_2px]"
                >
                  <div className="flex h-[39px] w-full items-center gap-[12px]">
                    {/* Custom File Icon */}
                    <div className="relative h-[32px] w-[32px]">
                      <div className="absolute inset-[8.33%_16.67%] border-[2.66667px] border-[#F87171] rounded-sm"></div>
                      <div className="absolute right-[16.67%] top-[8.33%] bottom-[66.67%] left-[58.33%] border-[2.66667px] border-[#F87171] rounded-sm bg-[#1A1A1A]"></div>
                      <div className="absolute top-[37.5%] bottom-[62.5%] left-[33.33%] right-[58.33%] border-t-[2.66667px] border-[#F87171]"></div>
                      <div className="absolute top-[54.17%] bottom-[45.83%] left-[33.33%] right-[33.33%] border-t-[2.66667px] border-[#F87171]"></div>
                      <div className="absolute top-[70.83%] bottom-[29.17%] left-[33.33%] right-[33.33%] border-t-[2.66667px] border-[#F87171]"></div>
                    </div>

                    {/* Text Container */}
                    <div className="flex flex-col">
                      <p className="h-[21px] overflow-hidden truncate text-[14px] font-medium leading-[21px] text-[#F1F5F9] w-[480px]">
                        {file.name}
                      </p>
                      <p className="h-[18px] text-[12px] font-normal leading-[18px] text-[#71717A] w-[480px]">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>

                    {/* Remove Button */}
                    <button
                      type="button"
                      onClick={removeFile}
                      className="absolute right-[26px] top-[35.5px] flex h-5 w-5 items-center justify-center text-[#A1A1AA] hover:text-[#F1F5F9]"
                      aria-label="Remove file"
                    >
                      <FiX className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Default State Styling */
                <div
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  className={`flex min-h-[160px] flex-col items-center justify-center rounded-[6px] border-2 border-dashed px-6 text-center transition-all ${
                    isDragging
                      ? "border-[#F87171] bg-[#F87171]/5"
                      : "border-[#404040] bg-[#262626] hover:border-[#6B6B6B]"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.docx,.png,.jpg,.jpeg"
                  />
                  
                  <FiUploadCloud className={`mb-3 h-10 w-10 transition-colors ${
                    file ? "text-[#F87171]" : "text-[#71717A]"
                  }`} />

                  <p className="text-[14px] font-medium leading-[21px] text-[#F1F5F9]">
                    Drag and drop here
                  </p>
                  <p className="mt-1 text-[12px] text-[#71717A]">
                    or click to browse
                  </p>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-1 h-[37px] rounded-[6px] border border-[#404040] bg-[#1A1A1A] px-4 text-[13px] font-medium text-[#F1F5F9] hover:bg-[#202020] transition-colors"
                  >
                    Choose File
                  </button>
                </div>
              )}
            </div>

            {/* Additional Instructions */}
            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-medium leading-[21px] text-[#F1F5F9]">
                Additional Instructions (Optional)
              </label>

              <textarea
                rows={4}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g., Focus on concepts from pages 10-15, emphasize real-world applications..."
                className="w-full resize-none rounded-[6px] border border-[#404040] bg-[#262626] p-3 text-[14px] leading-[21px] text-[#F1F5F9] outline-none placeholder:text-[#71717A] focus:border-[#6B6B6B]"
              />

              <p className="text-[12px] leading-[18px] text-[#71717A]">
                Provide specific guidance for the AI to generate more relevant questions.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Number of Questions */}
              <div className="flex flex-col gap-2">
                <label className="text-[14px] font-medium leading-[21px] text-[#F1F5F9]">
                  Number of Questions
                </label>

                <div className="relative">
                  <input
                    type="number"
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(e.target.value)}
                    min="1"
                    max="50"
                    className="h-[47px] w-full rounded-[6px] border border-[#404040] bg-[#262626] px-3 text-[14px] leading-[21px] text-[#F1F5F9] outline-none focus:border-[#6B6B6B]"
                  />
                </div>
              </div>

              {/* Difficulty Selection */}
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[14px] font-medium leading-[21px] text-[#F1F5F9]">
                    Target Difficulty Level(s)
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {difficultyPill("Easy")}
                  {difficultyPill("Medium")}
                  {difficultyPill("Hard")}
                </div>
              </div>
            </div>
            </div>
          )}
        </div>


        {/* Footer */}
        <div className="flex h-[88px] items-start justify-end gap-3 border-t border-[#404040] px-6 pt-6">
          {apiError && (
            <div className="mr-auto mt-2 text-[14px] text-red-500">{apiError}</div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="h-[39px] rounded-[6px] border border-[#404040] bg-transparent px-4 text-[14px] font-medium leading-[21px] text-[#F1F5F9] hover:bg-[#202020] transition-colors"
          >
            Cancel
          </button>

          {generatedQuestions.length > 0 ? (
            <button
              type="button"
              onClick={handleAddQuestions}
              className="h-[39px] rounded-[6px] bg-[#F87171] px-4 text-[14px] font-medium leading-[21px] text-white hover:bg-[#EF6262] transition-colors"
            >
              Add {generatedQuestions.length} Questions
            </button>
          ) : (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={selectedDifficulties.size === 0 || !file || isGenerating}
              className="h-[39px] min-w-[150px] rounded-[6px] bg-[#F87171] px-4 text-[14px] font-medium leading-[21px] text-white hover:bg-[#EF6262] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating ? "Generating..." : "Generate Questions"}
            </button>
          )}
        </div>
      </div>

      {editingQuestionId && (
        <CreateQuestionModal
          open={true}
          onClose={() => setEditingQuestionId(null)}
          onSave={handleSaveEditedQuestion}
          initialValue={formattedEditingQuestion}
          editQuestionId={1 /* Triggers Edit Mode text ("Update") */}
          onDelete={() => {
            setGeneratedQuestions(prev => prev.filter(q => q.id !== editingQuestionId));
            setEditingQuestionId(null);
          }}
        />
      )}
    </div>
  );
}
