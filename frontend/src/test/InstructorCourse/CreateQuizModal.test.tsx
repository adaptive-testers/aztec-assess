import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import CreateQuizModal from "../../features/InstructorCourse/CreateQuizModal";

vi.mock("react-icons/fi", () => ({
  FiX: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="fi-x" {...props} />,
}));

type Props = React.ComponentProps<typeof CreateQuizModal>;

function makeProps(overrides: Partial<Props> = {}): Props {
  return {
    isOpen: true,
    onClose: vi.fn(),
    onPrimaryAction: vi.fn<Props["onPrimaryAction"]>(),
    ...overrides,
  };
}

function renderModal(overrides: Partial<Props> = {}) {
  const props = makeProps(overrides);
  const view = render(<CreateQuizModal {...props} />);
  return { props, ...view };
}

async function flushOpenInit() {
  // CreateQuizModal initializes fields with setTimeout(..., 0) on open.
  await waitFor(() => {
    expect(screen.getByLabelText(/quiz title/i)).toBeInTheDocument();
  });
}

describe("CreateQuizModal", () => {
  it("renders nothing when isOpen is false", () => {
    renderModal({ isOpen: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders create mode UI labels and dialog aria-label", async () => {
    renderModal({ mode: "create" });
    await flushOpenInit();

    expect(screen.getByRole("dialog", { name: "Create New Quiz" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Create New Quiz" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Quiz" })).toBeInTheDocument();
    expect(screen.getByText("Publish immediately")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("renders edit mode UI labels and shows delete button only when onDelete is provided", async () => {
    const onDelete = vi.fn<NonNullable<Props["onDelete"]>>().mockResolvedValue(undefined);
    renderModal({ mode: "edit", onDelete });
    await flushOpenInit();

    expect(screen.getByRole("dialog", { name: "Edit Quiz" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Edit Quiz" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
    expect(screen.getByText("Published")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("does not show delete controls in edit mode when onDelete is not provided", async () => {
    renderModal({ mode: "edit" });
    await flushOpenInit();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    expect(screen.queryByText(/delete quiz\?/i)).not.toBeInTheDocument();
  });

  it("calls onClose when clicking backdrop, X button, and Cancel", async () => {
    const user = userEvent.setup();
    const { props } = renderModal({ onClose: vi.fn() });
    await flushOpenInit();

    await user.click(screen.getByRole("button", { name: "Close modal backdrop" }));
    expect(props.onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(props.onClose).toHaveBeenCalledTimes(2);

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(props.onClose).toHaveBeenCalledTimes(3);
  });

  it("prefills fields from initialValues when opened (title, num_questions, selection_mode, toggles)", async () => {
    renderModal({
      mode: "edit",
      initialValues: {
        title: "Initial Quiz",
        num_questions: 25,
        selection_mode: "FIXED",
        adaptive_enabled: false,
        is_published: false,
      },
    });
    await flushOpenInit();

    await waitFor(() => {
      expect((screen.getByLabelText(/quiz title/i) as HTMLInputElement).value).toBe("Initial Quiz");
      expect(
        (screen.getByLabelText(/number of questions/i) as HTMLInputElement).value,
      ).toBe("25");
    });

    const bank = screen.getByLabelText(/from question bank/i) as HTMLInputElement;
    const fixed = screen.getByLabelText(/fixed questions/i) as HTMLInputElement;
    expect(bank.checked).toBe(false);
    expect(fixed.checked).toBe(true);

    const adaptive = screen.getByLabelText(/enable adaptive difficulty/i) as HTMLInputElement;
    const published = screen.getByLabelText(/^published$/i) as HTMLInputElement;
    expect(adaptive.checked).toBe(false);
    expect(published.checked).toBe(false);
  });

  it("resets values on re-open (uses latest initialValues each time)", async () => {
    const view = render(
      <CreateQuizModal
        isOpen={true}
        mode="edit"
        onClose={vi.fn()}
        onPrimaryAction={vi.fn<Props["onPrimaryAction"]>()}
        initialValues={{ title: "First", num_questions: 3 }}
      />,
    );
    await flushOpenInit();

    await waitFor(() => {
      expect((screen.getByLabelText(/quiz title/i) as HTMLInputElement).value).toBe("First");
    });

    view.rerender(
      <CreateQuizModal
        isOpen={false}
        mode="edit"
        onClose={vi.fn()}
        onPrimaryAction={vi.fn<Props["onPrimaryAction"]>()}
        initialValues={{ title: "First", num_questions: 3 }}
      />,
    );

    view.rerender(
      <CreateQuizModal
        isOpen={true}
        mode="edit"
        onClose={vi.fn()}
        onPrimaryAction={vi.fn<Props["onPrimaryAction"]>()}
        initialValues={{ title: "Second", num_questions: 9, selection_mode: "BANK" }}
      />,
    );

    // Wait for the setTimeout init to run again
    await waitFor(() => {
      expect((screen.getByLabelText(/quiz title/i) as HTMLInputElement).value).toBe("Second");
      expect(
        (screen.getByLabelText(/number of questions/i) as HTMLInputElement).value,
      ).toBe("9");
    });
  });

  it("shows apiError when provided", async () => {
    renderModal({ apiError: "Server says nope." });
    await flushOpenInit();
    expect(await screen.findByText("Server says nope.")).toBeInTheDocument();
  });

  it("local validation error takes precedence over apiError when submitting without a title", async () => {
    const user = userEvent.setup();
    const onPrimaryAction = vi.fn<Props["onPrimaryAction"]>();

    renderModal({ apiError: "Server error", onPrimaryAction });
    await flushOpenInit();

    // ensure title is empty
    const title = screen.getByLabelText(/quiz title/i);
    await user.clear(title);

    await user.click(screen.getByRole("button", { name: /create quiz/i }));

    expect(await screen.findByText("Quiz title is required.")).toBeInTheDocument();
    expect(screen.queryByText("Server error")).not.toBeInTheDocument();
    expect(onPrimaryAction).not.toHaveBeenCalled();
  });

  it("submit calls onPrimaryAction with trimmed title and current UI values", async () => {
    const user = userEvent.setup();
    const onPrimaryAction = vi.fn<Props["onPrimaryAction"]>();

    renderModal({ onPrimaryAction, mode: "create" });
    await flushOpenInit();

    await user.type(screen.getByLabelText(/quiz title/i), "   My Quiz   ");

    // Change number of questions
    const num = screen.getByLabelText(/number of questions/i);
    await user.clear(num);
    await user.type(num, "12");

    // Change selection mode to FIXED
    await user.click(screen.getByLabelText(/fixed questions/i));

    // Toggle adaptive off, publish off
    await user.click(screen.getByLabelText(/enable adaptive difficulty/i));
    await user.click(screen.getByLabelText(/publish immediately/i));

    await user.click(screen.getByRole("button", { name: "Create Quiz" }));

    await waitFor(() => {
      expect(onPrimaryAction).toHaveBeenCalledTimes(1);
    });

    expect(onPrimaryAction).toHaveBeenCalledWith({
      title: "My Quiz",
      num_questions: 12,
      adaptive_enabled: false,
      selection_mode: "FIXED",
      is_published: false,
    });
  });

  it("num_questions falls back to 10 when input is invalid (0, negative, or NaN)", async () => {
    const user = userEvent.setup();
    const onPrimaryAction = vi.fn<Props["onPrimaryAction"]>();

    renderModal({ onPrimaryAction });
    await flushOpenInit();

    await user.type(screen.getByLabelText(/quiz title/i), "Quiz");

    const num = screen.getByLabelText(/number of questions/i);
    const form = num.closest("form");
    if (!form) throw new Error("form not found");

    // 0 => fallback to 10 (submit via form so HTML5 min="1" doesn't block)
    await user.clear(num);
    await user.type(num, "0");
    fireEvent.submit(form);
    await waitFor(() => expect(onPrimaryAction).toHaveBeenCalledTimes(1));
    expect(onPrimaryAction).toHaveBeenLastCalledWith(
      expect.objectContaining({ num_questions: 10 }),
    );

    // negative => fallback to 10
    await user.clear(num);
    await user.type(num, "-5");
    fireEvent.submit(form);
    await waitFor(() => expect(onPrimaryAction).toHaveBeenCalledTimes(2));
    expect(onPrimaryAction).toHaveBeenLastCalledWith(
      expect.objectContaining({ num_questions: 10 }),
    );

    // NaN => fallback to 10 (type="number" still allows typing letters in jsdom)
    await user.clear(num);
    await user.type(num, "abc");
    fireEvent.submit(form);
    await waitFor(() => expect(onPrimaryAction).toHaveBeenCalledTimes(3));
    expect(onPrimaryAction).toHaveBeenLastCalledWith(
      expect.objectContaining({ num_questions: 10 }),
    );
  });

  it("uses primaryLabel prop for the submit button when not submitting", async () => {
    renderModal({ primaryLabel: "Do the Thing" });
    await flushOpenInit();
    expect(screen.getByRole("button", { name: "Do the Thing" })).toBeInTheDocument();
  });

  it("when isSubmitting is true, submit button is disabled and shows 'Saving...'", async () => {
    const user = userEvent.setup();
    const onPrimaryAction = vi.fn<Props["onPrimaryAction"]>();

    renderModal({ isSubmitting: true, onPrimaryAction });
    await flushOpenInit();

    const submit = screen.getByRole("button", { name: "Saving..." });
    expect(submit).toBeDisabled();

    // Clicking should not submit because disabled
    await user.click(submit);
    expect(onPrimaryAction).not.toHaveBeenCalled();
  });

  it("delete flow: clicking Delete shows confirmation; No cancels; Yes calls onDelete", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn<NonNullable<Props["onDelete"]>>().mockResolvedValue(undefined);

    renderModal({ mode: "edit", onDelete });
    await flushOpenInit();

    const deleteBtn = screen.getByRole("button", { name: "Delete" });
    await user.click(deleteBtn);

    expect(screen.getByText("Delete quiz?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "No" }));

    expect(screen.queryByText("Delete quiz?")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Yes" }));

    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
  });

  it("create mode: ignores onDelete prop (delete UI should not render)", async () => {
    const onDelete = vi.fn<NonNullable<Props["onDelete"]>>();
    renderModal({ mode: "create", onDelete });
    await flushOpenInit();

    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
  });
});
