## 1. Data layer

- [x] 1.1 Add `searchUsers(prefix)`, `resolveUser(email)`, and `addBoardMember(boardId, memberId)` to `src/lib/api.ts`; verify vitest covers URL/method/header/body on success and non-ok rejection for each

## 2. Widget dependency

- [x] 2.1 `@radix-ui/react-combobox` does not exist on npm (404); per user decision the suggestion list is a custom component; `npm run build` passes

## 3. Add-member control

- [x] 3.1 Add the manager-only "+" action and inline email entry to the MEMBERS panel in `BoardDetailPage`: debounced `searchUsers` suggestions, commit flow (local duplicate check -> resolve a fresh email -> `addBoardMember` -> `loadBoard(false)`), inline errors, busy guard, Escape/blur cancel

## 4. DOM verification

- [x] 4.1 DOM tests (stubbed fetch) cover: "+" manager-only visibility both ways; suggestions render from search results; add normalizes case/whitespace, resolves, posts `{ member }`, refetches, and shows the member; picking a suggestion posts without a resolve call; duplicate email rejected locally with no request; add failure inline error; Escape cancels without adding

## 5. Verification sweep

- [x] 5.1 Run `npm test`, `npm run lint`, and `npm run build` together and verify all pass