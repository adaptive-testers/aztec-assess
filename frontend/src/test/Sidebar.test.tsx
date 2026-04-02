import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("../api/axios", () => ({
  privateApi: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

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
    const { container } = setup();

    await screen.findByText("Aztec Assess");
    expect(screen.getByAltText(/aztec assess logo/i)).toBeInTheDocument();
    expect(container.querySelector("aside > div")?.className).toContain("justify-between");

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

    expect(coursesLink).toHaveAttribute("aria-expanded", "true");
    const menu = container.querySelector("#courses-menu") as HTMLElement;
    expect(menu.className).toContain("grid-rows-[1fr]");

    await user.click(coursesLink);
    expect(coursesLink).toHaveAttribute("aria-expanded", "false");
    expect(menu.className).toContain("grid-rows-[0fr]");
  });

  it("collapse button shrinks the sidebar and hides text labels", async () => {
    const { user, container } = setup();

    await screen.findByRole("link", { name: /dashboard/i });

    const [collapseBtn] = screen.getAllByRole("button");
    await user.click(collapseBtn);

    const dashLabel = screen.queryByText(/dashboard/i);
    const profileLabel = screen.queryByText(/profile/i);
    const settingsLabel = screen.queryByText(/settings/i);
    if (dashLabel) expect(dashLabel.className).toContain("opacity-0");
    if (profileLabel) expect(profileLabel.className).toContain("opacity-0");
    if (settingsLabel) expect(settingsLabel.className).toContain("opacity-0");

    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("w-[78px]");
    expect(screen.queryByAltText(/aztec assess logo/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Aztec Assess")).not.toBeInTheDocument();
    expect(collapseBtn.className).not.toContain("ml-2");
    expect(container.querySelector("aside > div")?.className).toContain("justify-center");
  });

  it("opens Courses submenu when clicked while collapsed", async () => {
    const { user, container } = setup();

    await screen.findByRole("link", { name: /courses/i });

    const [collapseBtn] = screen.getAllByRole("button");
    await user.click(collapseBtn);

    const coursesLink = container.querySelector(
      'a[aria-controls="courses-menu"]'
    ) as HTMLAnchorElement;
    expect(coursesLink).toBeTruthy();
    expect(coursesLink).toHaveAttribute("aria-expanded", "false");

    await user.click(coursesLink);
    expect(coursesLink).toHaveAttribute("aria-expanded", "true");

    const sidebarRoot = container.firstElementChild as HTMLElement;
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

    (privateApi.get as Mock)
      .mockResolvedValueOnce({ data: { role: "instructor" } })
      .mockResolvedValueOnce({ data: courses });

    const { user } = setup();

    const coursesLink = await screen.findByRole("link", { name: /courses/i });
    await user.click(coursesLink);

    await screen.findByText("Mathematics 101");

    expect(screen.getByText(/create course/i)).toBeInTheDocument();
    expect(screen.getByText("Mathematics 101")).toBeInTheDocument();
    expect(screen.getByText("Physics 202")).toBeInTheDocument();

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

    expect(screen.getByRole("link", { name: /join course/i })).toBeInTheDocument();
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

  it("shows empty-state guidance for students with no courses", async () => {
    (privateApi.get as Mock)
      .mockResolvedValueOnce({ data: { role: "student" } })
      .mockResolvedValueOnce({ data: [] });

    setup();

    await screen.findByText("You are not enrolled in any courses yet.");
    expect(screen.getByText("Use Join Course to add your first class.")).toBeInTheDocument();
  });

  it("shows empty-state guidance for instructors with no courses", async () => {
    (privateApi.get as Mock)
      .mockResolvedValueOnce({ data: { role: "instructor" } })
      .mockResolvedValueOnce({ data: [] });

    setup();

    await screen.findByText("You have not created any courses yet.");
    expect(
      screen.getByText("Create your first course to start inviting students.")
    ).toBeInTheDocument();
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
