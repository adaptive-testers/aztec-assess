import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Mock } from "vitest";

import { privateApi } from "../api/axios";
import { COURSES } from "../api/endpoints";
import CourseCreationPage from "../features/CourseCreation/CourseCreationPage";

import { render } from "./utils";

// Mock the API module
vi.mock("../api/axios", () => ({
  privateApi: {
    post: vi.fn(),
  },
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock Toast component
vi.mock("../components/Toast", () => ({
  Toast: ({ message }: { message: string }) => <div data-testid="toast">{message}</div>,
}));

// Mock axios.isAxiosError
vi.mock("axios", async () => {
  const actual = await vi.importActual<typeof import("axios")>("axios");
  const isAxiosErrorMock = (error: unknown): error is import("axios").AxiosError => {
    return (
      typeof error === "object" &&
      error !== null &&
      "response" in error &&
      typeof (error as { response?: unknown }).response === "object"
    );
  };
  return {
    ...actual,
    default: {
      ...actual.default,
      isAxiosError: isAxiosErrorMock,
    },
    isAxiosError: isAxiosErrorMock,
  };
});

const api = privateApi as unknown as { post: Mock };

describe("CourseCreationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the course creation form", () => {
    render(<CourseCreationPage />);

    expect(screen.getByText("Create New Course")).toBeInTheDocument();
    expect(screen.getByText("Enter your course details")).toBeInTheDocument();
    expect(screen.getByLabelText("Course Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Description (Optional)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create course/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("validates required course name field", async () => {
    const user = userEvent.setup();
    render(<CourseCreationPage />);

    const submitButton = screen.getByRole("button", { name: /create course/i });
    await user.click(submitButton);

    // react-hook-form validation prevents submission
    // Give it a moment for validation to process
    await waitFor(
      () => {
        expect(api.post).not.toHaveBeenCalled();
      },
      { timeout: 1000 }
    );
  });

  it("validates course name max length", async () => {
    const user = userEvent.setup();
    render(<CourseCreationPage />);

    const titleInput = screen.getByLabelText("Course Name") as HTMLInputElement;
    // HTML maxLength prevents typing more than 200, so we'll set the value directly
    // to test the react-hook-form validation
    const longTitle = "a".repeat(201);
    await user.clear(titleInput);
    // Use fireEvent to bypass HTML maxLength and set value directly
    fireEvent.change(titleInput, { target: { value: longTitle } });

    const submitButton = screen.getByRole("button", { name: /create course/i });
    await user.click(submitButton);

    // react-hook-form validation prevents submission
    await waitFor(
      () => {
        expect(api.post).not.toHaveBeenCalled();
      },
      { timeout: 1000 }
    );
  });

  it("validates description max length", async () => {
    const user = userEvent.setup();
    render(<CourseCreationPage />);

    const titleInput = screen.getByLabelText("Course Name");
    const descriptionInput = screen.getByLabelText("Description (Optional)") as HTMLTextAreaElement;
    const longDescription = "a".repeat(201);

    await user.type(titleInput, "Test Course");
    // Use fireEvent to bypass HTML maxLength and set value directly
    fireEvent.change(descriptionInput, { target: { value: longDescription } });

    const submitButton = screen.getByRole("button", { name: /create course/i });
    await user.click(submitButton);

    // react-hook-form validation prevents submission
    await waitFor(
      () => {
        expect(api.post).not.toHaveBeenCalled();
      },
      { timeout: 1000 }
    );
  });

  it("submits form with valid data and navigates to course detail page", async () => {
    const user = userEvent.setup();
    const mockResponse = {
      data: {
        id: "123e4567-e89b-12d3-a456-426614174000",
        title: "Physics 101",
        slug: "physics-101",
        status: "DRAFT",
        created_at: "2024-01-01T00:00:00Z",
      },
    };

    api.post.mockResolvedValue(mockResponse);
    render(<CourseCreationPage />);

    const titleInput = screen.getByLabelText("Course Name");
    await user.type(titleInput, "Physics 101");

    const submitButton = screen.getByRole("button", { name: /create course/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(COURSES.CREATE, {
        title: "Physics 101",
      });
    });

    // Check that toast appears
    await waitFor(() => {
      expect(screen.getByTestId("toast")).toBeInTheDocument();
      expect(screen.getByText("Course created successfully!")).toBeInTheDocument();
    });

    // Wait for navigation (component uses setTimeout with 1500ms delay)
    await waitFor(
      () => {
        expect(mockNavigate).toHaveBeenCalledWith("/courses/physics-101");
      },
      { timeout: 2000 }
    );
  });

  it("does not send description to backend even if provided", async () => {
    const user = userEvent.setup();
    const mockResponse = {
      data: {
        id: "123e4567-e89b-12d3-a456-426614174000",
        title: "Test Course",
        slug: "test-course",
        status: "DRAFT",
        created_at: "2024-01-01T00:00:00Z",
      },
    };

    api.post.mockResolvedValue(mockResponse);
    render(<CourseCreationPage />);

    const titleInput = screen.getByLabelText("Course Name");
    const descriptionInput = screen.getByLabelText("Description (Optional)");

    await user.type(titleInput, "Test Course");
    await user.type(descriptionInput, "This is a test description");

    const submitButton = screen.getByRole("button", { name: /create course/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(COURSES.CREATE, {
        title: "Test Course",
      });
      // Verify description is NOT sent
      expect(api.post).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ description: expect.anything() })
      );
    });
  });

  it("navigates to dashboard if slug is missing", async () => {
    const user = userEvent.setup();
    const mockResponse = {
      data: {
        id: "123e4567-e89b-12d3-a456-426614174000",
        title: "Test Course",
        status: "DRAFT",
        created_at: "2024-01-01T00:00:00Z",
        // slug is missing
      },
    };

    api.post.mockResolvedValue(mockResponse);
    render(<CourseCreationPage />);

    const titleInput = screen.getByLabelText("Course Name");
    await user.type(titleInput, "Test Course");

    const submitButton = screen.getByRole("button", { name: /create course/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled();
    });

    // Wait for navigation (component uses setTimeout with 1500ms delay)
    await waitFor(
      () => {
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
      },
      { timeout: 2000 }
    );
  });

  it("displays error message on API failure", async () => {
    const user = userEvent.setup();
    const errorResponse = {
      response: {
        data: {
          detail: "Failed to create course",
        },
      },
    };

    api.post.mockRejectedValue(errorResponse);
    render(<CourseCreationPage />);

    const titleInput = screen.getByLabelText("Course Name");
    await user.type(titleInput, "Test Course");

    const submitButton = screen.getByRole("button", { name: /create course/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Failed to create course")).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("displays generic error message when error has no detail", async () => {
    const user = userEvent.setup();
    // Create an error object that matches Axios error structure
    const errorResponse = {
      response: {
        data: {},
      },
      isAxiosError: true, // Add this to help the mock recognize it
    };

    api.post.mockRejectedValue(errorResponse);
    render(<CourseCreationPage />);

    const titleInput = screen.getByLabelText("Course Name");
    await user.type(titleInput, "Test Course");

    const submitButton = screen.getByRole("button", { name: /create course/i });
    await user.click(submitButton);

    await waitFor(
      () => {
        expect(
          screen.getByText("Failed to create course. Please try again.")
        ).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it("disables submit button while submitting", async () => {
    const user = userEvent.setup();
    let resolvePromise: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    api.post.mockReturnValue(pendingPromise);
    render(<CourseCreationPage />);

    const titleInput = screen.getByLabelText("Course Name");
    await user.type(titleInput, "Test Course");

    const submitButton = screen.getByRole("button", { name: /create course/i });
    await user.click(submitButton);

    // Button should be disabled and show "Creating..."
    expect(submitButton).toBeDisabled();
    expect(screen.getByText("Creating...")).toBeInTheDocument();

    // Resolve the promise
    resolvePromise!({
      data: {
        id: "123e4567-e89b-12d3-a456-426614174000",
        title: "Test Course",
        slug: "test-course",
        status: "DRAFT",
        created_at: "2024-01-01T00:00:00Z",
      },
    });

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it("navigates to profile when cancel button is clicked", async () => {
    const user = userEvent.setup();
    render(<CourseCreationPage />);

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    // Navigation should happen immediately
    expect(mockNavigate).toHaveBeenCalledWith("/profile");
  });
});

