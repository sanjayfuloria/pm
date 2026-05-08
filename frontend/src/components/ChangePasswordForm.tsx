"use client";

import { FormEvent, useState } from "react";
import { changePassword } from "@/lib/authApi";

type ChangePasswordFormProps = {
  token: string;
  onClose: () => void;
};

export const ChangePasswordForm = ({ token, onClose }: ChangePasswordFormProps) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 1) {
      setError("New password cannot be empty.");
      return;
    }

    setSubmitting(true);
    try {
      await changePassword(token, currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[var(--stroke)] bg-white p-8 shadow-[var(--shadow)]">
        <h2 className="font-display text-xl font-semibold text-[var(--navy-dark)]">
          Change password
        </h2>

        {success ? (
          <div className="mt-4">
            <p className="text-sm text-green-700">Password changed successfully.</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 rounded-full bg-[var(--secondary-purple)] px-5 py-2 text-sm font-semibold uppercase tracking-wide text-white transition hover:brightness-110"
            >
              Close
            </button>
          </div>
        ) : (
          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-semibold text-[var(--navy-dark)]">
              Current password
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--primary-blue)]"
                required
              />
            </label>
            <label className="block text-sm font-semibold text-[var(--navy-dark)]">
              New password
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--primary-blue)]"
                required
              />
            </label>
            <label className="block text-sm font-semibold text-[var(--navy-dark)]">
              Confirm new password
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--primary-blue)]"
                required
              />
            </label>

            {error && (
              <p role="alert" className="text-sm font-medium text-red-600">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-[var(--secondary-purple)] px-5 py-2 text-sm font-semibold uppercase tracking-wide text-white transition hover:brightness-110 disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-[var(--stroke)] px-5 py-2 text-sm font-semibold uppercase tracking-wide text-[var(--navy-dark)] transition hover:border-[var(--primary-blue)]"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
