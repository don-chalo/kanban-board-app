## 1. Data layer

- [x] 1.1 Add `updateBoard(boardId, input: { title?: string; description?: string })` to `src/lib/api.ts` returning `Board` via `PATCH /boards/:boardId`, sending only the provided fields (throwing style like `moveBoard`); verify vitest covers URL/method/header/body on success, partial-field bodies, and non-ok rejection

## 2. Inline edit control

- [x] 2.1 Add a reusable `InlineEdit` component (`src/components/InlineEdit.tsx`) with click-to-edit, autofocus + select-all, Enter-commit, Escape/blur-cancel, `busy` guard, and an `onSave` prop; verify its own vitest/DOM test covers commit, cancel (Escape and blur), busy ignoring repeat Enter, and value not lost on cancel

## 3. Wiring on the board detail page

- [x] 3.1 Replace the description paragraph in `BoardDetailPage` with an `InlineEdit` gated on `isManager && !frozen`, saving via `updateBoard(boardId, { description })` and applying the returned board with `setBoard` (no refetch); blank description saves as empty; verify the placeholder "(no description)" returns after clearing

- [x] 3.2 Replace the `h1` title in `BoardDetailPage` with an `InlineEdit` gated on `isManager && !frozen`, saving via `updateBoard(boardId, { title })` and applying locally; reject blank/whitespace titles inline with no request; verify the heading and breadcrumb both reflect the new title via the shared `board.title`

- [x] 3.3 Surface save failures as an inline error on the field with the previous value restored, distinct from `panelError`; verify via a stubbed non-ok PATCH response

## 4. DOM verification

- [x] 4.1 Verify via DOM tests (stubbed fetch): manager sees click-to-edit on title and description; non-manager sees plain text with no affordance; a frozen board (`Blocked`, `Cancelled`, `Done`) shows no editing for a manager; Enter commits and updates in place; Escape and blur cancel without a request; blank title is rejected with no request for any of title or description; save failure surfaces an inline error and leaves the displayed value unchanged

## 5. Verification sweep

- [ ] 5.1 Run `npm test`, `npm run lint`, and `npm run build` together and verify all pass