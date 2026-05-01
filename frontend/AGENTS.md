# Frontend codebase notes

## Scope

This directory contains a standalone Next.js frontend demo for a single-board Kanban UI. It is currently frontend-only and manages board state in memory.

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- dnd-kit for drag and drop
- Vitest + Testing Library for unit/component tests
- Playwright for e2e tests

## App structure

- src/app/layout.tsx: Root layout, font setup, global metadata.
- src/app/page.tsx: Home route that renders the Kanban board.
- src/app/globals.css: Design tokens, base styles, theme variables.

## Kanban implementation

- src/lib/kanban.ts: Shared types, seeded board data, drag-move logic, id creation helper.
- src/components/KanbanBoard.tsx: Main board state container and drag-drop orchestration.
- src/components/KanbanColumn.tsx: Column UI, rename input, droppable area, add/delete hooks.
- src/components/KanbanCard.tsx: Sortable card UI with remove action.
- src/components/KanbanCardPreview.tsx: Drag overlay preview.
- src/components/NewCardForm.tsx: Expandable add-card form.

## Current behavior

- Renders exactly five columns from seeded data.
- Supports column renaming in place.
- Supports adding and deleting cards.
- Supports drag and drop within and across columns.
- All changes are in-memory only and reset on reload.

## Test coverage in this directory

- src/lib/kanban.test.ts: moveCard utility behavior.
- src/components/KanbanBoard.test.tsx: render, rename, add/remove flows.
- tests/kanban.spec.ts: board load, add card, drag between columns.

## Commands

- npm install
- npm run dev
- npm run build
- npm run test:unit
- npm run test:e2e
- npm run test:all

## Integration status

- Dummy sign-in/logout gate is implemented in the frontend (user/password, session-based).
- Frontend now reads/writes board state through `/api/board` when backend is available.
- Persistent storage works when backend is running with SUPABASE_DB_URL configured.
- No AI sidebar/chat integration yet.
