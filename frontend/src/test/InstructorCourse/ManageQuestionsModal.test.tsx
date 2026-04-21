import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";

import ManageQuestionsModal, {
  type ManageQuestionItem,
} from "../../features/InstructorCourse/ManageQuestionsModal";
import { type Topic } from "../../types/quizTypes";

const MOCK_TOPIC_OPTIONS: Topic[] = [
  { id: "topic-alg-id", name: "Algebra", course_id: "c1", created_at: "" },
  { id: "topic-geo-id", name: "Geometry", course_id: "c1", created_at: "" },
];

/**
 * Mock CreateQuestionModal so these tests focus on ManageQuestionsModal UI + callback wiring,
 * not the internals of the nested modal.
 */
interface QuestionSavePayload {
  prompt: string;
  choices: string[];
  correctIndex: number;
  difficulty: string;
  is_active?: boolean;
}

interface MockCreateQuestionModalProps {
  open: boolean;
  onClose: () => void;
  editQuestionId?: number;
  initialValue?: {
    prompt: string;
    choices: string[];
    correctIndex: number;
    difficulty: "easy" | "medium" | "hard";
    is_active?: boolean;
  };
  onSave: (data: QuestionSavePayload, editId?: number) => void | Promise<void>;
  onDelete?: (questionId: number) => void | Promise<void>;
};

vi.mock("../../features/InstructorCourse/CreateQuestionModal", () => {
  const Mock = (props: MockCreateQuestionModalProps) => {
    if (!props.open) return null;

    return (
      <div role="dialog" aria-label="CreateQuestionModal">
        <div>mode: {props.editQuestionId != null ? "edit" : "create"}</div>
        <div>initialPrompt: {props.initialValue?.prompt ?? ""}</div>
        <div>initialChoicesCount: {props.initialValue?.choices?.length ?? 0}</div>
        <div>initialCorrectIndex: {String(props.initialValue?.correctIndex ?? "")}</div>
        <div>initialDifficulty: {props.initialValue?.difficulty ?? ""}</div>
        <div>initialActive: {String(props.initialValue?.is_active ?? "")}</div>

        <button
          type="button"
          onClick={async () => {
            await props.onSave(
              {
                prompt: "Prompt",
                choices: ["A", "B", "C", "D"],
                correctIndex: 2,
                difficulty: "easy",
                is_active: true,
              },
              props.editQuestionId,
            );
          }}
        >
          Mock Save
        </button>

        {props.onDelete && props.editQuestionId != null && (
          <button
            type="button"
            onClick={async () => {
              await props.onDelete?.(props.editQuestionId!);
            }}
          >
            Mock Delete
          </button>
        )}

        <button type="button" onClick={props.onClose}>
          Mock Close
        </button>
      </div>
    );
  };

  return { default: Mock };
});

vi.mock("react-icons/fi", () => ({
  FiCheck: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="fi-check" {...props} />,
  FiChevronDown: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="fi-chevron-down" {...props} />
  ),
  FiEdit2: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="fi-edit2" {...props} />,
  FiFilter: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="fi-filter" {...props} />,
  FiPlus: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="fi-plus" {...props} />,
  FiSearch: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="fi-search" {...props} />,
  FiSliders: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="fi-sliders" {...props} />,
  FiTag: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="fi-tag" {...props} />,
  FiX: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="fi-x" {...props} />,
}));

type Props = React.ComponentProps<typeof ManageQuestionsModal>;

function makeQuestion(overrides: Partial<ManageQuestionItem> = {}): ManageQuestionItem {
  return {
    id: "1",
    source: "manual",
    difficulty: "easy",
    prompt: "What is 2 + 2?",
    choices: [
      { label: "A", text: "3" },
      { label: "B", text: "4", isCorrect: true },
      { label: "C", text: "5" },
      { label: "D", text: "22" },
    ],
    created_at: "2026-02-01T00:00:00Z",
    created_by: 7,
    created_by_name: "Alice",
    is_active: true,
    ...overrides,
  };
}

function makeProps(overrides: Partial<Props> = {}): Props {
  return {
    open: true,
    onClose: vi.fn(),
    questions: [],
    loading: false,
    loadingMore: false,
    totalCount: undefined,
    hasMore: false,
    error: null,
    onSaveQuestion: vi.fn<NonNullable<Props["onSaveQuestion"]>>(),
    onUpdateQuestion: vi.fn<NonNullable<Props["onUpdateQuestion"]>>(),
    onDeleteQuestion: vi.fn<NonNullable<Props["onDeleteQuestion"]>>(),
    onEditQuestion: vi.fn<NonNullable<Props["onEditQuestion"]>>(),
    onCloseCreateQuestion: vi.fn(),
    onCreateQuestion: vi.fn(),
    onLoadMore: vi.fn(async () => undefined),
    onEnsureAllQuestionsLoaded: vi.fn(async () => undefined),
    ...overrides,
  };
}

function renderModal(overrides: Partial<Props> = {}) {
  const props = makeProps(overrides);
  const view = render(<ManageQuestionsModal {...props} />);
  return { props, ...view };
}

beforeEach(() => {
  // Make requestAnimationFrame deterministic (used in Load More scroll preservation)
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ManageQuestionsModal", () => {
  it("renders nothing when open is false", () => {
    renderModal({ open: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the modal, header controls, and search bar", () => {
    renderModal();

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Create Question" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate Question" })).toBeDisabled();

    expect(screen.getByRole("button", { name: "Filter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sort" })).toBeInTheDocument();

    expect(screen.getByPlaceholderText("Search questions...")).toBeInTheDocument();
  });

  it("calls onClose when clicking backdrop and header close button", async () => {
    const user = userEvent.setup();
    const { props } = renderModal({ onClose: vi.fn() });

    await user.click(screen.getByRole("button", { name: "Close modal backdrop" }));
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(props.onClose).toHaveBeenCalledTimes(2);
  });

  it("shows error banner when error prop is provided", () => {
    renderModal({ error: "Something broke." });
    expect(screen.getByText("Something broke.")).toBeInTheDocument();
  });

  it("shows skeletons when loading=true and does not show questions/empty state", () => {
    renderModal({ loading: true, questions: [makeQuestion()] });

    // Loading skeleton state - ensure real content not shown
    expect(screen.queryByText("What is 2 + 2?")).not.toBeInTheDocument();
    expect(screen.queryByText("No questions yet.")).not.toBeInTheDocument();
  });

  it("shows empty state when no questions and no filters", () => {
    renderModal({ questions: [], loading: false, error: null });
    expect(screen.getByText("No questions yet.")).toBeInTheDocument();
  });

  it("shows filtered empty state message when query yields no matches", async () => {
    const user = userEvent.setup();
    renderModal({ questions: [makeQuestion({ prompt: "Alpha prompt" })] });

    await user.type(screen.getByPlaceholderText("Search questions..."), "zzz");
    expect(screen.getByText("No questions match the current filters.")).toBeInTheDocument();
  });

  it("search filters questions and Clear search button resets query", async () => {
    const user = userEvent.setup();
    renderModal({
      questions: [
        makeQuestion({ id: "1", prompt: "Alpha prompt" }),
        makeQuestion({ id: "2", prompt: "Beta prompt" }),
      ],
    });

    expect(screen.getByText("Alpha prompt")).toBeInTheDocument();
    expect(screen.getByText("Beta prompt")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Search questions..."), "beta");
    expect(screen.queryByText("Alpha prompt")).not.toBeInTheDocument();
    expect(screen.getByText("Beta prompt")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByText("Alpha prompt")).toBeInTheDocument();
    expect(screen.getByText("Beta prompt")).toBeInTheDocument();
  });

  it("Filter dropdown: toggles, selects difficulty, filters results, and Clear resets filters", async () => {
    const user = userEvent.setup();
    renderModal({
      questions: [
        makeQuestion({ id: "1", difficulty: "easy", prompt: "Easy Q" }),
        makeQuestion({ id: "2", difficulty: "hard", prompt: "Hard Q" }),
      ],
    });

    await user.click(screen.getByRole("button", { name: "Filter" }));
    // options use capitalization: Easy/Medium/Hard
    await user.click(screen.getByRole("button", { name: "Hard" }));

    // button shows active count
    expect(screen.getByText("1")).toBeInTheDocument();

    // Should now show only hard question
    expect(screen.queryByText("Easy Q")).not.toBeInTheDocument();
    expect(screen.getByText("Hard Q")).toBeInTheDocument();

    // Clear filters
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.getByText("Easy Q")).toBeInTheDocument();
    expect(screen.getByText("Hard Q")).toBeInTheDocument();
  });

  it("closes filter dropdown when clicking outside", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole("button", { name: "Filter" }));
    expect(screen.getByText("Difficulty")).toBeInTheDocument();

    // click outside
    await user.click(document.body);
    await waitFor(() => expect(screen.queryByText("Difficulty")).not.toBeInTheDocument());
  });

  it("Sort dropdown: selecting Oldest changes display order by created_at", async () => {
    const user = userEvent.setup();
    renderModal({
      questions: [
        makeQuestion({ id: "1", prompt: "Older", created_at: "2026-01-01T00:00:00Z" }),
        makeQuestion({ id: "2", prompt: "Newer", created_at: "2026-02-01T00:00:00Z" }),
      ],
    });

    // Default is newest => "Newer" appears before "Older" in DOM
    const before = screen.getAllByText(/Older|Newer/).map((n) => n.textContent);
    expect(before[0]).toBe("Newer");
    expect(before[1]).toBe("Older");

    await user.click(screen.getByRole("button", { name: "Sort" }));
    await user.click(screen.getByRole("button", { name: "Oldest" }));

    const after = screen.getAllByText(/Older|Newer/).map((n) => n.textContent);
    expect(after[0]).toBe("Older");
    expect(after[1]).toBe("Newer");
  });

  it("shows tags for source, difficulty, and inactive state", () => {
    renderModal({
      questions: [
        makeQuestion({
          id: "1",
          source: "ai",
          difficulty: "medium",
          prompt: "Prompt",
          is_active: false,
        }),
      ],
    });

    expect(screen.getByText("AI Generated")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("Edit question button calls onEditQuestion with numeric id", async () => {
    const user = userEvent.setup();
    const onEditQuestion = vi.fn<NonNullable<Props["onEditQuestion"]>>();

    renderModal({
      questions: [makeQuestion({ id: "42", prompt: "Editable" })],
      onEditQuestion,
    });

    await user.click(screen.getByRole("button", { name: "Edit question" }));
    expect(onEditQuestion).toHaveBeenCalledTimes(1);
    expect(onEditQuestion).toHaveBeenCalledWith(42);
  });

  it("Expand button is disabled when a question has no choices; enabled when it has choices", async () => {
    const user = userEvent.setup();
    renderModal({
      questions: [
        makeQuestion({ id: "1", prompt: "No details", choices: [] }),
        makeQuestion({ id: "2", prompt: "Has details" }),
      ],
    });

    const expandButtons = screen.getAllByRole("button", { name: "Expand" });
    expect(expandButtons).toHaveLength(2);
    expect(expandButtons[0]).toBeDisabled();
    expect(expandButtons[1]).not.toBeDisabled();

    await user.click(expandButtons[1]);
    expect(screen.getByText("Answer Choices:")).toBeInTheDocument();
    expect(screen.getByText("B.")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Collapse" }));
    expect(screen.queryByText("Answer Choices:")).not.toBeInTheDocument();
  });

  it("Load More button calls onLoadMore when hasMore=true and items exist; disabled when loadingMore=true", async () => {
    const user = userEvent.setup();

    const onLoadMore = vi.fn(async () => undefined);
    const { rerender } = renderModal({
      questions: [makeQuestion()],
      hasMore: true,
      loadingMore: false,
      onLoadMore,
      totalCount: 10,
    });

    await user.click(screen.getByRole("button", { name: "Load More" }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Showing 1 of 10 questions")).toBeInTheDocument();

    // Now render loadingMore state
    const props2 = makeProps({
      questions: [makeQuestion()],
      hasMore: true,
      loadingMore: true,
      onLoadMore,
      totalCount: 10,
    });
    rerender(<ManageQuestionsModal {...props2} />);

    const loadingBtn = screen.getByRole("button", { name: /Loading more\.\.\./i });
    expect(loadingBtn).toBeDisabled();
    await user.click(loadingBtn);
    expect(onLoadMore).toHaveBeenCalledTimes(1); // no extra call
  });

  it("calls onEnsureAllQuestionsLoaded after debounce when hasMore=true and query is non-empty", async () => {
    const user = userEvent.setup();
    const onEnsureAllQuestionsLoaded = vi.fn().mockResolvedValue(undefined);

    renderModal({
      questions: [makeQuestion()],
      hasMore: true,
      onEnsureAllQuestionsLoaded,
    });

    await user.type(screen.getByPlaceholderText("Search questions..."), "math");

    // Debounce is 300ms; wait for effect to run
    await waitFor(() => expect(onEnsureAllQuestionsLoaded).toHaveBeenCalledTimes(1), {
      timeout: 800,
    });
  });

  it("calls onEnsureAllQuestionsLoaded when difficulty filters change and hasMore=true", async () => {
    const user = userEvent.setup();
    const onEnsureAllQuestionsLoaded = vi.fn().mockResolvedValue(undefined);

    renderModal({
      questions: [makeQuestion()],
      hasMore: true,
      onEnsureAllQuestionsLoaded,
    });

    await user.click(screen.getByRole("button", { name: "Filter" }));
    await user.click(screen.getByRole("button", { name: "Easy" }));

    await waitFor(() => expect(onEnsureAllQuestionsLoaded).toHaveBeenCalledTimes(1));
  });

  it("Create Question button opens CreateQuestionModal; Mock Save calls onSaveQuestion and closes + calls onCloseCreateQuestion", async () => {
    const user = userEvent.setup();
    const onSaveQuestion = vi.fn<NonNullable<Props["onSaveQuestion"]>>().mockResolvedValue(undefined);
    const onCloseCreateQuestion = vi.fn();
    const onCreateQuestion = vi.fn();

    renderModal({
      onSaveQuestion,
      onCloseCreateQuestion,
      onCreateQuestion,
    });

    await user.click(screen.getByRole("button", { name: "Create Question" }));
    expect(onCreateQuestion).toHaveBeenCalledTimes(1);

    expect(screen.getByRole("dialog", { name: "CreateQuestionModal" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Mock Save" }));

    await waitFor(() => expect(onSaveQuestion).toHaveBeenCalledTimes(1));
    expect(onSaveQuestion).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "Prompt",
        choices: ["A", "B", "C", "D"],
        correctIndex: 2,
        difficulty: "easy",
        is_active: true,
      }),
    );

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "CreateQuestionModal" })).not.toBeInTheDocument(),
    );
    expect(onCloseCreateQuestion).toHaveBeenCalledTimes(1);
  });

  it("editingQuestion prop opens CreateQuestionModal in edit mode with padded choices and clamped correctIndex", async () => {
    const editingQuestion: NonNullable<Props["editingQuestion"]> = {
      id: 9,
      prompt: "Edit prompt",
      choices: ["Only A", "Only B"], // should pad to 4
      correct_index: 99, // should clamp to 3
      difficulty: "HARD",
      is_active: false,
    };

    renderModal({ editingQuestion });

    // modal should open automatically
    expect(screen.getByRole("dialog", { name: "CreateQuestionModal" })).toBeInTheDocument();
    expect(screen.getByText("mode: edit")).toBeInTheDocument();
    expect(screen.getByText("initialPrompt: Edit prompt")).toBeInTheDocument();
    expect(screen.getByText("initialChoicesCount: 4")).toBeInTheDocument();
    expect(screen.getByText("initialCorrectIndex: 3")).toBeInTheDocument();
    expect(screen.getByText("initialDifficulty: hard")).toBeInTheDocument();
    expect(screen.getByText("initialActive: false")).toBeInTheDocument();
  });

  it("Mock Save in edit mode calls onUpdateQuestion(editId, data) and closes + calls onCloseCreateQuestion", async () => {
    const user = userEvent.setup();
    const onUpdateQuestion = vi.fn<NonNullable<Props["onUpdateQuestion"]>>().mockResolvedValue(undefined);
    const onCloseCreateQuestion = vi.fn();

    const editingQuestion: NonNullable<Props["editingQuestion"]> = {
      id: 55,
      prompt: "Edit prompt",
      choices: ["A", "B", "C", "D"],
      correct_index: 1,
      difficulty: "EASY",
      is_active: true,
    };

    renderModal({ editingQuestion, onUpdateQuestion, onCloseCreateQuestion });

    await user.click(screen.getByRole("button", { name: "Mock Save" }));

    await waitFor(() => expect(onUpdateQuestion).toHaveBeenCalledTimes(1));
    expect(onUpdateQuestion).toHaveBeenCalledWith(
      55,
      expect.objectContaining({
        prompt: "Prompt",
        choices: ["A", "B", "C", "D"],
        correctIndex: 2,
        difficulty: "easy",
        is_active: true,
      }),
    );

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "CreateQuestionModal" })).not.toBeInTheDocument(),
    );
    expect(onCloseCreateQuestion).toHaveBeenCalledTimes(1);
  });

  it("Mock Delete in edit mode calls onDeleteQuestion(editId) and closes + calls onCloseCreateQuestion", async () => {
    const user = userEvent.setup();
    const onDeleteQuestion = vi.fn<NonNullable<Props["onDeleteQuestion"]>>().mockResolvedValue(undefined);
    const onCloseCreateQuestion = vi.fn();

    const editingQuestion: NonNullable<Props["editingQuestion"]> = {
      id: 88,
      prompt: "Edit prompt",
      choices: ["A", "B", "C", "D"],
      correct_index: 0,
      difficulty: "MEDIUM",
      is_active: true,
    };

    renderModal({ editingQuestion, onDeleteQuestion, onCloseCreateQuestion });

    // Delete is only provided when onDeleteQuestion + editingQuestion exist
    await user.click(screen.getByRole("button", { name: "Mock Delete" }));

    await waitFor(() => expect(onDeleteQuestion).toHaveBeenCalledTimes(1));
    expect(onDeleteQuestion).toHaveBeenCalledWith(88);

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "CreateQuestionModal" })).not.toBeInTheDocument(),
    );
    expect(onCloseCreateQuestion).toHaveBeenCalledTimes(1);
  });

  it("resets query/filters/sort when modal is reopened", async () => {
    const user = userEvent.setup();
    const view = render(<ManageQuestionsModal {...makeProps({ open: true, questions: [makeQuestion()] })} />);

    // set query and open filter and sort
    await user.type(screen.getByPlaceholderText("Search questions..."), "abc");
    await user.click(screen.getByRole("button", { name: "Filter" }));
    await user.click(screen.getByRole("button", { name: "Easy" }));

    await user.click(screen.getByRole("button", { name: "Sort" }));
    await user.click(screen.getByRole("button", { name: "Oldest" }));

    // close modal
    view.rerender(<ManageQuestionsModal {...makeProps({ open: false })} />);

    // reopen (effect clears query, filters, sort)
    view.rerender(<ManageQuestionsModal {...makeProps({ open: true, questions: [makeQuestion()] })} />);

    // wait for reset effect then assert
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
      expect(screen.queryByText("1")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Newest" })).not.toBeInTheDocument();
    });
  });

  // ── Topics UI tests ────────────────────────────────────────────────────────
  it("renders topic tags for questions that have topics", () => {
    const question = makeQuestion({ topics: ["Algebra", "Geometry"] });
    renderModal({ questions: [question] });

    // Both topic tags should appear in the list item
    expect(screen.getByText("Algebra")).toBeInTheDocument();
    expect(screen.getByText("Geometry")).toBeInTheDocument();
  });

  it("does not render topic tags when the question has no topics", () => {
    const question = makeQuestion({ topics: [] });
    renderModal({ questions: [question] });

    // Without topics the tags should not appear
    expect(screen.queryByText("Algebra")).not.toBeInTheDocument();
  });

  it("renders multiple questions each with their own topic tags", () => {
    const q1 = makeQuestion({ id: "1", prompt: "Question 1", topics: ["Calculus"] });
    const q2 = makeQuestion({ id: "2", prompt: "Question 2", topics: ["Statistics"] });
    renderModal({ questions: [q1, q2] });

    expect(screen.getByText("Calculus")).toBeInTheDocument();
    expect(screen.getByText("Statistics")).toBeInTheDocument();
  });

  it("opens the Topic filter modal when Topic toolbar button is clicked", async () => {
    const user = userEvent.setup();
    renderModal({ questions: [makeQuestion()], topicOptions: MOCK_TOPIC_OPTIONS });

    await user.click(screen.getByRole("button", { name: "Filter by topic" }));

    expect(screen.getByText("Select topics to filter questions")).toBeInTheDocument();
  });

  it("filters questions to those matching any topic selected in TopicModal (IDs vs display names)", async () => {
    const user = userEvent.setup();
    const qAlg = makeQuestion({
      id: "1",
      prompt: "Algebra prompt",
      topics: ["Algebra"],
    });
    const qGeo = makeQuestion({
      id: "2",
      prompt: "Geometry prompt",
      topics: ["Geometry"],
    });
    renderModal({
      questions: [qAlg, qGeo],
      topicOptions: MOCK_TOPIC_OPTIONS,
    });

    await user.click(screen.getByRole("button", { name: "Filter by topic" }));
    await user.click(screen.getByRole("button", { name: "Algebra" }));
    await user.click(screen.getByRole("button", { name: "Apply Filter" }));

    expect(screen.getByText("Algebra prompt")).toBeInTheDocument();
    expect(screen.queryByText("Geometry prompt")).not.toBeInTheDocument();
  });

  it("shows all questions when topic filter is cleared (Clear All in TopicModal)", async () => {
    const user = userEvent.setup();
    const qAlg = makeQuestion({ id: "1", prompt: "Algebra prompt", topics: ["Algebra"] });
    const qGeo = makeQuestion({ id: "2", prompt: "Geometry prompt", topics: ["Geometry"] });
    renderModal({
      questions: [qAlg, qGeo],
      topicOptions: MOCK_TOPIC_OPTIONS,
    });

    await user.click(screen.getByRole("button", { name: "Filter by topic" }));
    await user.click(screen.getByRole("button", { name: "Algebra" }));
    await user.click(screen.getByRole("button", { name: "Apply Filter" }));
    expect(screen.queryByText("Geometry prompt")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Filter by topic" }));
    await user.click(screen.getByRole("button", { name: "Clear All" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByText("Algebra prompt")).toBeInTheDocument();
    expect(screen.getByText("Geometry prompt")).toBeInTheDocument();
  });

  it("calls onEnsureAllQuestionsLoaded when topic filters apply and hasMore=true", async () => {
    const user = userEvent.setup();
    const onEnsureAllQuestionsLoaded = vi.fn().mockResolvedValue(undefined);

    renderModal({
      questions: [makeQuestion({ topics: ["Algebra"] })],
      hasMore: true,
      topicOptions: MOCK_TOPIC_OPTIONS,
      onEnsureAllQuestionsLoaded,
    });

    await user.click(screen.getByRole("button", { name: "Filter by topic" }));
    await user.click(screen.getByRole("button", { name: "Algebra" }));
    await user.click(screen.getByRole("button", { name: "Apply Filter" }));

    await waitFor(() => expect(onEnsureAllQuestionsLoaded).toHaveBeenCalledTimes(1));
  });
});

