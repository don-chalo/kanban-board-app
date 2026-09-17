## 1. Shared find-or-create

- [x] 1.1 Add `resolveUserByEmail(email)` to `UserRepository` (trim + lowercase, `findByEmail`, else `create` with duplicate-key recovery); refactor `POST /login` to use it; verify existing login tests pass and add unit tests covering found, created, duplicate-race, and normalized emails

## 2. Prefix search

- [x] 2.1 Add `searchByEmailPrefix(prefix, limit)` to `UserRepository` returning up to 8 matching identities via an escaped `^` regex on normalized email, exact match first (lexical tiebreak); unit tests cover prefix match, case-insensitivity, exact-first ordering, and empty results

## 3. Resolve endpoint

- [x] 3.1 Add `POST /users/resolve` route that validates a non-empty `email` body (400 otherwise) and returns the identity from `resolveUserByEmail`; route tests cover created, existing, validation, and 401 for unknown actor

## 4. Search endpoint

- [x] 4.1 Add `GET /users?email=` route that validates a non-empty `email` query (400 otherwise) and returns up to 8 identities from `searchByEmailPrefix`; route tests cover matches, exact-first ordering, 400 without query, and 401 for unknown actor

## 5. Auth wiring

- [x] 5.1 Introduce an authenticated users sub-router using `createActorMiddleware`, carrying `GET /users/:userId`, the search route, and the resolve route; `POST /login` remains headerless; migrate `GET /users/:userId` to the middleware and verify 401 behavior

## 6. Verification sweep

- [x] 6.1 Run the API test suite, build, and `openspec validate` together and verify all pass