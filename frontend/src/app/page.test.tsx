import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/page";

vi.mock("@/components/KanbanBoard", () => ({
  KanbanBoard: () => <h1>Kanban Studio</h1>,
}));

vi.mock("@/components/AIChatSidebar", () => ({
  AIChatSidebar: () => <aside>AI Chat</aside>,
}));

const signIn = async (username: string, password: string) => {
  await userEvent.type(screen.getByLabelText(/username/i), username);
  await userEvent.type(screen.getByLabelText(/password/i), password);
  await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
};

describe("Home auth gate", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("shows login before authentication", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /kanban studio/i })
    ).not.toBeInTheDocument();
  });

  it("blocks invalid credentials", async () => {
    render(<Home />);
    await signIn("bad-user", "bad-password");

    expect(screen.getByRole("alert")).toHaveTextContent(
      /invalid username or password/i
    );
    expect(
      screen.queryByRole("heading", { name: /kanban studio/i })
    ).not.toBeInTheDocument();
  });

  it("allows valid credentials and supports logout", async () => {
    render(<Home />);
    await signIn("user", "password");

    expect(screen.getByRole("heading", { name: /kanban studio/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log out/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /log out/i }));
    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
  });

  it("restores authenticated state from session", () => {
    window.sessionStorage.setItem("pm-authenticated", "true");
    render(<Home />);

    expect(screen.getByRole("heading", { name: /kanban studio/i })).toBeInTheDocument();
  });
});
