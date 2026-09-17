## Context

The front-end is a Vite + React + TS app with `react-router-dom`, Tailwind v4 (matrix theme), and a small `src/lib` layer (`login`, `session`, `validateEmail`). The `/boards` route currently renders a centered placeholder. The API already provides `GET /boards` (membership-scoped, no task payloads) and `POST /boards` (title required, returns the created board); both require the `X-User-Id` header, which CORS now permits. See `proposal.md` for motivation; the contract is `specs/frontend/boards/spec.md`.

## Goals / Non-Goals

**Goals:**
- Render the membership-scoped board list with per-board title + lifecycle state, plus loading / error / empty states.
- Inline board creation with blank-title validation before the request.
- Protect the boards routes: no identity or a `401` leads to login (with session cleared).
- A switch-user control and a blank `BoardDetailPage` stub.

**Non-Goals:**
- Board detail content, editing, member management, or lifecycle actions (next change).
- Pagination or search (the list is small; the API returns the full membership set).
- Emailing/N+1 member resolution: the list renders ids/ownership markers only, no per-member `GET /users/:userId` calls.

## Decisions

- **Extend `src/lib/api.ts` with `listBoards()` and `createBoard(title)`**, and resolve the actor id inside those functions from `readIdentity()` (synchronous localStorage read). Add a small internal `authHeaders()` helper so the `X-User-Id` header lives in one place; `login()` keeps building its own plain headers.
  - Alternatives: pass the identity into each call from the component (noisier call sites); a global fetch wrapper (over-abstraction for two calls).
- **`listBoards()` returns a result union** (`{ status: "ok"; boards: Board[] } | { status: "unauthorized" } | { status: "error" }`) instead of throwing, so the page can branch obsessively on `401` (clear session + redirect) vs other failures. `createBoard()` throws on failure (the page maps it to an error message).
  - Alternatives: throwing a typed `ApiError` with status everywhere — heavier for a single 401-vs-else split.
- **Route guard as a small `RequireAuth` wrapper** in `App.tsx`: renders `children` when `readIdentity()` is non-null, otherwise `<Navigate to="/login" replace />`. Applied to `/boards` and `/boards/:boardId`. The 401-at-fetch-time path (stale identity) is handled inside `BoardsPage` after `listBoards()` returns `unauthorized`.
  - Alternatives: a full auth context/provider (unwarranted now; identity is a single localStorage read).
- **`BoardsPage` fetches in `useEffect`** with `loading` / `error` / `boards` state; inline create form validates via `trim().length === 0` (blank-title check), calls `createBoard`, then appends the returned board to the list (no refetch). A per-board state chip uses the theme palette; boards the user owns get a "YOU" marker (compare `creator`/`owner` to the stored id).
- **Switch user** calls `clearIdentity()` then `navigate("/login")`; shown in the page header alongside the logged-in email.
- **Blank board detail route**: `<Route path="/boards/:boardId">` renders a page shell and nothing else, matched by `<Link>` navigation from list cards.

## Risks / Trade-offs

- [Stale localStorage identity after DB wipes] → Handled: `401` clears the session and redirects to login; the user re-identifies (find-or-create) on next login.
- [Two windows editing boards concurrently] → Out of scope; the list is read-only after fetch. Acceptable for this slice.
- [Boards sorted in server order] → Fine for now; the list shows them as returned. Alpha/sort-by-state can come with the detail change.

## Migration Plan

- Front-end only: extend `api.ts`, add `BoardDetailPage`, rebuild `BoardsPage`, add `RequireAuth`, verify `npm test`, `npm run lint`, `npm run build`. No data migration. Rollback: revert the app files; the API is untouched.

## Open Questions

None — deferred items (detail page content, editing, lifecycle actions) are explicit non-goals.