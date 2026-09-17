## Why

A task with no legal moves (frozen board, terminal task) still reveals a disabled ghost arrow when hovered, and a failed actions request is silently treated the same as "genuinely no moves". Users can't tell an inactive task from a broken one.

## What Changes

- Hide the task move arrow entirely when the actions lookup returns a genuinely empty legal-moves list.
- When the actions request fails, keep the arrow visible but disabled, so a transient error is not mistaken for a terminal/frozen task.
- The board detail page tracks which task action lookups failed separately from which returned empty, and passes that state to the task card.
- Update the `Task state move` requirement wording: no moves -> arrow NOT shown; lookup failure -> arrow shown disabled.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `frontend/boards`: modify the `Task state move` requirement (and its "No moves disable the arrow" scenario) to state that the arrow is hidden when no moves are legal and shown disabled when the moves lookup fails.

## Impact

- `kanban-front-end/src/pages/TaskCard.tsx` — conditional render of the move arrow based on moves state (empty -> hidden, failure -> disabled, else enabled).
- `kanban-front-end/src/pages/BoardDetailPage.tsx` — `loadTaskMoves` records failed task-action lookups separately from empty results.
- `kanban-front-end/src/pages/TaskCard.test.tsx`, `src/pages/BoardDetailPage.test.tsx` — tests updated from "disabled" to "absent" for empty moves, plus a new failure case.
- No backend changes: the API already returns `[]` for entities with no legal moves ("Terminal task has no next states").