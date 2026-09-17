## 1. Domain guard

- [x] 1.1 Switch `createTask` in `kanban-api/src/domain/commands.ts` to `isBoardFrozen(board)` (throw `read_only`) and verify domain tests cover `Blocked`/`Done`/`Cancelled` rejections plus live success
- [x] 1.2 Cover frozen creation in `kanban-api/src/domain/spec-scenarios.test.ts` and verify scenarios pass

## 2. HTTP API validation

- [x] 2.1 Trim + blank-reject `title` in `PATCH /boards/:boardId` in `kanban-api/src/routes/boardsRouter.ts` (empty → `400 validation`, no mutation) and verify router tests cover blank reject, trim, and unchanged-on-reject
- [x] 2.2 Verify `POST /boards/:boardId/tasks` on `Blocked`/`Done`/`Cancelled` returns `409 read_only` in `kanban-api/src/routes/tasksRouter.test.ts` (or `boardsRouter.test.ts` if routed there) and that live creation still returns `201`

## 3. Verification

- [x] 3.1 Run `npm test` in `kanban-api` and verify all tests pass with no regression
- [x] 3.2 Run `openspec validate "trust-in-state-hardening" --strict` and verify no errors
