## Context

See proposal.md for motivation. Task moves flow through `moveTask` (authorize → `isEditable` → `canTransition`) with `allowedTaskTransitions` feeding `GET .../tasks/:taskId/actions`; `DomainError` codes map to HTTP statuses in `errorHandler.ts`. The front derives arrows locally from the cached transitions table plus board state. No new endpoints, no model changes.

## Goals / Non-Goals

**Goals:**
- One domain rule gating all task moves on `board.state === 'InProgress'`, with a distinct API code and hidden arrows.

**Non-Goals:**
- Touching task creation, the static transitions table, the Done gate, or frozen semantics.

## Decisions

### D1: Gate inside `moveTask`, before `isEditable`
Order: membership → editable (frozen/terminal keep `read_only`) → board-progress (`board_not_in_progress`) → transition. The new check goes after `isEditable` so frozen and terminal behavior is byte-identical; only live tasks on non-`In Progress` boards hit the new code. `allowedTaskTransitions` returns `[]` unless the board is `In Progress`, so actions endpoints, the derived front moves, and arrows follow with no extra paths. Alternative (gate before editable) rejected: it would relabel frozen-board attempts as `board_not_in_progress`, widening the observable change for no benefit.

### D2: New `board_not_in_progress` code, not `read_only`
A distinct 409 code lets the front show "start the board first" instead of confusing the gate with frozen state. Follows the `board_not_done` precedent. Requires adding the code to `DomainErrorCode` and `HTTP_STATUS_BY_CODE`.

### D3: Front hides arrows, keeps optimistic submit-and-explain
Arrows hidden when `board.state !== 'InProgress'` (same treatment as frozen, derived locally — zero requests). Moves submitted anyway (e.g. race where the board moved back) surface the distinct message via the code-carrying error, mirroring the `board_not_done` handling in `handleTaskMove`/`handleBoardMove`.

## Risks / Trade-offs

- [Broad test migration: most existing `moveTask` flows run on `To Do` boards] → Mitigation: move the board to `In Progress` first in fixtures, or assert the 409 where the gate is the point; e2e seeds updated the same way.
- [Clients polling actions see `[]` on `To Do` boards] → Accepted: that is the gate made visible, consistent with frozen/terminal.

## Migration Plan

Single release (backend + frontend together). No data migration: existing task states are untouched; only future moves are gated. Rollback is revert.

## Open Questions

None. Gate position, code, and arrow behavior were decided in exploration.
