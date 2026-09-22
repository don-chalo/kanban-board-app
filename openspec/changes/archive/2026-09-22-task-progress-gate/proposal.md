## Why

Today tasks move independently of their board's lifecycle: a board still in `To Do` can already have tasks in flight, which breaks the intended progression where work starts only once the board itself is underway. Gating task moves on the board being `In Progress` enforces that order with a single domain rule.

## What Changes

- `moveTask` requires `board.state === 'InProgress'` before the existing editable and transition checks; otherwise it throws a new `board_not_in_progress` error mapped to HTTP 409.
- `allowedTaskTransitions` returns `[]` when the board is not `In Progress`, so `GET .../tasks/:taskId/actions` and every derived surface (arrows, board detail) follow the gate with no extra paths.
- Creating tasks is unchanged: allowed on any non-frozen board, including `To Do`.
- Frontend hides task move arrows whenever the board is not `In Progress` (same treatment as frozen) and maps `board_not_in_progress` to a distinct message.
- The static `GET /transitions` table is untouched: the gate is dynamic per board, like the Done gate.

## Capabilities

### New Capabilities

None. All behavior tightens existing capabilities.

### Modified Capabilities

- `tasks`: task moves require the board in `In Progress`.
- `http-api`: task state moves rejected with `409 board_not_in_progress`; task next-actions empty unless the board is `In Progress`.
- `frontend/boards`: move arrows hidden unless the board is `In Progress`, with a distinct gate message.

## Impact

- Backend: `kanban-api` guards (`allowedTaskTransitions`), commands (`moveTask`), error mapping (new `board_not_in_progress` code), no router shape changes.
- Frontend: `BoardDetailPage.tsx` arrow derivation + gate message.
- Tests: broad migration — existing `moveTask` flows on `To Do` boards move the board to `In Progress` first or assert the 409; new gate coverage at domain, router, e2e, and UI levels.
