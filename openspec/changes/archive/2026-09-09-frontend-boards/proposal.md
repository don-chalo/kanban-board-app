## Why

The web app's `/boards` route is still a placeholder while the API already exposes `GET /boards` (membership-scoped, no task payloads) and `POST /boards`. Boards are the first real product surface after login, so users currently can't see or create any. This change renders the board list, adds creation, guards the route, and lets a user switch accounts.

## What Changes

- **New `frontend/boards` capability** replacing the `/boards` placeholder with a real list page.
- Fetch and display the identified user's boards (`GET /boards` with the `X-User-Id` header), showing each board's title and lifecycle state, with loading, error, and empty states.
- Inline board creation (`POST /boards` with a title); blank titles are rejected client-side before any request, mirroring the API's validation.
- Auth guard on the boards routes: when no identity is stored, or the API rejects the stored identity with `401`, the app clears the session and redirects to `/login`.
- "Switch user" control that clears the session and returns to the login page.
- **BREAKING (frontend):** the "Boards placeholder page" requirement in the `frontend/login` spec is removed — the placeholder is superseded by the boards list.

## Capabilities

### New Capabilities

- `frontend/boards`: The web app shows the boards that belong to the identified user, lets them create a new board, requires an identified session on the boards routes, and provides a blank per-board detail route to be built out later.

### Modified Capabilities

- `frontend/login`: Removes the "Boards placeholder page" requirement (placeholder message is replaced by the real boards list).

## Impact

- `kanban-front-end/src/lib/api.ts`: add `listBoards()` and `createBoard(title)` attaching the `X-User-Id` header from the stored session.
- `kanban-front-end/src/pages/BoardsPage.tsx`: placeholder replaced with the real list, create form, states, and switch-user.
- `kanban-front-end/src/pages/BoardDetailPage.tsx` (new): blank detail route.
- `kanban-front-end/src/App.tsx`: route guard for `/boards` and `/boards/:boardId`, redirecting to `/login` without an identity.
- `kanban-front-end/src/lib/session.ts`: reused read-only (`readIdentity`, `clearIdentity`).
- No API changes; contracts already exist.