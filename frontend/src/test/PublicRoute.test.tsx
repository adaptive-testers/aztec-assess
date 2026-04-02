import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import PublicRoute from "../components/PublicRoute";
import { useAuth } from "../context/AuthContext";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

function renderPublicRoute(authState: { accessToken: string | null; checkingRefresh: boolean }) {
  (useAuth as unknown as Mock).mockReturnValue(authState);

  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <div>Landing Page</div>
            </PublicRoute>
          }
        />
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("PublicRoute", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders public content for unauthenticated users", () => {
    renderPublicRoute({ accessToken: null, checkingRefresh: false });
    expect(screen.getByText("Landing Page")).toBeInTheDocument();
  });

  it("redirects authenticated users to dashboard", () => {
    renderPublicRoute({ accessToken: "mock-token", checkingRefresh: false });
    expect(screen.getByText("Dashboard Page")).toBeInTheDocument();
    expect(screen.queryByText("Landing Page")).not.toBeInTheDocument();
  });

  it("renders auth-check shell while refresh check is pending", () => {
    renderPublicRoute({ accessToken: null, checkingRefresh: true });
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByText("Landing Page")).not.toBeInTheDocument();
  });
});
