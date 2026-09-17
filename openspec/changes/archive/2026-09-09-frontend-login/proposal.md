## Why

The web app (`kanban-front-end`) is an empty Vite scaffold with no UI. The first slice is the login page: let a user identify through an email (per the API's `POST /login` find-or-create contract) and land on an empty boards page that will grow into the real boards list.

## What Changes

- Add `tailwindcss` + `@tailwindcss/vite` and `react-router-dom` to the front-end.
- Matrix-like high-contrast theme: black background, yellow foreground, monospace type, defined via Tailwind `@theme`.
- New `/login` page: email field + submit button, form centered horizontally and vertically, with styled signup for the yellow-on-black palette (inputs, focus, error states).
- Hand-rolled email validation mirroring the API's normalization: trim + lowercase + format check; blank or malformed emails never fire a request.
- On valid submit: `POST /api/login` with `{ email }`. On `200` (returns `{ id, email }`), persist the identity to `localStorage` and redirect to `/boards`.
- New `/boards` route: placeholder page reading "Work in progress, future Boards list".
- Root route `/` redirects to `/login`.
- Remove template cruft (`App.css` reference and default assets).

The front-end calls the API directly at its origin (CORS is enabled by the separate `api-cors` change); no Vite proxy is used.

## Capabilities

### New Capabilities

- `frontend/login`: The web app shows a centered login form that validates an email, calls `POST /api/login` on submit, stores the returned identity, and redirects to a `/boards` placeholder route.

### Modified Capabilities

<!-- none -->

## Impact

- `kanban-front-end/package.json`: add `tailwindcss`, `@tailwindcss/vite`, `react-router-dom`.
- `kanban-front-end/vite.config.ts`: add the Tailwind plugin.
- `kanban-front-end/src/index.css`: Tailwind import + `@theme` palette and font.
- `kanban-front-end/src/App.tsx`: router setup with `/`, `/login`, `/boards`.
- New files: `src/pages/LoginPage.tsx`, `src/pages/BoardsPage.tsx`, `src/lib/validateEmail.ts`, `src/lib/session.ts`.
- Removed: `src/App.css` usage and default template assets.
- Depends on the API behavior of `POST /login` (already implemented server-side) and CORS access (the `api-cors` change).