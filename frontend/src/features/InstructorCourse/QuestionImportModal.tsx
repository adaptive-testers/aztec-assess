import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { FiX } from "react-icons/fi";

export interface QuestionImportItem {
  prompt: string;
  choices: string[];
  correct_index: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
}

export interface QuestionImportPayload {
  questions: QuestionImportItem[];
  overwrite_existing: boolean;
}

export interface QuestionImportResponse {
  summary: {
    received: number;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  };
  results: {
    index: number;
    status: "created" | "updated" | "skipped" | "error";
    prompt?: string;
    detail?: string;
    errors?: Record<string, string[]>;
  }[];
}

interface ParsedRow {
  index: number;
  errors: string[];
  normalized?: QuestionImportItem;
}

interface QuestionImportModalProps {
  chapterTitle?: string;
  open: boolean;
  onClose: () => void;
  onImport: (payload: QuestionImportPayload) => Promise<QuestionImportResponse>;
}

const VALID_DIFFICULTIES = new Set(["EASY", "MEDIUM", "HARD"]);
const SAMPLE_JSON = JSON.stringify(
  [
    {
      prompt: "What is 2 + 2?",
      choices: ["3", "4", "5", "6"],
      correct_index: 1,
      difficulty: "EASY",
    },
  ],
  null,
  2,
);

function validateRow(row: unknown, index: number): ParsedRow {
  const errors: string[] = [];
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    return { index, errors: ["Row must be an object."] };
  }

  const payload = row as Record<string, unknown>;
  const rawPrompt = payload.prompt;
  const rawChoices = payload.choices;
  const rawCorrectIndex = payload.correct_index;
  const rawDifficulty = payload.difficulty;

  const prompt = typeof rawPrompt === "string" ? rawPrompt.trim() : "";
  if (!prompt) errors.push("prompt is required.");

  if (!Array.isArray(rawChoices) || rawChoices.length !== 4) {
    errors.push("choices must contain exactly 4 options.");
  }

  const normalizedChoices = Array.isArray(rawChoices)
    ? rawChoices.map((choice) => (typeof choice === "string" ? choice.trim() : ""))
    : [];

  if (Array.isArray(rawChoices) && rawChoices.some((choice) => typeof choice !== "string")) {
    errors.push("choices must contain only strings.");
  }

  const correctIndex = typeof rawCorrectIndex === "number" ? rawCorrectIndex : Number.NaN;
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) {
    errors.push("correct_index must be an integer between 0 and 3.");
  }

  const difficulty =
    typeof rawDifficulty === "string" ? rawDifficulty.toUpperCase().trim() : "";
  if (!VALID_DIFFICULTIES.has(difficulty)) {
    errors.push("difficulty must be one of EASY, MEDIUM, HARD.");
  }

  if (errors.length > 0) return { index, errors };

  return {
    index,
    errors: [],
    normalized: {
      prompt,
      choices: normalizedChoices,
      correct_index: correctIndex,
      difficulty: difficulty as QuestionImportItem["difficulty"],
    },
  };
}

function parseRows(input: string): { rows: ParsedRow[]; parseError: string | null } {
  try {
    const parsed = JSON.parse(input) as unknown;
    const rawRows = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && Array.isArray((parsed as { questions?: unknown[] }).questions)
        ? (parsed as { questions: unknown[] }).questions
        : null;

    if (!rawRows) {
      return {
        rows: [],
        parseError:
          "JSON must be either an array of questions or an object with a questions array.",
      };
    }

    return {
      rows: rawRows.map((row, idx) => validateRow(row, idx)),
      parseError: null,
    };
  } catch {
    return { rows: [], parseError: "Invalid JSON." };
  }
}

export default function QuestionImportModal({
  chapterTitle,
  open,
  onClose,
  onImport,
}: QuestionImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [rawInput, setRawInput] = useState("");
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<QuestionImportResponse["summary"] | null>(null);

  const validRows = useMemo(
    () => rows.filter((row) => row.errors.length === 0 && row.normalized),
    [rows],
  );
  const invalidRows = useMemo(() => rows.filter((row) => row.errors.length > 0), [rows]);

  useEffect(() => {
    if (open) return;
    setRawInput("");
    setOverwriteExisting(false);
    setRows([]);
    setParseError(null);
    setSubmitError(null);
    setSubmitting(false);
    setSummary(null);
  }, [open]);

  if (!open) return null;

  const resetValidationState = () => {
    setRows([]);
    setSummary(null);
    setParseError(null);
    setSubmitError(null);
  };

  const handleValidate = () => {
    resetValidationState();
    const trimmed = rawInput.trim();
    if (!trimmed) {
      setParseError("Paste JSON before validating.");
      return;
    }
    const parsed = parseRows(trimmed);
    setRows(parsed.rows);
    setParseError(parsed.parseError);
  };

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setRawInput(text);
    resetValidationState();
    event.target.value = "";
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    setSummary(null);

    const parsed = parseRows(rawInput.trim());
    setRows(parsed.rows);
    setParseError(parsed.parseError);

    if (parsed.parseError) return;
    if (parsed.rows.some((row) => row.errors.length > 0)) {
      setSubmitError("Fix invalid rows before importing.");
      return;
    }

    const questions = parsed.rows
      .map((row) => row.normalized)
      .filter((row): row is QuestionImportItem => row != null);

    if (questions.length === 0) {
      setSubmitError("No valid rows to import.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await onImport({
        questions,
        overwrite_existing: overwriteExisting,
      });
      setSummary(result.summary);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to import questions.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUseExample = () => {
    setRawInput(SAMPLE_JSON);
    resetValidationState();
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Import Questions"
    >
      <button
        type="button"
        aria-label="Close modal backdrop"
        className="fixed inset-0 z-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[10px] border border-[#404040] bg-[#1A1A1A] text-[#F1F5F9] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)]">
        <div className="flex h-[64px] shrink-0 items-center justify-between border-b border-[#404040] px-5">
          <h2 className="text-[18px] font-medium leading-[27px]">Import Questions</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-[#A1A1AA] hover:bg-white/5"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-4">
          <p className="mb-4 text-sm text-[#A1A1AA]">
            Chapter: {chapterTitle ?? "Selected chapter"}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-md border border-[#404040] px-3 py-2 text-sm text-[#F1F5F9] hover:bg-[#202020]"
            >
              Upload JSON File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileSelected}
            />

            <label className="inline-flex items-center gap-2 text-sm text-[#D4D4D8]">
              <input
                type="checkbox"
                checked={overwriteExisting}
                onChange={(event) => setOverwriteExisting(event.target.checked)}
              />
              Overwrite existing prompts
            </label>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <label htmlFor="question-import-json" className="text-sm text-[#D4D4D8]">
              Questions JSON
            </label>
            <button
              type="button"
              onClick={handleUseExample}
              className="rounded-md border border-[#404040] px-2 py-1 text-xs text-[#D4D4D8] hover:bg-[#202020]"
            >
              Use Example
            </button>
          </div>
          <textarea
            id="question-import-json"
            value={rawInput}
            onChange={(event) => {
              setRawInput(event.target.value);
              resetValidationState();
            }}
            placeholder='[{"prompt":"What is 2 + 2?","choices":["3","4","5","6"],"correct_index":1,"difficulty":"EASY"}]'
            className="mt-2 h-40 w-full rounded-md border border-[#404040] bg-[#101010] p-3 text-sm text-[#F1F5F9] outline-none focus:border-[#F87171] md:h-48"
          />

          {parseError && (
            <p className="mt-3 rounded-md border border-red-500/50 bg-red-900/20 p-2 text-sm text-red-300">
              {parseError}
            </p>
          )}
          {submitError && (
            <p className="mt-3 rounded-md border border-red-500/50 bg-red-900/20 p-2 text-sm text-red-300">
              {submitError}
            </p>
          )}

          {rows.length > 0 && !parseError && (
            <div className="mt-4 rounded-md border border-[#404040] bg-[#111111] p-3">
              <p className="text-sm text-[#D4D4D8]">
                Validation: {validRows.length} valid, {invalidRows.length} invalid (total{" "}
                {rows.length})
              </p>
              <div className="mt-3 max-h-48 overflow-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[#A1A1AA]">
                    <tr>
                      <th className="py-1 pr-3">Row</th>
                      <th className="py-1 pr-3">Status</th>
                      <th className="py-1">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.index} className="border-t border-[#232323] align-top">
                        <td className="py-1 pr-3">{row.index + 1}</td>
                        <td className="py-1 pr-3">
                          {row.errors.length === 0 ? (
                            <span className="text-emerald-400">valid</span>
                          ) : (
                            <span className="text-red-300">invalid</span>
                          )}
                        </td>
                        <td className="py-1">
                          {row.errors.length === 0 ? (
                            <span className="text-[#A1A1AA]">{row.normalized?.prompt}</span>
                          ) : (
                            <span className="text-red-300">{row.errors.join(" ")}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {summary && (
            <div className="mt-4 rounded-md border border-emerald-500/40 bg-emerald-900/20 p-3 text-sm text-emerald-200">
              Import complete: created {summary.created}, updated {summary.updated}, skipped{" "}
              {summary.skipped}, failed {summary.failed}.
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-[#333333] px-5 py-4">
          <button
            type="button"
            onClick={handleValidate}
            className="rounded-md border border-[#404040] px-4 py-2 text-sm font-medium text-[#F1F5F9] hover:bg-[#202020]"
          >
            Validate JSON
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              submitting || rows.length === 0 || invalidRows.length > 0 || validRows.length === 0
            }
            className="rounded-md bg-[#F87171] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Importing..." : "Import Questions"}
          </button>
        </div>
      </div>
    </div>
  );
}
