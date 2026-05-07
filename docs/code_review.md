# Code Review Report

Comprehensive review of the PM Kanban Board MVP repository.
Review date: May 7, 2026.

---

## Critical Issues

### 1. Action type handling uses `if` instead of `elif` (backend/app/main.py:234,259,275)

The action executor evaluates all three action types (`move_card`, `create_card`, `edit_card`) with sequential `if` statements. A single action could trigger multiple code paths if field names overlap or checks fall through via `continue`.

**Action:** Change the `if` chain to `if/elif/elif` so action types are mutually exclusive.

### 2. Silent exception swallows errors during AI chat (backend/app/main.py:177-178)

A bare `except Exception` catches all errors when loading the board for AI context and silently sets `board_context = None`. Database outages, permission errors, and corrupted state are all hidden.

**Action:** Catch specific expected exceptions. Log unexpected ones so failures are diagnosable.

### 3. No authentication on the backend (backend/app/deps.py:8-10)

`get_current_username()` trusts the `x-username` header and defaults to `"user"` when the header is absent. Any HTTP client can read or write any user's board by setting a header.

**Action:** This is a known MVP limitation. Document it explicitly. For production, implement token-based auth (JWT or session cookie).

### 4. CORS defaults to allow all origins (backend/app/config.py:19, main.py:35)

When `CORS_ALLOW_ORIGINS` is unset, the default is `["*"]`, allowing any website to call the API.

**Action:** Default to an empty list or localhost-only. Require explicit configuration for production.

---

## Bugs

### 5. Potential off-by-one in same-column card reorder (frontend/src/lib/kanban.ts:119-127)

After `splice(oldIndex, 1)`, the array shrinks. The subsequent `splice(newIndex, 0, activeId)` uses the original index, which is off by one when `oldIndex < newIndex`. The current dnd-kit usage may not expose this because `overId` resolves to the correct post-removal index in practice, but the logic is fragile.

**Action:** Adjust `newIndex` after the removal splice:
```ts
const adjusted = newIndex > oldIndex ? newIndex - 1 : newIndex;
nextCardIds.splice(oldIndex, 1);
nextCardIds.splice(adjusted, 0, activeId);
```
Add a unit test for reordering within the same column in both directions.

### 6. Board persistence queue can drop updates (frontend/src/components/KanbanBoard.tsx:89-115)

`queuedBoardRef.current` is a single ref, not a queue. A rapid sequence of updates overwrites the ref before the persist loop picks it up. Only the latest state is persisted, but if the loop's `while` check reads `null` between the overwrite and the next iteration, the update is lost entirely.

**Action:** The "last-write-wins" behavior is acceptable for an MVP, but the window between clearing the ref and checking the loop condition should be tightened. Consider setting `queuedBoardRef.current = null` only after a successful `updateBoard` call.

### 7. Failed actions are silently skipped (backend/app/main.py:247-248, 264-265, 280-281)

When an AI action references a nonexistent card or column, the loop `continue`s without recording the failure. The response's `applied_actions` list shows what succeeded but gives no indication of what was attempted and skipped.

**Action:** Collect skipped actions with reasons and return them in the response so the AI (and user) can see what failed.

---

## Security

### 8. Path traversal risk in static file serving (backend/app/main.py:311-316)

`static_files()` checks `candidate.exists() and candidate.is_file()` but does not verify the resolved path stays within `static_dir`. Symlinks or `..` segments could escape.

**Action:** After resolving the path, assert `candidate.resolve().is_relative_to(static_dir.resolve())`.

### 9. Hardcoded demo credentials in frontend source (frontend/src/app/page.tsx:10-15)

Four username/password pairs are visible in the shipped JavaScript bundle. Anyone with browser dev tools can see all valid credentials.

**Action:** Known MVP trade-off. For production, move credential validation to the backend behind a login endpoint.

### 10. Dockerfile installs uv via curl-pipe-sh (Dockerfile:23)

`curl -LsSf https://astral.sh/uv/install.sh | sh` has no integrity verification. A compromised CDN or MITM could inject arbitrary code into the build.

**Action:** Pin a specific uv version and verify a checksum, or install uv via pip/pipx.

---

## Error Handling

### 11. No logging anywhere in backend

No `logging` module is imported or used in any backend file. Exceptions, request details, and AI interactions leave no audit trail.

**Action:** Add structured logging (at minimum `logging.getLogger(__name__)`) to `main.py`, `service.py`, `repository.py`, and `ai.py`. Log caught exceptions, AI requests/responses, and migration outcomes.

### 12. Bare exception in AI client (backend/app/ai.py:24)

All Anthropic SDK errors (rate limits, auth failures, network timeouts, malformed responses) are caught as a single `Exception` and wrapped in `AIProviderError` with a 502 status.

**Action:** Catch `anthropic.AuthenticationError` separately (map to 503), distinguish rate limits from provider errors, and log the original exception.

### 13. AI JSON parse fallback hides model misbehavior (backend/app/ai.py:88-94)

When `structured_board_response()` can't parse the model's JSON, it returns the raw text as `message` with `actions: []`. The caller has no way to distinguish "model chose no actions" from "model output was unparseable."

**Action:** Return a flag (e.g., `parse_failed: true`) so the frontend can warn the user that the AI response was degraded.

### 14. Inconsistent error handling between boardApi.ts and aiApi.ts

`boardApi.ts` uses a shared `request()` helper with centralized error parsing. `aiApi.ts` duplicates the fetch/error logic independently.

**Action:** Extract a shared API client utility used by both modules.

---

## Performance

### 15. N+1 queries in migration check (backend/app/repository.py:97-108)

Each migration file triggers a separate `SELECT 1 FROM schema_migrations` query. With many migrations this becomes slow on cold start.

**Action:** Fetch all applied migration filenames in a single query, then diff against the filesystem list.

### 16. Quadratic normalization in action matching (backend/app/main.py:236,240,244,261,277)

`_normalize_label()` is called inside generator expressions that iterate all columns/cards for every action. A board with C columns, N cards, and A actions runs `O(A * (C + N))` normalizations.

**Action:** Build a normalized lookup dict once before the action loop:
```python
col_by_title = {_normalize_label(c["title"]): c for c in columns}
card_by_title = {_normalize_label(card["title"]): cid for cid, card in cards_by_id.items()}
```

### 17. Missing memoization causes unnecessary re-renders (frontend/src/components/KanbanBoard.tsx:258-267)

`KanbanColumn` receives new function references (`onRename`, `onAddCard`, `onDeleteCard`) and a new `cards` array on every render, defeating React's diffing.

**Action:** Wrap handlers in `useCallback` and consider `React.memo` on `KanbanColumn`.

### 18. Redundant useMemo (frontend/src/components/KanbanBoard.tsx:87)

`useMemo(() => board.cards, [board.cards])` returns the same reference it receives. It adds overhead with no benefit.

**Action:** Replace with `const cardsById = board.cards;`.

---

## Test Coverage Gaps

### 19. No test for same-column card reorder (frontend/src/lib/kanban.test.ts)

`moveCard` is tested for cross-column moves but not for reordering within the same column, which is where the off-by-one bug (issue 5) lives.

### 20. No drag-and-drop test in KanbanBoard (frontend/src/components/KanbanBoard.test.tsx)

The core feature of the app (dragging cards) has no component-level test coverage.

### 21. No isolated tests for KanbanColumn, KanbanCard, or NewCardForm

These components are only tested indirectly through parent component tests. Edge cases (empty column rename, card deletion, form validation) are not covered.

### 22. Backend action executor only tests the happy path (backend/tests/test_routes.py)

No tests for: nonexistent card/column references, malformed board state, duplicate card IDs, or no-op AI responses.

### 23. No test for concurrent board updates

Neither backend nor frontend tests verify behavior when two clients update the same board simultaneously.

**Action for 19-23:** Add targeted tests for each gap. Priority order: same-column reorder (19), action executor edge cases (22), component isolation (21).

---

## Infrastructure

### 24. Scripts lack pre-flight checks (scripts/start-*.sh, scripts/start-windows.ps1)

No verification that Docker is running, port 8000 is available, or `.env` exists before starting.

**Action:** Add checks at the top of each script. Print actionable error messages on failure.

### 25. .env.example is incomplete

Missing `CORS_ALLOW_ORIGINS` (used in code). No format hints for `SUPABASE_DB_URL`. No indication of which variables are required vs. optional.

**Action:** Add `CORS_ALLOW_ORIGINS=` with a comment, add format hints (e.g., `postgresql://user:pass@host:port/db`), and mark optional vars.

### 26. README.md contains hardcoded absolute paths (README.md:118-130)

Local development instructions reference `/Users/sanjayfuloria/projects/pm/backend/.venv/bin/uvicorn`, which breaks for any other developer.

**Action:** Replace with relative paths (e.g., `.venv/bin/uvicorn`).

### 27. .dockerignore missing entries

`docs/`, `*.md`, `backend/tests/`, `.pytest_cache/`, IDE configs, and `Dockerfile` itself are not excluded. Adds unnecessary size to the Docker context and image.

**Action:** Add missing patterns.

### 28. docker-compose.yml has no healthcheck

No way to verify the container is actually serving traffic after startup.

**Action:** Add a healthcheck hitting `/api/health`.

### 29. Frontend AGENTS.md is stale (frontend/AGENTS.md:60)

Claims "No AI sidebar/chat integration yet" but AI integration has been implemented in Parts 9-10.

**Action:** Update to reflect current state.

---

## Accessibility

### 30. Chat messages differentiated by color only (frontend/src/components/AIChatSidebar.tsx:120-124)

User and assistant messages use blue vs. gray backgrounds with no text label or icon. Color-blind users cannot distinguish sender.

**Action:** Add a "You" / "Assistant" label above each message.

### 31. Missing focus indicators on interactive elements

Several buttons (card delete, add card, logout) lack visible focus outlines for keyboard navigation.

**Action:** Add `focus:outline` or `focus-visible:ring` classes to all interactive elements.

### 32. No Escape key handler on column rename (frontend/src/components/KanbanColumn.tsx:63-67)

Enter commits the rename but Escape does nothing. Users expect Escape to cancel.

**Action:** Add `Escape` handler that resets `titleDraft` to `column.title` and blurs.

---

## Minor / Low Priority

### 33. Weak ID generation for cards (frontend/src/lib/kanban.ts:164-168)

`createId` uses `Math.random()` which is not cryptographically random. Low collision probability for MVP but unsuitable for multi-user production use.

**Action:** Switch to `crypto.randomUUID()` for production.

### 34. `state_version` naming inconsistency

Board API returns `state_version` but AI chat endpoint returns `board_state_version`. Frontend must handle both names.

**Action:** Standardize on one name across all endpoints.

### 35. `snapshot_on_update` parameter is dead code (backend/app/repository.py:171,192)

Always defaults to `True` and is never called with `False`.

**Action:** Remove the parameter and always snapshot.

### 36. Decorative elements not hidden from screen readers (frontend/src/components/KanbanBoard.tsx:199-200)

Gradient overlay divs are announced by screen readers.

**Action:** Add `aria-hidden="true"`.

---

## Summary

| Priority | Count | Categories |
|----------|-------|------------|
| Critical | 4 | Action handling logic, silent errors, auth, CORS |
| Bug | 3 | Reorder off-by-one, persistence queue, silent skips |
| Security | 3 | Path traversal, hardcoded creds, curl-pipe-sh |
| Error handling | 4 | No logging, bare exceptions, parse fallback, inconsistent clients |
| Performance | 4 | N+1 queries, quadratic normalization, re-renders, useless memo |
| Test gaps | 5 | Reorder, drag, components, edge cases, concurrency |
| Infrastructure | 6 | Scripts, env, README, dockerignore, healthcheck, stale docs |
| Accessibility | 3 | Color-only chat, focus indicators, escape key |
| Minor | 4 | ID generation, naming, dead code, aria |

**Total: 36 actionable items.**
