import { sendAIPrompt } from "@/lib/aiApi";

describe("sendAIPrompt", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns parsed response on success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          model: "claude-sonnet-4-5-20250929",
          output_text: "4",
          applied_actions: [],
          board_state_version: 1,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const response = await sendAIPrompt("2+2?");

    expect(response.output_text).toBe("4");
    expect(response.model).toBe("claude-sonnet-4-5-20250929");
    expect(response.applied_actions).toEqual([]);
  });

  it("throws endpoint detail when request fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ detail: "ANTHROPIC_API_KEY is not configured." }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(sendAIPrompt("hello")).rejects.toThrow(
      "ANTHROPIC_API_KEY is not configured."
    );
  });
});
