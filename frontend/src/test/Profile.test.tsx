import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the API module used by the component
vi.mock("../api/axios", () => ({
  publicApi: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

// SUT
import { publicApi } from "../api/axios";
import Profile from "../features/Dashboard/Profile.tsx";

const api = vi.mocked(publicApi, true);

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
  });

  it("loads and displays fetched profile", async () => {
    api.get.mockResolvedValueOnce({ data: initial });
    renderProfile();

    expect(screen.getByText(/loading/i)).toBeInTheDocument();

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
    expect(screen.queryByText("BoB")).not.toBeInTheDocument();
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

    // deferred promise for PUT
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
});
