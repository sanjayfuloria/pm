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

vi.mock("@/components/AdminPanel", () => ({
  AdminPanel: () => <div>Admin Panel</div>,
}));

vi.mock("@/components/ChangePasswordForm", () => ({
  ChangePasswordForm: () => <div>Change Password Form</div>,
}));

vi.mock("@/lib/authApi", () => ({
  login: vi.fn(),
  logout: vi.fn().mockResolvedValue(undefined),
}));

import { login as mockLogin } from "@/lib/authApi";

const signIn = async (username: string, password: string) => {
  await userEvent.type(screen.getByLabelText(/username/i), username);
  await userEvent.type(screen.getByLabelText(/password/i), password);
  await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
};

describe("Home auth gate", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("shows login before authentication", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /kanban studio/i })
    ).not.toBeInTheDocument();
  });

  it("blocks invalid credentials", async () => {
    (mockLogin as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Invalid username or password")
    );

    render(<Home />);
    await signIn("bad-user", "bad-password");

    expect(screen.getByRole("alert")).toHaveTextContent(
      /invalid username or password/i
    );
    expect(
      screen.queryByRole("heading", { name: /kanban studio/i })
    ).not.toBeInTheDocument();
  });

  it("allows valid login and supports logout", async () => {
    (mockLogin as ReturnType<typeof vi.fn>).mockResolvedValue({
      token: "test-token",
      username: "teacher",
      role: "teacher",
    });

    render(<Home />);
    await signIn("teacher", "changeme");

    expect(screen.getByRole("heading", { name: /kanban studio/i })).toBeInTheDocument();
    expect(screen.getByText(/signed in as teacher/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log out/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /log out/i }));
    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
  });

  it("allows student login", async () => {
    (mockLogin as ReturnType<typeof vi.fn>).mockResolvedValue({
      token: "student-token",
      username: "student1",
      role: "student",
    });

    render(<Home />);
    await signIn("student1", "changeme");

    expect(screen.getByRole("heading", { name: /kanban studio/i })).toBeInTheDocument();
    expect(screen.getByText(/signed in as student1/i)).toBeInTheDocument();
  });

  it("restores authenticated state from session", () => {
    window.sessionStorage.setItem("pm-auth-token", "saved-token");
    window.sessionStorage.setItem("pm-auth-username", "student2");
    window.sessionStorage.setItem("pm-auth-role", "student");
    render(<Home />);

    expect(screen.getByRole("heading", { name: /kanban studio/i })).toBeInTheDocument();
    expect(screen.getByText(/signed in as student2/i)).toBeInTheDocument();
  });
});
