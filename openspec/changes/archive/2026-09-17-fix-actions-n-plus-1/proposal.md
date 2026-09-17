## Why

Board detail performs ~1+N+M requests to paint (one `GET .../tasks/:id/actions` per task plus one `GET /users/:id` per member), and the lifecycle still allows `ToDo -> Blocked`, which the product no longer wants. Fetching one static transitions table plus one users batch removes both N+1s while keeping lifecycle ownership in the backend.

## What Changes

- Add `GET /transitions` returning the full transitions table plus `frozenStates` (canonical `LifecycleState` casing). Requires known `X-User-Id` actor; static and cacheable.
- Remove `ToDo -> Blocked`: `ToDo` may go only to `InProgress` or `Cancelled`; `Blocked` returns only to `InProgress`. **BREAKING** for clients relying on `ToDo -> Blocked` or `Blocked -> ToDo` (legacy `Blocked(previousState=ToDo)` entities report no moves; no data migration).
- Add `POST /users/batch` accepting `{ ids: string[] }` and returning `[{ id, email }]` for found identities only.
- Frontend derives per-task/per-board moves from the transitions table plus `board.state`/`task.state` (frozen/terminal locally); `Done` on boards is offered optimistically and the server remains the validator (`409 board_not_done`).
- Existing `GET .../actions` endpoints stay unchanged (compatible, not deprecated in this change).

## Capabilities

### New Capabilities

None. All behavior lands in existing capabilities.

### Modified Capabilities

- `tasks`: task lifecycle loses `ToDo -> Blocked`; `Blocked -> InProgress` only.
- `boards`: board lifecycle mirrors the task change.
- `http-api`: new `GET /transitions` and `POST /users/batch` contracts; documents optimistic `Done` with `board_not_done`.
- `users`: batch lookup respects stable email-keyed identity.
- `frontend/boards`: moves come from the transitions table plus batch member resolution; `409 board_not_done` surfaced distinctly.

## Impact

- Backend: `kanban-api/src/domain/lifecycle.ts`, new transitions route, `usersRouter.ts` + user repository `findByIds`, tests (`lifecycle`, `commands`, routers, e2e).
- Frontend: `lib/api.ts` (`getTransitions`, `batchUsers`), `lib/states.ts` (drop hardcoded frozen set), `lib/members.ts` (batch), `BoardDetailPage.tsx` (no per-entity actions calls, error mapping).
- Request count to paint a board drops from ~1+1+N+M to `GET board` + `POST /users/batch` + cached `GET /transitions`.
