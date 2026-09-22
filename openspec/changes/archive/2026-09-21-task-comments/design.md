## Context

See proposal.md for motivation. This change mirrors `board-comments` (archived): same `Comment` shape verbatim, same validation (`validation` → 400 on blank/overlong), same error codes, same frontend idioms (`InlineEdit`, `YES`/`CANCEL` dialog, `loadBoard(false)` refresh). Tasks persist as separate documents saved per-task via `replaceOne` in `saveBoardAggregate`; the `TaskModal` is a `max-w-sm` form dialog used for both create and edit. No backend changes beyond the task thread itself.

## Goals / Non-Goals

**Goals:**
- Task comment CRUD with the author-or-manager-or-task-owner matrix, frozen and terminal included.
- Title always opens the modal; form always shown but disabled unless `canEditTask` passes, SAVE hidden unless it passes, close via top-right X.
- Modal viewport-bounded with independent form collapse and list-only scroll; visible busy state on comment POST/PATCH/DELETE.

**Non-Goals:**
- Board comments changes, reactions/threads, pagination, rich text, comments in the "New task" modal.

## Decisions

### D1: Comments embedded in the task document
`Task` gains `comments: Comment[]`; `taskSchema` gains the same subdocument used for boards, `task.mapper` maps both directions with legacy docs defaulting to `[]`. No new collections, no list endpoint: comments ride the existing task payloads, and the per-task `replaceOne` persists them with no repository changes. Alternative (separate collection) rejected for the same reason as in board-comments.

### D2: Domain commands mirror board comments plus task-owner power
`addTaskComment(board, actor, taskId, {id, text}, now?)` / `editTaskComment` / `removeTaskComment` on `(board, …)`, finding the task first (`not_found` covers missing task or comment). Create requires membership; edit/remove requires author, board manager (`creator`/`owner` via `resolveRole`), or `task.owner === actor`. Deliberately no `isBoardFrozen` gate and no terminal-task gate. `createdAt` injectable like `startedAt`.

### D3: Thin routes in `tasksRouter`
`POST /:taskId/comments` → 201; `PATCH /:taskId/comments/:commentId` and `DELETE …` → 200 (`{}` on delete), delegating to the commands after `requireBoard` + `assertBoardMember` + `requireTask`. No new error codes.

### D4: Title always opens; form follows `canEditTask`
`TaskCard` drops the `editable` gate on the title button (always a button opening the modal). The existing `canEditTask` logic moves inside the modal: the form always renders, but when it fails the fields render `disabled` and SAVE is hidden — conversation plus CLOSE remains. The modal widens in edit mode (`max-w-sm` → `max-w-md`) and is viewport-bounded (`max-h` with internal scroll so it never exceeds the screen); the `COMMENTS (N)` toggle below SAVE/CLOSE swaps the form for the thread (input on top, newest-first, Enter to create, no ADD and no SAVE while visible). Author label from the existing `members` map. Alternative (dedicated detail dialog, card popover) rejected: reuses the one existing entry point and all comment idioms from board-comments.

### D5: Independent form collapse, list-only scroll
The form header doubles as a collapse toggle (`showForm`, default true; effective form visibility is `editable && showForm && !commentsOpen`), so a large thread can take the room even without expanding comments first. Scrolling is confined to the comments list (`max-h-* overflow-y-auto`); the form never scrolls. Alternative (whole-modal scroll) rejected: the entry input would scroll away on long threads.

### D6: Single close X; visible busy on every comment mutation
No CLOSE button: one `[X]` top-right closes the modal (backdrop click kept). Every comment mutation shows busy: POST disables the entry and shows an inline spinner (re-entrant Enter/click guarded); PATCH/DELETE track a `busyCommentId` rendering a spinner on that row with its actions disabled (shared `InlineEdit` untouched); the remove dialog's YES disables with spinner while in flight. Failure restores the prior state plus the existing error message. Alternative (CLOSE + X both) rejected: two controls for one action.

## Risks / Trade-offs

- [Title button now opens a non-editable modal on frozen/terminal] → Mitigated: spec explicitly redefines the rule; existing tests asserting a hidden edit action are updated to assert disabled form and hidden SAVE instead.
- [Modal crowded with long threads] → Mitigated: form collapses when expanded; list scrolls internally (`max-h-* overflow-y-auto`).
- [Unbounded thread growth in the task document] → Accepted, same as boards.

## Migration Plan

Single release (backend + frontend; old clients ignore the new field). No data migration: tasks without comments read as `[]`. Rollback is revert.

## Open Questions

None. Auth matrix, endpoints, modal behavior, and ordering were decided in exploration.
