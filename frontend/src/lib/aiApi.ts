export type AIChatResponse = {
  model: string;
  output_text: string;
  applied_actions: string[];
  board_state_version: number;
};

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

export const sendAIPrompt = async (prompt: string): Promise<AIChatResponse> => {
  const response = await fetch("/api/ai/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as AIChatResponse;
};
