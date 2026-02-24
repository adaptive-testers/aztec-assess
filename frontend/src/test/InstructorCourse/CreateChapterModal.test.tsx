import "@testing-library/jest-dom";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import CreateChapterModal, {
  type CreateChapterModalProps,
} from "../../features/InstructorCourse/CreateChapterModal";

vi.mock("react-icons/fi", () => ({
  FiX: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="fi-x" {...props} />
  ),
}));

type AddHandler = NonNullable<CreateChapterModalProps["onAdd"]>;
type UpdateHandler = NonNullable<CreateChapterModalProps["onUpdate"]>;
type DeleteHandler = NonNullable<CreateChapterModalProps["onDelete"]>;

interface RenderResult {
  props: CreateChapterModalProps;
  user: ReturnType<typeof userEvent.setup>;
}

function renderModal(
  overrides: Partial<CreateChapterModalProps> = {},
): RenderResult {
  const user = userEvent.setup();

  const props: CreateChapterModalProps = {
    onClose: vi.fn(),
    ...overrides,
  };

  render(<CreateChapterModal {...props} />);

  return { props, user };
}

describe("CreateChapterModal", () => {
  it("renders in create mode by default (Add Chapter + Add button)", () => {
    renderModal();

    expect(
      screen.getByRole("heading", { name: "Add Chapter" }),
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/chapter title/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cancel" }),
    ).toBeInTheDocument();

    // Delete UI should not appear in create mode
    expect(
      screen.queryByRole("button", { name: "Delete" }),
    ).not.toBeInTheDocument();
  });

  it("uses the title prop when provided", () => {
    renderModal({ title: "Custom Title" });
    expect(
      screen.getByRole("heading", { name: "Custom Title" }),
    ).toBeInTheDocument();
  });

  it("prefills the input with initialValues.title", () => {
    renderModal({ initialValues: { title: "Initial Chapter" } });

    const input = screen.getByLabelText(/chapter title/i) as HTMLInputElement;
    expect(input.value).toBe("Initial Chapter");
  });

  it("shows required asterisk and placeholder", () => {
    renderModal();

    expect(screen.getByText("*")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Enter chapter title..."),
    ).toBeInTheDocument();
  });

  it("clicking backdrop calls onClose (if provided)", async () => {
    const onClose = vi.fn();
    const { user } = renderModal({ onClose });

    await user.click(screen.getByRole("button", { name: "Close modal backdrop" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clicking X close button calls onClose (if provided)", async () => {
    const onClose = vi.fn();
    const { user } = renderModal({ onClose });

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("close controls do not throw when onClose is undefined", async () => {
    const { user } = renderModal({ onClose: undefined });

    await expect(
      user.click(screen.getByRole("button", { name: "Close" })),
    ).resolves.toBeUndefined();

    await expect(
      user.click(screen.getByRole("button", { name: "Close modal backdrop" })),
    ).resolves.toBeUndefined();
  });

  it("Cancel calls onCancel when provided", async () => {
    const onCancel = vi.fn();
    const onClose = vi.fn();
    const { user } = renderModal({ onCancel, onClose });

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("Cancel falls back to onClose when onCancel is not provided", async () => {
    const onClose = vi.fn();
    const { user } = renderModal({ onClose });

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("create mode: Add calls onAdd with trimmed title", async () => {
    const onAdd = vi.fn<AddHandler>().mockResolvedValue(undefined);
    const { user } = renderModal({ onAdd });

    await user.type(screen.getByLabelText(/chapter title/i), "   My Chapter   ");
    await user.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledTimes(1);
      expect(onAdd).toHaveBeenCalledWith("My Chapter");
    });
  });

  it("create mode: Add does nothing when title is empty/whitespace", async () => {
    const onAdd = vi.fn<AddHandler>();
    const { user } = renderModal({ onAdd });

    const input = screen.getByLabelText(/chapter title/i);
    await user.clear(input);
    await user.type(input, "    ");

    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(onAdd).not.toHaveBeenCalled();
  });

  it("create mode: Add does not throw when onAdd is not provided", async () => {
    const { user } = renderModal({ onAdd: undefined });

    await user.type(screen.getByLabelText(/chapter title/i), "Hello");
    await expect(
      user.click(screen.getByRole("button", { name: "Add" })),
    ).resolves.toBeUndefined();
  });

  it("edit mode: renders Edit Chapter + Save Changes", () => {
    renderModal({ mode: "edit", editChapterId: 1, onUpdate: vi.fn() });

    expect(
      screen.getByRole("heading", { name: "Edit Chapter" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Save Changes" }),
    ).toBeInTheDocument();
  });

  it("edit mode: Save Changes calls onUpdate(chapterId, { title }) with trimmed title", async () => {
    const onUpdate = vi.fn<UpdateHandler>().mockResolvedValue(undefined);
    const { user } = renderModal({
      mode: "edit",
      editChapterId: 123,
      onUpdate,
      initialValues: { title: "Old Title" },
    });

    const input = screen.getByLabelText(/chapter title/i);
    await user.clear(input);
    await user.type(input, "  New Title  ");

    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledTimes(1);
      expect(onUpdate).toHaveBeenCalledWith(123, { title: "New Title" });
    });
  });

  it("edit mode: Save Changes does nothing when title is empty/whitespace", async () => {
    const onUpdate = vi.fn<UpdateHandler>();
    const { user } = renderModal({
      mode: "edit",
      editChapterId: 10,
      onUpdate,
      initialValues: { title: "Something" },
    });

    const input = screen.getByLabelText(/chapter title/i);
    await user.clear(input);
    await user.type(input, "   ");

    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("edit mode only activates when editChapterId is provided; otherwise behaves like create", async () => {
    const onAdd = vi.fn<AddHandler>().mockResolvedValue(undefined);
    const onUpdate = vi.fn<UpdateHandler>();
    const { user } = renderModal({
      mode: "edit",
      editChapterId: undefined,
      onAdd,
      onUpdate,
    });

    // isEdit is false => Add Chapter / Add button
    expect(
      screen.getByRole("heading", { name: "Add Chapter" }),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText(/chapter title/i), "Hello");
    await user.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => expect(onAdd).toHaveBeenCalledWith("Hello"));
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("delete button is shown only in edit mode when onDelete and editChapterId are provided", () => {
    // Not edit mode
    renderModal({ onDelete: vi.fn(), editChapterId: 1 });
    expect(
      screen.queryByRole("button", { name: "Delete" }),
    ).not.toBeInTheDocument();

    // Edit mode but missing onDelete
    renderModal({ mode: "edit", editChapterId: 1, onUpdate: vi.fn() });
    expect(
      screen.queryByRole("button", { name: "Delete" }),
    ).not.toBeInTheDocument();

    // Edit mode with onDelete
    renderModal({
      mode: "edit",
      editChapterId: 1,
      onUpdate: vi.fn(),
      onDelete: vi.fn(),
    });
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("delete flow: clicking Delete shows confirmation UI; No cancels; Yes calls onDelete(id)", async () => {
    const onDelete = vi.fn<DeleteHandler>().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const { user } = renderModal({
      mode: "edit",
      editChapterId: 777,
      onUpdate: vi.fn(),
      onDelete,
      onClose,
    });

    // Initial delete button
    const deleteButton = screen.getByRole("button", { name: "Delete" });
    expect(deleteButton).toBeInTheDocument();

    // Click Delete -> show confirm UI
    await user.click(deleteButton);
    expect(screen.getByText("Delete?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "No" })).toBeInTheDocument();

    // No cancels
    await user.click(screen.getByRole("button", { name: "No" }));
    expect(screen.queryByText("Delete?")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();

    // Delete again -> Yes calls onDelete
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Yes" }));

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith(777);
    });

    // Component does not auto-close after delete
    expect(onClose).not.toHaveBeenCalled();
  });

  it("delete flow: clicking Delete alone does not call onDelete until confirming Yes", async () => {
    const onDelete = vi.fn<DeleteHandler>();
    const { user } = renderModal({
      mode: "edit",
      editChapterId: 555,
      onUpdate: vi.fn(),
      onDelete,
    });

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "No" }));
    expect(onDelete).not.toHaveBeenCalled();
  });
});
