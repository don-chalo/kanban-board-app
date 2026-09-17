## Why

Adding members to a board by email requires translating a typed email into a user identity, but the API can only resolve users by id (`GET /users/:userId`) or via the login upsert. An explicit search + find-or-create pair closes that gap so the board-add-member frontend change can turn an email into a board member.

## What Changes

- Add `GET /users?email=<prefix>` returning up to 8 matching users (prefix, case-insensitive) to power autocomplete; any authenticated user may search.
- Add `POST /users/resolve` with `{ email }` that returns the existing identity for that email or creates a new one, mirroring `POST /login` find-or-create semantics; available to any authenticated user.
- Factor the find-or-create-by-email logic (normalize, lookup, race-safe create) into a shared repo/service helper used by both `/login` and `/users/resolve` so the email-to-identity guarantee never forks.
- Both new endpoints require the `X-User-Id` header (missing or unknown actor -> 401), consistent with the rest of the API; `/login` stays headerless.

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `http-api`: add the user search and resolution endpoint contract (queries, bodies, responses, auth and error codes).
- `users`: extend the unique identity requirement so an identity is also found-or-created on resolve, not only on login, and add search over identities.

## Impact

- `kanban-api`: `usersRouter` gains the two routes; `UserRepository` gains a prefix-search method and a shared `resolveUserByEmail` helper reused by `/login`; the email index supports prefix lookup; tests added for search, resolve, auth, and errors.
- No frontend impact in this change (consumed next by `board-add-member`).