const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

const apiUrl = (path: string): string => `${API_BASE_URL}${path}`;

export type Student = {
  id: string;
  username: string;
  created_at: string;
};

export const listStudents = async (token: string): Promise<Student[]> => {
  const response = await fetch(apiUrl("/api/admin/students"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? "Failed to list students");
  }
  return (await response.json()) as Student[];
};

export const createStudent = async (
  token: string,
  username: string,
  password: string
): Promise<Student> => {
  const response = await fetch(apiUrl("/api/admin/students"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? "Failed to create student");
  }
  return (await response.json()) as Student;
};

export const deleteStudent = async (
  token: string,
  username: string
): Promise<void> => {
  const response = await fetch(apiUrl(`/api/admin/students/${username}`), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? "Failed to delete student");
  }
};
