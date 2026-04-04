import { screen, waitFor } from "@testing-library/react";
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

// Member record matching mockOwner — needed so userCourseRole resolves to "OWNER"
const mockOwnerMember = {
  id: "membership-1",
  user_id: mockOwner.id,
  user_email: mockOwner.email,
  first_name: mockOwner.first_name,
  last_name: mockOwner.last_name,
  role: "OWNER" as const,
};



describe("CourseDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Use UUID directly to avoid async slug-resolution setState issues
    mockParams.courseId = "123e4567-e89b-12d3-a456-426614174000";
    
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
        // Return the owner as a member so userCourseRole resolves to "OWNER"
        return Promise.resolve({
          data: [{
            id: "membership-1",
            user_id: mockOwner.id,
            user_email: mockOwner.email,
            first_name: mockOwner.first_name,
            last_name: mockOwner.last_name,
            role: "OWNER",
          }]
        });
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
    it("shows 'Course Info' title for owners", async () => {
      render(<CourseDetailPage />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Course Info" })).toBeInTheDocument();
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
          return Promise.resolve({ data: [] });
        }
        return Promise.reject(new Error(`Unexpected API call: ${url}`));
      });

      render(<CourseDetailPage />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Course Info" })).toBeInTheDocument();
      });
    });

    it("shows 'Course Info' title for archived courses", async () => {
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
          return Promise.resolve({ data: [] });
        }
        return Promise.reject(new Error(`Unexpected API call: ${url}`));
      });

      render(<CourseDetailPage />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Course Info" })).toBeInTheDocument();
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
          return Promise.resolve({ data: [] });
        }
        return Promise.reject(new Error(`Unexpected API call: ${url}`));
      });

      render(<CourseDetailPage />);

      await waitFor(() => {
        // For students, the save-actions-bar container should stay hidden (has pointer-events-none class)
        expect(screen.getByTestId("save-actions-bar")).toHaveClass("pointer-events-none");
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
          return Promise.resolve({ data: [] });
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
    it("hides Save Changes bar when no changes made", async () => {
      render(<CourseDetailPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("Test Course")).toBeInTheDocument();
      });

      // The bar should be hidden (no changes yet)
      expect(screen.getByTestId("save-actions-bar")).toHaveClass("opacity-0");
    });

    it("shows Save Changes bar when title is changed", async () => {
      const user = userEvent.setup();
      render(<CourseDetailPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("Test Course")).toBeInTheDocument();
      });

      const titleInput = screen.getByDisplayValue("Test Course");
      await user.clear(titleInput);
      await user.type(titleInput, "Updated Course Title");

      // The bar should become visible
      expect(screen.getByTestId("save-actions-bar")).toHaveClass("opacity-100");
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
          return Promise.resolve({ data: [] });
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

  describe("Navigation", () => {
    it("navigates to Students tab when Members button is clicked", async () => {
      const user = userEvent.setup();
      render(<CourseDetailPage />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Course Info" })).toBeInTheDocument();
      });

      const studentsButton = screen.getByRole("button", { name: /^members$/i });
      await user.click(studentsButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/courses/123e4567-e89b-12d3-a456-426614174000/students");
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
          return Promise.resolve({ data: [mockOwnerMember] });
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
        expect(screen.getByRole("heading", { name: "Course Info" })).toBeInTheDocument();
      });

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
        expect(screen.getByRole("heading", { name: "Course Info" })).toBeInTheDocument();
      });

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
        expect(screen.getByRole("heading", { name: "Course Info" })).toBeInTheDocument();
      });

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
        expect(screen.getByRole("heading", { name: "Course Info" })).toBeInTheDocument();
      });

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

      // Find the toggle button - findByRole handles the async role resolution
      const toggleButton = await screen.findByRole("button", { name: /Join Code/i });
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
          return Promise.resolve({ data: [] });
        }
        return Promise.reject(new Error(`Unexpected API call: ${url}`));
      });

      render(<CourseDetailPage />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Course Info" })).toBeInTheDocument();
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
        if (url === COURSES.DETAIL("123e4567-e89b-12d3-a456-426614174000")) {
          return Promise.resolve({ data: mockCourse });
        }
        if (url === COURSES.MEMBERS("123e4567-e89b-12d3-a456-426614174000")) {
          return Promise.resolve({ data: [] });
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

