"use client";

import { FormEvent, useMemo, useState } from "react";
import { sendAIPrompt } from "@/lib/aiApi";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type AIChatSidebarProps = {
  username: string;
  onBoardMutated: () => void;
};

const createMessageId = () =>
  `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const AIChatSidebar = ({ username, onBoardMutated }: AIChatSidebarProps) => {
  const [prompt, setPrompt] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: createMessageId(),
      role: "assistant",
      content: "Ask me something simple to verify AI connectivity.",
    },
  ]);

  const canSend = useMemo(() => prompt.trim().length > 0 && !isSending, [prompt, isSending]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || isSending) {
      return;
    }

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: "user",
      content: cleanPrompt,
    };

    setMessages((prev) => [...prev, userMessage]);
    setPrompt("");
    setError(null);
    setIsSending(true);

    try {
      const response = await sendAIPrompt(cleanPrompt);
      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          role: "assistant",
          content: response.output_text,
        },
      ]);
      if (response.applied_actions.length > 0) {
        onBoardMutated();
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to reach AI service."
      );
    } finally {
      setIsSending(false);
    }
  };

  if (isCollapsed) {
    return (
      <button
        type="button"
        onClick={() => setIsCollapsed(false)}
        className="fixed bottom-5 right-5 z-40 rounded-full border border-[var(--stroke)] bg-white/95 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--navy-dark)] shadow-[var(--shadow)] backdrop-blur transition hover:border-[var(--primary-blue)] sm:bottom-6 sm:right-6"
        aria-label="Open AI chat"
      >
        AI Chat
      </button>
    );
  }

  return (
    <aside
      className="fixed bottom-5 right-5 z-40 flex h-[min(56vh,520px)] w-[min(330px,calc(100vw-1.5rem))] flex-col rounded-2xl border border-[var(--stroke)] bg-white/95 shadow-[var(--shadow)] backdrop-blur sm:bottom-6 sm:right-6 sm:w-[320px]"
      data-testid="ai-chat-sidebar"
      aria-label="AI chat"
    >
      <header className="border-b border-[var(--stroke)] px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">
              AI Sidebar
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold text-[var(--navy-dark)]">
              Chat
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="rounded-full border border-[var(--stroke)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--gray-text)] transition hover:border-[var(--primary-blue)] hover:text-[var(--navy-dark)]"
          >
            Minimize
          </button>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-4" data-testid="ai-chat-messages">
        {messages.map((message) => (
          <article
            key={message.id}
            className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-6 ${
              message.role === "user"
                ? "ml-auto bg-[var(--primary-blue)] text-white"
                : "mr-auto border border-[var(--stroke)] bg-[var(--surface)] text-[var(--navy-dark)]"
            }`}
          >
            {message.content}
          </article>
        ))}
      </div>

      <form onSubmit={onSubmit} className="border-t border-[var(--stroke)] p-4">
        <label className="sr-only" htmlFor="ai-chat-prompt">
          Prompt
        </label>
        <textarea
          id="ai-chat-prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={3}
          placeholder="Ask the assistant..."
          className="w-full resize-none rounded-2xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--primary-blue)]"
        />

        {error ? (
          <p role="alert" className="mt-2 text-sm font-medium text-red-600">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!canSend}
          className="mt-3 w-full rounded-full bg-[var(--secondary-purple)] px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSending ? "Sending..." : "Send"}
        </button>
      </form>
    </aside>
  );
};
