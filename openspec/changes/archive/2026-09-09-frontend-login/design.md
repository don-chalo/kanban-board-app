## Context

`kanban-front-end` is a fresh Vite 7 + React 19 + TypeScript scaffold (swc plugin), currently empty. No router, no Tailwind, no tests. The API already implements `POST /login` (find-or-create, always `200 { id, email }`, `400` only when an email is missing/blank) and will send CORS headers once `api-cors` lands. The SPA will call the API at its own origin, e.g. `http://localhost:3000`. See `proposal.md` for motivation; the contract is `specs/frontend/login/spec.md`.

## Goals / Non-Goals

**Goals:**
- A login page whose email validation mirrors the API's rules (trim + lowercase + format) so valid-in-UI equals valid-on-server.
- End-to-end login: form → `POST /api/login` → persist identity → redirect to `/boards`.
- A matrix-like high-contrast theme (black/yellow) wired through Tailwind v4 `@theme`, with the form centered on screen.

**Non-Goals:**
- Real boards list content (placeholder only).
- Auth gating/protected-route logic (any email is a valid identity; `X-User-Id` on future API calls is a later concern).
- Password or existing-user flows.
- A backend proxy: the browser talks to the API directly over CORS.

## Decisions

- **Tailwind v4 via the official Vite plugin** (`tailwindcss` + `@tailwindcss/vite`), theme defined in `@theme` (`--color-*`, monospace font) and imported with `@import "tailwindcss"` in `index.css`. v4 needs no `tailwind.config.js` for this setup.
  - Alternatives: PostCSS + config-based v3 (fine, but v4 is the current release and the Vite plugin is the intended path).
- **`react-router-dom` with declarative routes**, not a `useState` switch. Two real routes now (`/login`, `/boards`), `/` navigates to `/login`. Pays off when the boards page grows.
  - Alternatives: manual state/conditional render (zero deps, but no URLs, no navigation primitives).
- **Hand-rolled `validateEmail`** in `src/lib/validateEmail.ts` mirroring the API: trim, lowercase, then a simple email format check (`/.+@.+\..+/` after normalization). Returns `{ ok, value, error? }` so the caller always works with the normalized value.
  - Alternatives: `zod` + `react-hook-form` (adds two dependencies for a single field); native `type="email"` (styling/UX inconsistent with the theme).
- **Identity stored in `localStorage`** (key `todo.identity`, value `{ id, email }`) on a `200`. Survives refresh and is trivially read by future pages for the `X-User-Id` header. `src/lib/session.ts` owns the read/write.
  - Alternatives: `sessionStorage` (lost on tab close); in-memory context (lost on refresh; would require re-login on every reload).
- **API base as a small exported constant** (`src/lib/api.ts`) defaulting to `http://localhost:3000/api`, overridable by an env var later. Direct cross-origin call via `fetch`; on `200` parse `{ id, email }`, otherwise surface an error message and keep the form usable.
- **Loading + error states on the submit button**: disabled while the request is in flight; errors rendered below the field in the yellow/black palette (inverted alert style).
- **Template cleanup**: drop `App.css` usage and default Vite/react SVG imports; App.tsx becomes the router.

## Risks / Trade-offs

- [Any origin can read public API responses via CORS] → Accepted; the API has no credential-based confidentiality (see `api-cors` design).
- [Hand-rolled regex rejects/accepts some edge emails the server would handle differently] → Mitigated by normalizing exactly like the server (trim + lowercase); format check is deliberately lenient.
- [`localStorage` identity could be stale/forged] → Non-issue for this app: the API treats `X-User-Id` as self-declared; there is no token to leak.
- [Dev CORS works only if the API is running on :3000] → Both `npm run dev` processes are a documented prerequisite; errors show a friendly message if the request fails.
- [Cold Tailwind v4 setup footguns (e.g., plugin order, content globbing)] → v4 auto-detects sources; verified during implementation by `npm run build`.

## Migration Plan

- Library install (`tailwindcss`, `@tailwindcss/vite`, `react-router-dom`), configure plugin, replace `index.css`/`App.tsx`, add pages + lib modules, `npm run build` + `npm run lint`. No deploy steps (local Vite app). Rollback: restoring the scaffold's files.

## Open Questions

None — deferred items (boards list, `X-User-Id` on API calls, protected routes) are explicit non-goals.