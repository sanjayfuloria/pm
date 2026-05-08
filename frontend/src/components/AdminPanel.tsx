"use client";

import { FormEvent, useEffect, useState } from "react";
import { createStudent, deleteStudent, listStudents, type Student } from "@/lib/adminApi";

type AdminPanelProps = {
  token: string;
  onViewBoard: (studentUsername: string) => void;
};

export const AdminPanel = ({ token, onViewBoard }: AdminPanelProps) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("changeme");
  const [creating, setCreating] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const refreshStudents = async () => {
    try {
      const list = await listStudents(token);
      setStudents(list);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshStudents();
  }, [token]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const username = newUsername.trim().toLowerCase();
    if (!username) return;
    setCreating(true);
    setError(null);
    try {
      await createStudent(token, username, newPassword || "changeme");
      setNewUsername("");
      setNewPassword("changeme");
      await refreshStudents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create student");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (username: string) => {
    setError(null);
    try {
      await deleteStudent(token, username);
      await refreshStudents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete student");
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] px-6 pt-6">
      <div className="rounded-2xl border border-[var(--stroke)] bg-white p-6 shadow-[var(--shadow)]">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-[var(--navy-dark)]">
            Student Management
          </h2>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-full border border-[var(--stroke)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--gray-text)] transition hover:border-[var(--primary-blue)]"
          >
            {collapsed ? "Expand" : "Collapse"}
          </button>
        </div>

        {!collapsed && (
          <div className="mt-4">
            <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
              <label className="block text-sm font-semibold text-[var(--navy-dark)]">
                Username
                <input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="mt-1 block w-48 rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--primary-blue)]"
                  required
                />
              </label>
              <label className="block text-sm font-semibold text-[var(--navy-dark)]">
                Password
                <input
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 block w-48 rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--primary-blue)]"
                />
              </label>
              <button
                type="submit"
                disabled={creating}
                className="rounded-full bg-[var(--secondary-purple)] px-5 py-2 text-sm font-semibold uppercase tracking-wide text-white transition hover:brightness-110 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Add student"}
              </button>
            </form>

            {error && (
              <p role="alert" className="mt-3 text-sm font-medium text-red-600">
                {error}
              </p>
            )}

            {loading ? (
              <p className="mt-4 text-sm text-[var(--gray-text)]">Loading students...</p>
            ) : students.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--gray-text)]">No students yet. Create one above.</p>
            ) : (
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--stroke)] text-left text-xs font-semibold uppercase tracking-[0.15em] text-[var(--gray-text)]">
                    <th className="pb-2">Username</th>
                    <th className="pb-2">Created</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-b border-[var(--stroke)]">
                      <td className="py-3 font-semibold text-[var(--navy-dark)]">{student.username}</td>
                      <td className="py-3 text-[var(--gray-text)]">
                        {new Date(student.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onViewBoard(student.username)}
                          className="mr-2 rounded-full border border-[var(--stroke)] px-3 py-1 text-xs font-semibold text-[var(--primary-blue)] transition hover:border-[var(--primary-blue)]"
                        >
                          View board
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(student.username)}
                          className="rounded-full border border-[var(--stroke)] px-3 py-1 text-xs font-semibold text-red-500 transition hover:border-red-400"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
