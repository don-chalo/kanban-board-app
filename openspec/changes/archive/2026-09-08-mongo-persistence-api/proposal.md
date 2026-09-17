## Why

The domain rules exist as pure, tested TypeScript (`kanban-api/src/domain`), but nothing persists and nothing can be called: there is no database connection, no HTTP surface, and `src/index.ts` is an empty stub. This change connects MongoDB via Mongoose and exposes the domain through a REST API, making the product actually usable end to end.

## What Changes

- **MongoDB persistence (Mongoose)** in `kanban-api`: three collections named `users`, `boards`, and `tasks`, all using UUID string IDs. Boards and tasks live in **separate collections**; a repository layer assembles the board aggregate (board document + its task documents), runs the pure domain command, then diffs and saves the changed documents. Saves are best-effort and sequential — no multi-document transactions.
- **REST API** exposing every domain command:
  - Users: `POST /users` (create identity), `GET /users/:userId`.
  - Boards: `GET /boards` (list where the actor is a member), `POST /boards`, `GET /boards/:boardId`, `PATCH /boards/:boardId` (title/description/owner), `POST /boards/:boardId/state`, `POST /boards/:boardId/members`, `DELETE /boards/:boardId/members/:userId`, `GET /boards/:boardId/actions`.
  - Tasks (nested under the board aggregate): `GET /boards/:boardId/tasks`, `POST /boards/:boardId/tasks`, `GET /boards/:boardId/tasks/:taskId`, `PATCH /boards/:boardId/tasks/:taskId`, `POST /boards/:boardId/tasks/:taskId/state`, `POST /boards/:boardId/tasks/:taskId/owner`, `GET /boards/:boardId/tasks/:taskId/actions`, `DELETE /boards/:boardId/tasks/:taskId`.
- **Actor identity via `X-User-Id` header**: placeholder for a real auth layer (explicitly deferred). The actor must be a known user (401 otherwise); a known user without permission gets 403.
- **Uniform error contract**: every error returns `{ error: { code, message } }`, with each domain error code mapped to an HTTP status.
- **`next-actions` support**: `GET .../actions` returns the lifecycle states an entity may legally move to next (empty when read-only/terminal; the board Done gate filters `Done`).
- **Small domain extension** to support the richer board endpoint: `Board` gains a `description`; `editAttributes` becomes `{ title?, description? }`; a new **`reassignBoardOwner`** command lets the Creator/Owner transfer board ownership to another board member; a pure **`allowedTransitions`** helper powers `next-actions`.

## Capabilities

### New Capabilities
- `http-api`: The REST contract — endpoint inventory, `X-User-Id` actor identity, error responses, `next-actions`, and durable persistence of users/boards/tasks.

### Modified Capabilities
- `boards`: `Board` entity gains a `description` attribute; new BOARD-level requirement "Board ownership may be reassigned" (Creator/Owner only, target must be a member and leaves the Associated set).
- `access-control`: "Board management is reserved to the Board Creator/Owner" extends to editing the board description and reassigning board ownership; denial scenarios for Associated members.

## Impact

- `kanban-api`: new `models/`, `mappers/`, `repositories/`, `routes/`, `middleware/` layers; `app.ts` (testable, no `listen`) and a real `index.ts` entry; config for `MONGODB_URI`/`PORT`; domain extended (`description`, `reassignBoardOwner`, `allowedTransitions`). deps `express`, `mongoose` already declared; devDeps added: `supertest`, `@types/supertest`, `mongodb-memory-server`, `tsx`; scripts `dev`/`build`/`start`.
- `kanban-front-end`: unchanged (still the Vite stub), but this change defines the API contract it will later consume.
- Existing domain unit tests remain untouched; new tests cover the repository seam, `next-actions`, and full HTTP workflows.

### Assumptions recorded during exploration

- Change name provided as `mongo-persistante-api`; treated as a typo and created as `mongo-persistence-api`.
- **IDs**: UUID strings stored in Mongo `_id` fields — wire id, DB id, and domain id are one value.
- **Identity**: `X-User-Id` header stands in for real authentication/sessions (still deferred); the API validates the actor exists. Unknown actor → 401, insufficient permission → 403.
- **Separate collections, no transactions**: board + task changes are saved best-effort and sequentially; a re-read self-heals the short inconsistency window.
- **Board owner reassignment**: Creator/Owner only; target must be a board member; an Associated target leaves the Associated set; the Creator is never changed; frozen boards reject the transfer. Mirrors the existing task-owner reassignment rule.
- **`next-actions`**: returns raw lifecycle state values the entity may transition to; empty array for read-only/terminal entities; excludes `Done` on boards that fail the Done gate.