## Why

Board-level discussion exists, but the conversations that matter most happen around individual tasks — status updates, blockers, review notes. Task comments attach that discussion to the task itself, reusing the `Comment` shape and patterns proven by board comments.

## What Changes

- Tasks gain an embedded comment thread: `Comment { id, author, text, createdAt }`, same shape verbatim. Any board member can add a comment, including on frozen boards and terminal tasks. Edit/remove is reserved to the author, the Board Creator/Owner, or the task owner — including on frozen boards and terminal tasks.
- New endpoints under `/boards/:boardId/tasks/:taskId/comments`: `POST` (create, 201), `PATCH /:commentId` (edit), `DELETE /:commentId` (remove). Comments travel inside the existing task payloads — no separate list endpoint. Same validation: blank rejected, over 2000 characters rejected (`400` + `validation`).
- Task title becomes an always-visible entry point opening the task modal in any state. The modal grows wider in edit mode and gains an expandable `COMMENTS (N)` section below SAVE/CLOSE: collapsed form by default, expanding swaps the form for the thread (input on top, newest-first). No SAVE button while comments are visible; comments are created with Enter. On frozen boards and terminal tasks the modal shows conversation only (no form, no SAVE). No comments section in the "New task" modal.

## Capabilities

### New Capabilities

None. All behavior extends existing capabilities.

### Modified Capabilities

- `tasks`: task entity gains an embedded comment thread with the author-or-manager-or-task-owner CRUD matrix, including on frozen boards and terminal tasks.
- `http-api`: new task comment endpoints plus comments embedded in task payloads.
- `frontend/boards`: task title always opens the task modal; modal gains the expandable comments section; form and SAVE hidden when the task is not editable.

## Impact

- Backend: `kanban-api` domain (`Task.comments` + 3 commands), task persistence (embedded comments, legacy → `[]`), `tasksRouter` (3 endpoints), tests.
- Frontend: `TaskCard.tsx` (title always a button), `TaskModal.tsx` (width, expandable section, conditional form/SAVE), `api.ts` (`Task.comments` + 3 fns), tests.
