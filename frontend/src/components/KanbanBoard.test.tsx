import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KanbanBoard } from "@/components/KanbanBoard";
import { initialData } from "@/lib/kanban";

const getFirstColumn = () => screen.getAllByTestId(/column-/i)[0];

describe("KanbanBoard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders five columns", () => {
    render(<KanbanBoard />);
    expect(screen.getAllByTestId(/column-/i)).toHaveLength(5);
  });

  it("renames a column", async () => {
    render(<KanbanBoard />);
    const column = getFirstColumn();
    const input = within(column).getByLabelText("Column title");
    await userEvent.clear(input);
    await userEvent.type(input, "New Name");
    expect(input).toHaveValue("New Name");
  });

  it("adds and removes a card", async () => {
    render(<KanbanBoard />);
    const column = getFirstColumn();
    const addButton = within(column).getByRole("button", {
      name: /add a card/i,
    });
    await userEvent.click(addButton);

    const titleInput = within(column).getByPlaceholderText(/card title/i);
    await userEvent.type(titleInput, "New card");
    const detailsInput = within(column).getByPlaceholderText(/details/i);
    await userEvent.type(detailsInput, "Notes");

    await userEvent.click(within(column).getByRole("button", { name: /add card/i }));

    expect(within(column).getByText("New card")).toBeInTheDocument();

    const deleteButton = within(column).getByRole("button", {
      name: /delete new card/i,
    });
    await userEvent.click(deleteButton);

    expect(within(column).queryByText("New card")).not.toBeInTheDocument();
  });

  it("loads board state from backend when enabled", async () => {
    const backendState = {
      ...initialData,
      columns: initialData.columns.map((column, index) =>
        index === 0 ? { ...column, title: "Backend Backlog" } : column
      ),
    };

    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "board-1",
          username: "user",
          title: "Kanban Studio",
          state: backendState,
          state_version: 1,
          updated_at: new Date().toISOString(),
        }),
        { status: 200 }
      )
    );

    render(<KanbanBoard enableBackend token="test-token" username="user" />);

    expect(await screen.findByDisplayValue("Backend Backlog")).toBeInTheDocument();
  });

  it("persists add card via backend update", async () => {
    const fetchMock = vi.spyOn(global, "fetch");
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "board-1",
            username: "user",
            title: "Kanban Studio",
            state: initialData,
            state_version: 1,
            updated_at: new Date().toISOString(),
          }),
          { status: 200 }
        )
      )
      .mockImplementationOnce(async (_url, init) => {
        const payload = JSON.parse(String(init?.body));
        return new Response(
          JSON.stringify({
            id: "board-1",
            username: "user",
            title: "Kanban Studio",
            state: payload.state,
            state_version: 2,
            updated_at: new Date().toISOString(),
          }),
          { status: 200 }
        );
      });

    render(<KanbanBoard enableBackend token="test-token" username="user" />);
    await screen.findByText(/backend sync active/i);

    const column = getFirstColumn();
    const addButton = within(column).getByRole("button", {
      name: /add a card/i,
    });
    await userEvent.click(addButton);

    await userEvent.type(within(column).getByPlaceholderText(/card title/i), "API card");
    await userEvent.type(within(column).getByPlaceholderText(/details/i), "From test");
    await userEvent.click(within(column).getByRole("button", { name: /add card/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/board",
      expect.objectContaining({ method: "PUT" })
    );
  });
});
