import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeAll, describe, expect, it, vi } from "vitest";

import App from "../App";

vi.mock("../api/useAuthInterceptors", () => ({
  useAuthInterceptors: vi.fn(),
}));

vi.mock("../components/PublicRoute", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("../components/ProtectedRoute", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("../features/LogIn/LogInPage", () => ({
  default: () => <div>Mock Log In Page</div>,
}));

beforeAll(() => {
  class MockIntersectionObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    takeRecords() {
      return [];
    }
  }

  Object.defineProperty(globalThis, "IntersectionObserver", {
    writable: true,
    configurable: true,
    value: MockIntersectionObserver,
  });
});

describe("App routing", () => {
  it("renders landing page on root path", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /assessments made\s*clear/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /built for real assessment workflows/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /how it works/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^for students$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^for instructors$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /ready to simplify assessments/i })).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: /aztec assess logo/i })).toHaveLength(2);
    expect(screen.getAllByTestId("landing-feature-card")).toHaveLength(4);
    expect(screen.getAllByTestId("landing-how-step")).toHaveLength(3);
    expect(screen.queryByText(/join tester list/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /create account/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /^log in$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Features" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "How It Works" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "For Students" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "For Instructors" }).length).toBeGreaterThan(0);
    expect(container.querySelectorAll('[data-shape-family="hexagon"]').length).toBeGreaterThan(1);
    expect(container.querySelectorAll('[data-shape-family="triangle"]').length).toBeGreaterThan(1);
    expect(container.querySelectorAll('[data-shape-family="rounded-square"]').length).toBeGreaterThan(1);
    expect(container.querySelector('[data-shape-family="circle"]')).toBeNull();
    expect(container.querySelector('[data-shape-family="diamond"]')).toBeNull();
    expect(container.querySelector('[data-shape-family="plus"]')).toBeNull();
    expect(container.querySelector('[data-shape-family="rings"]')).toBeNull();
    expect(screen.getAllByRole("link", { name: /^privacy$/i }).some((node) => node.getAttribute("href") === "/legal/privacy")).toBe(true);
    expect(screen.getAllByRole("link", { name: /^terms$/i }).some((node) => node.getAttribute("href") === "/legal/terms")).toBe(true);
    expect(screen.getByRole("link", { name: /cookies/i })).toHaveAttribute("href", "/legal/cookies");
    expect(screen.getAllByRole("link", { name: /^privacy$/i })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: /^terms$/i })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: /^cookies$/i })).toHaveLength(1);

    const mailtoLinks = screen
      .getAllByRole("link")
      .filter((node) => node.getAttribute("href")?.startsWith("mailto:"));
    expect(mailtoLinks).toHaveLength(0);
  }, 15000);

  it("renders login route on /login", () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText("Mock Log In Page")).toBeInTheDocument();
  });

  it("renders custom 404 page for unknown routes", () => {
    render(
      <MemoryRouter initialEntries={["/does-not-exist"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText("ERROR 404")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go home/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /^log in$/i })).toHaveAttribute("href", "/login");
  });

  it("renders privacy legal page", () => {
    render(
      <MemoryRouter initialEntries={["/legal/privacy"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /privacy policy/i })).toBeInTheDocument();
    expect(screen.getByText(/effective date: march 27, 2026/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /information we collect/i })).toBeInTheDocument();
    expect(screen.getAllByText(/legal@aztecassess\.app/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/contact@aztecassess\.app/i)).not.toBeInTheDocument();
  });

  it("renders terms legal page", () => {
    render(
      <MemoryRouter initialEntries={["/legal/terms"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /terms and conditions/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /intellectual property/i })).toBeInTheDocument();
    expect(screen.getAllByText(/legal@aztecassess\.app/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/contact@aztecassess\.app/i)).not.toBeInTheDocument();
  });

  it("renders cookies legal page", () => {
    render(
      <MemoryRouter initialEntries={["/legal/cookies"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /cookie policy/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /cookie categories we use/i })).toBeInTheDocument();
    expect(screen.getAllByText(/legal@aztecassess\.app/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/contact@aztecassess\.app/i)).not.toBeInTheDocument();
  });
});
