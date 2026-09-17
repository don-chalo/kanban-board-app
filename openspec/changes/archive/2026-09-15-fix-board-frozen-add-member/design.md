## Context

`kanban-api/src/domain/commands.ts:147` `manageBoard` authorizes via `authorize(ManageBoard)` (Creator/Owner only) then switches on `kind`. `removeMember` has `isBoardFrozen(board)` guard (`guards.ts:11` → `Blocked|Cancelled|Done`) throwing `DomainError("read_only")` → `409` via `boardsRouter` error map. `addMember` lacks any frozen check and `editAttributes` is unguarded. Frontend `BoardDetailPage.tsx:362` computes `frozen = FROZEN_BOARD_STATES.has(board.state)` and already uses `isManager && !frozen` for title/description `InlineEdit` and `removeMember` `x`, but the MEMBERS `+` button is `isManager`-only (`:586`). Proposal forbids `addMember` and `title` edit on frozen while explicitly allowing `description` edit on frozen. See proposal.md — Why.

## Goals / Non-Goals

**Goals:**
- Reject `POST /boards/:id/members` on `Blocked`/`Cancelled`/`Done` with `409 read_only`, reusing existing `isBoardFrozen` guard and error mapping.
- Reject `PATCH /boards/:id` title mutation on frozen atomically (if `title` present → `409`, no partial `description` apply); allow `description`-only patches on frozen.
- Hide/unhide frontend affordances: `+` hidden on frozen; title InlineEdit hidden on frozen; description InlineEdit stays visible to Creator/Owner on frozen.

**Non-Goals:**
- Changing `removeMember`, `reassignBoardOwner`, `reassignTaskOwner`, `deleteTask` frozen guards (already correct).
- Board state machine / Done gate / cascade (`isEditable`, `allowedBoardTransitions`) — unchanged.
- Search/resolve user flows (`GET /users?email`, `POST /users/resolve`) — unchanged.
- Hiding description edit on frozen or adding a separate description-freeze toggle.

## Decisions

**D1: Reuse `isBoardFrozen` for `addMember` (Option C, not `isTerminal`).**
- `addMember` gets `if (isBoardFrozen(board)) throw DomainError("read_only", ...)` at top of case, matching `removeMember:167`. Alternative `isTerminal()` (`Done|Cancelled` only) would leave `Blocked` addable and diverge from `removeMember` precedent; `isBoardFrozen` keeps add/remove symmetric and was the explored preference.
- Validation: domain tests will move a board to `Blocked` and `Done`/`Cancelled` then assert `addMember` throws `read_only`; live board still succeeds.

**D2: Split `editAttributes` title vs description — atomic title guard.**
- Inside `editAttributes` case, if `change.title !== undefined && isBoardFrozen(board)` throw `read_only` before any mutation. If only `change.description !== undefined` and frozen, allow mutation. If both fields supplied on frozen, the whole call throws — no partial `description` apply — for atomicity and to avoid a `200` that silently dropped the title.
- Alternative considered: apply `description` and ignore `title` on frozen → rejected: partial success is surprising and would need a warning code; atomic rejection is simpler and matches the `read_only` model used elsewhere.
- Router `PATCH /boards/:boardId` already delegates to `manageBoard({kind:"editAttributes",...})`; no new route, no new error code.

**D3: Frontend conditions reuse existing `frozen` const.**
- `MEMBERS +` button: `{isManager && !frozen && ( <button>+</button> )}` — minimal change at `BoardDetailPage.tsx:586`. `memberEntryOpen` state will never open when button is absent; keep existing `memberError` handling to surface `409` if API is called directly (e.g., stale tab).
- Title `InlineEdit editable={isManager && !frozen}` stays as-is. Description `InlineEdit editable={isManager}` (remove `&& !frozen`) at `:420` — description remains editable on frozen per exception. Alternative keeping both hidden was rejected per user direction.
- No change to `loadBoard` or `members` map logic; `removeMember` `x` already `!frozen`.

**D4: Error contract unchanged.**
- Backend throws `DomainError("read_only", ...)` → existing `boardsRouter` catch maps to `409 {error:{code:"read_only", message}}` per `http-api` spec. No new status or code; frontend `api.ts` `addBoardMember`/`updateBoard` already rejects on non-ok and surfaces `memberError`/inline error.

## Risks / Trade-offs

- **Split edit atomicity surprises clients batching title+description on frozen** → Mitigation: document atomic rejection in spec; frontend saves title and description separately (two `InlineEdit` instances) so batching never occurs in UI; API test covers mixed patch rejected.
- **Description exception contradicts "Cancelled read-only" intuition** → Mitigation: spec explicitly states exception; design notes it as intentional; no task will re-freeze description later without a new change.
- **Blocked is recoverable but now blocks adds** → Tradeoff: consistency with `removeMember` on `Blocked` chosen over allowing adds during `Blocked`; unblocking restores addability, so window is short. If business later wants adds on `Blocked`, change requires only swapping `isBoardFrozen` → `isTerminal`.

## Migration Plan

- No data migration. Deploy API then frontend; either order is safe (API rejects regardless of button visibility, button hide is cosmetic). Rollback: revert guards and frontend conditions; no persisted state to clean.

## Open Questions

- None. Scope (Option C, title-blocked / description-allowed, atomic) is confirmed.
