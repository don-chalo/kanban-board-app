## 1. Dependencies

- [x] 1.1 Install `@radix-ui/react-select`, `@radix-ui/react-avatar`, and `@radix-ui/react-tooltip`; verify `npm run build` still passes

## 2. Data layer

- [x] 2.1 Extend `src/lib/api.ts` with the `Task` interface and retype `Board.tasks` as `Task[]`; add `getBoard()` (with the `ok | unauthorized | error` union) and `getUser()` (returns the user or `null` on 404); verify vitest covers the board 200, board 401, board error, and user-found/not-found outcomes and that the `X-User-Id` header is sent
- [x] 2.2 Add `boardActions()`, `taskActions()`, `createTask()`, `moveBoard()`, `moveTask()`, and `setTaskOwner()` to `src/lib/api.ts`; verify vitest covers success (matching URLs/methods/headers/body) and non-ok rejection for each

## 3. Member resolution

- [x] 3.1 Add a helper that builds a `Map<userId, email>` for `creator + owner + associated` via parallel `getUser` calls, falling back to the raw id for unknown users; verify vitest covers the happy path and the fallback

## 4. Page shell and identity panel

- [x] 4.1 Rebuild `src/pages/BoardDetailPage.tsx`: fetch the board on mount with the `BoardsPage` state machine (loading / error / 401 clears session and redirects to `/login`), render the large title, the description line with a "(no description)" placeholder when empty, and the identity panel (creator, owner, members); verify DOM tests (stubbed fetch) cover list render with resolved member emails, the empty-description placeholder, and the 401 redirect
- [x] 4.2 Add the board state select to the identity panel using `@radix-ui/react-select` with the current state pinned as a disabled item and legal moves from `boardActions()` as the selectable items; verify DOM tests cover offering legal moves only and terminal boards showing a disabled select with the current state still visible

## 5. Task columns and cards

- [x] 5.1 Render five columns (To Do, In Progress, Done, Blocked, Cancelled) and place each task card (resolved via the member map) in its state column; verify DOM tests cover grouping by state and empty columns rendering
- [x] 5.2 Build the task card: truncated title, state, bottom-right avatar (`Avatar.Fallback` letter) wrapped in a `Tooltip` with the full email, and a hover-revealed right arrow; verify DOM tests cover the avatar letter + tooltip text and that `truncate` is applied to long titles

## 6. Task state move

- [x] 6.1 Wire the card arrow to a dropdown of `taskActions()` results (same pinned-current + legal-moves pattern); choosing a target calls `moveTask()` and refetches the board so the card relocates; verify DOM tests cover offering legal moves, the relocate-on-move flow, and the arrow being disabled when no moves are legal

## 7. Task creation modal

- [x] 7.1 Add the "+" new-task action and a hand-rolled modal with a required title and optional description; verify DOM tests cover creating a task (posts title + optional description, appears in the To Do column after refresh) and blank-title rejection with no request
- [x] 7.2 Add the optional owner field, rendered only when the actor is the board creator or owner (two-step `createTask` + `setTaskOwner`), hidden otherwise; verify DOM tests cover the field for managers and its absence (plus self-owned tasks) for plain members

## 8. Read-only rendering

- [x] 8.1 Derive frozen/terminal rendering from the loaded board state: `Blocked`/`Cancelled`/`Done` disables the new-task button and task arrows; `Done`/`Cancelled` additionally locks the board select; verify DOM tests cover a blocked board and a done board

## 9. Verification sweep

- [x] 9.1 Run `npm test`, `npm run lint`, and `npm run build` together and verify all pass with no type errors