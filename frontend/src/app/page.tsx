"use client";

import { FormEvent, useEffect, useState } from "react";
import { AIChatSidebar } from "@/components/AIChatSidebar";
import { KanbanBoard } from "@/components/KanbanBoard";

const SESSION_KEY = "pm-authenticated";
const SESSION_USERNAME_KEY = "pm-authenticated-username";

const DEMO_CREDENTIALS: Record<string, string> = {
  teacher: "password",
  student1: "password",
  student2: "password",
};

type AuthState = "loading" | "authenticated" | "unauthenticated";

export default function Home() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [authenticatedUsername, setAuthenticatedUsername] = useState<string>("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [boardRefreshToken, setBoardRefreshToken] = useState(0);

  useEffect(() => {
    const hasSession = window.sessionStorage.getItem(SESSION_KEY) === "true";
    if (hasSession) {
      const savedUsername =
        window.sessionStorage.getItem(SESSION_USERNAME_KEY) ?? "teacher";
      setAuthenticatedUsername(savedUsername);
      setAuthState("authenticated");
      return;
    }

    setAuthState("unauthenticated");
  }, []);

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedUsername = username.trim().toLowerCase();
    const expectedPassword = DEMO_CREDENTIALS[normalizedUsername];
    const isValid = expectedPassword !== undefined && password === expectedPassword;

    if (!isValid) {
      setError("Invalid username or password.");
      return;
    }

    window.sessionStorage.setItem(SESSION_KEY, "true");
    window.sessionStorage.setItem(SESSION_USERNAME_KEY, normalizedUsername);
    setAuthenticatedUsername(normalizedUsername);
    setError("");
    setUsername("");
    setPassword("");
    setAuthState("authenticated");
  };

  const handleLogout = () => {
    window.sessionStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(SESSION_USERNAME_KEY);
    setAuthenticatedUsername("");
    setAuthState("unauthenticated");
  };

  if (authState === "loading") {
    return null;
  }

  if (authState === "unauthenticated") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-6">
        <section className="w-full rounded-3xl border border-[var(--stroke)] bg-white p-8 shadow-[var(--shadow)]">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--gray-text)]">
            Project Management MVP
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold text-[var(--navy-dark)]">
            Sign in
          </h1>
          <p className="mt-3 text-sm text-[var(--gray-text)]">
            Use the demo credentials to access your Kanban board.
          </p>
          <p className="mt-2 text-xs text-[var(--gray-text)]">
            Accounts: teacher/password, student1/password, student2/password
          </p>

          <form className="mt-8 space-y-4" onSubmit={handleLogin}>
            <label className="block text-sm font-semibold text-[var(--navy-dark)]">
              Username
              <input
                className="mt-2 w-full rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--primary-blue)]"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </label>

            <label className="block text-sm font-semibold text-[var(--navy-dark)]">
              Password
              <input
                type="password"
                className="mt-2 w-full rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--primary-blue)]"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            {error ? (
              <p role="alert" className="text-sm font-medium text-red-600">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              className="w-full rounded-full bg-[var(--secondary-purple)] px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white transition hover:brightness-110"
            >
              Sign in
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <div>
      <div className="mx-auto flex w-full max-w-[1500px] items-center justify-end gap-3 px-6 pt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--gray-text)]">
          Signed in as {authenticatedUsername}
        </p>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-full border border-[var(--stroke)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--navy-dark)] transition hover:border-[var(--primary-blue)]"
        >
          Log out
        </button>
      </div>
      <KanbanBoard
        key={boardRefreshToken}
        enableBackend
        username={authenticatedUsername}
      />
      <AIChatSidebar
        username={authenticatedUsername}
        onBoardMutated={() => setBoardRefreshToken((token) => token + 1)}
      />
    </div>
  );
}
