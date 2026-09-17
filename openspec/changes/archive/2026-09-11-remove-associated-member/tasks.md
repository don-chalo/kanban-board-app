## 1. Backend frozen gate

- [x] 1.1 Add an `isBoardFrozen` guard inside `manageBoard`'s `removeMember` case in `src/domain/commands.ts` (matching the `deleteTask` pattern, throwing `read_only`); verify domain tests cover removal on frozen boards (`Blocked`, `Cancelled`, `Done`) being rejected and removal on an unfrozen board still succeeding

## 2. Data layer

- [x] 2.1 Add `removeMember(boardId, userId)` to `src/lib/api.ts` deleting via `DELETE /boards/:boardId/members/:userId` and returning `Board` (throwing style like `addBoardMember`); verify vitest covers URL/method/headers on success, non-ok rejection, and that the response board is returned

## 3. Member removal UI

- [x] 3.1 Add the hover-reveal "X" action to associated member rows in the MEMBERS panel of `BoardDetailPage.tsx` (gated on `isManager && !frozen`, scoped to ids in `board.associated`, using Tailwind `group`/`group-hover`); verify via DOM tests that a manager sees the "X" on hover for associated members, a non-manager never does, and it is absent on frozen boards

- [x] 3.2 Wire the immediate removal path: clicking "X" on a member who owns no tasks calls `removeMember`, applies the returned board via `setBoard` (no refetch), and removes the row; on request failure the error shows in the `memberError` slot and the member stays; verify via a stubbed `DELETE` response

- [x] 3.3 Add a confirmation dialog (modeled on `NewTaskModal`) shown when the clicked associated member owns at least one task, naming the member with YES and CANCEL buttons; Yes runs the removal via the stubbed `DELETE` and applies the board, Cancel closes the dialog with no request; members without tasks skip the dialog; verify via DOM tests the dialog-on-task-owner, cancel-keeps-member, and immediate-removal-without-tasks cases

## 4. Verification sweep

- [x] 4.1 Update the board detail page stub to handle `DELETE /boards/:boardId/members/:userId` and run `npm test`, `npm run lint`, and `npm run build` in `kanban-front-end`; verify all pass

- [x] 4.2 Run `npm test`, `npm run lint`, and `npm run build` in `kanban-api`; verify all pass (including the new frozen-gate domain tests)