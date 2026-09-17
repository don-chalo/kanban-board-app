## Why

Users experience "log in" as typing their email and seeing their boards and tasks. Today `POST /users` mints a brand-new identity on every call, so the same email produces many distinct user documents that cannot see each other's data. Email should be the account key: the same email must always resolve to the same user identity.

## What Changes

- **BREAKING**: Remove `POST /users`. Replace it with `POST /login`, which accepts `{ email }` and find-or-creates the user identity by email, always returning `200` with the user's `{ id, email }`.
- Emails are normalized (trimmed and lowercased) so `Alice@X.com` and `alice@x.com` are the same account.
- The `users` collection enforces a **unique index on email**, so two concurrent first logins cannot create duplicate identities; a duplicate-key race resolves to the existing identity.
- `GET /users/:userId` is unchanged and remains the way to retrieve a known identity.
- No other endpoint changes: after login the client continues to send `X-User-Id` as today.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities
- `http-api`: The "User identity endpoints" requirement changes — `POST /login` (find-or-create, always 200) replaces `POST /users`; `GET /users/:userId` is retained.
- `users`: The "Unique user identity" requirement changes — each email SHALL map to exactly one user identity, created on first login and reused on subsequent logins.

## Impact

- **API**: `POST /users` removed; `POST /login` added (breaking for any caller of the old endpoint).
- **Code**: `kanban-api/src/routes/usersRouter.ts` (route rewrite); `kanban-api/src/repositories/userRepo.ts` (add `findByEmail`); `kanban-api/src/models/index.ts` (unique email index).
- **Tests**: `usersRouter.test.ts`, `boardsRouter.test.ts`, `tasksRouter.test.ts`, `app.test.ts`, and `e2e/http-api.e2e.test.ts` switch from `POST /users` to `POST /login` and treat the response as always `200`; new cases for repeat-login idempotence and email normalization.
- **Specs**: updated main specs `openspec/specs/http-api/spec.md` and `openspec/specs/users/spec.md` (via deltas in this change).