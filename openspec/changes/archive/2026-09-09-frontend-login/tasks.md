## 1. Setup and theming

- [x] 1.1 Add dependencies (`tailwindcss`, `@tailwindcss/vite`, `react-router-dom`) and register the Tailwind Vite plugin in `vite.config.ts`; verify `npm install` succeeds and `npm run build` still passes
- [x] 1.2 Replace `src/index.css` with `@import "tailwindcss"` plus an `@theme` block defining the black/yellow high-contrast palette and a monospace font; remove template cruft (`App.css` import, default Vite/React assets); verify `npm run lint` and `npm run build` pass
- [x] 1.3 Add `vitest` as a dev dependency and a `test` script in `package.json`; verify `npm test` runs (no tests yet is fine at this step)

## 2. Logic modules

- [x] 2.1 Implement `src/lib/validateEmail.ts` (trim + lowercase + format check, returning the normalized value or an error) and verify vitest tests cover: blank rejected, malformed rejected, valid with surrounding whitespace/case normalized, valid plain email accepted
- [x] 2.2 Implement `src/lib/session.ts` (store and read `{ id, email }` in `localStorage` under `todo.identity`) and verify vitest tests cover storing, reading back, and clearing state
- [x] 2.3 Implement `src/lib/api.ts` with a base URL (default `http://localhost:3000/api`) and a `login(email)` function calling `POST /api/login`; verify a unit test covers the `200` success path and the error path

## 3. Pages and routing

- [x] 3.1 Replace `src/App.tsx` with a router: `/` redirects to `/login`, `/login` renders `LoginPage`, `/boards` renders `BoardsPage`; verify `npm run build` passes and a manual check shows `/login` on start
- [x] 3.2 Create `src/pages/BoardsPage.tsx` rendering the "Work in progress, future Boards list" placeholder; verify it appears at `/boards`
- [x] 3.3 Create `src/pages/LoginPage.tsx` with a form centered horizontally and vertically in the yellow-on-black theme: email field, submit button, validation error below the field, in-flight disable, and on success `navigate("/boards")`; verify `npm run lint` and `npm run build` pass and a manual check covers valid login → boards redirect, invalid email → inline error with no request, and failed API call → error message kept on page

## 4. Verification sweep

- [x] 4.1 Run `npm test`, `npm run lint`, and `npm run build` together and verify all pass with no type errors