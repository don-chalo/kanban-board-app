## Context

`usersRouter` already find-or-creates an identity by email inline in `POST /login` (normalize, `findByEmail`, create with duplicate-key race handling) and resolves by id via `GET /users/:userId` with a manual `x-user-id` check. `boardsRouter` uses `createActorMiddleware` for auth. The boards member endpoint consumes `userId`, so an email -> identity bridge (search + resolve) is the missing surface.

## Goals / Non-Goals

**Goals:**
- Expose email -> identity as a read-only prefix search (`GET /users?email=`) and as a find-or-create resolve (`POST /users/resolve`).
- Make `/login` and `/users/resolve` share one upsert path so the email-to-identity guarantee cannot fork.
- Keep both new endpoints behind `X-User-Id` auth, matching the rest of the API.

**Non-Goals:**
- No new domain concepts: identity stays `{ id, email }`; no membership or board behavior changes.
- No fuzzy/substring search, pagination, or ordering beyond "exact first".
- Frontend consumption lives in the separate `board-add-member` change.

## Decisions

1. **Two endpoints, never one.** Search must be side-effect free — a GET that find-or-creates would mint an identity on every keystroke of autocomplete. `GET /users?email=` searches; `POST /users/resolve` owns creation.
2. **Shared upsert helper.** Add `resolveUserByEmail(email)` to `UserRepository`: trim + lowercase, `findByEmail`, else `create` with the existing duplicate-key (`11000`) recovery. Refactor `POST /login` to call it. Alternative considered: keep login inline and duplicate the logic — rejected because it risks the "same email, one identity" invariant drifting.
3. **Search semantics.** Prefix match against stored normalized (lowercase) emails using an escaped `^` regex with no case-insensitive flag, so the email index is usable (stored emails are already lowercase). Cap results at 8, exact match surfaced first (lexical tiebreak). Server enforces the cap to bound payload and latency.
4. **Auth placement.** Apply `createActorMiddleware(userRepo)` to an authenticated users sub-router that carries `GET /users/:userId`, `GET /users`, and `POST /users/resolve`; `POST /login` stays headerless. This also lets `GET /users/:userId` drop its hand-rolled header check.
5. **Errors.** Missing/empty `email` query or body -> `ApiError("validation", ...)` (400). Unknown/missing actor -> 401 from the middleware. These match the existing error-contract codes.

## Risks / Trade-offs

- [Authenticated prefix search is a mild email directory] -> any logged-in user can probe prefixes; accepted for the product, decided with the user.
- [Refactoring `/login` could regress the identity guarantee] -> mitigate with the existing login test coverage plus new helper unit tests.
- [Case-insensitive regex would scan the whole collection] -> avoided: emails stored lowercase, plain `^` regex keeps index usage.
- [Resolve/create race on concurrent first use] -> same `11000` recovery already proven in login, moved into the shared helper.

## Migration Plan

Additive routes and helper only; no data migration. Rollback: revert the route additions and keep the extracted helper (login behavior unchanged).

## Open Questions

None. (Suggestion ordering beyond exact-first is a lexical implementation detail.)