import { getBoard, updateBoard } from "@/lib/boardApi";

const mockBoardResponse = {
  id: "board-1",
  username: "user",
  title: "Kanban Studio",
  state: { columns: [], cards: {} },
  state_version: 1,
  updated_at: new Date().toISOString(),
};

describe("boardApi", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("gets board data", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockBoardResponse), { status: 200 })
    );

    const result = await getBoard("user");

    expect(fetch).toHaveBeenCalledWith(
      "/api/board",
      expect.objectContaining({ method: "GET" })
    );
    expect(result.id).toBe("board-1");
  });

  it("updates board data", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ...mockBoardResponse, state_version: 2 }), {
        status: 200,
      })
    );

    const nextState = { columns: [{ id: "col-a", title: "A", cardIds: [] }], cards: {} };
    const result = await updateBoard("user", nextState);

    expect(fetch).toHaveBeenCalledWith(
      "/api/board",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          "content-type": "application/json",
        }),
      })
    );
    expect(result.state_version).toBe(2);
  });

  it("throws on non-2xx responses", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ detail: "No board" }), { status: 404 })
    );

    await expect(getBoard("user")).rejects.toThrow("Request failed (404)");
  });
});
