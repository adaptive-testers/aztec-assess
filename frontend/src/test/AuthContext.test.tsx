import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AUTH } from "../api/endpoints";
import { AuthProvider, useAuth } from "../context/AuthContext";

const { mockNavigate, mockPost, mockMsalInstance } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockPost: vi.fn(),
  mockMsalInstance: {
    getAllAccounts: vi.fn(),
    setActiveAccount: vi.fn(),
    clearCache: vi.fn(),
  },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@azure/msal-react", () => ({
  useMsal: () => ({ instance: mockMsalInstance }),
}));

vi.mock("../api/axios", () => ({
  publicApi: {
    post: mockPost,
  },
}));

function Harness() {
  const { accessToken, setAccessToken, logout } = useAuth();

  return (
    <div>
      <p data-testid="token">{accessToken ?? "none"}</p>
      <button type="button" onClick={() => setAccessToken("manual-token")}>
        Set Token
      </button>
      <button type="button" onClick={logout}>
        Logout
      </button>
    </div>
  );
}

describe("AuthProvider logout behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMsalInstance.getAllAccounts.mockReturnValue([{}]);
    mockPost.mockImplementation((url: string) => {
      if (url === AUTH.TOKEN_REFRESH) {
        return Promise.resolve({ data: { tokens: { access: null } } });
      }
      if (url === AUTH.LOGOUT) {
        return Promise.resolve({ data: {} });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it("clears token immediately and navigates to landing on logout", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AuthProvider>
          <Harness />
        </AuthProvider>
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: /set token/i }));
    expect(screen.getByTestId("token")).toHaveTextContent("manual-token");

    await user.click(screen.getByRole("button", { name: /logout/i }));

    expect(screen.getByTestId("token")).toHaveTextContent("none");
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });

    await waitFor(() => {
      expect(
        mockPost.mock.calls.some((call) => call[0] === AUTH.LOGOUT)
      ).toBe(true);
    });

    expect(mockMsalInstance.setActiveAccount).toHaveBeenCalledWith(null);
    expect(mockMsalInstance.clearCache).toHaveBeenCalled();
  });
});
