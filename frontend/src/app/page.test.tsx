import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/page";

vi.mock("@/components/KanbanBoard", () => ({
  KanbanBoard: ({ username }: { username: string }) => (
    <>
      <h1>Kanban Studio</h1>
      <p data-testid="board-username">{username}</p>
    </>
  ),
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

  it("allows teacher credentials and supports logout", async () => {
    render(<Home />);
    await signIn("teacher", "password");

    expect(screen.getByRole("heading", { name: /kanban studio/i })).toBeInTheDocument();
    expect(screen.getByText(/signed in as teacher/i)).toBeInTheDocument();
    expect(screen.getByTestId("board-username")).toHaveTextContent("teacher");
    expect(screen.getByRole("button", { name: /log out/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /log out/i }));
    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
  });

  it("allows student credentials", async () => {
    render(<Home />);
    await signIn("student1", "password");

    expect(screen.getByRole("heading", { name: /kanban studio/i })).toBeInTheDocument();
    expect(screen.getByText(/signed in as student1/i)).toBeInTheDocument();
    expect(screen.getByTestId("board-username")).toHaveTextContent("student1");
  });

  it("restores authenticated state from session", () => {
    window.sessionStorage.setItem("pm-authenticated", "true");
    window.sessionStorage.setItem("pm-authenticated-username", "student2");
    render(<Home />);

    expect(screen.getByRole("heading", { name: /kanban studio/i })).toBeInTheDocument();
    expect(screen.getByText(/signed in as student2/i)).toBeInTheDocument();
    expect(screen.getByTestId("board-username")).toHaveTextContent("student2");
  });
});
