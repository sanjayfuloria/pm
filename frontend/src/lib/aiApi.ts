export type AIChatResponse = {
  model: string;
  output_text: string;
  applied_actions: string[];
  board_state_version: number;
};

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

const apiUrl = (path: string): string => `${API_BASE_URL}${path}`;

const parseError = async (response: Response) => {
  try {
    const payload = (await response.json()) as { detail?: string };
    if (payload.detail) {
      return payload.detail;
    }
  } catch {
    // Ignore JSON parse issues and return generic fallback.
  }

  return `AI request failed with status ${response.status}.`;
};

export const sendAIPrompt = async (
  prompt: string,
  token: string
): Promise<AIChatResponse> => {
  const response = await fetch(apiUrl("/api/ai/chat"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as AIChatResponse;
};
