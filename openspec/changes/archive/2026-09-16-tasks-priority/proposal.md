## Why

Tasks have no urgency signal: members must open each card to judge importance, and columns mix urgent and trivial work in creation order. A lightweight priority keeps triage visual without changing the lifecycle or board workflow.

## What Changes

- Add `Task.priority` with values `low | medium | high | urgent`, default `medium`. A missing value on read is treated as `medium` (backward compatible, no migration).
- Validate priority in the domain and in `POST /boards/:boardId/tasks` + `PATCH /boards/:boardId/tasks/:taskId`; invalid values are rejected with `400` and `validation`.
- Editing priority uses the existing `Action.EditTask` gate (Task Owner or Board Creator/Owner, editable task only). Creation accepts an optional `priority`.
- `TaskCard` shows an always-visible single-letter badge (`L / M / H / U`) for space reasons, with the full word available via tooltip/accessible name.
- `TaskModal` gains a `PRIORITY` selector, preselected to `medium` on create and prefilled from the task on edit.
- Columns keep their `COLUMN_ORDER` order, but cards inside each column are ordered by priority (`urgent > high > medium > low`, stable for ties).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `tasks`: Task entity gains priority (default `medium`, missing reads as `medium`).
- `http-api`: task creation/editing endpoints accept and validate optional `priority`.
- `frontend/boards`: task card badge, task modal selector, and per-column priority ordering.

## Impact

- `kanban-api/src/domain/entities.ts` — `TaskPriority` type + `priority` field.
- `kanban-api/src/domain/commands.ts` — `createTask`/`editTask` accept and validate priority, default `medium`.
- `kanban-api/src/routes/tasksRouter.ts` — `POST /` and `PATCH /:taskId` accept optional `priority`, reject invalid with `400`.
- `kanban-api/src/models/index.ts`, `src/mappers/task.mapper.ts` — persist `priority` with `medium` default and `?? medium` read fallback.
- `kanban-front-end/src/lib/api.ts` — `TaskPriority` type, `Task.priority`, `createTask`/`updateTask` pass `priority?`.
- `kanban-front-end/src/pages/TaskCard.tsx` — single-letter badge, always visible.
- `kanban-front-end/src/pages/TaskModal.tsx` — `PRIORITY` selector for create and edit.
- `kanban-front-end/src/pages/BoardDetailPage.tsx` — stable sort by priority weight within each column filter.
- Tests: domain, router, mapper/model, `TaskCard.test.tsx`, `TaskModal.test.tsx`, `BoardDetailPage.test.tsx`.
- No lifecycle, auth, or column-order changes. No data migration (lazy `medium` fallback).
