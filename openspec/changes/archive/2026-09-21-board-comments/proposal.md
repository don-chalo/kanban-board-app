## Why

Boards coordinate work but offer no place for discussion: decisions end up outside the product, disconnected from the board they concern. Board-level comments give members a shared conversation attached to the board, starting with boards and extending to tasks later with the same shape.

## What Changes

- Boards gain an embedded comment thread: `Comment { id, author, text, createdAt }`, full CRUD scoped to author-or-manager (author edits/deletes own; creator/owner edits/deletes any), including on frozen boards.
- New endpoints under `/boards/:boardId/comments`: `POST` (create, 201), `PATCH /:commentId` (edit), `DELETE /:commentId` (remove). Comments travel inside the existing `GET /boards/:boardId` aggregate — no separate list endpoint.
- Validation: blank text rejected with `400` and `validation`; text over 2000 characters rejected with `400` and `validation`. Non-members denied (`403`); unknown actor `401`; unknown board or comment `404`.
- Board detail page gains a `COMMENTS (n)` section below the task columns (columns grid gets a minimum height so the header stays visible): entry input on top with `> ADD`, list newest-first, inline edit plus confirm dialog on delete following existing patterns.

## Capabilities

### New Capabilities

None. All behavior extends existing capabilities.

### Modified Capabilities

- `boards`: board entity gains an embedded comment thread with author-or-manager CRUD, including on frozen boards.
- `http-api`: new comment endpoints plus comments embedded in board detail responses.
- `frontend/boards`: board detail gains the comments section with create, inline edit, and confirmed delete.

## Impact

- Backend: `kanban-api` domain (`Comment` entity + commands), board persistence (embedded comments), `boardsRouter` (3 endpoints), tests.
- Frontend: `BoardDetailPage.tsx` comments section plus `BoardDetailPage.test.tsx` coverage.
- Task comments are an explicit follow-up reusing the same `Comment` shape; no task changes here.
