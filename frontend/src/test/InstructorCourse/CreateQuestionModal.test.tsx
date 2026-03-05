import "@testing-library/jest-dom";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import CreateQuestionModal, {
  type CreateQuestionModalProps,
} from "../../features/InstructorCourse/CreateQuestionModal";

type OnSaveHandler = NonNullable<CreateQuestionModalProps["onSave"]>;
type OnDeleteHandler = NonNullable<CreateQuestionModalProps["onDelete"]>;

// Keep tests stable regardless of icon implementation.
vi.mock("react-icons/fi", () => ({
  FiChevronDown: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="fi-chevron-down" {...props} />
  ),
  FiX: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="fi-x" {...props} />
  ),
}));

vi.mock("../../features/InstructorCourse/TopicModal", () => ({
  __esModule: true,
  default: function TopicModal() {
    return null;
  },
}));

function renderModal(
  overrides: Partial<CreateQuestionModalProps> = {},
) {
  const onClose = vi.fn();
  const onSave = vi.fn<OnSaveHandler>();

  const props: CreateQuestionModalProps = {
    open: true,
    onClose,
    onSave,
    ...overrides,
  };

  render(<CreateQuestionModal {...props} />);
  return { props, onClose, onSave };
}

function getPromptTextarea() {
  return screen.getByPlaceholderText(/enter your question here/i);
}

function getChoiceInput(n: 1 | 2 | 3 | 4) {
  return screen.getByPlaceholderText(`Choice ${n}`);
}

function getMarkChoiceRadio(n: 1 | 2 | 3 | 4) {
  return screen.getByRole("radio", { name: new RegExp(`mark choice ${n} as correct`, "i") });
}

describe("CreateQuestionModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not render when open=false", () => {
    render(
      <CreateQuestionModal
        open={false}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders create mode UI by default", () => {
    renderModal();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /create question/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^create$/i })).toBeInTheDocument();

    // Delete only appears in edit mode with onDelete + editQuestionId
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();

    // Basic form elements
    expect(getPromptTextarea()).toBeInTheDocument();
    expect(getChoiceInput(1)).toBeInTheDocument();
    expect(getChoiceInput(2)).toBeInTheDocument();
    expect(getChoiceInput(3)).toBeInTheDocument();
    expect(getChoiceInput(4)).toBeInTheDocument();

    // Difficulty buttons
    expect(screen.getByRole("button", { name: /easy/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /medium/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /hard/i })).toBeInTheDocument();

    // Status checkbox
    expect(
      screen.getByRole("checkbox", {
        name: /active \(included in question bank\)/i,
      }),
    ).toBeInTheDocument();
  });

  it("renders edit mode UI when editQuestionId is provided", () => {
    renderModal({ editQuestionId: 42 });

    expect(
      screen.getByRole("heading", { name: /edit question/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^update$/i })).toBeInTheDocument();
  });

  it("shows Delete button only when in edit mode AND onDelete is provided", () => {
    // Edit mode without onDelete => no delete button
    renderModal({ editQuestionId: 10, onDelete: undefined });
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();

    cleanup();

    // Re-render with onDelete provided => delete visible
    const onDelete = vi.fn<OnDeleteHandler>();
    renderModal({ editQuestionId: 10, onDelete });
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("closes when clicking backdrop, X button, or Cancel", async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.click(screen.getByRole("button", { name: /close modal backdrop/i }));
    await user.click(screen.getByRole("button", { name: /^close$/i }));
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("focuses the prompt textarea on open", () => {
    vi.useFakeTimers();

    renderModal();

    // Focus is scheduled via setTimeout(0); run it then assert (waitFor would hang under fake timers)
    vi.runAllTimers();

    expect(getPromptTextarea()).toHaveFocus();
  });

  it("prefills fields from initialValue (prompt, choices, correctIndex, difficulty, is_active)", () => {
    renderModal({
      initialValue: {
        prompt: "Initial prompt",
        choices: ["A", "B", "C", "D"],
        correctIndex: 2,
        difficulty: "hard",
        is_active: false,
      },
    });

    const prompt = getPromptTextarea() as HTMLTextAreaElement;
    expect(prompt.value).toBe("Initial prompt");

    expect((getChoiceInput(1) as HTMLInputElement).value).toBe("A");
    expect((getChoiceInput(2) as HTMLInputElement).value).toBe("B");
    expect((getChoiceInput(3) as HTMLInputElement).value).toBe("C");
    expect((getChoiceInput(4) as HTMLInputElement).value).toBe("D");

    // Correct choice should be marked via radio checked
    expect(getMarkChoiceRadio(3)).toBeChecked();
    expect(getMarkChoiceRadio(1)).not.toBeChecked();

    // Status checkbox
    expect(
      screen.getByRole("checkbox", {
        name: /active \(included in question bank\)/i,
      }),
    ).not.toBeChecked();

    // We avoid styling assertions; verify difficulty via saving later tests.
    expect(screen.getByRole("button", { name: /hard/i })).toBeInTheDocument();
  });

  it("clamps correctIndex from initialValue to the range [0,3]", () => {
    // Too large => clamps to 3
    renderModal({ initialValue: { correctIndex: 999 } });
    expect(getMarkChoiceRadio(4)).toBeChecked();

    cleanup();

    // Negative => clamps to 0
    renderModal({ initialValue: { correctIndex: -10 } });
    expect(getMarkChoiceRadio(1)).toBeChecked();
  });

  it("lets the user set the correct choice by clicking the radio or its input", async () => {
    const user = userEvent.setup();
    renderModal();

    // Default is choice 1
    expect(getMarkChoiceRadio(1)).toBeChecked();

    // Click choice 3 radio
    await user.click(getMarkChoiceRadio(3));
    expect(getMarkChoiceRadio(3)).toBeChecked();
    expect(getMarkChoiceRadio(1)).not.toBeChecked();

    // Click choice 4 radio
    await user.click(getMarkChoiceRadio(4));
    expect(getMarkChoiceRadio(4)).toBeChecked();
    expect(getMarkChoiceRadio(3)).not.toBeChecked();
  });

  it("updates prompt and choice text as the user types", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(getPromptTextarea(), "What is 2+2?");
    await user.type(getChoiceInput(1), "3");
    await user.type(getChoiceInput(2), "4");

    expect((getPromptTextarea() as HTMLTextAreaElement).value).toBe("What is 2+2?");
    expect((getChoiceInput(1) as HTMLInputElement).value).toBe("3");
    expect((getChoiceInput(2) as HTMLInputElement).value).toBe("4");
  });

  it("changes difficulty when clicking difficulty buttons", async () => {
    const user = userEvent.setup();
    const { onSave } = renderModal();

    // Default is easy; switch to medium then hard
    await user.click(screen.getByRole("button", { name: /medium/i }));
    await user.click(screen.getByRole("button", { name: /hard/i }));

    await user.click(screen.getByRole("button", { name: /^create$/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    const [payload] = onSave.mock.calls[0];
    expect(payload.difficulty).toBe("hard");
  });

  it("toggles is_active when clicking the Status checkbox", async () => {
    const user = userEvent.setup();
    const { onSave } = renderModal();

    const checkbox = screen.getByRole("checkbox", {
      name: /active \(included in question bank\)/i,
    });

    expect(checkbox).toBeChecked();
    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();

    await user.click(screen.getByRole("button", { name: /^create$/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const [payload] = onSave.mock.calls[0];
    expect(payload.is_active).toBe(false);
  });

  it("create mode: clicking Create calls onSave with full state and undefined edit id", async () => {
    const user = userEvent.setup();
    const { onSave } = renderModal();

    await user.type(getPromptTextarea(), "Prompt text");
    await user.type(getChoiceInput(1), "A");
    await user.type(getChoiceInput(2), "B");
    await user.type(getChoiceInput(3), "C");
    await user.type(getChoiceInput(4), "D");

    await user.click(getMarkChoiceRadio(2)); // correctIndex = 1
    await user.click(screen.getByRole("button", { name: /medium/i }));

    await user.click(screen.getByRole("button", { name: /^create$/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));

    const [payload, id] = onSave.mock.calls[0];
    expect(id).toBeUndefined();

    expect(payload).toMatchObject({
      prompt: "Prompt text",
      choices: ["A", "B", "C", "D"],
      correctIndex: 1,
      difficulty: "medium",
      is_active: true,
    });
  });

  it("edit mode: clicking Update calls onSave with payload and editQuestionId", async () => {
    const user = userEvent.setup();
    const { onSave } = renderModal({
      editQuestionId: 99,
      initialValue: {
        prompt: "Old",
        choices: ["1", "2", "3", "4"],
        correctIndex: 0,
        difficulty: "easy",
        is_active: true,
      },
    });

    await waitFor(() => {
      expect((getPromptTextarea() as HTMLTextAreaElement).value).toBe("Old");
    });
    await user.clear(getPromptTextarea());
    await user.type(getPromptTextarea(), "New prompt");

    await user.click(getMarkChoiceRadio(4));
    await user.click(screen.getByRole("button", { name: /hard/i }));

    await user.click(screen.getByRole("button", { name: /^update$/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));

    const [payload, id] = onSave.mock.calls[0];
    expect(id).toBe(99);
    expect(payload.prompt).toBe("New prompt");
    expect(payload.correctIndex).toBe(3);
    expect(payload.difficulty).toBe("hard");
  });

  it("edit mode: clicking Delete calls onDelete(editQuestionId)", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn<OnDeleteHandler>().mockResolvedValue(undefined);

    renderModal({ editQuestionId: 7, onDelete });

    await user.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith(7);
    });
  });

  it("does nothing when Create/Update is clicked but onSave is not provided", async () => {
    const user = userEvent.setup();

    render(
      <CreateQuestionModal
        open
        onClose={vi.fn()}
        // onSave intentionally omitted
      />,
    );

    await user.click(screen.getByRole("button", { name: /^create$/i }));

    // If it threw, the test would fail; also ensure UI still present.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
