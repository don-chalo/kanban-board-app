## Why

The BOARD OWNER row in the identity panel is static text even though the API already supports reassigning ownership. Board Creators/Owners have no UI to transfer ownership, so ownership stays locked to whoever created the board.

## What Changes

- Make the OWNER value in the identity panel an editable control for the Board Creator/Owner: a dropdown (same Radix Select style as the BOARD STATE selector) listing the board's current members (Creator, Owner, and Associated), with the current owner selected.
- Selecting a different member reassigns ownership via `PATCH /boards/:boardId` with `{ owner }` (the endpoint and domain rule already exist) and applies the returned board locally.
- Extend the client `updateBoard` to accept an optional `owner` field (mirrors `updateTask`).
- Non-managers continue to see the OWNER value as plain text; on a frozen board (`Blocked`, `Cancelled`, `Done`) the control is not offered, matching the backend's `read_only` rejection.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `frontend/boards`: add a new requirement covering the board owner reassignment affordance (who can change it, what the list contains, how the pick saves, and when it is hidden). The API behavior is already specified under `http-api` ("Board ownership is reassigned", "Reassignment to a non-member is rejected"), so no `http-api` delta is needed.

## Impact

- `kanban-front-end/src/lib/api.ts` — `updateBoard` gains optional `owner`.
- `kanban-front-end/src/pages/BoardDetailPage.tsx` — OWNER row renders a member dropdown for managers on live boards; picks reassign and apply the returned board.
- `kanban-front-end/src/lib/api.test.ts`, `src/pages/BoardDetailPage.test.tsx` — new coverage.
- No backend changes: `PATCH /boards/:boardId` and `reassignBoardOwner` already enforce manager role, non-frozen state, and membership of the new owner.