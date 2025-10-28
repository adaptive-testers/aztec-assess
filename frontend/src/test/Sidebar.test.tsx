import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom";

// SUT
import Sidebar from "../components/Sidebar/Sidebar";
import { useAuth } from "../context/AuthContext";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(() => ({
    logout: vi.fn(),
  })),
}));

const mockLogout = vi.fn();

describe("Sidebar", () => {
  beforeEach(() => {
    mockLogout.mockReset();
    (useAuth as unknown as vi.Mock).mockImplementation(() => ({
      logout: mockLogout,
    }));
  });

  function setup(initialPath = "/") {
    const user = userEvent.setup();
    const utils = render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Sidebar />
      </MemoryRouter>
    );
    return { user, ...utils };
  }

  it("renders the brand and top-level nav items", () => {
    setup();
    expect(screen.getByText("Aztec Assess")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /dashboard/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /profile/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /courses/i })).toBeInTheDocument();
  });

  it("highlights the active link based on the current route", () => {
    setup("/dashboard");
    const dashboardLink = screen.getByRole("link", { name: /dashboard/i });
    expect(dashboardLink.className).toContain("bg-[#F87171]");
  });

  it("toggles the Courses submenu open/closed when clicked (expanded state)", async () => {
    const { user, container } = setup();

    const coursesLink = screen.getByRole("link", { name: /courses/i });
    expect(coursesLink).toHaveAttribute("aria-expanded", "false");

    await user.click(coursesLink);
    expect(coursesLink).toHaveAttribute("aria-expanded", "true");

    const menu = container.querySelector("#courses-menu") as HTMLElement;
    expect(menu.className).toContain("grid-rows-[1fr]");
  });

  it("collapse button shrinks the sidebar and hides text labels", async () => {
    const { user, container } = setup();

    const [collapseBtn] = screen.getAllByRole("button");
    await user.click(collapseBtn);

    // when collapsed, text labels are not rendered
    expect(screen.queryByText(/dashboard/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/profile/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/settings/i)).not.toBeInTheDocument();

    // root wrapper should now be narrow
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("w-[78px]");
  });

  it("opens Courses submenu when clicked while collapsed", async () => {
    const { user, container } = setup();

    // collapse first
    const [collapseBtn] = screen.getAllByRole("button");
    await user.click(collapseBtn);

    // find the Courses link by its aria-controls attribute
    const coursesLink = container.querySelector(
      'a[aria-controls="courses-menu"]'
    ) as HTMLAnchorElement;
    expect(coursesLink).toBeTruthy();
    expect(coursesLink).toHaveAttribute("aria-expanded", "false");

    await user.click(coursesLink);
    expect(coursesLink).toHaveAttribute("aria-expanded", "true");

    const sidebarRoot = container.firstElementChild as HTMLElement;
    expect(sidebarRoot.className).toContain("w-[280px]");
  });

  it("calls logout from AuthContext when Logout is clicked", async () => {
    const { user } = setup();
    const logoutButton = screen.getByRole("button", { name: /logout/i });
    await user.click(logoutButton);
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
