import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { privateApi } from "../api/axios";
import { AUTH, COURSES } from "../api/endpoints";
import DashboardPage from "../features/Dashboard/DashboardPage";

vi.mock("../api/axios", () => ({
  privateApi: {
    get: vi.fn(),
  },
}));

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/courses/create" element={<div>Create Course Page</div>} />
        <Route path="/join-course" element={<div>Join Course Page</div>} />
        <Route path="/courses/:courseId" element={<div>Course Detail Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
  });

  it("renders real course list, instructor quick action, and feedback CTA", async () => {
    (privateApi.get as Mock).mockImplementation((url: string) => {
      if (url === AUTH.PROFILE) {
        return Promise.resolve({ data: { first_name: "Casey", role: "instructor" } });
      }
      if (url === COURSES.LIST) {
        return Promise.resolve({
          data: [{ id: "course-1", slug: "bio-101", title: "BIO 101", status: "ACTIVE" }],
        });
      }
      return Promise.resolve({ data: [] });
    });

    const user = userEvent.setup();
    renderDashboard();

    expect(await screen.findByText(/Welcome, Casey/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create Course/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /BIO 101/i })).toBeInTheDocument();

    const feedbackLink = screen.getByRole("link", { name: /Share Feedback/i });
    expect(feedbackLink).toHaveAttribute("href", "https://forms.gle/SnDByxCY3zveU9cj7");

    await user.click(screen.getByRole("button", { name: /BIO 101/i }));
    await waitFor(() =>
      expect(screen.getByText("Course Detail Page")).toBeInTheDocument(),
    );
  });

  it("shows student quick action", async () => {
    (privateApi.get as Mock).mockImplementation((url: string) => {
      if (url === AUTH.PROFILE) {
        return Promise.resolve({ data: { first_name: "Alex", role: "student" } });
      }
      if (url === COURSES.LIST) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });

    renderDashboard();
    expect(await screen.findByText(/Welcome, Alex/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Join Course/i })).toBeInTheDocument();
  });

  it("renders tester checklist and supports hide/show toggle when enabled", async () => {
    vi.stubEnv("VITE_TESTER_ONBOARDING_ENABLED", "true");
    (privateApi.get as Mock).mockImplementation((url: string) => {
      if (url === AUTH.PROFILE) {
        return Promise.resolve({ data: { first_name: "Casey", role: "instructor" } });
      }
      if (url === COURSES.LIST) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });

    const user = userEvent.setup();
    const view = renderDashboard();

    expect(await screen.findByText(/Tester Checklist/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Required flow: create or open one course and publish one quiz\./i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Optional flow: archive one course and verify it appears under Archived Courses\./i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open Feedback Form/i })).toHaveAttribute(
      "href",
      "https://forms.gle/SnDByxCY3zveU9cj7",
    );

    const toggleButton = screen.getByRole("button", { name: /Toggle tester checklist/i });
    expect(toggleButton).toHaveAttribute("aria-expanded", "true");

    await user.click(toggleButton);
    expect(toggleButton).toHaveAttribute("aria-expanded", "false");
    await waitFor(() =>
      expect(
        screen.queryByText(/Required flow: create or open one course and publish one quiz\./i),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("link", { name: /Open Feedback Form/i }),
    ).not.toBeInTheDocument();

    await user.click(toggleButton);
    expect(toggleButton).toHaveAttribute("aria-expanded", "true");
    expect(await screen.findByText(/Required flow: create or open one course and publish one quiz\./i)).toBeInTheDocument();

    view.unmount();
  });

  it("shows student-specific required and optional tester flows", async () => {
    vi.stubEnv("VITE_TESTER_ONBOARDING_ENABLED", "true");
    (privateApi.get as Mock).mockImplementation((url: string) => {
      if (url === AUTH.PROFILE) {
        return Promise.resolve({ data: { first_name: "Alex", role: "student" } });
      }
      if (url === COURSES.LIST) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });

    renderDashboard();

    expect(await screen.findByText(/Tester Checklist/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Required flow: join one course and submit one quiz attempt\./i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Optional flow: revisit a completed quiz result and verify grading details\./i),
    ).toBeInTheDocument();
  });
});
