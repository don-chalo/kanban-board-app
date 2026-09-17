## Why

Tasks can be created, moved between states, and reassigned owners individually, but their title, description, and owner cannot be edited after creation. The client already has the API surface it needs — `PATCH /boards/:boardId/tasks/:taskId` and `POST /boards/:boardId/tasks/:taskId/owner` exist but are unused — so the edit affordance is missing even though the backend supports it. The new-task modal also silently drops the board Creator and Owner from the OWNER list (it filters out the acting user, who for a manager is the Creator/Owner), so those rows can never be chosen as task owners.

## What Changes

- Generalize the new-task modal into a `TaskModal` that serves both create and edit: edit mode prefills the task's title, description, and current owner, shows `> EDIT TASK` / `> SAVE` (creation keeps `> NEW TASK` / `> CREATE`).
- Add a click-to-edit trigger on a task card's title: clicking it opens the edit modal, offered only to the Task Owner or the Board Creator/Owner and never on a frozen board or a terminal task.
- In edit mode a manager can change the task owner; a non-manager who owns the task edits title and description only (the OWNER field stays hidden, matching creation).
- Fix the OWNER list in the modal (create and edit): the list includes the board Creator, the Owner, and all Associated members including the acting user, and the empty option is labeled `(me)` instead of `---`.
- Add a `updateTask` client (`PATCH /boards/:boardId/tasks/:taskId`) next to the existing `setTaskOwner`; after a successful edit the board refetches.
- **BREAKING** (backend invariant): blank task titles are rejected. The modal rejects them before submitting, and the backend `PATCH` handler is hardened to return `400` for a blank title, mirroring the create route.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `frontend/boards`: The `Task creation` requirement changes (OWNER list contents and the `(me)` option), and a new `Task editing` requirement is added to the boards frontend capability.
- `http-api`: The `Task creation, reading, editing, and deletion` requirement changes to require that a task title SHALL never be blank, rejected with `400` on the edit `PATCH`.

## Impact

- `kanban-front-end`:
  - `src/pages/NewTaskModal.tsx` renamed/parameterized into `src/pages/TaskModal.tsx` (mode, labels, OWNER list, prefill, blank-title validation).
  - `src/components/TaskCard.tsx` (edit trigger + gating).
  - `src/pages/BoardDetailPage.tsx` (edit-modal state and save handlers, refetch after edit).
  - `src/lib/api.ts` (new `updateTask` client).
  - Tests: `NewTaskModal.test.tsx` → `TaskModal.test.tsx`, plus `TaskCard.test.tsx` and `BoardDetailPage.test.tsx`.
- `kanban-api`:
  - `src/routes/tasksRouter.ts` (blank-title `400` on the task `PATCH`).
  - Tests: `tasksRouter.test.ts` and/or `commands.test.ts`.
- Specs: deltas for `openspec/specs/frontend/boards/spec.md` and `openspec/specs/http-api/spec.md`.
- No new dependencies, no schema or store changes.