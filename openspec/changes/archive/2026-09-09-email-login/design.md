## Context

The API identifies callers by `X-User-Id`; identities are minted today via a public `POST /users { email }` that always inserts a fresh document with a new UUID (`usersRouter.ts`, `userRepo.create`). `GET /users/:userId` self-checks the header. Storage is Mongo via Mongoose; the user schema currently has no email index. Motivation is in proposal.md - Why; the observable contract lives in the `http-api` and `users` delta specs.

## Goals / Non-Goals

**Goals:**
- Make login idempotent: same email always resolves to the same user identity.
- Keep `X-User-Id` as the identity mechanism for boards/tasks; change nothing downstream.
- Add one DB-level guarantee that two concurrent first logins cannot create duplicates.
- Preserve the existing error contract (400 for a missing/blank email).

**Non-Goals:**
- Real authentication (passwords, tokens, email verification) - the design deliberately keeps email-only login with no proof of ownership.
- Schema changes beyond the users collection.

## Decisions

- **D1 - `POST /login` is find-or-create in the route.** Look up `findByEmail(email)`; if found return it; if not, `create` a fresh identity and return it. Response is always HTTP 200. _Alternative considered:_ `findOneAndUpdate` upsert - rejected because it forces UUID generation into the driver and muddies the repository's create/find semantics.
- **D2 - Unique index on `users.email`.** This is what makes "one identity per email" enforceable; without it, two concurrent logins can both pass the `find` and double-create. `create` catches the duplicate-key error (code 11000) and re-reads `findByEmail` to return the existing identity, keeping login idempotent under races.
- **D3 - Normalize emails in the route** (`trim().toLowerCase()`) before lookup and before persist, so `Alice@X.com` and `alice@x.com` collide to one identity. _Alternative considered:_ a Mongoose pre-save hook - rejected for being implicit; the route is the single place all emails enter.
- **D4 - `POST /users` is removed, not kept alongside.** Keeping both mint and login paths would split identity creation and re-open the duplicate-identity footgun. Callers migrate to `POST /login` (breaking by design, flagged in the proposal).
- **D5 - Always 200, never 201.** Login is a read-with-create-if-absent; the caller is not told whether the identity pre-existed (product decision from exploration). This also means no call-site branching on creation status.

## Risks / Trade-offs

- **Unique index build fails if a dev Mongo already holds duplicate emails** (possible from earlier `POST /users` usage) → One-time cleanup of the `users` collection before index creation; the index is created by Mongoose on model init.
- **Broadening "who is this email" to "whoever typed it first".** First-claim-wins identity is a known trade-off of email-only login → Accepted as a non-goal; documented so a future auth layer can layer on top.
- **`POST /users` callers break.** In-repo callers (route, middleware, and tests) all switch to `POST /login` within this change; external clients must migrate.

## Migration Plan

1. Deploy the unique index on `users.email` (dedupe collection first if needed).
2. Ship the router change (remove `POST /users`, add `POST /login`).
3. Rollback: restore `POST /users` mint behavior on the router; the index can stay (it only constrains future inserts).

## Open Questions

None - the design decisions were resolved during exploration.