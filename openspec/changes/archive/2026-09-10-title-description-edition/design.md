## Context

See proposal.md - Why. The board detail page (`BoardDetailPage`) already owns the board state, renders the title as an uppercased `h1` and the description as a paragraph with a "(no description)" placeholder, and already computes the `isManager` and `frozen` gates used by every writable control. The backend already supports the needed mutation: `PATCH /boards/:boardId` accepts `title` and/or `description`, is restricted to the Board Creator/Owner, and returns the full board. `api.ts` (throwing style) has no PATCH client yet. This is the app's first inline text editor (previous editors are modal or a member-picker entry).

## Goals / Non-Goals

**Goals:**
- One reusable inline-edit control used by both the title (`h1`) and the description paragraph.
- Enter saves via PATCH and applies the returned board locally; Escape/blur cancels.
- Editing gated on `isManager` and disabled when `frozen`.

**Non-Goals:**
- No member-map/task-moves refresh (the returned board is enough; members and moves cannot change from a description/title edit).
- No backend changes - in particular, `PATCH` title emptiness is a frontend guard only (see Decisions 5).
- No optimistic "revert on failure" retry UI; save is a single request.

## Decisions

1. **Reusable `InlineEdit` control** rather than two bespoke handlers. Both fields share: click-to-enter, `autoFocus` + select-all on mount, Enter confirm, Escape/blur cancel, busy guard, inline error. Alternatives considered: per-field handlers (duplicated logic, no shared test surface) - rejected.
2. **Save via `PATCH` then `setBoard(returned)` locally, no `loadBoard(false)`.** The response is the authoritative board; a refetch would also re-resolve member emails and task moves for no benefit. Alternatives: `loadBoard(false)` for consistency with other mutations (extra N+1 `getUser` calls and task-action fetches) - rejected as heavier than needed. The heading and breadcrumb both derive from `board.title`, so one local update keeps them consistent.
3. **Exit semantics: Enter saves; Escape and blur cancel.** Matches the app's existing member-entry cancel behavior and avoids accidental commits (alternative: blur-saves - rejected per the user).
4. **Gating.** Editable only when `isManager && !frozen`. Non-managers and frozen boards render the plain value with no hover/click affordance. The backend PATCH is manager-only, so the gate prevents 403s for associates.
5. **Blank handling.** Description saves as empty (placeholder returns). Title is validated non-empty client-side (trim) with an inline "Title is required." error and no request, mirroring creation-time validation. Known backend gap: `PATCH` does not currently reject blank titles; left frontend-only in this change (flagged in proposal - Impact) to keep scope tight.
6. **Error display.** Save failure sets the inline edit's error state and discards the edit input (back to the previous value), rather than reusing the global `panelError` which lives near the "+ NEW TASK" button and would show errors displaced from the field.
7. **Parser shape.** New `api.ts` client `updateBoard(boardId, { title?, description? })` returns `Board`, sending only the fields present - the same shape the backend already accepts, and reusable if title/description later get other UI entry points.

## Risks / Trade-offs

- [Title kept locally without trim on the value sent] -> PATCH stores as typed; the client already trims for the blank check and sends the trimmed title, so storage stays normalized.
- [Backend accepts blank title from non-UI clients] -> accepted as a known gap for this change; flagged in the proposal for a later backend follow-up.
- [Blur-cancel vs Enter-only commit] -> Enter is the only commit path (there is no separate save button), so blur always cancels predictably; no click-through ambiguity to guard.
- [Accessibility of click-to-edit] -> the editable region is an explicit keydown/click surface; Enter/Escape behaviors are keyboard-reachable.

## Migration Plan

Ships with the page (no flag). Rollback: revert the `InlineEdit` usage on the two fields; the PATCH endpoint remains harmless and unused elsewhere.

## Open Questions

None.