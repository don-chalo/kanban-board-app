## Why

As the number of boards grows, the boards page shows a single unfiltered list in fetch order, forcing users to scan everything to find a board. Client-side filtering and sorting makes the list usable with zero backend changes.

## What Changes

- Boards page gains a filter bar between the create form and the list:
  - Multi-state filter: five toggle chips (ToDo, InProgress, Done, Blocked, Cancelled); all active means no filtering.
  - Owner filter and creator filter: autocomplete text fields reusing the `GET /users?email=<prefix>` + `searchUsers` pattern from board detail; selecting a suggestion filters by that user id; a chip with a clear action shows the selection.
  - Sort controls: field select (Title | State) plus explicit direction select; state order follows the canonical `COLUMN_ORDER`; title compares case-insensitively.
  - Counter `SHOWING X OF Y` right-aligned on the sort row, plus a `CLEAR` action visible whenever any filter or non-default sort is active.
  - Distinct empty state when filters match nothing (`NO BOARDS MATCH THE CURRENT FILTERS`), keeping the existing no-boards empty state untouched.
- Filter + sort state persists in the URL query (`?states=…&owner=…&creator=…&sort=…&dir=…`), shareable and surviving reloads; typing in autocomplete fields does not touch the URL, only selections do (history `replace`).
- Derived entirely client-side with `useMemo` over the fetched `Board[]`; no API changes.

## Capabilities

### New Capabilities

None. All behavior extends an existing capability.

### Modified Capabilities

- `frontend/boards`: boards list gains filtering, sorting, URL persistence, and the filtered-empty state.

## Impact

- Frontend only: `kanban-front-end/src/pages/BoardsPage.tsx` (filters, sort, URL sync) plus `BoardsPage.test.tsx` coverage.
- No backend, API, or spec changes outside `frontend/boards`.
