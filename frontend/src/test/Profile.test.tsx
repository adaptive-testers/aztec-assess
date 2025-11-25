import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Mock } from "vitest";

// Mock the API module used by the component
vi.mock("../api/axios", () => ({
  privateApi: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

// Mock AuthContext
vi.mock("../context/AuthContext", () => {
  return {
    useAuth: vi.fn(() => ({
      accessToken: "test-token",
      setAccessToken: vi.fn(),
      logout: vi.fn(),
    })),
  };
});

// SUT (import AFTER mocks)
import { privateApi } from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Profile from "../features/Profile/ProfilePage.tsx";

const api = vi.mocked(privateApi, true);

const PROFILE = {
  first_name: "James",
  last_name: "Duong",
  id: "828225756",
  email: "instructor@gmail.com",
};

const PROFILE_UPDATED = {
  ...PROFILE,
  first_name: "Bob",
  last_name: "Smith",
};

function renderProfile() {
  return render(<Profile />);
}

describe("Profile", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // default auth: token present, so component fetches profile
    (useAuth as unknown as Mock).mockReturnValue({
      accessToken: "test-token",
      setAccessToken: vi.fn(),
      logout: vi.fn(),
    });
  });

  it("loads and displays fetched profile", async () => {
    api.get.mockResolvedValueOnce({ data: PROFILE });
    renderProfile();

    // Whether it's a text loader or skeleton, we only care that the profile
    // eventually renders the fetched data.
    await waitFor(() => {
      expect(screen.getByText("James")).toBeInTheDocument();
      expect(screen.getByText("Duong")).toBeInTheDocument();
      expect(screen.getByText("instructor@gmail.com")).toBeInTheDocument();
    });
  });

  it("enter edit, change then cancel -> reverts to baseline (initial fetch)", async () => {
    api.get.mockResolvedValueOnce({ data: PROFILE });
    renderProfile();
    await waitFor(() => screen.getByText("James"));

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /edit/i }));

    const inputs = screen.getAllByRole("textbox"); // [firstName, lastName]
    await user.clear(inputs[0]);
    await user.type(inputs[0], "Bob");

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.getByText("James")).toBeInTheDocument();
    expect(screen.queryByText("Bob")).not.toBeInTheDocument();
  });

  it("validation: cannot save blank names; error messages show", async () => {
    api.get.mockResolvedValueOnce({ data: PROFILE });
    renderProfile();
    await waitFor(() => screen.getByText("James"));

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /edit/i }));

    const [firstNameInput, lastNameInput] = screen.getAllByRole("textbox");
    await user.clear(firstNameInput);
    await user.clear(lastNameInput);

    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(
      await screen.findByText(/first name is required\./i)
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/last name is required\./i)
    ).toBeInTheDocument();
  });

  it("save updates baseline; later cancel reverts to the NEW saved values", async () => {
    api.get.mockResolvedValueOnce({ data: PROFILE });
    api.patch.mockResolvedValueOnce({ data: PROFILE });

    renderProfile();
    await waitFor(() => screen.getByText("James"));

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /edit/i }));

    const [firstNameInput] = screen.getAllByRole("textbox");
    await user.clear(firstNameInput);
    await user.type(firstNameInput, "James");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(screen.getByText("James")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /edit/i }));
    const [firstNameInput2] = screen.getAllByRole("textbox");
    await user.clear(firstNameInput2);
    await user.type(firstNameInput2, "Bob");
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.getByText("James")).toBeInTheDocument();
    expect(screen.queryByText("Bob")).not.toBeInTheDocument();
  });

  it('shows "Saving..." while PATCH in progress and disables the button', async () => {
    api.get.mockResolvedValueOnce({ data: PROFILE });

    // deferred PATCH promise
    let resolvePatch!: (val: { data: typeof PROFILE_UPDATED }) => void;
    const patchPromise = new Promise<{ data: typeof PROFILE_UPDATED }>(
      (res) => (resolvePatch = res)
    );
    api.patch.mockReturnValueOnce(patchPromise);

    renderProfile();
    await waitFor(() => screen.getByText("James"));

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /edit/i }));

    const saveBtn = screen.getByRole("button", { name: /^save$/i });
    expect(saveBtn).toBeEnabled();

    await user.click(saveBtn);

    // while saving
    const savingBtn = screen.getByRole("button", { name: /saving/i });
    expect(savingBtn).toBeDisabled();

    // finish PATCH
    resolvePatch({ data: PROFILE_UPDATED });
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /saving/i })
      ).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
    });
  });

  it("Cancel clears validation errors", async () => {
    api.get.mockResolvedValueOnce({ data: PROFILE });
    renderProfile();
    await waitFor(() => screen.getByText("James"));

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /edit/i }));

    const [firstNameInput, lastNameInput] = screen.getAllByRole("textbox");
    await user.clear(firstNameInput);
    await user.clear(lastNameInput);

    await user.click(screen.getByRole("button", { name: /^save$/i }));
    expect(
      await screen.findByText(/first name is required/i)
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(
      screen.queryByText(/first name is required/i)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/last name is required/i)
    ).not.toBeInTheDocument();
  });

  it("renders avatar initials from fetched names", async () => {
    api.get.mockResolvedValueOnce({ data: PROFILE });
    renderProfile();

    await waitFor(() =>
      expect(screen.getByText("instructor@gmail.com")).toBeInTheDocument()
    );

    expect(screen.getByText(/^JD$/)).toBeInTheDocument();
  });

  it("renders single initial when last name is missing", async () => {
    api.get.mockResolvedValueOnce({ data: { ...PROFILE, last_name: "" } });
    renderProfile();

    await waitFor(() =>
      expect(screen.getByText("instructor@gmail.com")).toBeInTheDocument()
    );

    expect(screen.getByText(/^J$/)).toBeInTheDocument();
  });

  it("gates on session: does not call API when no token", async () => {
    (useAuth as unknown as Mock).mockReturnValue({
      accessToken: null,
      setAccessToken: vi.fn(),
      logout: vi.fn(),
    });

    renderProfile();

    // The component may show a loader or skeleton, but it MUST NOT hit the API
    expect(api.get).not.toHaveBeenCalled();
  });

  it("GET 401 -> clears access token", async () => {
    const setToken = vi.fn();
    (useAuth as unknown as Mock).mockReturnValue({
      accessToken: "test-token",
      setAccessToken: setToken,
      logout: vi.fn(),
    });

    api.get.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 401 },
    });

    renderProfile();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(1);
    });

    // Regardless of the exact UI, the important behavior is token clear
    expect(setToken).toHaveBeenCalledWith(null);
  });

  it("PATCH 401 on save -> clears access token", async () => {
    const setToken = vi.fn();
    (useAuth as unknown as Mock).mockReturnValue({
      accessToken: "test-token",
      setAccessToken: setToken,
      logout: vi.fn(),
    });

    api.get.mockResolvedValueOnce({ data: PROFILE });
    api.patch.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 401 },
    });

    renderProfile();
    await waitFor(() => screen.getByText("James"));

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /edit/i }));

    // fill with valid values so it attempts PATCH
    const [firstNameInput, lastNameInput] = screen.getAllByRole("textbox");
    await user.clear(firstNameInput);
    await user.type(firstNameInput, "James");
    await user.clear(lastNameInput);
    await user.type(lastNameInput, "Duong");

    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledTimes(1);
    });
    expect(setToken).toHaveBeenCalledWith(null);
  });

  it("GET non-401 error -> does not clear token", async () => {
    const setToken = vi.fn();
    (useAuth as unknown as Mock).mockReturnValue({
      accessToken: "test-token",
      setAccessToken: setToken,
      logout: vi.fn(),
    });

    api.get.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500 },
    });

    renderProfile();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(1);
    });

    // For non-401 errors, token should NOT be cleared
    expect(setToken).not.toHaveBeenCalled();
  });

  it("PATCH non-401 error -> does not clear token", async () => {
    const setToken = vi.fn();
    (useAuth as unknown as Mock).mockReturnValue({
      accessToken: "test-token",
      setAccessToken: setToken,
      logout: vi.fn(),
    });

    api.get.mockResolvedValueOnce({ data: PROFILE });
    api.patch.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500 },
    });

    renderProfile();
    await waitFor(() => screen.getByText("James"));

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /edit/i }));

    const [firstNameInput, lastNameInput] = screen.getAllByRole("textbox");
    await user.clear(firstNameInput);
    await user.type(firstNameInput, "James");
    await user.clear(lastNameInput);
    await user.type(lastNameInput, "Duong");

    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledTimes(1);
    });

    // Non-401 -> token should remain unchanged
    expect(setToken).not.toHaveBeenCalled();
  });
});
