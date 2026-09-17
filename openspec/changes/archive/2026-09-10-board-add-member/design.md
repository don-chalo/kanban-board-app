## Context

`BoardDetailPage` already owns the board fetch/refetch cycle (`loadBoard`), the identity-panel `MEMBERS` list, the `members` email map (via `resolveMemberEmails`), and the `isManager` gate used for the task owner field. The backend contract arrives with the `user-search-and-resolve` change: `GET /users?email=` (search) and `POST /users/resolve` (find-or-create), plus the existing `POST /boards/:boardId/members`.

## Goals / Non-Goals

**Goals:**
- Manager-only "+" on the MEMBERS panel opening an inline autocomplete email entry.
- Commit path: pick a suggestion or type a fresh email -> resolve identity (suggestion id, or `resolveUser` create) -> `addBoardMember` -> refetch -> new member visible in the MEMBERS list and task owner options.
- Inline errors (duplicate, creator/owner, unknown/failed request) without losing the typed email.

**Non-Goals:**
- No member removal UI (the DELETE endpoint exists but is a later change).
- No backend changes; relies on `user-search-and-resolve` being available.

## Decisions

1. **Widget: Radix Combobox.** `@radix-ui/react-combobox` gives type-ahead over server results *and* free-text entry, which is required because a fresh email must be resolvable/creatable. Plain `@radix-ui/react-select` only offers preset choices and cannot express "type an email that isn't a suggestion". Fallback if the package proves unusable: a text `<input>` + a Radix Select suggestion list fed per keystroke, with Enter committing either a selection or the typed email.
2. **Querying.** Debounce typing ~200ms, then `searchUsers(prefix)`; render up to 8 suggestions. Keep the last results so the chosen value's id is available without a second write call.
3. **Client API.** Add to `api.ts`, matching existing throwing style: `searchUsers(prefix): Promise<UserIdentity[]>`, `resolveUser(email): Promise<UserIdentity>` (POST `/users/resolve`), `addBoardMember(boardId, memberId): Promise<Board>` (POST `/boards/:boardId/members`).
4. **Commit flow in `BoardDetailPage`.** Normalize the email (trim/lowercase) and reject locally with "already a member" when it maps to an existing member email — no request. Otherwise use the picked suggestion's id or `resolveUser(email)`, then `addBoardMember`. On success: `loadBoard(false)` and clear the field, keeping the entry open so several members can be added in a row; on any failure: inline error, keep the value.
5. **Guardrails.** `addBusy` disables submit and ignores repeat Enter; Escape or blur (while idle) closes the entry without adding. A `+` renders only when `isManager`; associates see the plain list, matching the spec.

## Risks / Trade-offs

- [Backend reachability] -> the frontend fetches search/resolve/add; without the backend change deployed the adds fail. Ordering: ship `user-search-and-resolve` first; DOM tests stub fetch so they pass either way.
- [Debounce latency] -> 200ms is below perceived-threshold for typing; acceptable.
- [New Radix dependency (combobox)] -> small, tree-shaken; the Select+input fallback exists if it misbehaves in happy-dom tests.
- [Element enumeration privacy] -> backend-side concern, already accepted with the user.

## Migration Plan

Feature-flagged behind nothing; ships with the page. Rollback: revert the MEMBERS-panel component; backend endpoints remain harmless.

## Open Questions

None.