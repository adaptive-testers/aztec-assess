import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import "@testing-library/jest-dom";

import { privateApi } from "../api/axios";
import { AUTH } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import JoinCoursePage from "../features/Course/JoinCoursePage";

const mockNavigate = vi.fn();

vi.mock("../api/axios", () => ({
  privateApi: {
    post: vi.fn(),
  },
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(() => ({
    accessToken: "mock-token",
    checkingRefresh: false,
  })),
}));

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

// Mock window.location.reload
const mockReload = vi.fn();
Object.defineProperty(window, "location", {
  value: {
    reload: mockReload,
  },
  writable: true,
});

describe("JoinCoursePage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockNavigate.mockClear();
    mockReload.mockClear();
    (useAuth as unknown as Mock).mockReturnValue({
      accessToken: "mock-token",
      checkingRefresh: false,
    });
  });

  function setup() {
    const user = userEvent.setup();
    const utils = render(<JoinCoursePage />);
    return { user, ...utils };
  }

  it("renders the join course form", () => {
    setup();

    expect(screen.getByText("Join Course")).toBeInTheDocument();
    expect(
      screen.getByText("Enter the course code provided by your instructor")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Course Code")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument();
  });

  it("validates course code is required", async () => {
    const { user } = setup();

    const searchButton = screen.getByRole("button", { name: /search/i });
    await user.click(searchButton);

    expect(await screen.findByText("Course code is required.")).toBeInTheDocument();
    expect(privateApi.post).not.toHaveBeenCalled();
  });

  it("validates course code minimum length", async () => {
    const { user } = setup();

    const input = screen.getByLabelText("Course Code");
    await user.type(input, "ABC");

    const searchButton = screen.getByRole("button", { name: /search/i });
    await user.click(searchButton);

    expect(
      await screen.findByText("Course code must be at least 4 characters.")
    ).toBeInTheDocument();
  });

  it("validates course code maximum length", async () => {
    const { user } = setup();

    const input = screen.getByLabelText("Course Code");
    await user.type(input, "ABCDEFGHIJKLMNOPQ"); // 17 characters

    const searchButton = screen.getByRole("button", { name: /search/i });
    await user.click(searchButton);

    expect(
      await screen.findByText("Course code must be no more than 16 characters.")
    ).toBeInTheDocument();
  });

  it("validates course code is alphanumeric only", async () => {
    const { user } = setup();

    const input = screen.getByLabelText("Course Code");
    await user.type(input, "ABC-123");

    const searchButton = screen.getByRole("button", { name: /search/i });
    await user.click(searchButton);

    expect(
      await screen.findByText("Course code can only contain letters and numbers.")
    ).toBeInTheDocument();
  });

  it("converts course code to uppercase", async () => {
    const { user } = setup();

    const input = screen.getByLabelText("Course Code") as HTMLInputElement;
    await user.type(input, "abc123");

    expect(input.value).toBe("ABC123");
  });

  it("filters out invalid characters from input", async () => {
    const { user } = setup();

    const input = screen.getByLabelText("Course Code") as HTMLInputElement;
    await user.type(input, "ABC-123!@#");

    expect(input.value).toBe("ABC123");
  });

  it("shows loading state when searching", async () => {
    const { user } = setup();

    (privateApi.post as Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ data: {} }), 100);
        })
    );

    const input = screen.getByLabelText("Course Code");
    await user.type(input, "ABC12345");

    const searchButton = screen.getByRole("button", { name: /search/i });
    await user.click(searchButton);

    expect(screen.getByText("Searching...")).toBeInTheDocument();
    expect(searchButton).toBeDisabled();
  });

  it("displays course preview after successful search", async () => {
    const { user } = setup();

    const previewData = {
      id: "123",
      title: "Test Course",
      status: "ACTIVE",
      join_code: "ABC12345",
      member_count: 10,
      created_at: "2024-01-01T00:00:00Z",
      owner_id: "owner-123",
      is_member: false,
    };

    (privateApi.post as Mock).mockResolvedValueOnce({ data: previewData });

    const input = screen.getByLabelText("Course Code");
    await user.type(input, "ABC12345");

    const searchButton = screen.getByRole("button", { name: /search/i });
    await user.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText("Course Details")).toBeInTheDocument();
    });

    expect(screen.getByText("Test Course")).toBeInTheDocument();
    expect(screen.getByText("ABC12345")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /join course/i })).toBeInTheDocument();
  });

  it("shows error message when preview fails", async () => {
    const { user } = setup();

    (privateApi.post as Mock).mockRejectedValueOnce({
      response: { data: { detail: "Invalid join code" } },
    });

    const input = screen.getByLabelText("Course Code");
    await user.type(input, "INVALID");

    const searchButton = screen.getByRole("button", { name: /search/i });
    await user.click(searchButton);

    expect(await screen.findByText("Invalid join code")).toBeInTheDocument();
  });

  it("shows warning when user is already a member", async () => {
    const { user } = setup();

    const previewData = {
      id: "123",
      title: "Test Course",
      status: "ACTIVE",
      join_code: "ABC12345",
      member_count: 10,
      created_at: "2024-01-01T00:00:00Z",
      owner_id: "owner-123",
      is_member: true,
    };

    (privateApi.post as Mock).mockResolvedValueOnce({ data: previewData });

    const input = screen.getByLabelText("Course Code");
    await user.type(input, "ABC12345");

    const searchButton = screen.getByRole("button", { name: /search/i });
    await user.click(searchButton);

    await waitFor(() => {
      expect(
        screen.getByText("You are already a member of this course.")
      ).toBeInTheDocument();
    });

    const joinButton = screen.getByRole("button", { name: /join course/i });
    expect(joinButton).toBeDisabled();
  });

  it("allows canceling preview and returning to search", async () => {
    const { user } = setup();

    const previewData = {
      id: "123",
      title: "Test Course",
      status: "ACTIVE",
      join_code: "ABC12345",
      member_count: 10,
      created_at: "2024-01-01T00:00:00Z",
      owner_id: "owner-123",
      is_member: false,
    };

    (privateApi.post as Mock).mockResolvedValueOnce({ data: previewData });

    const input = screen.getByLabelText("Course Code");
    await user.type(input, "ABC12345");

    const searchButton = screen.getByRole("button", { name: /search/i });
    await user.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText("Course Details")).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    expect(screen.getByText("Enter Course Code")).toBeInTheDocument();
    expect(screen.queryByText("Test Course")).not.toBeInTheDocument();
  });

  it("joins course successfully and shows toast", async () => {
    const { user } = setup();

    const previewData = {
      id: "123",
      title: "Test Course",
      status: "ACTIVE",
      join_code: "ABC12345",
      member_count: 10,
      created_at: "2024-01-01T00:00:00Z",
      owner_id: "owner-123",
      is_member: false,
    };

    const joinResponse = {
      course_id: "123",
      course_slug: "test-course",
      role: "STUDENT",
      created: true,
    };

    (privateApi.post as Mock)
      .mockResolvedValueOnce({ data: previewData })
      .mockResolvedValueOnce({ data: joinResponse });

    const input = screen.getByLabelText("Course Code");
    await user.type(input, "ABC12345");

    const searchButton = screen.getByRole("button", { name: /search/i });
    await user.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText("Test Course")).toBeInTheDocument();
    });

    const joinButton = screen.getByRole("button", { name: /join course/i });
    await user.click(joinButton);

    await waitFor(() => {
      expect(screen.getByText("Successfully joined the course!")).toBeInTheDocument();
    });

    expect(privateApi.post).toHaveBeenCalledWith(AUTH.ENROLLMENT_JOIN, {
      join_code: "ABC12345",
    });
  });

  it("shows error toast when join fails", async () => {
    const { user } = setup();

    const previewData = {
      id: "123",
      title: "Test Course",
      status: "ACTIVE",
      join_code: "ABC12345",
      member_count: 10,
      created_at: "2024-01-01T00:00:00Z",
      owner_id: "owner-123",
      is_member: false,
    };

    (privateApi.post as Mock)
      .mockResolvedValueOnce({ data: previewData })
      .mockRejectedValueOnce({
        response: { data: { detail: "Failed to join course" } },
      });

    const input = screen.getByLabelText("Course Code");
    await user.type(input, "ABC12345");

    const searchButton = screen.getByRole("button", { name: /search/i });
    await user.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText("Test Course")).toBeInTheDocument();
    });

    const joinButton = screen.getByRole("button", { name: /join course/i });
    await user.click(joinButton);

    await waitFor(() => {
      expect(screen.getByText("Failed to join course")).toBeInTheDocument();
    });
  });
});

