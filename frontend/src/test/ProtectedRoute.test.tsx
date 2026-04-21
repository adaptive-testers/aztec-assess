import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../context/AuthContext";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

function renderWithRoute(authState: { accessToken: string | null; checkingRefresh: boolean }) {
  (useAuth as unknown as Mock).mockReturnValue(authState);

  return render(
    <MemoryRouter initialEntries={["/private"]}>
      <Routes>
        <Route path="/" element={<div>Landing Page</div>} />
        <Route
          path="/private"
          element={
            <ProtectedRoute>
              <div>Private Page</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  it("renders loading state while refresh check is pending", () => {
    renderWithRoute({ accessToken: null, checkingRefresh: true });

    expect(screen.getByText(/loading\.\.\./i)).toBeInTheDocument();
  });

  it("redirects unauthenticated users to landing page", () => {
    renderWithRoute({ accessToken: null, checkingRefresh: false });

    expect(screen.getByText("Landing Page")).toBeInTheDocument();
    expect(screen.queryByText("Private Page")).not.toBeInTheDocument();
  });

  it("renders protected content when authenticated", () => {
    renderWithRoute({ accessToken: "mock-token", checkingRefresh: false });

    expect(screen.getByText("Private Page")).toBeInTheDocument();
  });
});
