import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

// Mocks

// Mock Google OAuth
let mockOAuthConfig: { onSuccess?: (data: { code: string }) => void; onError?: () => void } | null = null;
const mockGoogleLogin = vi.fn();

vi.mock("@react-oauth/google", () => ({
  useGoogleLogin: vi.fn((config) => {
    mockOAuthConfig = config;
    return mockGoogleLogin;
  }),
  GoogleOAuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock the API module used by the component
const postMock = vi.fn();
vi.mock("../api/axios", () => ({
  publicApi: { post: (...args: unknown[]) => postMock(...args) },
}));

const mockLoginPopup = vi.fn();
vi.mock("@azure/msal-react", () => ({
  useMsal: () => ({
    instance: { loginPopup: mockLoginPopup },
    accounts: [],
    inProgress: 0,
  }),
}));

// Capture setAccessToken calls from AuthContext
const setAccessTokenMock = vi.fn();
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ setAccessToken: setAccessTokenMock, checkingRefresh: false }),
}));

// Provide a stable useNavigate mock
const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

// SUT
import LogInContainer from "../features/LogIn/LogInPage";

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("LogInContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOAuthConfig = null;
  });

  it("renders the basics: heading, inputs, main button", () => {
    renderWithRouter(<LogInContainer />);

    expect(
      screen.getByRole("heading", { name: /log in/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
  });

  it("toggles password visibility via the eye button", async () => {
    renderWithRouter(<LogInContainer />);

    const pwd = screen.getByLabelText(/password/i, {
      selector: "input",
    }) as HTMLInputElement;
    expect(pwd.type).toBe("password");

    const passwordForm = pwd.closest("form")!;
    const toggle = within(passwordForm).getByRole("button", {
      name: /show (?:characters|password)/i,
    });

    await userEvent.click(toggle);

    // After click, the button's accessible name becomes "Hide password"
    expect(
      within(passwordForm).getByRole("button", { name: /hide password/i })
    ).toBeInTheDocument();

    // The input type flips to text (visibly showing the password)
    expect(
      screen.getByLabelText(/password/i, {
        selector: "input",
      }) as HTMLInputElement
    ).toHaveProperty("type", "text");
  });

  it("validates email format when submitting the email field form", async () => {
    renderWithRouter(<LogInContainer />);

    const email = screen.getByLabelText(/email/i);
    // Enter an invalid email
    await userEvent.type(email, "not-an-email");

    // Submit the email input's form (email lives inside its own <form/>)
    const emailForm = email.closest("form")!;
    fireEvent.submit(emailForm);

    expect(
      await screen.findByText(/enter a valid email address/i)
    ).toBeInTheDocument();
  });

  it("requires password to be filled", async () => {
    renderWithRouter(<LogInContainer />);

    const email = screen.getByLabelText(/email/i);
    const pwd = screen.getByLabelText(/password/i);

    // Fill email but leave password empty
    await userEvent.type(email, "user@example.com");
    fireEvent.submit(pwd.closest("form")!);

    // Should show "Password is required" error
    expect(
      await screen.findByText(/password is required/i)
    ).toBeInTheDocument();
  });

  it("submits successfully (pressing Enter on the password form), shows loading, sets token, and navigates", async () => {
    renderWithRouter(<LogInContainer />);

    const email = screen.getByLabelText(/email/i);
    const pwd = screen.getByLabelText(/password/i);

    await userEvent.type(email, "user@example.com");
    await userEvent.type(pwd, "Passw0rd!");

    // Make post "slow" so we can observe the loading state
    postMock.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () => resolve({ data: { tokens: { access: "test-token" } } }),
            50
          )
        )
    );

    const passwordForm = pwd.closest("form")!;
    fireEvent.submit(passwordForm);

    // While submitting, the big button should show "Logging in..."
    expect(await screen.findByText(/logging in\.\.\./i)).toBeInTheDocument();

    await waitFor(() => {
      expect(setAccessTokenMock).toHaveBeenCalledWith("test-token");
      expect(navigateMock).toHaveBeenCalledWith("/profile");
    });
  });

  it('toggling "Keep me signed in" flips the visual state (class); consider adding aria-pressed for accessibility', async () => {
    renderWithRouter(<LogInContainer />);

    // The small square is a <button> with a class that flips bg color when active
    const square = screen
      .getAllByRole("button")
      .find((b) =>
        b.className.includes("w-[14px] h-[14px]")
      ) as HTMLButtonElement;

    expect(square.className).not.toContain("bg-[#EF6262]");
    await userEvent.click(square);
    expect(square.className).toContain("bg-[#EF6262]");
    await userEvent.click(square);
    expect(square.className).not.toContain("bg-[#EF6262]");
  });

  it("handles API error by setting a root error (note: currently not rendered)", async () => {
    renderWithRouter(<LogInContainer />);

    const email = screen.getByLabelText(/email/i);
    const pwd = screen.getByLabelText(/password/i);

    await userEvent.type(email, "user@example.com");
    await userEvent.type(pwd, "Passw0rd!");

    // Reject with an axios-like error shape
    postMock.mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { message: "Invalid email or password" } },
    });

    fireEvent.submit(pwd.closest("form")!);

    await waitFor(() => {
      expect(navigateMock).not.toHaveBeenCalled();
    });
  });

  // OAuth Tests
  describe("Google OAuth Login", () => {

    it("calls Google login when Google button is clicked", async () => {
      renderWithRouter(<LogInContainer />);

      const googleButton = screen.getByLabelText("Sign in with Google");
      await userEvent.click(googleButton);

      expect(mockGoogleLogin).toHaveBeenCalled();
    });

    it("handles successful OAuth login for existing user", async () => {
      postMock.mockResolvedValueOnce({
        data: {
          email: "user@gmail.com",
          first_name: "Test",
          last_name: "User",
          role: "student",
          tokens: { access: "mock_access_token" },
        },
      });

      renderWithRouter(<LogInContainer />);

      const googleButton = screen.getByLabelText("Sign in with Google");
      await userEvent.click(googleButton);

      // Trigger the OAuth success callback
      if (mockOAuthConfig?.onSuccess) {
        await mockOAuthConfig.onSuccess({ code: "mock_oauth_code" });
      }

      await waitFor(() => {
        expect(postMock).toHaveBeenCalledWith(
          expect.stringContaining("/auth/oauth/google/"),
          { code: "mock_oauth_code" }
        );
        expect(setAccessTokenMock).toHaveBeenCalledWith("mock_access_token");
        expect(navigateMock).toHaveBeenCalledWith("/profile");
      });
    });

    it("handles OAuth login when user doesn't exist (shows helpful error)", async () => {
      postMock.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 400,
          data: { detail: "Role is required for new user registration." },
        },
      });

      renderWithRouter(<LogInContainer />);

      const googleButton = screen.getByLabelText("Sign in with Google");
      await userEvent.click(googleButton);

      // Trigger the OAuth success callback
      if (mockOAuthConfig?.onSuccess) {
        await mockOAuthConfig.onSuccess({ code: "mock_oauth_code" });
      }

      await waitFor(() => {
        expect(screen.getByText(/Account not found. Please create an account first./i)).toBeInTheDocument();
      });
    });

    it("handles OAuth error", async () => {
      renderWithRouter(<LogInContainer />);

      const googleButton = screen.getByLabelText("Sign in with Google");
      await userEvent.click(googleButton);

      // Trigger the OAuth error callback
      if (mockOAuthConfig?.onError) {
        mockOAuthConfig.onError();
      }

      await waitFor(() => {
        expect(screen.getByText(/Sign-in was cancelled/i)).toBeInTheDocument();
      });
    });

    it("handles OAuth API error with friendly message", async () => {
      postMock.mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 401, data: { detail: "Failed to authenticate with Google." } },
      });

      renderWithRouter(<LogInContainer />);
      const googleButton = screen.getByLabelText("Sign in with Google");
      await userEvent.click(googleButton);

      // Trigger the OAuth success callback (which will then fail on API call)
      if (mockOAuthConfig?.onSuccess) {
        await mockOAuthConfig.onSuccess({ code: "mock_oauth_code" });
      }

      await waitFor(() => {
        expect(screen.getByText(/Sign-in failed. Please try again./i)).toBeInTheDocument();
      });
    });
  });

  describe("Microsoft OAuth Login", () => {
    it("calls loginPopup when Microsoft button is clicked", async () => {
      mockLoginPopup.mockResolvedValueOnce({ accessToken: "mock_ms_token" });
      postMock.mockResolvedValueOnce({ data: { tokens: { access: "mock_access_token" } } });

      renderWithRouter(<LogInContainer />);
      const microsoftButton = screen.getByLabelText("Sign in with Microsoft");
      await userEvent.click(microsoftButton);

      expect(mockLoginPopup).toHaveBeenCalledWith(
        expect.objectContaining({
          scopes: ["openid", "profile", "email", "User.Read"],
          overrideInteractionInProgress: true,
        })
      );
    });

    it("handles successful Microsoft OAuth login", async () => {
      mockLoginPopup.mockResolvedValueOnce({ accessToken: "mock_ms_token" });
      postMock.mockResolvedValueOnce({ data: { tokens: { access: "mock_access_token" } } });

      renderWithRouter(<LogInContainer />);
      const microsoftButton = screen.getByLabelText("Sign in with Microsoft");
      await userEvent.click(microsoftButton);

      await waitFor(() => {
        expect(postMock).toHaveBeenCalledWith(
          expect.stringContaining("/auth/oauth/microsoft/"),
          { access_token: "mock_ms_token" }
        );
        expect(setAccessTokenMock).toHaveBeenCalledWith("mock_access_token");
        expect(navigateMock).toHaveBeenCalledWith("/profile");
      });
    });

    it("handles Microsoft account not found (shows friendly message)", async () => {
      mockLoginPopup.mockResolvedValueOnce({ accessToken: "mock_ms_token" });
      postMock.mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 400, data: { detail: "Role is required for new user registration." } },
      });

      renderWithRouter(<LogInContainer />);
      const microsoftButton = screen.getByLabelText("Sign in with Microsoft");
      await userEvent.click(microsoftButton);

      await waitFor(() => {
        expect(screen.getByText(/Account not found. Please create an account first./i)).toBeInTheDocument();
      });
    });

    it("does not show error when user cancels Microsoft popup", async () => {
      mockLoginPopup.mockRejectedValueOnce(
        Object.assign(new Error("User cancelled"), { errorCode: "user_cancelled", name: "BrowserAuthError" })
      );

      renderWithRouter(<LogInContainer />);
      const microsoftButton = screen.getByLabelText("Sign in with Microsoft");
      await userEvent.click(microsoftButton);

      await waitFor(() => {
        expect(mockLoginPopup).toHaveBeenCalled();
      });
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("handles Microsoft API error with friendly message", async () => {
      mockLoginPopup.mockResolvedValueOnce({ accessToken: "mock_ms_token" });
      postMock.mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 401, data: { detail: "Invalid token." } },
      });

      renderWithRouter(<LogInContainer />);
      const microsoftButton = screen.getByLabelText("Sign in with Microsoft");
      await userEvent.click(microsoftButton);

      await waitFor(() => {
        expect(screen.getByText(/Sign-in failed. Please try again./i)).toBeInTheDocument();
      });
    });
  });
});
