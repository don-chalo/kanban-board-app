## 1. Filter bar UI

- [x] 1.1 Add multi-state chips, owner/creator autocomplete fields (50/50 row), sort field + direction selects, `SHOWING X OF Y` counter with conditional `CLEAR`, and the filtered-empty state to `BoardsPage.tsx`, and verify rendering matches the agreed layout sketch
- [x] 1.2 Derive the visible list with a `useMemo` filter-then-sort pipeline (states set AND owner/creator ids; title `localeCompare` base sensitivity; state via `COLUMN_ORDER`) and verify unit coverage for each filter, their combination, each sort, and the counter

## 2. URL persistence

- [x] 2.1 Sync filter/sort state with the URL query via `useSearchParams` (`states`, `owner`, `creator`, `sort`, `dir`; history `replace`; invalid values fall back to defaults; typing never writes) and verify reload/share restores the view plus label resolution for `owner`/`creator` ids via `getUser`

## 3. Verification

- [x] 3.1 Extend `BoardsPage.test.tsx` (filter by state/owner/creator, combined filters, title and state sorts both directions, clear reset, filtered-empty vs no-boards states, URL round-trip) and verify the suite passes
- [x] 3.2 Run `npm test`, `npm run lint`, `npm run build` in `kanban-front-end` and verify all pass
