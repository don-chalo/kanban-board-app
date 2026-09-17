## Why

Server-side trust is the core value of a shared kanban: frozen boards, lifecycle rules, and title invariants must hold regardless of what the UI shows. Two gaps let the API accept what the UI forbids — creating tasks on `Blocked` boards and blanking board titles via `PATCH` — plus a silent last-write-wins race on concurrent saves.

## What Changes

- **Forbid `createTask` on `Blocked` boards** — `createTask` SHALL check `isBoardFrozen()` (`Blocked` | `Cancelled` | `Done`) and throw `read_only` → HTTP `409`. Aligns backend with frontend (`+ NEW TASK` already disabled on frozen) and with `moveTask`/`editTask`/`deleteTask` which already use `isEditable`.
- **Validate `PATCH /boards/:boardId` title** — blank/whitespace-only `title` SHALL be rejected with `400 validation` and leave the board unchanged; non-blank titles SHALL be trimmed before apply. Mirrors `POST /boards` and `PATCH /tasks/:taskId` behavior. `description` remains free-form (blank allowed).
- **Document concurrency + auth limits (no code)** — record `load-mutate-replaceOne` last-write-wins and `X-User-Id` spoofability as known limitations; version-based optimistic concurrency deferred to follow-up.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `boards`: Task creation SHALL be rejected on frozen boards; board title SHALL never be blank.
- `http-api`: `POST /boards/:boardId/tasks` on `Blocked` SHALL return `409 read_only`; `PATCH /boards/:boardId` with blank title SHALL return `400 validation`.

## Impact

- **kanban-api** `src/domain/commands.ts` (`createTask` guard), `src/routes/boardsRouter.ts` (title trim + blank reject), domain + router tests. No DB migration, no new routes/codes.
- **kanban-front-end** no changes (already disables creation on frozen, rejects blank title inline).
- **Docs/specs** delta specs for `boards`, `http-api`. Concurrency/auth noted in design only.
