"use client";

import { FormEvent, useEffect, useState } from "react";
import { AIChatSidebar } from "@/components/AIChatSidebar";
import { AdminPanel } from "@/components/AdminPanel";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { KanbanBoard } from "@/components/KanbanBoard";
import { login as apiLogin, logout as apiLogout } from "@/lib/authApi";

const SESSION_TOKEN_KEY = "pm-auth-token";
const SESSION_USERNAME_KEY = "pm-auth-username";
const SESSION_ROLE_KEY = "pm-auth-role";

type AuthState = "loading" | "authenticated" | "unauthenticated";

export default function Home() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [token, setToken] = useState("");
  const [authenticatedUsername, setAuthenticatedUsername] = useState("");
  const [role, setRole] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [boardRefreshToken, setBoardRefreshToken] = useState(0);
  const [viewingStudent, setViewingStudent] = useState<string | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    const savedToken = window.sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (savedToken) {
      setToken(savedToken);
      setAuthenticatedUsername(
        window.sessionStorage.getItem(SESSION_USERNAME_KEY) ?? ""
      );
      setRole(window.sessionStorage.getItem(SESSION_ROLE_KEY) ?? "");
      setAuthState("authenticated");
      return;
    }
    setAuthState("unauthenticated");
  }, []);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoginLoading(true);
    try {
      const result = await apiLogin(
        username.trim().toLowerCase(),
        password
      );
      window.sessionStorage.setItem(SESSION_TOKEN_KEY, result.token);
      window.sessionStorage.setItem(SESSION_USERNAME_KEY, result.username);
      window.sessionStorage.setItem(SESSION_ROLE_KEY, result.role);
      setToken(result.token);
      setAuthenticatedUsername(result.username);
      setRole(result.role);
      setUsername("");
      setPassword("");
      setAuthState("authenticated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await apiLogout(token).catch(() => {});
    window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
    window.sessionStorage.removeItem(SESSION_USERNAME_KEY);
    window.sessionStorage.removeItem(SESSION_ROLE_KEY);
    setToken("");
    setAuthenticatedUsername("");
    setRole("");
    setViewingStudent(null);
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
            Enter your credentials to access your Kanban board.
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
              disabled={loginLoading}
              className="w-full rounded-full bg-[var(--secondary-purple)] px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {loginLoading ? "Signing in..." : "Sign in"}
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
          Signed in as {authenticatedUsername} ({role})
        </p>
        <button
          type="button"
          onClick={() => setShowChangePassword(true)}
          className="rounded-full border border-[var(--stroke)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--navy-dark)] transition hover:border-[var(--primary-blue)]"
        >
          Change password
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-full border border-[var(--stroke)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--navy-dark)] transition hover:border-[var(--primary-blue)]"
        >
          Log out
        </button>
      </div>

      {showChangePassword && (
        <ChangePasswordForm
          token={token}
          onClose={() => setShowChangePassword(false)}
        />
      )}

      {role === "teacher" && !viewingStudent && (
        <AdminPanel
          token={token}
          onViewBoard={(studentUsername) => setViewingStudent(studentUsername)}
        />
      )}

      {viewingStudent && (
        <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-6 pt-4">
          <button
            type="button"
            onClick={() => {
              setViewingStudent(null);
              setBoardRefreshToken((t) => t + 1);
            }}
            className="rounded-full border border-[var(--stroke)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--navy-dark)] transition hover:border-[var(--primary-blue)]"
          >
            Back to my board
          </button>
          <p className="text-sm font-semibold text-[var(--navy-dark)]">
            Viewing {viewingStudent}&apos;s board (read-only)
          </p>
        </div>
      )}

      <KanbanBoard
        key={`${viewingStudent ?? authenticatedUsername}-${boardRefreshToken}`}
        enableBackend
        token={token}
        username={viewingStudent ?? authenticatedUsername}
        readOnly={!!viewingStudent}
        studentUsername={viewingStudent ?? undefined}
      />

      {!viewingStudent && (
        <AIChatSidebar
          token={token}
          username={authenticatedUsername}
          onBoardMutated={() => setBoardRefreshToken((t) => t + 1)}
        />
      )}
    </div>
  );
}
