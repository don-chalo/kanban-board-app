## 1. Domain lifecycle cut

- [x] 1.1 Split `ToDo`/`InProgress` arms in `lifecycle.ts` (`ToDo -> InProgress|Cancelled`, `Blocked -> InProgress` only) and verify `lifecycle.test.ts` covers `ToDo->Blocked` false, `Blocked->ToDo` false, `Blocked(InProgress)->InProgress` true
- [x] 1.2 Update domain suites depending on the old table (`commands.test.ts`, `guards.test.ts`, `spec-scenarios.test.ts`) and verify `kanban-api` domain tests pass

## 2. Transitions endpoint

- [x] 2.1 Implement `GET /transitions` derived from the domain (canonical casing, `frozenStates`, `Cache-Control`, actor auth) and verify contract tests cover table content, 401 unknown actor, and cache header
- [x] 2.2 Update router/e2e suites asserting old `ToDo` actions (`boardsRouter.test.ts`, `tasksRouter.test.ts`, `http-api.e2e.test.ts`) and verify they expect `[InProgress, Cancelled]` for `ToDo`

## 3. Users batch endpoint

- [x] 3.1 Add repository `findByIds` plus `POST /users/batch` (`{ids}` -> found-only `[{id,email}]`, 400 missing/non-array/over-100, 401 unknown actor) and verify `usersRouter.test.ts` covers ok, unknown-omitted, dedupe, 400, 401 cases

## 4. Frontend N+1 removal

- [x] 4.1 Add `getTransitions`/`batchUsers` to `lib/api.ts`, switch `members.ts` to one batch call with id fallback, and verify `members.test.ts` plus `api.test.ts` cover batch ok/failure
- [x] 4.2 Replace per-entity `loadTaskMoves`/`boardActions` in `BoardDetailPage.tsx` with table-derived moves (frozen/terminal locally, optimistic board `Done`), drop hardcoded `FROZEN_BOARD_STATES`, map `board_not_done` to a gate message, and verify `BoardDetailPage.test.tsx` covers table-driven moves, `ToDo` without `Blocked`, disabled arrow on table failure, and gate message

## 5. Verification

- [x] 5.1 Run `npm test`, `npm run lint`, `npm run build` in `kanban-api` and `kanban-front-end` and verify all pass (pre-existing failures noted: `config.test.ts` env, `boardsRouter.ts` strict-null build error, durable-restart e2e flake — all reproduce on clean main)
