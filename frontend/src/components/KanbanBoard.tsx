"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "@/components/KanbanColumn";
import { KanbanCardPreview } from "@/components/KanbanCardPreview";
import { getBoard, updateBoard } from "@/lib/boardApi";
import { createId, initialData, moveCard, type BoardData } from "@/lib/kanban";

type KanbanBoardProps = {
  enableBackend?: boolean;
  token?: string;
  username?: string;
  readOnly?: boolean;
  studentUsername?: string;
};

export const KanbanBoard = ({
  enableBackend = false,
  token = "",
  username = "user",
  readOnly = false,
  studentUsername,
}: KanbanBoardProps) => {
  const [board, setBoard] = useState<BoardData>(() => initialData);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [backendConnected, setBackendConnected] = useState(false);
  const [isLoadingBoard, setIsLoadingBoard] = useState(false);
  const [isSavingBoard, setIsSavingBoard] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const boardRef = useRef(board);
  const isPersistingRef = useRef(false);
  const queuedBoardRef = useRef<BoardData | null>(null);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  useEffect(() => {
    if (!enableBackend) {
      setBackendConnected(false);
      setErrorMessage(null);
      return;
    }

    let isCancelled = false;

    const loadBoard = async () => {
      setIsLoadingBoard(true);
      setErrorMessage(null);
      try {
        const response = await getBoard(token, studentUsername);
        if (isCancelled) {
          return;
        }
        setBoard(response.state);
        setBackendConnected(true);
      } catch {
        if (isCancelled) {
          return;
        }
        setBackendConnected(false);
        setErrorMessage("Backend unavailable. Using local board state.");
      } finally {
        if (!isCancelled) {
          setIsLoadingBoard(false);
        }
      }
    };

    void loadBoard();

    return () => {
      isCancelled = true;
    };
  }, [enableBackend, token, studentUsername]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const cardsById = useMemo(() => board.cards, [board.cards]);

  const persistBoard = async (nextBoard: BoardData) => {
    if (!enableBackend || !backendConnected || readOnly) {
      return;
    }

    queuedBoardRef.current = nextBoard;
    if (isPersistingRef.current) {
      return;
    }

    isPersistingRef.current = true;
    setIsSavingBoard(true);
    setErrorMessage(null);

    try {
      while (queuedBoardRef.current) {
        const stateToPersist = queuedBoardRef.current;
        queuedBoardRef.current = null;
        await updateBoard(token, stateToPersist);
      }
    } catch {
      setErrorMessage("Could not save board changes. Please retry.");
    } finally {
      isPersistingRef.current = false;
      setIsSavingBoard(false);
    }
  };

  const applyBoardUpdate = async (
    updater: (current: BoardData) => BoardData
  ) => {
    const currentBoard = boardRef.current;
    const nextBoard = updater(currentBoard);

    // Optimistic updates keep drag and edits responsive while persistence runs in the background.
    setBoard(nextBoard);

    if (!enableBackend || !backendConnected) {
      return;
    }

    await persistBoard(nextBoard);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCardId(null);

    if (!over || active.id === over.id) {
      return;
    }

    void applyBoardUpdate((prev) => ({
      ...prev,
      columns: moveCard(prev.columns, active.id as string, over.id as string),
    }));
  };

  const handleRenameColumn = (columnId: string, title: string) => {
    void applyBoardUpdate((prev) => ({
      ...prev,
      columns: prev.columns.map((column) =>
        column.id === columnId ? { ...column, title } : column
      ),
    }));
  };

  const handleAddCard = (columnId: string, title: string, details: string) => {
    const id = createId("card");
    void applyBoardUpdate((prev) => ({
      ...prev,
      cards: {
        ...prev.cards,
        [id]: { id, title, details: details || "No details yet." },
      },
      columns: prev.columns.map((column) =>
        column.id === columnId
          ? { ...column, cardIds: [...column.cardIds, id] }
          : column
      ),
    }));
  };

  const handleDeleteCard = (columnId: string, cardId: string) => {
    void applyBoardUpdate((prev) => {
      return {
        ...prev,
        cards: Object.fromEntries(
          Object.entries(prev.cards).filter(([id]) => id !== cardId)
        ),
        columns: prev.columns.map((column) =>
          column.id === columnId
            ? {
                ...column,
                cardIds: column.cardIds.filter((id) => id !== cardId),
              }
            : column
        ),
      };
    });
  };

  const activeCard = activeCardId ? cardsById[activeCardId] : null;

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute left-0 top-0 h-[420px] w-[420px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(32,157,215,0.25)_0%,_rgba(32,157,215,0.05)_55%,_transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[520px] w-[520px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(117,57,145,0.18)_0%,_rgba(117,57,145,0.05)_55%,_transparent_75%)]" />

      <main className="relative mx-auto flex min-h-screen max-w-[1500px] flex-col gap-10 px-6 pb-16 pt-12">
        <header className="flex flex-col gap-6 rounded-[32px] border border-[var(--stroke)] bg-white/80 p-8 shadow-[var(--shadow)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
                Single Board Kanban
              </p>
              <h1 className="mt-3 font-display text-4xl font-semibold text-[var(--navy-dark)]">
                Kanban Studio
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--gray-text)]">
                Keep momentum visible. Rename columns, drag cards between stages,
                and capture quick notes without getting buried in settings.
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--gray-text)]">
                Focus
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--primary-blue)]">
                One board. Five columns. Zero clutter.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {board.columns.map((column) => (
              <div
                key={column.id}
                className="flex items-center gap-2 rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--navy-dark)]"
              >
                <span className="h-2 w-2 rounded-full bg-[var(--accent-yellow)]" />
                {column.title}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--gray-text)]">
            {isLoadingBoard ? <span>Loading board...</span> : null}
            {isSavingBoard ? <span>Saving changes...</span> : null}
            {enableBackend && !isLoadingBoard && !isSavingBoard ? (
              <span>{backendConnected ? "Backend sync active" : "Local mode"}</span>
            ) : null}
            {errorMessage ? (
              <span role="alert" className="text-red-600 normal-case tracking-normal">
                {errorMessage}
              </span>
            ) : null}
          </div>
        </header>

        <DndContext
          sensors={readOnly ? [] : sensors}
          collisionDetection={closestCorners}
          onDragStart={readOnly ? undefined : handleDragStart}
          onDragEnd={readOnly ? undefined : handleDragEnd}
        >
          <section className="grid gap-6 lg:grid-cols-5">
            {board.columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                cards={column.cardIds.map((cardId) => board.cards[cardId])}
                onRename={readOnly ? undefined : handleRenameColumn}
                onAddCard={readOnly ? undefined : handleAddCard}
                onDeleteCard={readOnly ? undefined : handleDeleteCard}
              />
            ))}
          </section>
          <DragOverlay>
            {activeCard ? (
              <div className="w-[260px]">
                <KanbanCardPreview card={activeCard} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>
    </div>
  );
};
