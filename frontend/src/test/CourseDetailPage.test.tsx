import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AxiosError } from "axios";
import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

import { privateApi } from "../api/axios";
import { AUTH, COURSES } from "../api/endpoints";
import CourseDetailPage from "../features/Course/CourseDetailPage";

import { render } from "./utils";

// publicApi needed for AuthProvider token refresh
vi.mock("../api/axios", () => ({
  privateApi: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  publicApi: { post: vi.fn(() => Promise.reject(new Error("No refresh token"))) },
}));

vi.mock("@azure/msal-react", () => ({
  useMsal: () => ({ instance: {}, accounts: [], inProgress: 0 }),
}));

const mockNavigate = vi.fn();
const mockParams = { courseId: "test-course-slug" };
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
  };
});

vi.mock("../components/Toast", () => ({
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
  patch: Mock;
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
  role: "instructor" as const,
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
];

describe("CourseDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams.courseId = "test-course-slug";
    
    api.get.mockImplementation((url: string) => {
      if (url === AUTH.PROFILE) {
        return Promise.resolve({ data: mockOwner });
      }
      if (url === COURSES.LIST) {
        return Promise.resolve({ data: [mockCourse] });
      }
      if (url === `${COURSES.LIST}?status=ARCHIVED`) {
        return Promise.resolve({ data: [] });
      }
      if (url === COURSES.DETAIL("123e4567-e89b-12d3-a456-426614174000")) {
        return Promise.resolve({ data: mockCourse });
      }
      if (url === COURSES.MEMBERS("123e4567-e89b-12d3-a456-426614174000")) {
        return Promise.resolve({ data: mockMembers });
      }
      return Promise.reject(new Error(`Unexpected API call: ${url}`));
    });
  });

  describe("Course ID Resolution", () => {
    it("resolves UUID course ID directly", async () => {
      mockParams.courseId = "123e4567-e89b-12d3-a456-426614174000";
      
      render(<CourseDetailPage />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(COURSES.DETAIL("123e4567-e89b-12d3-a456-426614174000"));
      });
    });

    it("resolves slug to UUID by fetching course list", async () => {
      mockParams.courseId = "test-course-slug";
      
      render(<CourseDetailPage />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(COURSES.LIST);
        expect(api.get).toHaveBeenCalledWith(COURSES.DETAIL("123e4567-e89b-12d3-a456-426614174000"));
      });
    });

    it("shows error toast when course not found", async () => {
      mockParams.courseId = "non-existent-slug";
      api.get.mockImplementation((url: string) => {
        if (url === AUTH.PROFILE) {
          return Promise.resolve({ data: mockOwner });
        }
        if (url === COURSES.LIST) {
          return Promise.resolve({ data: [] });
        }
        return Promise.reject(new Error("Not found"));
      });

      render(<CourseDetailPage />);

      await waitFor(() => {
        expect(screen.getByTestId("toast")).toHaveTextContent("Course not found");
      });
    });

    it("checks archived courses when resolving slug", async () => {
      mockParams.courseId = "archived-course-slug";
      const archivedCourse = { ...mockCourse, slug: "archived-course-slug", status: "ARCHIVED" as const };
      
      api.get.mockImplementation((url: string) => {
        if (url === AUTH.PROFILE) {
          return Promise.resolve({ data: mockOwner });
        }
        if (url === COURSES.LIST) {
          return Promise.resolve({ data: [] });
        }
        if (url === COURSES.LIST + "?status=ARCHIVED") {
          return Promise.resolve({ data: [archivedCourse] });
        }
        if (url === COURSES.DETAIL(archivedCourse.id)) {
          return Promise.resolve({ data: archivedCourse });
        }
        return Promise.reject(new Error(`Unexpected API call: ${url}`));
      });

      render(<CourseDetailPage />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(COURSES.LIST + "?status=ARCHIVED");
      });
    });
  });

  describe("Role-Based Rendering", () => {
    it("shows 'Edit Course' title for owners", async () => {
      render(<CourseDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Edit Course")).toBeInTheDocument();
      });
    });

    it("shows 'Course Info' title for students", async () => {
      const studentProfile = { ...mockOwner, id: "student-uuid-123" };
      api.get.mockImplementation((url: string) => {
        if (url === AUTH.PROFILE) {
          return Promise.resolve({ data: studentProfile });
        }
        if (url === COURSES.LIST) {
          return Promise.resolve({ data: [mockCourse] });
        }
        if (url === COURSES.DETAIL("123e4567-e89b-12d3-a456-426614174000")) {
          return Promise.resolve({ data: mockCourse });
        }
        if (url === COURSES.MEMBERS("123e4567-e89b-12d3-a456-426614174000")) {
          return Promise.resolve({ data: mockMembers });
        }
        return Promise.reject(new Error(`Unexpected API call: ${url}`));
      });

      render(<CourseDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Course Info")).toBeInTheDocument();
      });
    });

    it("shows 'Course Details' title for archived courses", async () => {
      const archivedCourse = { ...mockCourse, status: "ARCHIVED" as const };
      api.get.mockImplementation((url: string) => {
        if (url === AUTH.PROFILE) {
          return Promise.resolve({ data: mockOwner });
        }
        if (url === COURSES.LIST) {
          return Promise.resolve({ data: [mockCourse] });
        }
        if (url === COURSES.DETAIL("123e4567-e89b-12d3-a456-426614174000")) {
          return Promise.resolve({ data: archivedCourse });
        }
        if (url === COURSES.MEMBERS("123e4567-e89b-12d3-a456-426614174000")) {
          return Promise.resolve({ data: mockMembers });
        }
        return Promise.reject(new Error(`Unexpected API call: ${url}`));
      });

      render(<CourseDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Course Details")).toBeInTheDocument();
      });
    });

    it("shows Save Changes button for owners/instructors", async () => {
      render(<CourseDetailPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
      });
    });

    it("hides Save Changes button for students", async () => {
      const studentProfile = { ...mockOwner, id: "student-uuid-123" };
      api.get.mockImplementation((url: string) => {
        if (url === AUTH.PROFILE) {
          return Promise.resolve({ data: studentProfile });
        }
        if (url === COURSES.LIST) {
          return Promise.resolve({ data: [mockCourse] });
        }
        if (url === COURSES.DETAIL("123e4567-e89b-12d3-a456-426614174000")) {
          return Promise.resolve({ data: mockCourse });
        }
        if (url === COURSES.MEMBERS("123e4567-e89b-12d3-a456-426614174000")) {
          return Promise.resolve({ data: mockMembers });
        }
        return Promise.reject(new Error(`Unexpected API call: ${url}`));
      });

      render(<CourseDetailPage />);

      await waitFor(() => {
        expect(screen.queryByRole("button", { name: /save changes/i })).not.toBeInTheDocument();
      });
    });

    it("shows join code section for staff", async () => {
      render(<CourseDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Join Code")).toBeInTheDocument();
      });
    });

    it("hides join code section for archived courses", async () => {
      const archivedCourse = { ...mockCourse, status: "ARCHIVED" as const };
      api.get.mockImplementation((url: string) => {
        if (url === AUTH.PROFILE) {
          return Promise.resolve({ data: mockOwner });
        }
        if (url === COURSES.LIST) {
          return Promise.resolve({ data: [mockCourse] });
        }
        if (url === COURSES.DETAIL("123e4567-e89b-12d3-a456-426614174000")) {
          return Promise.resolve({ data: archivedCourse });
        }
        if (url === COURSES.MEMBERS("123e4567-e89b-12d3-a456-426614174000")) {
          return Promise.resolve({ data: mockMembers });
        }
        return Promise.reject(new Error(`Unexpected API call: ${url}`));
      });

      render(<CourseDetailPage />);

      await waitFor(() => {
        expect(screen.queryByText("Join Code")).not.toBeInTheDocument();
      });
    });
  });

  describe("Form Interactions", () => {
    it("disables Save Changes button when no changes made", async () => {
      render(<CourseDetailPage />);

      await waitFor(() => {
        const saveButton = screen.getByRole("button", { name: /save changes/i });
        expect(saveButton).toBeDisabled();
      });
    });

    it("enables Save Changes button when title is changed", async () => {
      const user = userEvent.setup();
      render(<CourseDetailPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("Test Course")).toBeInTheDocument();
      });

      const titleInput = screen.getByDisplayValue("Test Course");
      await user.clear(titleInput);
      await user.type(titleInput, "Updated Course Title");

      const saveButton = screen.getByRole("button", { name: /save changes/i });
      expect(saveButton).not.toBeDisabled();
    });

    it("submits form with updated title", async () => {
      const user = userEvent.setup();
      api.patch.mockResolvedValue({ data: { ...mockCourse, title: "Updated Title" } });

      render(<CourseDetailPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("Test Course")).toBeInTheDocument();
      });

      const titleInput = screen.getByDisplayValue("Test Course");
      await user.clear(titleInput);
      await user.type(titleInput, "Updated Title");

      const saveButton = screen.getByRole("button", { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith(
          COURSES.UPDATE("123e4567-e89b-12d3-a456-426614174000"),
          { title: "Updated Title" }
        );
      });
    });

    it("shows course title as read-only for students", async () => {
      const studentProfile = { ...mockOwner, id: "student-uuid-123" };
      api.get.mockImplementation((url: string) => {
        if (url === AUTH.PROFILE) {
          return Promise.resolve({ data: studentProfile });
        }
        if (url === COURSES.LIST) {
          return Promise.resolve({ data: [mockCourse] });
        }
        if (url === COURSES.DETAIL("123e4567-e89b-12d3-a456-426614174000")) {
          return Promise.resolve({ data: mockCourse });
        }
        if (url === COURSES.MEMBERS("123e4567-e89b-12d3-a456-426614174000")) {
          return Promise.resolve({ data: mockMembers });
        }
        return Promise.reject(new Error(`Unexpected API call: ${url}`));
      });

      render(<CourseDetailPage />);

      await waitFor(() => {
        const titleElement = screen.getByText("Test Course");
        expect(titleElement).toBeInTheDocument();
        // Should not be an input field
        expect(screen.queryByDisplayValue("Test Course")).not.toBeInTheDocument();
      });
    });
  });

  describe("Tab Navigation", () => {
    it("defaults to Course Details tab", async () => {
      render(<CourseDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Course Details")).toBeInTheDocument();
        expect(screen.getByText("Course Information")).toBeInTheDocument();
      });
    });

    it("switches to Members tab when clicked", async () => {
      const user = userEvent.setup();
      render(<CourseDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Course Details")).toBeInTheDocument();
      });

      const membersTab = screen.getByRole("button", { name: /members/i });
      await user.click(membersTab);

      await waitFor(() => {
        expect(screen.getByText("Course Members")).toBeInTheDocument();
      });
    });

    it("shows member count in Members tab", async () => {
      render(<CourseDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/Members \(3\)/)).toBeInTheDocument();
      });
    });
  });

  describe("Member Management", () => {
    it("displays member list with roles", async () => {
      const user = userEvent.setup();
      render(<CourseDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Course Details")).toBeInTheDocument();
      });

      const membersTab = screen.getByRole("button", { name: /members/i });
      await user.click(membersTab);

      await waitFor(() => {
        expect(screen.getByText("Owner User")).toBeInTheDocument();
        expect(screen.getByText("Instructor User")).toBeInTheDocument();
        expect(screen.getByText("Student User")).toBeInTheDocument();
      });
    });

    it("shows 'Instructor' instead of 'Owner' for students", async () => {
      const studentProfile = { ...mockOwner, id: "student-uuid-123" };
      api.get.mockImplementation((url: string) => {
        if (url === AUTH.PROFILE) {
          return Promise.resolve({ data: studentProfile });
        }
        if (url === COURSES.LIST) {
          return Promise.resolve({ data: [mockCourse] });
        }
        if (url === COURSES.DETAIL("123e4567-e89b-12d3-a456-426614174000")) {
          return Promise.resolve({ data: mockCourse });
        }
        if (url === COURSES.MEMBERS("123e4567-e89b-12d3-a456-426614174000")) {
          return Promise.resolve({ data: mockMembers });
        }
        return Promise.reject(new Error(`Unexpected API call: ${url}`));
      });

      const user = userEvent.setup();
      render(<CourseDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Course Details")).toBeInTheDocument();
      });

      const membersTab = screen.getByRole("button", { name: /members/i });
      await user.click(membersTab);

      await waitFor(() => {
        // Should show "Instructor" not "Owner" for students
        const roleTexts = screen.getAllByText(/Instructor|Owner|Student|TA/);
        const instructorText = roleTexts.find(el => el.textContent === "Instructor");
        expect(instructorText).toBeInTheDocument();
      });
    });

    it("opens add member modal when Add Member button is clicked", async () => {
      const user = userEvent.setup();
      render(<CourseDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Course Details")).toBeInTheDocument();
      });

      const membersTab = screen.getByRole("button", { name: /members/i });
      await user.click(membersTab);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add member/i })).toBeInTheDocument();
      });

      const addButtons = screen.getAllByRole("button", { name: /add member/i });
      const openAddModalButton = addButtons[0];
      await user.click(openAddModalButton);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /add member/i })).toBeInTheDocument();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });
    });

    it("adds member when form is submitted", async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValue({ data: { id: "new-membership" } });
      api.get.mockImplementation((url: string) => {
        if (url === AUTH.PROFILE) {
          return Promise.resolve({ data: mockOwner });
        }
        if (url === COURSES.LIST) {
          return Promise.resolve({ data: [mockCourse] });
        }
        if (url === COURSES.DETAIL("123e4567-e89b-12d3-a456-426614174000")) {
          return Promise.resolve({ data: mockCourse });
        }
        if (url === COURSES.MEMBERS("123e4567-e89b-12d3-a456-426614174000")) {
          return Promise.resolve({ data: mockMembers });
        }
        return Promise.reject(new Error(`Unexpected API call: ${url}`));
      });

      render(<CourseDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Course Details")).toBeInTheDocument();
      });

      const membersTab = screen.getByRole("button", { name: /members/i });
      await user.click(membersTab);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add member/i })).toBeInTheDocument();
      });

      const addButton = screen.getByRole("button", { name: /add member/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, "newmember@example.com");

      const modalHeading = screen.getByRole("heading", { name: /add member/i });
      const modalContainer = modalHeading.closest("div")?.parentElement?.parentElement as HTMLElement;
      const submitButton = within(modalContainer).getByRole("button", { name: /add member/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          COURSES.ADD_MEMBER("123e4567-e89b-12d3-a456-426614174000"),
          { email: "newmember@example.com", role: "STUDENT" }
        );
      });
    });

    it("hides Add Member button for students", async () => {
      const studentProfile = { ...mockOwner, id: "student-uuid-123" };
      api.get.mockImplementation((url: string) => {
        if (url === AUTH.PROFILE) {
          return Promise.resolve({ data: studentProfile });
        }
        if (url === COURSES.LIST) {
          return Promise.resolve({ data: [mockCourse] });
        }
        if (url === COURSES.DETAIL("123e4567-e89b-12d3-a456-426614174000")) {
          return Promise.resolve({ data: mockCourse });
        }
        if (url === COURSES.MEMBERS("123e4567-e89b-12d3-a456-426614174000")) {
          return Promise.resolve({ data: mockMembers });
        }
        return Promise.reject(new Error(`Unexpected API call: ${url}`));
      });

      const user = userEvent.setup();
      render(<CourseDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Course Details")).toBeInTheDocument();
      });

      const membersTab = screen.getByRole("button", { name: /members/i });
      await user.click(membersTab);

      await waitFor(() => {
        expect(screen.queryByRole("button", { name: /add member/i })).not.toBeInTheDocument();
      });
    });
  });

  describe("Course Actions", () => {
    it("activates course when Activate button is clicked", async () => {
      const draftCourse = { ...mockCourse, status: "DRAFT" as const };
      api.get.mockImplementation((url: string) => {
        if (url === AUTH.PROFILE) {
          return Promise.resolve({ data: mockOwner });
        }
        if (url === COURSES.LIST) {
          return Promise.resolve({ data: [mockCourse] });
        }
        if (url === COURSES.DETAIL("123e4567-e89b-12d3-a456-426614174000")) {
          return Promise.resolve({ data: draftCourse });
        }
        if (url === COURSES.MEMBERS("123e4567-e89b-12d3-a456-426614174000")) {
          return Promise.resolve({ data: mockMembers });
        }
        return Promise.reject(new Error(`Unexpected API call: ${url}`));
      });
      api.post.mockResolvedValue({ data: { status: "ACTIVE", join_code: "NEW12345" } });

      const user = userEvent.setup();
      render(<CourseDetailPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /activate course/i })).toBeInTheDocument();
      });

      const activateButton = screen.getByRole("button", { name: /activate course/i });
      await user.click(activateButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(COURSES.ACTIVATE("123e4567-e89b-12d3-a456-426614174000"));
      });
    });

    it("opens archive modal when Archive button is clicked", async () => {
      const user = userEvent.setup();
      render(<CourseDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Course Details")).toBeInTheDocument();
      });

      // Switch to details tab to see danger zone
      const detailsTab = screen.getByRole("button", { name: /course details/i });
      await user.click(detailsTab);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /archive course/i })).toBeInTheDocument();
      });

      const archiveButton = screen.getByRole("button", { name: /archive course/i });
      await user.click(archiveButton);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /archive course/i })).toBeInTheDocument();
        expect(screen.getByText(/Are you sure you want to archive/)).toBeInTheDocument();
      });
    });

    it("archives course when confirmed", async () => {
      api.post.mockResolvedValue({ data: { status: "ARCHIVED" } });

      const user = userEvent.setup();
      render(<CourseDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Course Details")).toBeInTheDocument();
      });

      const detailsTab = screen.getByRole("button", { name: /course details/i });
      await user.click(detailsTab);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /archive course/i })).toBeInTheDocument();
      });

      const archiveButton = screen.getByRole("button", { name: /archive course/i });
      await user.click(archiveButton);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /yes, archive course/i })).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole("button", { name: /yes, archive course/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(COURSES.ARCHIVE("123e4567-e89b-12d3-a456-426614174000"));
      });
    });

    it("opens delete modal when Delete Course button is clicked", async () => {
      const user = userEvent.setup();
      render(<CourseDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Course Details")).toBeInTheDocument();
      });

      const detailsTab = screen.getByRole("button", { name: /course details/i });
      await user.click(detailsTab);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /delete course/i })).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole("button", { name: /delete course/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /delete course/i })).toBeInTheDocument();
        expect(screen.getByText(/Are you sure you want to permanently delete/)).toBeInTheDocument();
      });
    });

    it("deletes course when confirmed", async () => {
      api.delete.mockResolvedValue({});

      const user = userEvent.setup();
      render(<CourseDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Course Details")).toBeInTheDocument();
      });

      const detailsTab = screen.getByRole("button", { name: /course details/i });
      await user.click(detailsTab);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /delete course/i })).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole("button", { name: /delete course/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /yes, delete course/i })).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole("button", { name: /yes, delete course/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(api.delete).toHaveBeenCalledWith(COURSES.DELETE("123e4567-e89b-12d3-a456-426614174000"));
      });

      // Should navigate after deletion
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
      }, { timeout: 2000 });
    });

    it("toggles join code when Enable/Disable button is clicked", async () => {
      api.post.mockResolvedValue({ data: { join_code_enabled: false } });

      const user = userEvent.setup();
      render(<CourseDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Join Code")).toBeInTheDocument();
      });

      const toggleButton = screen.getByRole("button", { name: /disable join code/i });
      await user.click(toggleButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(COURSES.DISABLE_JOIN_CODE("123e4567-e89b-12d3-a456-426614174000"));
      });
    });

    it("rotates join code when rotate button is clicked", async () => {
      api.post.mockResolvedValue({ data: { join_code: "NEWCODE123" } });

      const user = userEvent.setup();
      render(<CourseDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("ABC12345")).toBeInTheDocument();
      });

      const rotateButton = screen.getByLabelText(/rotate code/i);
      await user.click(rotateButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(COURSES.ROTATE_JOIN_CODE("123e4567-e89b-12d3-a456-426614174000"));
      });
    });
  });

  describe("Danger Zone", () => {
    it("shows danger zone only on details tab", async () => {
      const user = userEvent.setup();
      render(<CourseDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Course Details")).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText("Danger Zone")).toBeInTheDocument();
      });

      // Switch to members tab
      const membersTab = screen.getByRole("button", { name: /members/i });
      await user.click(membersTab);

      await waitFor(() => {
        // Danger zone should not be visible on members tab
        expect(screen.queryByText("Danger Zone")).not.toBeInTheDocument();
      });
    });

    it("hides danger zone for students", async () => {
      const studentProfile = { ...mockOwner, id: "student-uuid-123" };
      api.get.mockImplementation((url: string) => {
        if (url === AUTH.PROFILE) {
          return Promise.resolve({ data: studentProfile });
        }
        if (url === COURSES.LIST) {
          return Promise.resolve({ data: [mockCourse] });
        }
        if (url === COURSES.DETAIL("123e4567-e89b-12d3-a456-426614174000")) {
          return Promise.resolve({ data: mockCourse });
        }
        if (url === COURSES.MEMBERS("123e4567-e89b-12d3-a456-426614174000")) {
          return Promise.resolve({ data: mockMembers });
        }
        return Promise.reject(new Error(`Unexpected API call: ${url}`));
      });

      render(<CourseDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Course Details")).toBeInTheDocument();
      });

      expect(screen.queryByText("Danger Zone")).not.toBeInTheDocument();
    });
  });

  describe("Loading States", () => {
    it("shows skeleton loaders while loading", async () => {
      api.get.mockImplementation((url: string) => {
        if (url === AUTH.PROFILE) {
          return Promise.resolve({ data: mockOwner });
        }
        if (url === COURSES.LIST) {
          return new Promise(resolve => setTimeout(() => resolve({ data: [mockCourse] }), 100));
        }
        return Promise.reject(new Error(`Unexpected API call: ${url}`));
      });

      render(<CourseDetailPage />);

      // Should show loading state initially
      const skeletons = document.querySelectorAll(".skeleton-shimmer");
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });
});

