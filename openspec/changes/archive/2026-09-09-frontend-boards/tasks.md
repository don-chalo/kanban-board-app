## 1. Data layer

- [x] 1.1 Add a `Board` type and an internal `authHeaders()` helper to `src/lib/api.ts`, then implement `listBoards()` returning `{ status: "ok"; boards: Board[] } | { status: "unauthorized" } | { status: "error" }`; verify vitest tests cover the success, 401, and other-failure outcomes and that the `X-User-Id` header is sent
- [x] 1.2 Implement `createBoard(title)` in `src/lib/api.ts` (POST with the `X-User-Id` header, throws on failure) and verify vitest tests cover success (returns the created board) and failure (rejects on non-2xx)

## 2. Guard and routing

- [x] 2.1 Add a `RequireAuth` wrapper (renders children when `readIdentity()` is non-null, otherwise redirects to `/login`) and apply it to `/boards` and `/boards/:boardId` in `src/App.tsx`; verify a vitest render test shows the redirect when no identity is stored and the page when one is
- [x] 2.2 Create `src/pages/BoardDetailPage.tsx` as a blank page and add the `/boards/:boardId` route; verify `npm run build` passes and the route renders without error

## 3. Boards page

- [x] 3.1 Rebuild `src/pages/BoardsPage.tsx`: fetch boards on mount with loading state, render title + lifecycle-state chip per board, show an empty state when there are none, show an error message on failure, and on `unauthorized` clear the session and redirect to `/login`; verify DOM tests (stubbed fetch) cover list render, loading, empty, error, and the 401 redirect
- [x] 3.2 Add the inline create form to `BoardsPage`: blank titles show an error with no request sent, a valid title creates the board and appends it to the list, and creation failures show an error; verify DOM tests cover both paths

## 4. Switch user

- [x] 4.1 Add a switch-user control on the boards page that clears the session and navigates to `/login`; verify a DOM test shows it clearing `todo.identity` and landing on the login view

## 5. Verification sweep

- [x] 5.1 Run `npm test`, `npm run lint`, and `npm run build` together and verify all pass with no type errors