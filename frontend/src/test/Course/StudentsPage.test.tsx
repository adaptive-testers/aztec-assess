import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AxiosError } from "axios";
import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

import { privateApi } from "../../api/axios";
import { AUTH, COURSES } from "../../api/endpoints";
import StudentsPage from "../../features/Course/StudentsPage";

import { render } from "../utils";

// Mock utilities
vi.mock("../../api/axios", () => ({
  privateApi: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
  publicApi: { post: vi.fn(() => Promise.reject(new Error("No refresh token"))) },
}));

vi.mock("@azure/msal-react", () => ({
  useMsal: () => ({ instance: {}, accounts: [], inProgress: 0 }),
}));

const mockNavigate = vi.fn();
const mockParams = { courseId: "123e4567-e89b-12d3-a456-426614174000" };
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
  };
});

vi.mock("../../components/Toast", () => ({
  Toast: ({ message }: { message: string }) => <div data-testid="toast">{message}</div>,
}));

vi.mock("axios", async () => {
  const actual = await vi.importActual<typeof import("axios")>("axios");
  const isAxiosErrorMock = (error: unknown): error is AxiosError => {
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

const api = privateApi as unknown as {
  get: Mock;
  post: Mock;
  delete: Mock;
};

const mockCourse = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  title: "Test Course",
  slug: "test-course-slug",
  status: "ACTIVE" as const,
  join_code: "ABC12345",
  join_code_enabled: true,
  member_count: 3,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const mockOwner = {
  id: "owner-uuid-123",
  email: "owner@example.com",
  first_name: "Owner",
  last_name: "User",
  role: "OWNER" as const,
};

const mockMembers = [
  {
    id: "membership-1",
    user_id: "owner-uuid-123",
    user_email: "owner@example.com",
    user_first_name: "Owner",
    user_last_name: "User",
    role: "OWNER" as const,
    joined_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "membership-2",
    user_id: "instructor-uuid-123",
    user_email: "instructor@example.com",
    user_first_name: "Instructor",
    user_last_name: "User",
    role: "INSTRUCTOR" as const,
    joined_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "membership-3",
    user_id: "student-uuid-123",
    user_email: "student@example.com",
    user_first_name: "Student",
    user_last_name: "User",
    role: "STUDENT" as const,
    joined_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "membership-4",
    user_id: "ta-uuid-123",
    user_email: "ta@example.com",
    user_first_name: "Teaching",
    user_last_name: "Assistant",
    role: "TA" as const,
    joined_at: "2024-01-01T00:00:00Z",
  }
];

describe("StudentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams.courseId = "123e4567-e89b-12d3-a456-426614174000";

    api.get.mockImplementation((url: string) => {
      if (url === AUTH.PROFILE) {
        return Promise.resolve({ data: mockOwner });
      }
      if (url === COURSES.LIST) {
        return Promise.resolve({ data: [mockCourse] });
      }
      if (url === COURSES.DETAIL(mockParams.courseId)) {
        return Promise.resolve({ data: mockCourse });
      }
      if (url === COURSES.MEMBERS(mockParams.courseId)) {
        return Promise.resolve({ data: mockMembers });
      }
      return Promise.reject(new Error(`Unexpected API call: ${url}`));
    });
  });

  describe("Rendering and Role Visibility", () => {
    it("renders the StudentsPage correctly for owners/instructors", async () => {
      render(<StudentsPage />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Members" })).toBeInTheDocument();
        expect(screen.getByText("Manage students and instructors for this course")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "+ Add Member" })).toBeInTheDocument();
      });
    });

    it("renders the StudentsPage correctly for students (hides Add Member)", async () => {
      const studentProfile = { ...mockOwner, id: "student-uuid-123" };
      api.get.mockImplementation((url: string) => {
        if (url === AUTH.PROFILE) {
          return Promise.resolve({ data: studentProfile });
        }
        if (url === COURSES.LIST) {
          return Promise.resolve({ data: [mockCourse] });
        }
        if (url === COURSES.DETAIL(mockParams.courseId)) {
          return Promise.resolve({ data: mockCourse });
        }
        if (url === COURSES.MEMBERS(mockParams.courseId)) {
          return Promise.resolve({ data: mockMembers });
        }
        return Promise.reject(new Error(`Unexpected API call: ${url}`));
      });

      render(<StudentsPage />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Members" })).toBeInTheDocument();
      });
      // Should not see the Add Member button
      expect(screen.queryByRole("button", { name: "+ Add Member" })).not.toBeInTheDocument();
    });

    it("displays member list with correct formatted roles", async () => {
      render(<StudentsPage />);

      await waitFor(() => {
        expect(screen.getByText("Owner User")).toBeInTheDocument();
        expect(screen.getByText("Instructor User")).toBeInTheDocument();
        expect(screen.getByText("Student User")).toBeInTheDocument();
        expect(screen.getByText("Teaching Assistant")).toBeInTheDocument();
      });

      // roles should be formatted nicely
      expect(screen.getAllByText("Owner")[0]).toBeInTheDocument();
      expect(screen.getByText("Instructor")).toBeInTheDocument();
      expect(screen.getByText("Student")).toBeInTheDocument();
      expect(screen.getByText("TA")).toBeInTheDocument();
    });
  });

  describe("Member Operations", () => {
    it("opens add member modal when Add Member button is clicked", async () => {
      const user = userEvent.setup();
      render(<StudentsPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "+ Add Member" })).toBeInTheDocument();
      });

      const addMemberBtn = screen.getByRole("button", { name: "+ Add Member" });
      await user.click(addMemberBtn);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Add Member" })).toBeInTheDocument();
        expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      });
    });

    it("adds member when form is submitted", async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValue({ data: { id: "new-membership" } });

      render(<StudentsPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "+ Add Member" })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "+ Add Member" }));

      await waitFor(() => {
        expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/Email Address/i), "new@student.com");
      const submitBtn = screen.getByRole("button", { name: /^\s*Add Member\s*$/ });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          COURSES.ADD_MEMBER(mockParams.courseId),
          { email: "new@student.com", role: "STUDENT" }
        );
      });
    });

    it("shows remove button only for eligible members", async () => {
      render(<StudentsPage />);
      
      await waitFor(() => {
        const removeButtons = screen.getAllByRole("button", { name: "Remove" });
        // Should not be able to remove self (owner) or other owners
        // So only Instructor, Student, and TA should have remove buttons (3 buttons)
        expect(removeButtons).toHaveLength(3);
      });
    });

    it("opens remove confirmation modal and removes member", async () => {
      const user = userEvent.setup();
      // Component uses privateApi.post for REMOVE_MEMBER
      api.post.mockResolvedValue({});
      
      render(<StudentsPage />);
      
      await waitFor(() => {
        expect(screen.getAllByRole("button", { name: "Remove" })).toHaveLength(3);
      });

      // Click the first remove button (Instructor User) using fireEvent for reliability
      const removeButtons = screen.getAllByRole("button", { name: "Remove" });
      fireEvent.click(removeButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /Remove Member/i })).toBeInTheDocument();
        expect(screen.getByText(/Are you sure you want to remove/i)).toBeInTheDocument();
      });

      const confirmBtn = screen.getByRole("button", { name: /Remove Member/i });
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          COURSES.REMOVE_MEMBER(mockParams.courseId),
          { user_id: "instructor-uuid-123" }
        );
      });
    });
  });

  describe("Navigation", () => {
    it("navigates back to Course Info when Course Info nav button is clicked", async () => {
      const user = userEvent.setup();
      render(<StudentsPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Course Info" })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Course Info" }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(`/courses/${mockParams.courseId}/settings`);
      });
    });
  });
});
