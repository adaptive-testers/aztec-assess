import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import "@testing-library/jest-dom";

// Mock the API module used by the component
vi.mock("../api/axios", () => ({
  privateApi: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

// SUT
import { privateApi } from "../api/axios";
import { AUTH, COURSES } from "../api/endpoints";
import Sidebar from "../components/Sidebar/Sidebar";
import { useAuth } from "../context/AuthContext";
import { CourseRoleProvider, useCourseRole } from "../context/CourseRoleContext";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(() => ({
    logout: vi.fn(),
    accessToken: "mock-token",
    checkingRefresh: false,
  })),
}));

const mockLogout = vi.fn();
const authState: {
  logout: () => void;
  accessToken: string | null;
  checkingRefresh: boolean;
} = {
  logout: mockLogout,
  accessToken: "mock-token",
  checkingRefresh: false,
};

function RoleProbe({ courseId }: { courseId: string }) {
  const role = useCourseRole(courseId);
  return <div data-testid={`role-${courseId}`}>{role ?? "none"}</div>;
}

describe("Sidebar", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    (privateApi.get as Mock).mockResolvedValue({ data: [] });

    (useAuth as unknown as Mock).mockImplementation(() => ({
      ...authState,
    }));
    authState.accessToken = "mock-token";
    authState.checkingRefresh = false;
  });

  function setup(initialPath = "/") {
    const user = userEvent.setup();
    const utils = render(
      <MemoryRouter initialEntries={[initialPath]}>
        <CourseRoleProvider>
          <Sidebar />
        </CourseRoleProvider>
      </MemoryRouter>
    );
    return { user, ...utils };
  }

  it("renders the brand and top-level nav items", async () => {
    setup();

    await screen.findByText("Aztec Assess");

    expect(screen.getByRole("link", { name: /profile/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /courses/i })).toBeInTheDocument();
  });

  it("highlights the active link based on the current route", async () => {
    setup("/dashboard");

    await screen.findByText("Aztec Assess");

    const dashboardLink = screen.getByRole("link", { name: /dashboard/i });
    expect(dashboardLink.className).toContain("bg-[#F87171]");
  });

  it("toggles the Courses submenu open/closed when clicked (expanded state)", async () => {
    const { user, container } = setup();

    const coursesLink = await screen.findByRole("link", { name: /courses/i });

    // In the current Sidebar implementation, the submenu starts OPEN
    expect(coursesLink).toHaveAttribute("aria-expanded", "true");
    const menu = container.querySelector("#courses-menu") as HTMLElement;
    expect(menu.className).toContain("grid-rows-[1fr]");

    // Click once -> should CLOSE
    await user.click(coursesLink);
    expect(coursesLink).toHaveAttribute("aria-expanded", "false");
    expect(menu.className).toContain("grid-rows-[0fr]");
  });

  it("collapse button shrinks the sidebar and hides text labels", async () => {
    const { user, container } = setup();

    await screen.findByRole("link", { name: /dashboard/i });

    const [collapseBtn] = screen.getAllByRole("button");
    await user.click(collapseBtn);

    // when collapsed, text labels are not rendered
    expect(screen.queryByText(/dashboard/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/profile/i)).not.toBeInTheDocument();

    // root wrapper should now be narrow
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("w-[78px]");
  });

  it("opens Courses submenu when clicked while collapsed", async () => {
    const { user, container } = setup();

    await screen.findByRole("link", { name: /courses/i });

    // collapse first
    const [collapseBtn] = screen.getAllByRole("button");
    await user.click(collapseBtn);

    // find the Courses link by its aria-controls attribute
    const coursesLink = container.querySelector(
      'a[aria-controls="courses-menu"]'
    ) as HTMLAnchorElement;
    expect(coursesLink).toBeTruthy();
    expect(coursesLink).toHaveAttribute("aria-expanded", "false");

    // click while collapsed -> should expand sidebar AND open submenu
    await user.click(coursesLink);
    expect(coursesLink).toHaveAttribute("aria-expanded", "true");

    const sidebarRoot = container.firstElementChild as HTMLElement;
    // In your current Sidebar, expanded width uses w-[210px] + responsive classes
    expect(sidebarRoot.className).toContain("w-[210px]");
  });

  it("calls logout from AuthContext when Logout is clicked", async () => {
    const { user } = setup();

    await screen.findByText("Aztec Assess");

    const logoutButton = screen.getByLabelText(/logout/i);
    await user.click(logoutButton);
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it("fetches courses from API and renders them in the Courses dropdown", async () => {
    const courses = [
      { id: 1, title: "Mathematics 101", slug: "mathematics-101" },
      { id: 2, title: "Physics 202", slug: "physics-202" },
    ];

    // Mock profile API to return instructor role (so "Create Course" shows)
    (privateApi.get as Mock)
      .mockResolvedValueOnce({ data: { role: "instructor" } }) // Profile call
      .mockResolvedValueOnce({ data: courses }); // Courses call

    const { user } = setup();

    const coursesLink = await screen.findByRole("link", { name: /courses/i });
    await user.click(coursesLink);

    // Wait for courses to load
    await screen.findByText("Mathematics 101");

    // static "Create Course" + the fetched items
    expect(screen.getByText(/create course/i)).toBeInTheDocument();
    expect(screen.getByText("Mathematics 101")).toBeInTheDocument();
    expect(screen.getByText("Physics 202")).toBeInTheDocument();

    // verify link hrefs generated by NavLink
    expect(
      screen.getByRole("link", { name: "Mathematics 101" })
    ).toHaveAttribute("href", "/courses/mathematics-101");
    expect(screen.getByRole("link", { name: "Physics 202" })).toHaveAttribute(
      "href",
      "/courses/physics-202"
    );

    expect(privateApi.get).toHaveBeenCalled();
  });

  it("falls back to ID-based course links when slug is missing", async () => {
    const courses = [
      { id: 1, title: "Mathematics 101" },
      { id: 2, title: "Physics 202" },
    ];

    (privateApi.get as Mock)
      .mockResolvedValueOnce({ data: { role: "instructor" } })
      .mockResolvedValueOnce({ data: courses });

    const { user } = setup();

    const coursesLink = await screen.findByRole("link", { name: /courses/i });
    await user.click(coursesLink);

    await screen.findByText("Mathematics 101");

    expect(
      screen.getByRole("link", { name: "Mathematics 101" })
    ).toHaveAttribute("href", "/courses/1");
    expect(screen.getByRole("link", { name: "Physics 202" })).toHaveAttribute(
      "href",
      "/courses/2"
    );
  });

  it("shows Join Course for students", async () => {
    (privateApi.get as Mock)
      .mockResolvedValueOnce({ data: { role: "student" } })
      .mockResolvedValueOnce({ data: [] });

    const { user } = setup();

    const coursesLink = await screen.findByRole("link", { name: /courses/i });
    await user.click(coursesLink);

    expect(screen.getByText(/join course/i)).toBeInTheDocument();
    expect(screen.queryByText(/create course/i)).not.toBeInTheDocument();
  });

  it("shows Create Course for instructors", async () => {
    (privateApi.get as Mock)
      .mockResolvedValueOnce({ data: { role: "instructor" } })
      .mockResolvedValueOnce({ data: [] });

    const { user } = setup();

    const coursesLink = await screen.findByRole("link", { name: /courses/i });
    await user.click(coursesLink);

    expect(screen.getByText(/create course/i)).toBeInTheDocument();
    expect(screen.queryByText(/join course/i)).not.toBeInTheDocument();
  });

  it("clears cached course roles when auth token is removed", async () => {
    (privateApi.get as Mock).mockImplementation((url: string) => {
      if (url === AUTH.PROFILE) return Promise.resolve({ data: { role: "instructor" } });
      if (url === COURSES.LIST) {
        return Promise.resolve({
          data: [{ id: "course-1", title: "Course 1", slug: "course-1", user_role: "OWNER" }],
        });
      }
      if (url === `${COURSES.LIST}?status=ARCHIVED`) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });

    const { rerender } = render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <CourseRoleProvider>
          <Sidebar />
          <RoleProbe courseId="course-1" />
        </CourseRoleProvider>
      </MemoryRouter>
    );

    await screen.findByText("Aztec Assess");
    await screen.findByTestId("role-course-1");
    expect(screen.getByTestId("role-course-1")).toHaveTextContent("OWNER");

    authState.accessToken = null;
    rerender(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <CourseRoleProvider>
          <Sidebar />
          <RoleProbe courseId="course-1" />
        </CourseRoleProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("role-course-1")).toHaveTextContent("none");
    });
  });

  it("replaces course-role cache after course refresh events", async () => {
    const byUrl: Record<string, unknown[]> = {
      [AUTH.PROFILE]: [{ role: "instructor" }],
      [COURSES.LIST]: [
        [{ id: "course-1", title: "Course 1", slug: "course-1", user_role: "OWNER" }],
        [{ id: "course-2", title: "Course 2", slug: "course-2", user_role: "INSTRUCTOR" }],
      ],
      [`${COURSES.LIST}?status=ARCHIVED`]: [[], []],
    };

    (privateApi.get as Mock).mockImplementation((url: string) => {
      const queue = byUrl[url] ?? [];
      const data = queue.length > 0 ? queue.shift() : [];
      return Promise.resolve({ data });
    });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <CourseRoleProvider>
          <Sidebar />
          <RoleProbe courseId="course-1" />
          <RoleProbe courseId="course-2" />
        </CourseRoleProvider>
      </MemoryRouter>
    );

    await screen.findByText("Aztec Assess");
    await waitFor(() => {
      expect(screen.getByTestId("role-course-1")).toHaveTextContent("OWNER");
    });
    expect(screen.getByTestId("role-course-2")).toHaveTextContent("none");

    window.dispatchEvent(new CustomEvent("courseDeleted"));

    await waitFor(() => {
      expect(screen.getByTestId("role-course-1")).toHaveTextContent("none");
      expect(screen.getByTestId("role-course-2")).toHaveTextContent("INSTRUCTOR");
    });
  });
});
