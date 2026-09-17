## Why

Boards show priority, start date, and counts, but no effort signal: members cannot gauge sprint load or work-in-progress weight without opening every card. Fibonacci story points give a lightweight estimate visible at card and board level.

## What Changes

- Add `Task.storyPoints: 1 | 2 | 3 | 5 | 8 | 13 | null`, default `null` (`null` = unestimated). A task persisted without `storyPoints` reads as `null`.
- Validate the Fibonacci set in the domain and in `POST /boards/:boardId/tasks` + `PATCH /boards/:boardId/tasks/:taskId`; any other value is rejected with `400` and `validation`. Editing points uses the existing `Action.EditTask` gate. `null` counts as `0` in sums.
- `TaskCard` shows a points badge in the top-right corner, hidden when `null`.
- `TaskModal` places `PRIORITY` and `STORY PTS` selectors side by side in one row (`--` = `null`, default on create, prefilled on edit, sent on create plus only-on-change on edit).
- `BoardDetailPage` shows an aggregate line under the board description: `TOTAL: X PTS - IN PROGRESS: N TASKS (Y PTS)`, derived locally from `board.tasks` (no new endpoint).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `tasks`: Task entity gains `storyPoints` with Fibonacci validation.
- `http-api`: task creation/editing endpoints accept and validate optional `storyPoints`.
- `frontend/boards`: card badge, modal selector row, board aggregate line.

## Impact

- `kanban-api/src/domain/entities.ts` — `StoryPoints` type + `storyPoints` field + `isStoryPoints` guard.
- `kanban-api/src/domain/commands.ts` — `createTask`/`editTask` accept and validate `storyPoints?`, default `null`.
- `kanban-api/src/routes/tasksRouter.ts` — `POST /` and `PATCH /:taskId` accept optional `storyPoints`, reject invalid with `400`.
- `kanban-api/src/models/index.ts`, `src/mappers/task.mapper.ts` — persist `storyPoints` with `null` default and `?? null` read fallback.
- `kanban-front-end/src/lib/api.ts` — `StoryPoints` type, `Task.storyPoints`, `createTask`/`updateTask` pass `storyPoints?`.
- `kanban-front-end/src/pages/TaskCard.tsx` — points badge top-right, hidden when `null`.
- `kanban-front-end/src/pages/TaskModal.tsx` — `PRIORITY` + `STORY PTS` two-column row.
- `kanban-front-end/src/pages/BoardDetailPage.tsx` — aggregate line under description.
- Tests: domain, router, mapper/model, `TaskCard.test.tsx`, `TaskModal.test.tsx`, `BoardDetailPage.test.tsx`.
- No lifecycle, auth, priority-order, or column-order changes. No data migration (lazy `null` fallback).
