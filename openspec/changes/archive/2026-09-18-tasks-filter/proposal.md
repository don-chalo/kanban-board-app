## Why

On boards with many tasks, finding one means scanning five columns visually. A client-side text search narrows the visible cards instantly with zero backend changes.

## What Changes

- Board detail page gains a `Search tasks...` text field right-aligned on the `+ NEW TASK` row (fixed width, clear `x` action visible only with text).
- Typing filters cards across all five columns: a task stays visible when the query is contained in its title, description, lifecycle-state label, or owner email/id (case-insensitive); empty query shows everything.
- No counters are added or changed: column `(n)` counts and the effort summary always reflect total tasks, never the filtered view.
- Purely client-side over the already-loaded board: no requests, no debounce, no URL persistence.

## Capabilities

### New Capabilities

None. All behavior extends an existing capability.

### Modified Capabilities

- `frontend/boards`: board detail task columns gain text search.

## Impact

- Frontend only: `kanban-front-end/src/pages/BoardDetailPage.tsx` (query state, input, one extra `.filter`) plus `BoardDetailPage.test.tsx` coverage.
- No backend, API, or other spec changes.
