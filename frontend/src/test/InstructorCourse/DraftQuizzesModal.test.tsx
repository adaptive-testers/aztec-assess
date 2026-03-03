import "@testing-library/jest-dom";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import DraftQuizzesModal, { type DraftQuiz } from "../../features/InstructorCourse/DraftQuizzesModal";

vi.mock("react-icons/fi", () => ({
  FiX: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="fi-x" {...props} />,
  FiTrash2: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="fi-trash" {...props} />,
}));

type Props = React.ComponentProps<typeof DraftQuizzesModal>;

function makeDraft(overrides: Partial<DraftQuiz> = {}): DraftQuiz {
  return {
    id: "draft-1",
    title: "Draft Quiz",
    createdDate: "Feb 1, 2026",
    ...overrides,
  };
}

function makeProps(overrides: Partial<Props> = {}): Props {
  return {
    isOpen: true,
    onClose: vi.fn(),
    drafts: [],
    loading: false,
    error: null,
    onEditDraft: vi.fn<Props["onEditDraft"]>(),
    onDeleteDraft: vi.fn<Props["onDeleteDraft"]>(),
    ...overrides,
  };
}

function renderModal(overrides: Partial<Props> = {}) {
  const props = makeProps(overrides);
  const view = render(<DraftQuizzesModal {...props} />);
  return { props, ...view };
}

describe("DraftQuizzesModal", () => {
  it("renders nothing when isOpen is false", () => {
    renderModal({ isOpen: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders dialog with correct aria-label and title", () => {
    renderModal();
    expect(screen.getByRole("dialog", { name: "Draft quizzes" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Draft Quizzes" })).toBeInTheDocument();
  });

  it("calls onClose when clicking backdrop and header X button", async () => {
    const user = userEvent.setup();
    const { props } = renderModal({ onClose: vi.fn() });

    // There are two buttons with aria-label "Close": backdrop and header close button.
    const closeButtons = screen.getAllByRole("button", { name: "Close" });
    expect(closeButtons.length).toBeGreaterThanOrEqual(2);

    await user.click(closeButtons[0]);
    await user.click(closeButtons[1]);

    expect(props.onClose).toHaveBeenCalledTimes(2);
  });

  it("shows loading skeleton blocks when loading=true", () => {
    const { container } = renderModal({ loading: true, drafts: [makeDraft()] });

    // UI should be in loading state, so no draft titles should render
    expect(screen.queryByText("Draft Quiz")).not.toBeInTheDocument();
    expect(screen.queryByText("No drafts yet.")).not.toBeInTheDocument();

    // Confirm skeleton blocks exist (3 blocks with class containing 'h-[83px]')
    const skeletons = container.querySelectorAll('[class*="h-[83px]"]');
    expect(skeletons).toHaveLength(3);
  });

  it("shows error message when error is provided (and not loading)", () => {
    renderModal({ error: "Something went wrong.", loading: false });
    expect(screen.getByText("Something went wrong.")).toBeInTheDocument();
    expect(screen.queryByText("No drafts yet.")).not.toBeInTheDocument();
  });

  it("shows empty state when no drafts and not loading/error", () => {
    renderModal({ drafts: [], loading: false, error: null });
    expect(screen.getByText("No drafts yet.")).toBeInTheDocument();
  });

  it("renders each draft with title and created date", () => {
    const drafts: DraftQuiz[] = [
      makeDraft({ id: "a", title: "Draft A", createdDate: "Jan 1, 2026" }),
      makeDraft({ id: "b", title: "Draft B", createdDate: "Jan 2, 2026" }),
    ];

    renderModal({ drafts });

    expect(screen.getByText("Draft A")).toBeInTheDocument();
    expect(screen.getByText("Created Jan 1, 2026")).toBeInTheDocument();

    expect(screen.getByText("Draft B")).toBeInTheDocument();
    expect(screen.getByText("Created Jan 2, 2026")).toBeInTheDocument();

    // Each row has an Edit button
    const editButtons = screen.getAllByRole("button", { name: "Edit" });
    expect(editButtons).toHaveLength(2);
  });

  it("uses fallbacks: 'Untitled draft' when title is empty and 'No date' when createdDate missing", () => {
    renderModal({
      drafts: [makeDraft({ id: "x", title: "", createdDate: undefined })],
    });

    expect(screen.getByText("Untitled draft")).toBeInTheDocument();
    expect(screen.getByText("No date")).toBeInTheDocument();
  });

  it("clicking Edit calls onEditDraft with the full draft object", async () => {
    const user = userEvent.setup();
    const draft = makeDraft({ id: "edit-me", title: "Edit Me" });
    const onEditDraft = vi.fn<Props["onEditDraft"]>();

    renderModal({ drafts: [draft], onEditDraft });

    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(onEditDraft).toHaveBeenCalledTimes(1);
    expect(onEditDraft).toHaveBeenCalledWith(draft);
  });

  it("delete flow: clicking trash shows confirmation; No cancels; Yes calls onDeleteDraft with id and hides confirmation", async () => {
    const user = userEvent.setup();
    const draft = makeDraft({ id: "del-1", title: "To Delete" });
    const onDeleteDraft = vi.fn<Props["onDeleteDraft"]>();

    renderModal({ drafts: [draft], onDeleteDraft });

    // Trash button is labeled 'Delete {title}'
    await user.click(screen.getByRole("button", { name: "Delete To Delete" }));

    // Confirm UI appears for that row
    expect(screen.getByText("Delete?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "No" })).toBeInTheDocument();

    // Cancel
    await user.click(screen.getByRole("button", { name: "No" }));
    expect(screen.queryByText("Delete?")).not.toBeInTheDocument();

    // Re-open confirm and accept
    await user.click(screen.getByRole("button", { name: "Delete To Delete" }));
    await user.click(screen.getByRole("button", { name: "Yes" }));

    expect(onDeleteDraft).toHaveBeenCalledTimes(1);
    expect(onDeleteDraft).toHaveBeenCalledWith("del-1");

    // Confirmation should close immediately after clicking Yes
    expect(screen.queryByText("Delete?")).not.toBeInTheDocument();
  });

  it("only one row can be in confirming-delete state at a time (switching rows updates UI)", async () => {
    const user = userEvent.setup();
    const drafts: DraftQuiz[] = [
      makeDraft({ id: "d1", title: "First" }),
      makeDraft({ id: "d2", title: "Second" }),
    ];

    renderModal({ drafts });

    // Start confirming delete on first
    await user.click(screen.getByRole("button", { name: "Delete First" }));
    expect(screen.getByText("Delete?")).toBeInTheDocument();

    // Now start confirming delete on second
    await user.click(screen.getByRole("button", { name: "Delete Second" }));

    // There should still be exactly one confirmation set visible (same "Delete?" label)
    // and it should correspond to the latest clicked row: Second.
    const rows = screen.getAllByText(/Created|No date/).map((el) => el.closest("div"));
    expect(rows).toHaveLength(2);
    // (Not strictly needed—just ensure UI is stable)

    expect(screen.getByText("Delete?")).toBeInTheDocument();
    // "Yes"/"No" should exist once
    expect(screen.getAllByRole("button", { name: "Yes" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "No" })).toHaveLength(1);

    // While confirming, the "Edit" button for that row is hidden, but the other row still has Edit.
    // We can't easily target row-level without testids, so assert at least one Edit button remains.
    expect(screen.getAllByRole("button", { name: "Edit" }).length).toBeGreaterThanOrEqual(1);
  });

  it("when confirming delete for a row, its Edit button is not present until confirmation closes", async () => {
    const user = userEvent.setup();
    const draft = makeDraft({ id: "d1", title: "Row" });

    renderModal({ drafts: [draft] });

    // Initially edit exists
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();

    // Trigger confirm delete; edit button should disappear
    await user.click(screen.getByRole("button", { name: "Delete Row" }));
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();

    // Cancel; edit should reappear
    await user.click(screen.getByRole("button", { name: "No" }));
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("supports async onDeleteDraft without leaving confirmation stuck", async () => {
    const user = userEvent.setup();
    const draft = makeDraft({ id: "async-del", title: "Async" });

    const onDeleteDraft = vi.fn<Props["onDeleteDraft"]>(async () => {
      // emulate async work
      await Promise.resolve();
    });

    renderModal({ drafts: [draft], onDeleteDraft });

    await user.click(screen.getByRole("button", { name: "Delete Async" }));
    await user.click(screen.getByRole("button", { name: "Yes" }));

    expect(onDeleteDraft).toHaveBeenCalledTimes(1);
    expect(onDeleteDraft).toHaveBeenCalledWith("async-del");

    // Confirmation closes immediately even if delete is async
    expect(screen.queryByText("Delete?")).not.toBeInTheDocument();
  });

  it("does not call callbacks when loading is true (no interactive draft rows shown)", async () => {
    const user = userEvent.setup();
    const onEditDraft = vi.fn<Props["onEditDraft"]>();
    const onDeleteDraft = vi.fn<Props["onDeleteDraft"]>();

    renderModal({
      loading: true,
      drafts: [makeDraft({ id: "x", title: "Hidden" })],
      onEditDraft,
      onDeleteDraft,
    });

    // No Edit/Delete buttons should be present during loading
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Delete /i })).not.toBeInTheDocument();

    // Clicking modal title should not trigger anything
    await user.click(screen.getByRole("heading", { name: "Draft Quizzes" }));

    expect(onEditDraft).not.toHaveBeenCalled();
    expect(onDeleteDraft).not.toHaveBeenCalled();
  });

  it("renders correct controls per row; clicking within a row does not close the modal", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const draft = makeDraft({ id: "row-1", title: "Row Title" });

    renderModal({ drafts: [draft], onClose });

    const dialog = screen.getByRole("dialog", { name: "Draft quizzes" });
    const rowTitle = within(dialog).getByText("Row Title");
    await user.click(rowTitle);

    // Clicking inside row shouldn't call onClose (only backdrop / close buttons do)
    expect(onClose).not.toHaveBeenCalled();
  });
});
