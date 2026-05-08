import type { BoardData } from "@/lib/kanban";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

const apiUrl = (path: string): string => `${API_BASE_URL}${path}`;

export type BoardApiResponse = {
  id: string;
  username: string;
  title: string;
  state: BoardData;
  state_version: number;
  updated_at: string;
};

const parseError = async (response: Response) => {
  try {
    const payload = await response.json();
    return payload.detail || response.statusText;
  } catch {
    return response.statusText;
  }
};

const request = async <T>(input: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const detail = await parseError(response);
    throw new Error(`Request failed (${response.status}): ${detail}`);
  }

  return (await response.json()) as T;
};

export const getBoard = async (
  token: string,
  studentUsername?: string
): Promise<BoardApiResponse> => {
  const url = studentUsername
    ? apiUrl(`/api/board?student=${encodeURIComponent(studentUsername)}`)
    : apiUrl("/api/board");
  return request<BoardApiResponse>(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export const updateBoard = async (
  token: string,
  state: BoardData
): Promise<BoardApiResponse> => {
  return request<BoardApiResponse>(apiUrl("/api/board"), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ state }),
  });
};
