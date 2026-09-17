## 1. Setup

- [x] 1.1 Confirm the baseline is green before any change: `npm test` and `npx tsc --noEmit` pass in `kanban-api`
- [x] 1.2 Add devDependencies `supertest`, `@types/supertest`, `mongodb-memory-server`, `tsx` and scripts `dev` (`tsx watch src/index.ts`), `build` (`tsc`), `start` (`node dist/index.js`) and verify install succeeds and `npx tsc --noEmit` stays clean

## 2. Domain extension

- [x] 2.1 Add `description: string` to the `Board` entity, seed `""` in `createBoard`, and change `editAttributes`/`ManageBoardChange` to `{ title?, description? }` and verify the updated domain unit tests pass while the existing suite stays green
- [x] 2.2 Implement `reassignBoardOwner(board, actor, newOwner)` (authorized to Creator/Owner, rejects frozen boards, target must be a member, Associated target leaves the Associated set, Creator never changes) in `src/domain/commands.ts` and verify unit tests cover every grant/denial from the boards and access-control delta specs
- [x] 2.3 Implement the pure `allowedTransitions` helper (task and board variants; empty for terminal or board-frozen entities; `Done` only when the board Done gate passes) and verify unit tests cover live, blocked, terminal, frozen, and Done-gate cases
- [x] 2.4 Update `src/domain/fixtures.ts` and the scenario tests to cover board `description` and board-owner reassignment per the boards and access-control deltas and verify the full `npm test` suite (domain + new) passes

## 3. Models and mappers

- [x] 3.1 Add `src/config.ts` reading `MONGODB_URI` and `PORT` from env with sane defaults and verify it loads from env and defaults correctly
- [x] 3.2 Define Mongoose schemas `User`, `Board`, `Task` (uuid string `_id`; `tasks.boardId` index; board membership indexes on creator/owner/associated) and verify models compile and a basic create/read round-trip works against a test database
- [x] 3.3 Implement pure `mappers/` functions mapping docs to domain objects and back (user, board, task) and verify round-trip unit tests pass

## 4. Repositories

- [x] 4.1 Implement `userRepo` (`create`, `findById`) and verify integration tests cover create/read and the missing-user case
- [x] 4.2 Implement `boardRepo.loadBoardAggregate(boardId)` (board doc + task docs hydrated into a domain `Board`) and `listBoardsForMember(userId)` and verify aggregation and membership-scoped listing tests pass
- [x] 4.3 Implement the task diff-save in `saveBoardAggregate` (new ids → insert, changed → update, absent → delete) and verify the full insert/update/delete matrix tests pass

## 5. Middleware and error handling

- [x] 5.1 Implement the actor middleware that resolves `X-User-Id` to a known user (unknown → 401 `{error:{code:"unknown_actor",...}}`) and verify the 401 cases via supertest
- [x] 5.2 Implement the error middleware mapping rejected promises to the code→status table (401/403/404/409/400) with `{error:{code,message}}` bodies and a 500 fallback, and verify mapping tests pass

## 6. Routes

- [x] 6.1 Implement the users router (`POST /users`, `GET /users/:userId`) and verify via integration tests the http-api spec user scenarios pass
- [x] 6.2 Implement the boards router (`GET /boards` membership-scoped, `POST /boards`, `GET /boards/:boardId`, `PATCH` for title/description/owner, `POST /boards/:boardId/state`, `POST /boards/:boardId/members`, `DELETE /boards/:boardId/members/:userId`) and verify integration tests cover creation, listing scope, detail, attribute/owner patching, lifecycle with the Done gate, membership changes, and 403/404/409 responses
- [x] 6.3 Implement the tasks router nested under boards (`GET`/`POST` tasks, `GET`/`PATCH`/`DELETE` task, `POST .../state`, `POST .../owner`) and verify integration tests cover create/read/edit/delete, owner reassignment, move rules, and read-only/terminal rejections
- [x] 6.4 Implement the next-actions endpoints (`GET /boards/:boardId/actions`, `GET /boards/:boardId/tasks/:taskId/actions`, members only) and verify integration tests cover live, terminal, and blocked entities

## 7. App wiring and verification sweep

- [x] 7.1 Implement `src/app.ts` (`buildApp(repos)` returning an Express app without listening) and `src/index.ts` (connect to Mongo, then listen) and verify the app builds and boots reading `MONGODB_URI`/`PORT`
- [x] 7.2 Add an end-to-end integration test file mirroring the http-api spec scenarios against `mongodb-memory-server` + `supertest` (identity, durability across a restart, users, boards, tasks, next-actions, error contract) and verify every scenario has a passing test
- [x] 7.3 Run `npx tsc --noEmit` and `npm test` and verify the entire suite passes with no type errors