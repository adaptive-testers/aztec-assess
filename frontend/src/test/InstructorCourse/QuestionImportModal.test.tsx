import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import QuestionImportModal, {
  type QuestionImportPayload,
  type QuestionImportResponse,
} from "../../features/InstructorCourse/QuestionImportModal";

describe("QuestionImportModal", () => {
  it("validates JSON and submits import with success summary", async () => {
    const user = userEvent.setup();
    const onImport = vi.fn<
      (payload: QuestionImportPayload) => Promise<QuestionImportResponse>
    >(async (payload: QuestionImportPayload) => {
      void payload;
      return {
        summary: {
          received: 1,
          created: 1,
          updated: 0,
          skipped: 0,
          failed: 0,
        },
        results: [{ index: 0, status: "created" as const, prompt: "What is 2 + 2?" }],
      };
    });

    render(
      <QuestionImportModal
        open
        chapterTitle="Chapter 1"
        onClose={vi.fn()}
        onImport={onImport}
      />,
    );

    expect(screen.getByRole("button", { name: /Use Example/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Use Example/i }));
    await user.click(screen.getByRole("button", { name: /Validate JSON/i }));

    expect(screen.getByText(/Validation: 1 valid, 0 invalid/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Import Questions/i }));
    await waitFor(() => expect(onImport).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/Import complete: created 1, updated 0, skipped 0, failed 0./i)).toBeInTheDocument();
  });

  it("reports invalid rows and blocks submit", async () => {
    const user = userEvent.setup();
    const onImport = vi.fn();

    render(
      <QuestionImportModal
        open
        chapterTitle="Chapter 1"
        onClose={vi.fn()}
        onImport={onImport}
      />,
    );

    await user.click(screen.getByLabelText(/Questions JSON/i));
    await user.paste(
      JSON.stringify([
        {
          prompt: "",
          choices: ["A", "B", "C"],
          correct_index: 7,
          difficulty: "MEDIUM",
        },
      ]),
    );
    await user.click(screen.getByRole("button", { name: /Validate JSON/i }));

    expect(screen.getByText(/Validation: 0 valid, 1 invalid/i)).toBeInTheDocument();
    expect(screen.getByText(/choices must contain exactly 4 options./i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Import Questions/i }),
    ).toBeDisabled();
    expect(onImport).not.toHaveBeenCalled();
  });
});
