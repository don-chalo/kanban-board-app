## Why

Board columns show only the state label (TO DO, IN PROGRESS, ...), so members cannot see workload distribution at a glance and must scan every card to count tasks.

## What Changes

- Each column header in `BoardDetailPage` renders `LABEL (n)` where `n` is the number of tasks currently in that lifecycle state.
- The `(n)` suffix is always visible, including `(0)` for empty columns.
- The `(n)` suffix uses an attenuated style (`opacity-60` span inside the existing header).
- Front-end only: no API changes, no `BoardsPage` changes, no change to the column `section` accessible name.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `frontend/boards`: the "Task columns" requirement gains per-column task counts in the header.

## Impact

- Affected code: `kanban-front-end/src/pages/BoardDetailPage.tsx` (column `h2` only), plus DOM test coverage in `BoardDetailPage.test.tsx`.
- No API, persistence, or routing changes. No dependency changes.
- Minor test churn accepted: existing header assertions use `section[aria-label]` and `toContain`, which keep working; new assertions for `(n)` / `(0)` will be added.
