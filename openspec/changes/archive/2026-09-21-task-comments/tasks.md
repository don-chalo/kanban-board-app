## 1. Domain and persistence

- [x] 1.1 Add `comments: Comment[]` to `Task` plus `addTaskComment` / `editTaskComment` / `removeTaskComment` (membership, author-or-board-manager-or-task-owner, blank/2000-char validation, no frozen or terminal gate, `createdAt` stamp) and verify domain tests cover grants, denials, validation, and frozen-board plus terminal-task CRUD
- [x] 1.2 Embed `comments` in the task document (model, mappers defaulting legacy tasks to `[]`, no repository changes) and verify mapper tests cover round-trip plus legacy tasks reading as empty

## 2. Comment endpoints

- [x] 2.1 Implement `POST`, `PATCH`, and `DELETE /boards/:boardId/tasks/:taskId/comments[/:commentId]` in `tasksRouter` (thin parsers delegating to the commands, correct 201/200/400/401/403/404 codes) and verify `tasksRouter.test.ts` covers create, edit, remove, validation, auth, frozen-board CRUD, and comments embedded in task payloads

## 3. Task modal comments UI

- [x] 3.1 Render the task title as an always-visible entry point opening the modal in any state, and verify `BoardDetailPage.test.tsx` no longer expects a hidden edit action on frozen boards or terminal tasks but a modal with a disabled form and no SAVE
- [x] 3.2 Render the expandable `COMMENTS (N)` section in `TaskModal` edit mode (wider modal, form collapse on expand, entry input on top with Enter-to-create and no SAVE while visible, newest-first list with author/timestamp/text, edit/remove gated on author-or-manager-or-task-owner reusing `InlineEdit` and the confirm dialog) and verify `TaskModal.test.tsx` covers expand/collapse, order, create, inline blank rejection, author/manager/task-owner edits, hidden actions for unrelated members, confirmed remove, and frozen-board plus terminal-task conversation
- [x] 3.3 Add `comments` to the frontend `Task` type plus `createTaskComment` / `editTaskComment` / `removeTaskComment` in `lib/api.ts` with fixtures updated, and verify `api.test.ts` covers the three calls and their failures

## 4. Verification

- [x] 4.1 Run `npm test` in `kanban-api` plus `npm test`, `npm run lint`, `npm run build` in `kanban-front-end` and verify all pass

## 5. Modal close, form, and busy refinements

- [x] 5.1 Replace the CLOSE button with a top-right X, always render the edit form disabled with SAVE hidden when not editable, bound the modal to the viewport, add independent form collapse, and confine scrolling to the comment list in `TaskModal.tsx`, and verify `TaskModal.test.tsx` covers X close, disabled form without SAVE, form collapse, and list-only scroll
- [x] 5.2 Show busy state on comment create, edit, and remove (disabled entry plus inline spinner, row spinner with disabled actions, dialog YES disabled with spinner, no duplicate requests, restore on failure) and verify `TaskModal.test.tsx` covers busy on all three mutations
- [x] 5.3 Run `npm test`, `npm run lint`, `npm run build` in `kanban-front-end` and verify all pass
