## 1. Domain and persistence

- [x] 1.1 Add the `Comment` entity (`id`, `author`, `text`, `createdAt`) and the pure `addComment` / `editComment` / `removeComment` commands (membership, author-or-manager, blank/2000-char validation, no frozen gate, `createdAt` stamp) and verify domain tests cover grants, denials, validation, and frozen-board CRUD
- [x] 1.2 Embed `comments` in the board document (model, mappers defaulting legacy boards to `[]`, aggregate assembly) and verify mapper/repository tests cover round-trip plus legacy boards reading as empty

## 2. Comment endpoints

- [x] 2.1 Implement `POST`, `PATCH`, and `DELETE /boards/:boardId/comments[/:commentId]` in `boardsRouter` (thin parsers delegating to the commands, correct 201/200/400/401/403/404 codes) and verify `boardsRouter.test.ts` covers create, edit, remove, validation, auth, frozen-board CRUD, and comments embedded in board detail

## 3. Comments section UI

- [x] 3.1 Render the `COMMENTS (n)` section below a min-height columns grid in `BoardDetailPage.tsx` (entry input on top with add, newest-first list with author/timestamp/text, edit/remove gated on author-or-manager reusing `InlineEdit` and the confirm dialog, refresh via `loadBoard`) and verify `BoardDetailPage.test.tsx` covers list order, create, inline blank rejection, author edit, manager edit of others, hidden actions for plain members, confirmed remove, and frozen-board CRUD

## 4. Verification

- [x] 4.1 Run `npm test` in `kanban-api` plus `npm test`, `npm run lint`, `npm run build` in `kanban-front-end` and verify all pass
