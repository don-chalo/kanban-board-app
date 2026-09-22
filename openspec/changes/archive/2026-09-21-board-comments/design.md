## Context

See proposal.md for motivation. Boards persist as an aggregate (`board` document + `task` documents) assembled by `boardRepo`; mutations go through pure domain commands (`manageBoard`, `moveBoard`, …) that throw `DomainError` codes mapped to HTTP statuses (`read_only`/`invalid_transition`/`board_not_done` → 409, `validation` → 400). The front `BoardDetailPage` already owns the patterns this feature reuses: `InlineEdit` for in-place editing, the remove-member `YES`/`CANCEL` dialog for confirmed deletes, and the `members` email map for author display. No backend changes.

## Goals / Non-Goals

**Goals:**
- Board comments CRUD with author-or-manager authorization, frozen-board included.
- `Comment` shape reusable verbatim for task comments later.

**Non-Goals:**
- Task comments, comment reactions/threads, pagination, rich text, attachments.

## Decisions

### D1: Comments embedded in the board aggregate
`Board` gains `comments: Comment[]` (`{ id: UUID, author: UserId, text, createdAt: ISO }`); the board document embeds them, so `GET /boards/:boardId` returns the thread with zero new read paths and `saveBoardAggregate` persists it with the existing best-effort sequential save. Newest-first is a read-time sort (store append-only). Alternative (separate `comments` collection with `targetType/targetId`) rejected: doubles the repository surface for a thread that is always read with its board; the polymorphic need only arrives with task comments, which can embed identically.

### D2: Domain commands `addComment` / `editComment` / `removeComment`
Pure functions on `(board, actor, …)` following the `manageBoard` pattern: membership check (`unauthorized` → 403), blank/overlong text (`validation` → 400), author-or-manager check for edit/remove (`unauthorized` → 403), missing comment (`not_found` → 404). Deliberately NO `isBoardFrozen` gate — full CRUD on frozen boards per the confirmed scope. `createdAt` stamps at creation with the same injectable-clock approach as task `startedAt`; edits do not touch author or timestamp.

### D3: Thin routes under the confirmed base
`POST /boards/:boardId/comments` → 201; `PATCH /boards/:boardId/comments/:commentId` → 200 with the updated comment; `DELETE …` → 200 `{}`. Routers stay thin parsers (body validation, id lookup) delegating to the commands, mirroring `tasksRouter`. Error codes reuse the existing contract; no new codes.

### D4: Frontend section reuses three existing patterns
`COMMENTS (n)` section below the columns grid (which gains a `min-h-*` so the header stays visible); entry input + `> ADD` on top; list newest-first; `InlineEdit` for author/manager edits; remove-member-style confirm dialog for deletes; visibility of edit/remove gated on `comment.author === actorId || isManager`. Author label from the existing `members` map (fallback raw id). List refreshes via the existing `loadBoard(false)` after each mutation — no new fetch paths.

## Risks / Trade-offs

- [Unbounded thread growth inside the board document] → Accepted for v1 (boards are small; pagination is an explicit non-goal). A 2000-char cap bounds per-comment size.
- [Concurrent edits last-write-wins] → Accepted: same semantics as title/description edits today.
- [Frozen-board edits surprise API consumers] → Mitigated: spec states it explicitly; error contract unchanged otherwise.

## Migration Plan

Single release (backend + frontend together; old clients ignore the new `comments` field). No data migration: existing boards read as `comments: []`. Rollback is revert.

## Open Questions

None. Location, ordering, auth matrix, frozen behavior, and limits were decided in exploration.
