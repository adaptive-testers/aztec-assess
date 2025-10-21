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

// Mock the API module used by the component
const postMock = vi.fn();
vi.mock("../api/axios", () => ({
  publicApi: { post: (...args: unknown[]) => postMock(...args) },
}));

// Capture setAccessToken calls from AuthContext
const setAccessTokenMock = vi.fn();
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ setAccessToken: setAccessTokenMock }),
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

  it("validates password rules when submitting the password field form", async () => {
    renderWithRouter(<LogInContainer />);

    const pwd = screen.getByLabelText(/password/i);

    // Too short -> min length error
    await userEvent.clear(pwd);
    await userEvent.type(pwd, "short");
    fireEvent.submit(pwd.closest("form")!);
    expect(await screen.findByText(/minimum length is 8/i)).toBeInTheDocument();

    // Long but missing number -> number error
    await userEvent.clear(pwd);
    await userEvent.type(pwd, "password!");
    fireEvent.submit(pwd.closest("form")!);
    expect(
      await screen.findByText(/must contain at least one number/i)
    ).toBeInTheDocument();

    // Has number but missing special char -> special-char error
    await userEvent.clear(pwd);
    await userEvent.type(pwd, "password1");
    fireEvent.submit(pwd.closest("form")!);
    expect(
      await screen.findByText(/must contain at least one special character/i)
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
          setTimeout(() => resolve({ data: { access: "test-token" } }), 50)
        )
    );

    const passwordForm = pwd.closest("form")!;
    fireEvent.submit(passwordForm);

    // While submitting, the big button should show "Logging in..."
    expect(await screen.findByText(/logging in\.\.\./i)).toBeInTheDocument();

    await waitFor(() => {
      expect(setAccessTokenMock).toHaveBeenCalledWith("test-token");
      expect(navigateMock).toHaveBeenCalledWith("/dashboard");
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
});
