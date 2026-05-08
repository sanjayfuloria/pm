const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

const apiUrl = (path: string): string => `${API_BASE_URL}${path}`;

export type LoginResponse = {
  token: string;
  username: string;
  role: string;
};

export const login = async (
  username: string,
  password: string
): Promise<LoginResponse> => {
  const response = await fetch(apiUrl("/api/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? "Login failed");
  }
  return (await response.json()) as LoginResponse;
};

export const logout = async (token: string): Promise<void> => {
  await fetch(apiUrl("/api/auth/logout"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
};

export const changePassword = async (
  token: string,
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  const response = await fetch(apiUrl("/api/auth/change-password"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? "Password change failed");
  }
};
