## Context

`TaskCard` renders a Radix Select move dropdown on every card; with an empty moves list it renders `disabled` (TaskCard.tsx:69-70), still revealing a ghost arrow on hover. `BoardDetailPage.loadTaskMoves` catches per-task failures and records them as `[]` (BoardDetailPage.tsx:33-39), so a transient API error is indistinguishable from a genuinely terminal/frozen task. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Hide the move arrow completely when the actions lookup genuinely returns no legal moves.
- Keep the arrow visible-but-disabled when the lookup fails, so a broken request is not mistaken for an inactive task.
- Model the two states separately in page state and pass the distinction to the card.

**Non-Goals:**
- No backend changes (`GET .../tasks/:taskId/actions` already returns `[]` for no-legal-moves).
- No retry affordance on the arrow (re-fetching is out of scope; a board reload recovers).
- No visual redesign of the enabled dropdown.

## Decisions

1. **Tri-state moves per task.** The card needs three outcomes — `enabled` (legal moves exist), `empty` (legal moves = `[]`), `failed` (lookup errored). Model this with two structures in the page: the existing `taskMoves: Map<taskId, LifecycleState[]>` plus a new `failedTaskMoves: Set<taskId>`.

2. **`loadTaskMoves` reports failures instead of swallowing them.** Change it to return `{ moves: Map<...>, failed: Set<...> }`, adding the task id to `failed` in the existing catch. `loadBoard` sets both pieces of state from the result.

3. **`TaskCard` gets a `movesFailed?: boolean` prop; the Select is rendered conditionally.**
   - `movesFailed` → render the Select `disabled` (today's look, telling the user the state is unknown).
   - `!movesFailed && moves.length === 0` → render no Select at all (no ghost on hover; the card is just title + state + avatar).
   - otherwise → the enabled dropdown as today.
   Alternative considered: a `LifecycleState[] | "error"` union in `taskMoves` — rejected because it forces an `"error"` case into every consumer of the map and muddies type boundaries; a parallel `Set` keeps the existing consumers unchanged.

4. **`disabled={moves.length === 0}` is retained on the rendered Select** as a defensive guard for the `movesFailed` branch.

## Risks / Trade-offs

- **Failure leaves no recovery via the arrow** → Acceptable; a board reload (`loadBoard`) re-attempts the lookup. Note in tasks.md that the failure case is covered by a stub returning a non-ok actions response.
- **Frozen board behavior stays correct** → The backend returns `[]` (not an error), so frozen/terminal cards hide the arrow; only genuine request failures show a disabled arrow.
- **Test churn** → Existing tests asserting a *disabled* arrow for empty moves (TaskCard.test.tsx, BoardDetailPage.test.tsx:480,493) must assert *absence* instead; this is intentional and covered by tasks.

## Migration Plan

Frontend-only change; deploy by updating `kanban-front-end`. Rollback is reverting the conditional render and the failed-set tracking. No data migration.