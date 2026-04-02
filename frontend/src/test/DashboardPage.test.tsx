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
});
