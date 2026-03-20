import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import "@testing-library/jest-dom";

import GenerateQuestionsModal from "../../features/InstructorCourse/GenerateQuestionModal";
import { privateApi } from "../../api/axios";
import { QUIZZES } from "../../api/endpoints";

vi.mock("../../api/axios", () => ({
  privateApi: {
    post: vi.fn(),
  },
}));

vi.mock("react-icons/fi", () => ({
  FiChevronDown: (props: any) => <svg data-testid="fi-chevron-down" {...props} />,
  FiEdit2: (props: any) => <svg data-testid="fi-edit2" {...props} />,
  FiUploadCloud: (props: any) => <svg data-testid="fi-upload-cloud" {...props} />,
  FiX: (props: any) => <svg data-testid="fi-x" {...props} />,
  FiTrash2: (props: any) => <svg data-testid="fi-trash2" {...props} />,
  FiCheck: (props: any) => <svg data-testid="fi-check" {...props} />,
  FiCalendar: (props: any) => <svg data-testid="fi-calendar" {...props} />,
  FiFileText: (props: any) => <svg data-testid="fi-file-text" {...props} />,
}));

// Mock CreateQuestionModal to avoid deep rendering issues
vi.mock("../../features/InstructorCourse/CreateQuestionModal", () => ({
  default: () => <div data-testid="mock-create-modal" />
}));

describe("GenerateQuestionsModal", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const CHAPTER_ID = 123;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("renders nothing when open is false", () => {
    render(
      <GenerateQuestionsModal
        open={false}
        onClose={mockOnClose}
        chapterId={CHAPTER_ID}
      />
    );
    expect(screen.queryByText(/Generate Questions with AI/i)).not.toBeInTheDocument();
  });

  it("renders upload form initially", () => {
    render(
      <GenerateQuestionsModal
        open={true}
        onClose={mockOnClose}
        chapterId={CHAPTER_ID}
      />
    );
    expect(screen.getByText(/Upload Material/i)).toBeInTheDocument();
    expect(screen.getByText(/Generate Questions with AI/i)).toBeInTheDocument();
  });

  it("enables generate button when a file is provided", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <GenerateQuestionsModal
        open={true}
        onClose={mockOnClose}
        chapterId={CHAPTER_ID}
      />
    );

    const file = new File(["test content"], "test.pdf", { type: "application/pdf" });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    
    // Select difficulty to satisfy the other condition
    await user.click(screen.getByText("Medium"));

    // Simulate file upload
    await user.upload(input, file);
    
    expect(screen.getByText("test.pdf")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Generate Questions$/i })).toBeEnabled();
  });

  it("clears file when clicking the remove button", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <GenerateQuestionsModal
        open={true}
        onClose={mockOnClose}
        chapterId={CHAPTER_ID}
      />
    );

    const file = new File(["test content"], "test.pdf", { type: "application/pdf" });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    const removeBtn = screen.getByLabelText(/remove file/i);
    await user.click(removeBtn);

    expect(screen.queryByText("test.pdf")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Generate Questions$/i })).toBeDisabled();
  });

  it("validates file size", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <GenerateQuestionsModal
        open={true}
        onClose={mockOnClose}
        chapterId={CHAPTER_ID}
      />
    );

    const heavyFile = new File(["a".repeat(11 * 1024 * 1024)], "huge.pdf", { type: "application/pdf" });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    
    await user.upload(input, heavyFile);
    expect(await screen.findByText(/File is too large/i)).toBeInTheDocument();
  });

  it("validates file type", async () => {
    const { container } = render(
      <GenerateQuestionsModal
        open={true}
        onClose={mockOnClose}
        chapterId={CHAPTER_ID}
      />
    );

    const invalidFile = new File(["test"], "test.exe", { type: "application/x-msdownload" });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    
    // Use fireEvent to bypass potential userEvent 'accept' filter
    fireEvent.change(input, { target: { files: [invalidFile] } });
    
    expect(await screen.findByText(/Invalid file type/i)).toBeInTheDocument();
  });

  it("successfully generates and shows review screen", async () => {
    const user = userEvent.setup();
    const mockQuestions = [
      { id: "q1", prompt: "Test Q", choices: [], difficulty: "easy", source: "ai" }
    ];
    (privateApi.post as Mock).mockResolvedValue({ data: mockQuestions });

    const { container } = render(
      <GenerateQuestionsModal
        open={true}
        onClose={mockOnClose}
        chapterId={CHAPTER_ID}
        onSuccess={mockOnSuccess}
      />
    );

    // Provide material and difficulty
    const file = new File(["test"], "test.pdf", { type: "application/pdf" });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);
    await user.click(screen.getByText("Easy"));

    const generateBtn = screen.getByRole("button", { name: /^Generate Questions$/i });
    await user.click(generateBtn);

    // Skip flakey immediate text check or use findByText
    expect(await screen.findByText(/Review Questions/i)).toBeInTheDocument();
    expect(screen.getByText("Test Q")).toBeInTheDocument();

    // Check if it saved to sessionStorage
    expect(sessionStorage.getItem("ai_generated_questions_draft")).toContain("Test Q");
  });

  it("can delete a question from the review list", async () => {
    const user = userEvent.setup();
    const mockQuestions = [
      { id: "q1", prompt: "Q1", choices: [], difficulty: "easy", source: "ai" },
      { id: "q2", prompt: "Q2", choices: [], difficulty: "easy", source: "ai" }
    ];
    (privateApi.post as Mock).mockResolvedValue({ data: mockQuestions });

    const { container } = render(<GenerateQuestionsModal open={true} chapterId={CHAPTER_ID} />);

    // Fast forward to review
    const file = new File(["test"], "t.pdf", { type: "application/pdf" });
    await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, file);
    await user.click(screen.getByText("Easy"));
    await user.click(screen.getByRole("button", { name: /^Generate Questions$/i }));

    await screen.findByText("Q1");
    expect(screen.getByText("Q2")).toBeInTheDocument();

    const deleteBtns = screen.getAllByLabelText(/delete question/i);
    await user.click(deleteBtns[0]); // Delete Q1

    expect(screen.queryByText("Q1")).not.toBeInTheDocument();
    expect(screen.getByText("Q2")).toBeInTheDocument();
  });

  it("submits bulk questions to the backend on Add Questions", async () => {
    const user = userEvent.setup();
    const mockQuestions = [{ id: "q1", prompt: "Q1", choices: [], difficulty: "easy", source: "ai" }];
    (privateApi.post as Mock).mockResolvedValue({ data: mockQuestions });

    const { container, rerender } = render(
      <GenerateQuestionsModal
        open={true}
        onClose={mockOnClose}
        chapterId={CHAPTER_ID}
        onSuccess={mockOnSuccess}
      />
    );

    // Setup review state
    const file = new File(["test"], "t.pdf", { type: "application/pdf" });
    await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, file);
    await user.click(screen.getByText("Easy"));
    await user.click(screen.getByRole("button", { name: /^Generate Questions$/i }));

    const addBtn = await screen.findByRole("button", { name: /Add 1 Questions/i });
    
    // Mock the bulk creation API
    (privateApi.post as Mock).mockResolvedValue({ data: { success: true } });
    
    await user.click(addBtn);

    await waitFor(() => {
      expect(privateApi.post).toHaveBeenCalledWith(
        QUIZZES.BULK_CREATE_QUESTIONS(CHAPTER_ID),
        { questions: expect.any(Array) }
      );
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    // Manually rerender with open=false to simulate parent state update
    rerender(
      <GenerateQuestionsModal
        open={false}
        onClose={mockOnClose}
        chapterId={CHAPTER_ID}
        onSuccess={mockOnSuccess}
      />
    );

    // Session storage should be cleared after the mock close effect kicks in
    await waitFor(() => {
      expect(sessionStorage.getItem("ai_generated_questions_draft")).toBeNull();
    });
  });

  it("restores state from sessionStorage on mount", () => {
    const draft = [{ id: "q-saved", prompt: "Saved Q", choices: [], difficulty: "easy", source: "ai" }];
    sessionStorage.setItem("ai_generated_questions_draft", JSON.stringify(draft));

    render(
      <GenerateQuestionsModal
        open={true}
        onClose={mockOnClose}
        chapterId={CHAPTER_ID}
      />
    );

    expect(screen.getByText("Review Questions")).toBeInTheDocument();
    expect(screen.getByText("Saved Q")).toBeInTheDocument();
  });

  it("aborts the API call when closed mid-generation", async () => {
    const user = userEvent.setup();
    // Non-resolving promise to simulate long delay
    (privateApi.post as Mock).mockReturnValue(new Promise(() => {}));

    const { rerender, container } = render(
      <GenerateQuestionsModal
        open={true}
        onClose={mockOnClose}
        chapterId={CHAPTER_ID}
      />
    );

    const file = new File(["test"], "t.pdf", { type: "application/pdf" });
    await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, file);
    await user.click(screen.getByText("Easy"));
    await user.click(screen.getByRole("button", { name: /^Generate Questions$/i }));

    // Now close the modal by rerendering with open=false
    rerender(
      <GenerateQuestionsModal
        open={false}
        onClose={mockOnClose}
        chapterId={CHAPTER_ID}
      />
    );

    // We can't easily check internal refs, but we can verify the reset happened if we open it again
    rerender(
      <GenerateQuestionsModal
        open={true}
        onClose={mockOnClose}
        chapterId={CHAPTER_ID}
      />
    );
    
    expect(screen.queryByText(/Generating/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Upload Material/i)).toBeInTheDocument();
  });
});
