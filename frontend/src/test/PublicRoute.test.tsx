import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import PublicRoute from "../components/PublicRoute";
import { useAuth } from "../context/AuthContext";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

function renderPublicRoute() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <div>Public login content</div>
            </PublicRoute>
          }
        />
        <Route path="/dashboard" element={<div>Dashboard content</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("PublicRoute", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders children for unauthenticated users", () => {
    (useAuth as unknown as Mock).mockReturnValue({
      accessToken: null,
      checkingRefresh: false,
    });

    renderPublicRoute();
    expect(screen.getByText("Public login content")).toBeInTheDocument();
  });

  it("redirects authenticated users to dashboard", () => {
    (useAuth as unknown as Mock).mockReturnValue({
      accessToken: "token",
      checkingRefresh: false,
    });

    renderPublicRoute();
    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
    expect(screen.queryByText("Public login content")).not.toBeInTheDocument();
  });

  it("shows loading state while refresh check is running", () => {
    (useAuth as unknown as Mock).mockReturnValue({
      accessToken: null,
      checkingRefresh: true,
    });

    renderPublicRoute();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });
});
