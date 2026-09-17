## Context

The pure, tested domain layer in `kanban-api/src/domain` is the single source of truth for entities, roles, lifecycles, cascade, and authorization (see the archived `core-domain-model` change). Express 5 and Mongoose are already declared dependencies but nothing persists and `src/index.ts` is an empty stub. This change adds MongoDB persistence plus a REST surface that is a thin shell over the existing commands. See proposal.md - Why.

## Goals / Non-Goals

**Goals:**
- Persist users, boards, and tasks in MongoDB and expose every domain command over HTTP.
- Keep the domain i/o-free: all Mongo models, mapping, aggregate assembly, and diff-saving live behind a repository seam.
- Make the whole API integration-testable without a running server or a real MongoDB.
- Add the minimal domain extension (`Board.description`, `reassignBoardOwner`, `allowedTransitions`) the richer endpoints need.

**Non-Goals:**
- Real authentication/sessions/JWT — the `X-User-Id` header is a deliberate placeholder (deferred change).
- Any frontend work — the API contract is defined here for the frontend to consume later.
- Multi-command transactions, pagination, rate limiting, or CORS configuration.

## Decisions

### D1: Three separate collections with UUID string `_id`s
```
users   { _id, email }
boards  { _id, title, description, creator, owner, associated[], state, previousState }
tasks   { _id, boardId, creator, owner, title, description, state, previousState }
        index: tasks.boardId; boards.{creator, owner, associated}
```
The wire id, the Mongo `_id`, and the domain id are one UUID string value. Mongoose schemas declare `_id: String`; `tasks.boardId` is indexed for the aggregate join.
- *Alternative considered:* embedding tasks inside the board document — rejected by decision (separate collections), and would grow the board doc and complicate per-task writes.
- *Alternative considered:* ObjectId `_id`s — rejected: three identity spaces (hex id vs domain string) leaking into every DTO; string UUIDs keep all layers aligned.

### D2: Repository seam — assemble aggregate, run domain command, diff-save
```
load   boards.findById —──────┐
       tasks.findByBoardId ────┤→ toDomain → Board{tasks[]}
                               v
                     run pure command  (authorize/state/guards)
                               v
persist  boards: save board doc           (title/description/owner/assoc/state)
         tasks:  new ids → insert · changed → update · absent → delete
```
`repositories/` exposes `loadBoardAggregate(boardId)`, `saveBoardAggregate(board)`, `userRepo.findById/create`, `listBoardsForMember(userId)`. `mappers/` are pure `doc ↔ domain` functions, unit-tested on their own.
- *Alternative considered:* routes mutating Mongoose documents directly — rejected: enforcement must run through the domain commands, and a single seam keeps that guarantee checkable.

### D3: Best-effort sequential saves — no transactions
Board save, then task diff, applied in order in the same request handler. No Mongo transactions.
- *Alternative considered:* replica-set transactions (`mongod --replSet`, `mongodb-memory-server` replicateSet) — rejected: added ops complexity for a millisecond-wide inconsistency window that a re-read heals and that only the board's own tasks occupy.

### D4: `X-User-Id` header as actor identity
A middleware reads `X-User-Id` and looks the user up in the `users` collection. Unknown identity → **401** `{error:{code:"unknown_actor",...}}`; known user lacking permission → **403** (from the domain `unauthorized` code). The header is the seam a future real-auth change plugs in behind.
- *Alternative considered:* no identity validation at all — rejected: "non-member has no access" becomes untestable and actors could impersonate freely.

### D5: Uniform error contract
One error-handling middleware maps every rejected promise to `{status, body: {error:{code,message}}}`:

| code | HTTP |
|---|---|
| `unknown_actor` (API layer) | 401 |
| `unauthorized` | 403 |
| `not_found` | 404 |
| `invalid_transition`, `board_not_done`, `read_only` | 409 |
| `member_required`, `duplicate_member`, `not_associated`, `cannot_modify_creator` | 400 |
| body-parse / Mongo validation failures | 400 |

### D6: `next-actions` via a pure `allowedTransitions` helper
In the domain (`lifecycle.ts`/`guards.ts`): returns the legal target states for a task or board. Empty when the entity is terminal or the board is frozen; for a board, `Done` is included only when `boardCanBeDone` passes. Routes serve it without re-deriving rules.

### D7: `app.ts` factory → integration-testable API
`buildApp({ userRepo, boardRepo, taskRepo })` returns an Express app and never calls `listen`. `index.ts` reads env (`MONGODB_URI`, `PORT`), connects, and calls `listen`. Express 5 async handlers forward rejections to the error middleware.
- *Alternative considered:* routes constructing their own models/repos — rejected: dependency injection is what lets tests swap in `mongodb-memory-server`.

### D8: Domain extension for board attributes and ownership
- `Board` gains `description` (initial `""`); `createBoard` seeds it; `editAttributes` becomes `{ title?, description? }`.
- New command `reassignBoardOwner(board, actor, newOwner)`: authorized via `Action.ManageBoard`, rejects frozen boards (`isBoardFrozen`), requires the target to be a board member, removes the target from `associated` when present, and never changes the Creator — mirroring `reassignTaskOwner`.
- `PATCH /boards/:boardId` accepts `{ title?, description?, owner? }` and dispatches to `editAttributes` and/or `reassignBoardOwner`.

## Risks / Trade-offs

- [Best-effort multi-doc saves can leave a transient board/task mismatch] → Change window is one request, only affects the board's own tasks, and any failed step fails the request so a re-read shows the old state; document order keeps board attributes/state consistent with the task diff.
- [TS 7 strict plus Express 5 async typing friction] → Echo `async (req, res) => …` signatures once in a typed route helper; all handlers return promises so rejections reach the error middleware.
- [`mongodb-memory-server` downloads a mongod binary (Windows)] → Dev-only dependency; falls back to a locally installed Mongo if present; skipped in domain-only unit tests.
- [Long nested routes (`/boards/:boardId/tasks/:taskId/...`)] → Accepted: matches the aggregate and the domain's load-whole-board model; routers are layered (`boardsRouter` mounts `tasksRouter`).
- [Repository diff logic can drift from domain behavior] → Diff is driven by ids only; mappers and `saveBoardAggregate` have dedicated tests, including the insert/update/delete matrix.

## Migration Plan

Greenfield — no existing data or endpoints. Ship order: domain extension (D8 + `allowedTransitions`) with tests → models/mappers → repositories → middleware/routes → `app.ts`/`index.ts` → integration tests. Rollback is `git revert`; storage is disposable in a dev database.

## Open Questions

- CORS/origins and pagination for `GET /boards` — deferrable until the frontend consumes the API.
- Real auth replacing the `X-User-Id` header — a dedicated future change; the header seam (D4) is the replacement point.