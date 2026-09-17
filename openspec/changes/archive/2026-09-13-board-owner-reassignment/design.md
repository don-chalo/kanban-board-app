## Context

The identity panel (BoardDetailPage.tsx) currently renders CREATOR/OWNER as static text. The backend already supports reassignment: `PATCH /boards/:boardId` accepts `body.owner` (boardsRouter.ts:52-57) and `reassignBoardOwner` (commands.ts:113) enforces manager role, non-frozen state, and that the new owner is a board member (moving that member out of `associated`). The client `updateBoard` (api.ts:225) only sends `title`/`description`. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Give the Board Creator/Owner a Radix Select dropdown (visually parallel to the BOARD STATE select) on the OWNER row that lists the board's current members with the current owner preselected.
- Reassign ownership through the existing PATCH and reflect the returned board in the panel without a refetch.
- Reuse the existing `members` email lookup for labels; no new data fetch.

**Non-Goals:**
- No backend changes (member-only assignment rule stands).
- No search-by-email autocomplete (add-member style) — the backend restricts the new owner to current members, so a user directory search would surface selections that can only be rejected.
- No transfer-confirmation dialog.

## Decisions

1. **Extend `updateBoard` instead of a new client.** Add optional `owner?: string` alongside `title`/`description`, matching how `updateTask` extended around the same PATCH shape. Mirrors the backend, which handles all three in one PATCH. Alternative considered: a dedicated `setBoardOwner` — rejected as redundant duplication.

2. **OWNER row = Radix Select for managers on live boards.** When `isManager && !frozen`, replace the static `ownerEmail` span with a `Select.Root`:
   - `value={board.owner}`; disabled item for the current owner (mirrors the BOARD STATE select, which disables the current state).
   - Options from `[board.creator, board.owner, ...board.associated]` deduplicated (same source as the MEMBERS list), labels from the `members` map.
   - `aria-label="Board owner"`.
   Otherwise the value stays a plain-text span. Alternative considered: the add-member searchable input — rejected (non-member picks would hit the backend `member_required` rule); an InlineEdit free-text input — rejected because the owner is a discrete member choice.

3. **Apply the returned board locally.** `onValueChange` calls `updateBoard(boardId, { owner })` and `setBoard(result)` (same local-apply pattern as `removeMemberById` and board title/description save). No `loadBoard(false)` refetch needed: every candidate owner is already resolved in the `members` map.

4. **Identity collapse is handled by React.** When the acting user is only the current owner and reassigns away, the updated board makes `isManager` false; the row re-renders as plain text. No special case required.

## Risks / Trade-offs

- **Actor loses manager status after reassign** → Correct behavior; the returned board re-renders the panel without the dropdown. No mitigation needed.
- **Reassigning to the current owner is a no-op** → The current-owner item is disabled (like BOARD STATE), so no request fires.
- **PATCH failure (e.g., stale board, frozen race)** → The PATCH throws; ownership stays as shown. Surface a panel error consistent with other mutations (reuse the `panelError` slot); the dropdown value (controlled by `board.owner`) does not change.

## Migration Plan

Frontend-only change; deploy by updating `kanban-front-end`. Rollback is reverting the OWNER row to a static span. No data migration.