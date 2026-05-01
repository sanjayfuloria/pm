import type { BoardData } from "@/lib/kanban";

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
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const detail = await parseError(response);
    throw new Error(`Request failed (${response.status}): ${detail}`);
  }

  return (await response.json()) as T;
};

export const getBoard = async (username: string): Promise<BoardApiResponse> => {
  return request<BoardApiResponse>("/api/board", {
    method: "GET",
    headers: {
      "x-username": username,
    },
  });
};

export const updateBoard = async (
  username: string,
  state: BoardData
): Promise<BoardApiResponse> => {
  return request<BoardApiResponse>("/api/board", {
    method: "PUT",
    headers: {
      "x-username": username,
    },
    body: JSON.stringify({ state }),
  });
};
