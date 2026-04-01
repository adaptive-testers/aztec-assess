import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

import PublicRoute from "../components/PublicRoute";
import { useAuth } from "../context/AuthContext";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

function renderWithAuth(authState: { accessToken: string | null; checkingRefresh: boolean }) {
  (useAuth as unknown as Mock).mockReturnValue(authState);

  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
        <Route
          path="/"
          element={
            <PublicRoute>
              <div>Landing Page</div>
            </PublicRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("PublicRoute", () => {
  it("renders auth-check shell while refresh check is pending", () => {
    renderWithAuth({ accessToken: null, checkingRefresh: true });

    expect(screen.getByTestId("public-route-auth-shell")).toBeInTheDocument();
    expect(screen.getByRole("status", { name: /checking session/i })).toBeInTheDocument();
    expect(screen.queryByText("Landing Page")).not.toBeInTheDocument();
  });

  it("redirects authenticated users to dashboard", () => {
    renderWithAuth({ accessToken: "mock-token", checkingRefresh: false });

    expect(screen.getByText("Dashboard Page")).toBeInTheDocument();
    expect(screen.queryByText("Landing Page")).not.toBeInTheDocument();
  });

  it("renders public content for unauthenticated users", () => {
    renderWithAuth({ accessToken: null, checkingRefresh: false });

    expect(screen.getByText("Landing Page")).toBeInTheDocument();
  });
});
