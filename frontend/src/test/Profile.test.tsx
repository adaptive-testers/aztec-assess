import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Mock } from "vitest";

// Mock the API module used by the component
vi.mock("../api/axios", () => ({
  privateApi: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

// Mock AuthContext so we have a token (otherwise component shows "Loading session…")
vi.mock("../context/AuthContext", () => {
  return {
    useAuth: vi.fn(() => ({
      accessToken: "test-token",
      setAccessToken: vi.fn(),
    })),
  };
});

// SUT (import AFTER mocks)
import { privateApi } from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Profile from "../features/Profile/ProfilePage.tsx";

const api = vi.mocked(privateApi, true);

const initial = {
  firstName: "James",
  lastName: "Duong",
  id: "828225756",
  email: "instructor@gmail.com",
};

const saved = {
  firstName: "James",
  lastName: "Duong",
  id: "828225756",
  email: "instructor@gmail.com",
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
    });
  });

  it("loads and displays fetched profile", async () => {
    api.get.mockResolvedValueOnce({ data: initial });
    renderProfile();

    // Component shows "Loading profile…" while fetching
    expect(screen.getByText(/loading profile/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("James")).toBeInTheDocument();
      expect(screen.getByText("Duong")).toBeInTheDocument();
      expect(screen.getByText("instructor@gmail.com")).toBeInTheDocument();
    });
  });

  it("enter edit, change then cancel -> reverts to baseline (initial fetch)", async () => {
    api.get.mockResolvedValueOnce({ data: initial });
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
    api.get.mockResolvedValueOnce({ data: initial });
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
    api.get.mockResolvedValueOnce({ data: initial });
    api.put.mockResolvedValueOnce({ data: saved });

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

  it('shows "Saving..." while PUT in progress and disables the button', async () => {
    api.get.mockResolvedValueOnce({ data: initial });

    // deferred PUT promise
    let resolvePut!: (val: { data: typeof saved }) => void;
    const putPromise = new Promise<{ data: typeof saved }>(
      (res) => (resolvePut = res)
    );
    api.put.mockReturnValueOnce(putPromise);

    renderProfile();
    await waitFor(() => screen.getByText("James"));

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /edit/i }));

    const saveBtn = screen.getByRole("button", { name: /^save$/i });
    expect(saveBtn).toBeEnabled();

    await user.click(saveBtn);

    // while saving
    expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();

    // finish PUT
    resolvePut({ data: saved });
    await waitFor(() => {
      expect(screen.getByText("James")).toBeInTheDocument();
    });
  });

  it("Cancel clears validation errors", async () => {
    api.get.mockResolvedValueOnce({ data: initial });
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
    api.get.mockResolvedValueOnce({ data: initial });
    renderProfile();

    await waitFor(() =>
      expect(screen.getByText("instructor@gmail.com")).toBeInTheDocument()
    );

    expect(screen.getByText(/^JD$/)).toBeInTheDocument();
  });

  it("renders single initial when last name is missing", async () => {
    api.get.mockResolvedValueOnce({ data: { ...initial, lastName: "" } });
    renderProfile();

    await waitFor(() =>
      expect(screen.getByText("instructor@gmail.com")).toBeInTheDocument()
    );

    expect(screen.getByText(/^J$/)).toBeInTheDocument();
  });

  it("gates on session: shows 'Loading session…' and does not call API when no token", async () => {
    (useAuth as unknown as Mock).mockReturnValue({
      accessToken: null,
      setAccessToken: vi.fn(),
    });

    renderProfile();

    expect(screen.getByText(/loading session/i)).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });

  it("GET 401 -> shows 'Session expired' and clears access token", async () => {
    const setToken = vi.fn();
    (useAuth as unknown as Mock).mockReturnValue({
      accessToken: "test-token",
      setAccessToken: setToken,
    });

    // axios.isAxiosError check -> provide isAxiosError + response.status
    api.get.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 401 },
    });

    renderProfile();

    // component should surface the error text
    expect(
      await screen.findByText(/session expired\. please log in again\./i)
    ).toBeInTheDocument();
    expect(setToken).toHaveBeenCalledWith(null);
  });

  it("PUT 401 on save -> shows 'Session expired' and clears access token", async () => {
    const setToken = vi.fn();
    (useAuth as unknown as Mock).mockReturnValue({
      accessToken: "test-token",
      setAccessToken: setToken,
    });

    api.get.mockResolvedValueOnce({ data: initial });
    api.put.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 401 },
    });

    renderProfile();
    await waitFor(() => screen.getByText("James"));

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /edit/i }));

    // fill with valid values so it attempts PUT
    const [firstNameInput, lastNameInput] = screen.getAllByRole("textbox");
    await user.clear(firstNameInput);
    await user.type(firstNameInput, "James");
    await user.clear(lastNameInput);
    await user.type(lastNameInput, "Duong");

    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(
      await screen.findByText(/session expired\. please log in again\./i)
    ).toBeInTheDocument();
    expect(setToken).toHaveBeenCalledWith(null);
  });

  it("GET non-401 error -> shows 'Failed to load profile.'", async () => {
    api.get.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500 },
    });

    renderProfile();

    expect(
      await screen.findByText(/failed to load profile\./i)
    ).toBeInTheDocument();
  });

  it("PUT non-401 error -> shows 'Failed to save profile.'", async () => {
    api.get.mockResolvedValueOnce({ data: initial });
    api.put.mockRejectedValueOnce({
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

    expect(
      await screen.findByText(/failed to save profile\./i)
    ).toBeInTheDocument();
  });
});
