## 1. Data layer

- [x] 1.1 Add a unique index on the `email` field of the user schema in `src/models/index.ts` and verify `UserModel.schema.indexes()` includes the unique email index
- [x] 1.2 Add `findByEmail(email)` to the `UserRepository` interface and `createMongoUserRepository`, and verify a repo test covers finding an existing user by email and returning `null` for an unknown email

## 2. Router change

- [x] 2.1 Implement email normalization (`trim().toLowerCase()`) and replace `POST /users` with `POST /login` find-or-create in `src/routes/usersRouter.ts`, always responding `200` with `{ id, email }`, catching duplicate-key races by re-reading `findByEmail`, and keeping `GET /users/:userId` unchanged; verify `usersRouter.test.ts` covers first-login creation (200), repeat-login returning the same id, case/whitespace-normalized email, missing/blank email → 400, and `GET /users/:userId` still self-checks `X-User-Id`

## 3. Test updates

- [x] 3.1 Update `boardsRouter.test.ts`, `tasksRouter.test.ts`, and `app.test.ts` to use `POST /login` instead of `POST /users` and adjust any `201` expectations to `200`; verify all three route test files pass
- [x] 3.2 Update `src/e2e/http-api.e2e.test.ts` (create helpers, identity scenarios, and restart-durability test) to log in via `POST /login`; verify the e2e file passes including the server-restart durability test

## 4. Verification sweep

- [x] 4.1 Run `npx tsc --noEmit` and `npm test` and verify the entire suite passes with no type errors
- [x] 4.2 Run `openspec validate email-login` and verify the change is valid with synced main specs showing the new `POST /login` behavior