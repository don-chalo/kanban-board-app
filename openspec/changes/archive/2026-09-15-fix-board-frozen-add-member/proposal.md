## Why

Adding Associated members currently succeeds on a frozen board (`Blocked`, `Cancelled`, `Done`) while removing members is rejected with `409 read_only`. This inconsistency lets a terminal board gain new collaborators after it should be immutable and contradicts the expected frozen/terminal read-only semantics. The same gap applies to board title edits (description is intentionally exempted).

## What Changes

- **Forbid `addMember` on frozen boards** — `manageBoard` `addMember` SHALL check `isBoardFrozen()` (`Blocked` | `Cancelled` | `Done`) and throw `read_only` → HTTP `409` with `{error:{code:"read_only"}}`. Mirrors existing `removeMember`/`reassignBoardOwner` guards.
- **Split `editAttributes` title vs description** — Editing `title` on a frozen board SHALL be rejected with `409 read_only`; editing `description` on a frozen board SHALL remain allowed (intentional exception to `Boards: Cancelled read-only`). A `PATCH /boards/:boardId` that includes `title` while frozen SHALL reject atomically (no partial apply of `description`).
- **Frontend hide `+` on frozen** — MEMBERS `+` affordance visible only to Creator/Owner **and** when not frozen. Title InlineEdit hidden on frozen; description InlineEdit remains offered to Creator/Owner even when frozen (blank description accepted, blank title rejected inline before request).

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `boards`: Board membership and attribute rules — frozen boards SHALL NOT gain new Associated members; title SHALL NOT be mutated on frozen boards while description MAY be.
- `http-api`: Board membership and attribute endpoints — `POST /boards/:boardId/members` and `PATCH /boards/:boardId` (with `title`) SHALL return `409 read_only` on `Blocked`/`Cancelled`/`Done`.
- `frontend/boards`: Member-addition and board title/description editing affordances — `+` hidden on frozen boards; title edit hidden on frozen boards; description edit remains visible on frozen boards.

## Impact

- **kanban-api** `src/domain/commands.ts` (`manageBoard` `addMember` + `editAttributes` title guard), `src/domain/guards.ts` reuse, `src/routes/boardsRouter.ts` (no new route; existing `DomainError`→409 mapping covers it), domain and router tests.
- **kanban-front-end** `src/pages/BoardDetailPage.tsx` (MEMBERS `+` condition `isManager && !frozen`, title `editable={isManager && !frozen}`, description `editable={isManager}`), `src/lib/api.ts` error propagation unchanged.
- **Docs/specs** delta specs for `boards`, `http-api`, `frontend/boards`. No DB migration.
