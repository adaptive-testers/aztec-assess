import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";

import TopicModal from "../../features/InstructorCourse/TopicModal";
import { type Topic } from "../../types/quizTypes";

vi.mock("react-icons/fi", () => ({
  FiX: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="fi-x" {...props} />,
  FiPlus: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="fi-plus" {...props} />,
}));

type Props = React.ComponentProps<typeof TopicModal>;

const MOCK_TOPICS: Topic[] = [
  { id: "1", name: "Linear Equations", course_id: "c1", created_at: "" },
  { id: "2", name: "Functions", course_id: "c1", created_at: "" },
  { id: "3", name: "Quadratic Functions", course_id: "c1", created_at: "" },
  { id: "4", name: "Polynomials", course_id: "c1", created_at: "" },
];

function makeProps(overrides: Partial<Props> = {}): Props {
  return {
    open: true,
    mode: "filter",
    topics: MOCK_TOPICS,
    initialSelectedTopics: [],
    onClose: vi.fn(),
    onApply: vi.fn(),
    onClearAll: vi.fn(),
    onCreateTopic: vi.fn(async () => undefined),
    onDeleteTopics: vi.fn(async () => undefined),
    ...overrides,
  };
}

function renderModal(overrides: Partial<Props> = {}) {
  const props = makeProps(overrides);
  const view = render(<TopicModal {...props} />);
  return { props, ...view };
}

async function waitForInit(firstTopicName = "Linear Equations") {
  // TopicModal initializes state in a setTimeout(..., 0) after opening.
  await waitFor(() => {
    // Wait until at least one topic chip appears (or the UI is ready).
    expect(screen.getByText(firstTopicName)).toBeInTheDocument();
  });
}

describe("TopicModal", () => {
  it("renders nothing when open is false", () => {
    renderModal({ open: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders default title based on mode and supports title override", async () => {
    renderModal({ mode: "filter" });
    // title renders immediately, but still okay to wait
    expect(
      screen.getByRole("heading", { name: "Select topics to filter questions" }),
    ).toBeInTheDocument();

    const view = render(<TopicModal {...makeProps({ open: true, mode: "select" })} />);
    expect(screen.getByRole("heading", { name: "Select topics" })).toBeInTheDocument();

    view.rerender(
      <TopicModal
        {...makeProps({
          open: true,
          mode: "select",
          title: "Custom Title",
        })}
      />,
    );
    expect(screen.getByRole("heading", { name: "Custom Title" })).toBeInTheDocument();
  });

  it("calls onClose when clicking backdrop, X button, Cancel button, and Escape", async () => {
    const user = userEvent.setup();
    const { props } = renderModal({ onClose: vi.fn() });
    await waitForInit();

    await user.click(screen.getByRole("button", { name: "Close modal backdrop" }));
    await user.click(screen.getByRole("button", { name: "Close" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    // Escape
    await user.keyboard("{Escape}");

    expect(props.onClose).toHaveBeenCalledTimes(4);
  });

  it("toggles topic selection via chips (visual state changes) and apply calls onApply(selected) then onClose", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    const onClose = vi.fn();

    renderModal({
      mode: "filter",
      onApply,
      onClose,
      initialSelectedTopics: ["2"], // "Functions"
    });

    await waitForInit("Functions");

    // Preselected topic chip with name "Functions" (id="2")
    expect(screen.getByText("Functions")).toBeInTheDocument();

    // Toggle "Polynomials" (id="4")
    await user.click(screen.getByRole("button", { name: "Polynomials" }));

    // Unselect "Functions" (id="2")
    await user.click(screen.getByRole("button", { name: "Functions" }));

    await user.click(screen.getByRole("button", { name: "Apply Filter" }));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith(["4"]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("deduplicates initialSelectedTopics on open", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    const onClose = vi.fn();

    renderModal({
      mode: "select",
      onApply,
      onClose,
      topics: MOCK_TOPICS,
      initialSelectedTopics: ["1", "1", "1"], // "Linear Equations"
    });

    await waitForInit("Linear Equations");

    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onApply).toHaveBeenCalledWith(["1"]);
  });

  it("shows Clear All button only in filter mode; clicking clears selection and calls onClearAll", async () => {
    const user = userEvent.setup();
    const onClearAll = vi.fn();
    const onApply = vi.fn();
    const onClose = vi.fn();

    const { rerender } = renderModal({
      mode: "filter",
      topics: MOCK_TOPICS.slice(0, 2), // 1, 2
      initialSelectedTopics: ["1", "2"],
      onClearAll,
      onApply,
      onClose,
    });

    await waitForInit("Linear Equations");

    expect(screen.getByRole("button", { name: "Clear All" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear All" }));

    expect(onClearAll).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Apply Filter" }));
    expect(onApply).toHaveBeenCalledWith([]);
    expect(onClose).toHaveBeenCalledTimes(1);

    // In select mode, Clear All is not shown
    rerender(<TopicModal {...makeProps({ open: true, mode: "select", topics: MOCK_TOPICS.slice(0, 1) })} />);
    await waitForInit("Linear Equations");
    expect(screen.queryByRole("button", { name: "Clear All" })).not.toBeInTheDocument();
  });

  it("Add Topic flow: shows input, focuses it, Add creates topic, selects it, and calls onCreateTopic with trimmed name", async () => {
    const user = userEvent.setup();
    const onCreateTopic = vi.fn(async () => undefined);

    const { rerender } = renderModal({
      topics: MOCK_TOPICS.slice(0, 1),
      onCreateTopic,
    });

    await waitForInit("Linear Equations");

    await user.click(screen.getByRole("button", { name: "Add Topic" }));

    const input = await screen.findByPlaceholderText("New topic name...");
    await waitFor(() => expect(input).toHaveFocus());

    await user.type(input, "   New Topic   ");
    await user.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => expect(onCreateTopic).toHaveBeenCalledTimes(1));
    expect(onCreateTopic).toHaveBeenCalledWith("New Topic");

    // Simulate parent updating topics prop
    const updatedTopics = [
      ...MOCK_TOPICS.slice(0, 1),
      { id: "5", name: "New Topic", course_id: "c1", created_at: "" },
    ];
    rerender(<TopicModal {...makeProps({ topics: updatedTopics, onCreateTopic })} />);

    // Newly created topic chip should be visible
    expect(await screen.findByRole("button", { name: "New Topic" })).toBeInTheDocument();
  });

  it("Add Topic input: Escape or Cancel closes input and clears typed text", async () => {
    const user = userEvent.setup();

    renderModal({ topics: MOCK_TOPICS.slice(0, 1) });
    await waitForInit("Linear Equations");

    await user.click(screen.getByRole("button", { name: "Add Topic" }));

    const input = await screen.findByPlaceholderText("New topic name...");
    await user.type(input, "Temp");
    await user.keyboard("{Escape}");

    // Input should be gone
    await waitFor(() =>
      expect(screen.queryByPlaceholderText("New topic name...")).not.toBeInTheDocument(),
    );

    // Re-open add input: should be empty
    await user.click(screen.getByRole("button", { name: "Add Topic" }));
    const input2 = await screen.findByPlaceholderText("New topic name...");
    expect((input2 as HTMLInputElement).value).toBe("");

    // Cancel button also closes and clears
    await user.type(input2, "Temp2");
    await user.click(screen.getAllByRole("button", { name: "Cancel" })[0]);
    await waitFor(() =>
      expect(screen.queryByPlaceholderText("New topic name...")).not.toBeInTheDocument(),
    );
  });

  it("Add Topic: Enter key submits, empty/whitespace is ignored", async () => {
    const user = userEvent.setup();
    const onCreateTopic = vi.fn(async () => undefined);

    renderModal({ topics: MOCK_TOPICS.slice(0, 1), onCreateTopic });
    await waitForInit("Linear Equations");

    await user.click(screen.getByRole("button", { name: "Add Topic" }));
    const input = await screen.findByPlaceholderText("New topic name...");

    await user.type(input, "   ");
    await user.keyboard("{Enter}");
    expect(onCreateTopic).not.toHaveBeenCalled();

    await user.clear(input);
    await user.type(input, "Topic X{Enter}");

    await waitFor(() => expect(onCreateTopic).toHaveBeenCalledTimes(1));
    expect(onCreateTopic).toHaveBeenCalledWith("Topic X");
  });

  it("Add Topic: case-insensitive duplicates do not call onCreateTopic and selects existing exact name", async () => {
    const user = userEvent.setup();
    const onCreateTopic = vi.fn(async () => undefined);
    const onApply = vi.fn();
    const onClose = vi.fn();

    renderModal({
      topics: [{ id: "id-linear", name: "Linear Equations", course_id: "c1", created_at: "" }],
      initialSelectedTopics: [],
      onCreateTopic,
      onApply,
      onClose,
      mode: "filter",
    });
    await waitForInit("Linear Equations");

    await user.click(screen.getByRole("button", { name: "Add Topic" }));
    const input = await screen.findByPlaceholderText("New topic name...");
    await user.type(input, "linear equations{Enter}");

    // should not create a new topic, but should select existing casing
    expect(onCreateTopic).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Apply Filter" }));
    expect(onApply).toHaveBeenCalledWith(["id-linear"]);
  });

  it("Delete button is disabled when nothing is selected", async () => {
    renderModal({ topics: MOCK_TOPICS.slice(0, 2), initialSelectedTopics: [] });
    await waitForInit("Linear Equations");

    const del = screen.getByRole("button", { name: "Delete" });
    expect(del).toBeDisabled();
  });

  it("Delete flow: Delete -> Confirm? -> confirm removes topics, clears selection, and calls onDeleteTopics(snapshot)", async () => {
    const user = userEvent.setup();
    const onDeleteTopics = vi.fn(async () => undefined);

    renderModal({
      topics: MOCK_TOPICS.slice(0, 3), // 1, 2, 3
      initialSelectedTopics: ["1", "2"],
      onDeleteTopics,
      mode: "filter",
    });

    await waitForInit("Linear Equations");

    const del = screen.getByRole("button", { name: "Delete" });
    expect(del).not.toBeDisabled();

    await user.click(del);
    expect(screen.getByRole("button", { name: "Confirm?" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirm?" }));

    await waitFor(() => expect(onDeleteTopics).toHaveBeenCalledTimes(1));
    expect(onDeleteTopics).toHaveBeenCalledWith(["1", "2"]);

    // Deleted chips should disappear
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Linear Equations" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Functions" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Quadratic Functions" })).toBeInTheDocument();
    });

    // Button should revert to Delete (not confirming)
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("Delete uses snapshot selection: if selection changes after starting delete, confirmation deletes the original snapshot", async () => {
    const user = userEvent.setup();
    const onDeleteTopics = vi.fn(async () => undefined);

    renderModal({
      topics: MOCK_TOPICS.slice(0, 3),
      initialSelectedTopics: ["1", "2"],
      onDeleteTopics,
      mode: "filter",
    });

    await waitForInit("Linear Equations");

    // start delete (snapshot is 1,2)
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("button", { name: "Confirm?" })).toBeInTheDocument();

    // change selection: unselect 2, select 3
    await user.click(screen.getByRole("button", { name: "Functions" }));
    await user.click(screen.getByRole("button", { name: "Quadratic Functions" }));

    await user.click(screen.getByRole("button", { name: "Confirm?" }));

    await waitFor(() => expect(onDeleteTopics).toHaveBeenCalledTimes(1));
    expect(onDeleteTopics).toHaveBeenCalledWith(["1", "2"]);

    // 1 and 2 removed; 3 remains
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Linear Equations" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Functions" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Quadratic Functions" })).toBeInTheDocument();
    });
  });

  it("Delete confirm automatically expires after 3 seconds", async () => {
    const user = userEvent.setup();

    renderModal({ topics: MOCK_TOPICS.slice(0, 2), initialSelectedTopics: ["1"] });
    await waitForInit("Linear Equations");

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("button", { name: "Confirm?" })).toBeInTheDocument();

    // Just wait in real time since fake timers with userEvent and React 18 are flaky
    await new Promise((resolve) => setTimeout(resolve, 3100));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Confirm?" })).not.toBeInTheDocument();
    });
  });

  it("resets state on reopen (selected/topics/add/delete states)", async () => {
    const user = userEvent.setup();

    const view = render(
      <TopicModal
        {...makeProps({
          open: true,
          mode: "filter",
          topics: MOCK_TOPICS.slice(0, 2),
          initialSelectedTopics: ["1"],
        })}
      />,
    );

    await waitForInit("Linear Equations");

    // Make changes: open add UI and type, start delete confirm, select 2 too
    await user.click(screen.getByRole("button", { name: "Functions" }));
    await user.click(screen.getByRole("button", { name: "Add Topic" }));
    await user.type(await screen.findByPlaceholderText("New topic name..."), "Temp");
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("button", { name: "Confirm?" })).toBeInTheDocument();

    // Close (rerender open=false)
    view.rerender(<TopicModal {...makeProps({ open: false, mode: "filter", topics: MOCK_TOPICS.slice(0, 2) })} />);

    // Re-open with only A preselected
    view.rerender(
      <TopicModal
        {...makeProps({
          open: true,
          mode: "filter",
          topics: MOCK_TOPICS.slice(0, 2),
          initialSelectedTopics: ["1"],
        })}
      />,
    );

    await waitForInit("Linear Equations");

    // Add UI should be closed asynchronously
    await waitFor(() => {
      expect(screen.queryByPlaceholderText("New topic name...")).not.toBeInTheDocument();
    });
    // Delete confirm should be cleared
    expect(screen.queryByRole("button", { name: "Confirm?" })).not.toBeInTheDocument();

    // Apply should still submit the re-initialized selection (A only)
    const onApply = vi.fn();
    const onClose = vi.fn();
    view.rerender(
      <TopicModal
        {...makeProps({
          open: true,
          mode: "filter",
          topics: MOCK_TOPICS.slice(0, 2),
          initialSelectedTopics: ["1"],
          onApply,
          onClose,
        })}
      />,
    );

    await waitForInit("Linear Equations");
    await user.click(screen.getByRole("button", { name: "Apply Filter" }));

    expect(onApply).toHaveBeenCalledWith(["1"]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
