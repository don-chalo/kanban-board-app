## 1. Data layer

- [x] 1.1 Extend `updateBoard(boardId, { title?, description?, owner? })` in `kanban-front-end/src/lib/api.ts` to send `owner` in the PATCH body when provided (mirroring the `updateTask` pattern); verify `api.test.ts` covers: owner included in the body on success, owner omitted when not provided, and non-ok responses rejecting with `Update board failed (status)`

## 2. OWNER dropdown in the identity panel

- [x] 2.1 In `src/pages/BoardDetailPage.tsx` render the OWNER row as a Radix Select (same chrome as BOARD STATE) when `isManager && !frozen`: options from `[board.creator, board.owner, ...board.associated]` deduped with labels from `members`, current owner preselected and disabled; otherwise render the existing plain-value span; verify `BoardDetailPage.test.tsx` asserts the dropdown appears for a manager on a live board and plain text for a non-manager and on a frozen board
- [x] 2.2 Wire the select's `onValueChange` to call `updateBoard(boardId, { owner })` and `setBoard(result)` locally, surfacing failures in `panelError`; verify `BoardDetailPage.test.tsx` asserts a member pick sends a PATCH with `{ owner: <id> }` and the OWNER label updates to the new member

## 3. Test suite and sweep

- [x] 3.1 Run `npx vitest run` in `kanban-front-end` and verify all tests pass (including new owner-dropdown cases and unchanged suites)
- [x] 3.2 Run `npm run lint` and `npm run build` in `kanban-front-end` and verify they pass with no new warnings