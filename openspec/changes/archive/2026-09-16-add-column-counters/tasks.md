## 1. Column header counts

- [x] 1.1 Render `LABEL (n)` in each column `h2` in `kanban-front-end/src/pages/BoardDetailPage.tsx` (count via `board.tasks.filter((task) => task.state === state).length`, `(n)` in a nested `span` with `opacity-60`, `section aria-label` unchanged) and verify `BoardDetailPage.test.tsx` asserts headers show `(1)` for a populated column and `(0)` for an empty one using the existing `section[aria-label]` helper
- [x] 1.2 Verify no API or `BoardsPage` changes and run `npm test`, `npm run lint`, `npm run build` from `kanban-front-end` until all pass
