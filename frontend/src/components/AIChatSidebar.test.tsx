import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AIChatSidebar } from "@/components/AIChatSidebar";
import { sendAIPrompt } from "@/lib/aiApi";

vi.mock("@/lib/aiApi", () => ({
  sendAIPrompt: vi.fn(),
}));

const sendAIPromptMock = vi.mocked(sendAIPrompt);

describe("AIChatSidebar", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders initial message and supports collapse/expand", async () => {
    render(<AIChatSidebar token="test-token" username="user" onBoardMutated={vi.fn()} />);

    expect(screen.getByText(/ask me something simple to verify ai connectivity/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /minimize/i }));
    expect(screen.getByRole("button", { name: /open ai chat/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /open ai chat/i }));
    expect(screen.getByTestId("ai-chat-sidebar")).toBeInTheDocument();
  });

  it("submits prompt, renders response, and refreshes board when actions applied", async () => {
    const onBoardMutated = vi.fn();
    sendAIPromptMock.mockResolvedValue({
      model: "claude-sonnet-4-5-20250929",
      output_text: "Moved card successfully.",
      applied_actions: ["Moved 'Refine status language'"],
      board_state_version: 2,
    });

    render(<AIChatSidebar token="test-token" username="user" onBoardMutated={onBoardMutated} />);

    await userEvent.type(screen.getByLabelText(/prompt/i), "move card");
    await userEvent.click(screen.getByRole("button", { name: /^send$/i }));

    expect(sendAIPromptMock).toHaveBeenCalledWith("move card", "test-token");
    expect(await screen.findByText("Moved card successfully.")).toBeInTheDocument();
    expect(onBoardMutated).toHaveBeenCalledTimes(1);
  });

  it("does not refresh board for non-mutating responses", async () => {
    const onBoardMutated = vi.fn();
    sendAIPromptMock.mockResolvedValue({
      model: "claude-sonnet-4-5-20250929",
      output_text: "No board changes needed.",
      applied_actions: [],
      board_state_version: 1,
    });

    render(<AIChatSidebar token="test-token" username="user" onBoardMutated={onBoardMutated} />);

    await userEvent.type(screen.getByLabelText(/prompt/i), "summarize board");
    await userEvent.click(screen.getByRole("button", { name: /^send$/i }));

    expect(await screen.findByText("No board changes needed.")).toBeInTheDocument();
    expect(onBoardMutated).not.toHaveBeenCalled();
  });

  it("shows loading and error state when request fails", async () => {
    let rejectRequest: (error: Error) => void = () => {};
    sendAIPromptMock.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectRequest = reject;
        })
    );

    render(<AIChatSidebar token="test-token" username="user" onBoardMutated={vi.fn()} />);

    await userEvent.type(screen.getByLabelText(/prompt/i), "hello");
    await userEvent.click(screen.getByRole("button", { name: /^send$/i }));

    expect(screen.getByRole("button", { name: /sending/i })).toBeDisabled();

    rejectRequest(new Error("AI service unavailable."));
    expect(await screen.findByRole("alert")).toHaveTextContent("AI service unavailable.");
  });
});
