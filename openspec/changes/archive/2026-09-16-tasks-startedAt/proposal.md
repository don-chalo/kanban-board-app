## Why

Boards show priority and lifecycle but no start signal: members cannot tell when work actually began without opening history. A single first-start date answers "when did this leave To Do" at a glance.

## What Changes

- Add `Task.startedAt: ISO string | null`, default `null`. A task persisted without `startedAt` reads as `null`.
- Set `startedAt` exactly once on the `ToDo -> InProgress` transition when it is `null`; never overwrite it (including returns from `Blocked`). Historical tasks without a date keep `null` forever (no backfill).
- `PATCH /boards/:boardId/tasks/:taskId` ignores `startedAt` (no `400`, no write). `createTask`/`editTask` never accept it.
- `TaskCard` shows `YYYY-MM-DD` (`startedAt.slice(0, 10)`) to the left of the owner avatar; `null` renders nothing. Full ISO stays in `title`/accessible name.
- No column reordering, no filtering, no new endpoints.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `tasks`: Task entity gains `startedAt` with once-only set rule.
- `http-api`: task state move stamps `startedAt`; task `PATCH` ignores it; reads return it.
- `frontend/boards`: task card shows the start date left of the avatar.

## Impact

- `kanban-api/src/domain/entities.ts` — `startedAt` field.
- `kanban-api/src/domain/commands.ts` — `moveTask` stamps on `ToDo -> InProgress` when `null` (injectable clock), `createTask` defaults `null`.
- `kanban-api/src/models/index.ts`, `src/mappers/task.mapper.ts` — persist `startedAt` (`String`, `default: null`) with `?? null` read fallback.
- `kanban-api/src/routes/tasksRouter.ts` — state-move response carries `startedAt`; `PATCH` drops `startedAt` silently.
- `kanban-front-end/src/lib/api.ts` — `startedAt: string | null`.
- `kanban-front-end/src/pages/TaskCard.tsx` — `YYYY-MM-DD` left of avatar, hidden when `null`.
- Tests: domain once-only, mapper/model legacy, router move + patch-ignore, `TaskCard.test.tsx` date shown/hidden.
- No lifecycle, auth, priority-order, or column-order changes. No data migration.
