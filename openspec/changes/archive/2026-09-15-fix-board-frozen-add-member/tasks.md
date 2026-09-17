## 1. Domain guards

- [x] 1.1 Add `isBoardFrozen` guard to `manageBoard` `addMember` case in `kanban-api/src/domain/commands.ts` (throw `DomainError("read_only")` when `isBoardFrozen(board)`, matching `removeMember` pattern) and verify it does not fire on live boards
- [x] 1.2 Split `manageBoard` `editAttributes` title vs description in `kanban-api/src/domain/commands.ts` (if `title !== undefined && isBoardFrozen(board)` throw `read_only` atomically; `description`-only on frozen remains allowed; mixed `{title, description}` on frozen rejects) and verify `isBoardFrozen` is imported

## 2. Domain and spec-scenario tests

- [x] 2.1 Cover `addMember` frozen rejections in `kanban-api/src/domain/commands.test.ts` — `Blocked`, `Done`, `Cancelled` each throw `read_only`, live `To Do`/`InProgress` still succeeds, duplicates/creator checks still apply on live
- [x] 2.2 Cover `editAttributes` split in `kanban-api/src/domain/commands.test.ts` — `title` edit on `Blocked`/`Done`/`Cancelled` throws `read_only`, `description`-only on frozen succeeds, mixed `title+description` on frozen throws atomically with no partial apply
- [x] 2.3 Cover scenarios in `kanban-api/src/domain/spec-scenarios.test.ts` for frozen membership/title immutability

## 3. HTTP API tests

- [x] 3.1 Verify `POST /boards/:boardId/members` on frozen boards returns `409 read_only` in `kanban-api/src/routes/boardsRouter.test.ts` (one case per `Blocked`/`Done`/`Cancelled`, plus live success) and that `DELETE`/`reassign` frozen guards remain green
- [x] 3.2 Verify `PATCH /boards/:boardId` title on frozen returns `409 read_only` while description-only on frozen returns `200` and updates, and mixed `title+description` on frozen returns `409` with description unchanged, in `kanban-api/src/routes/boardsRouter.test.ts` (or `src/e2e/http-api.e2e.test.ts` if routing via e2e)

## 4. Frontend

- [x] 4.1 Hide MEMBERS `+` on frozen in `kanban-front-end/src/pages/BoardDetailPage.tsx` (`isManager && !frozen` at the `+` button, matching `removeMember` `x` guard) and verify `BoardDetailPage.test.tsx` covers `+` visible on live manager, hidden on `Blocked`/`Done`/`Cancelled` and for non-managers
- [x] 4.2 Keep title non-editable on frozen and make description editable on frozen in `kanban-front-end/src/pages/BoardDetailPage.tsx` (`title InlineEdit editable={isManager && !frozen}`, `description InlineEdit editable={isManager}`) and verify `BoardDetailPage.test.tsx` covers title plain-text on frozen, description still opens/saves on frozen, non-manager still plain-text
- [x] 4.3 Verify error surfacing for `addMember` `409` in `kanban-front-end/src/lib/api.test.ts` and `BoardDetailPage.test.tsx` member error path (stale-tab `POST` while frozen shows `memberError` without losing input)

## 5. Verification

- [x] 5.1 Run `npm test` in `kanban-api` and `kanban-front-end` and verify all 423+ tests pass with no regression
- [x] 5.2 Run `openspec validate --change fix-board-frozen-add-member --strict` and verify no errors
