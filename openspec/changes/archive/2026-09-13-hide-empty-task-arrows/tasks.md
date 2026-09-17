## 1. TaskCard arrow behavior

- [x] 1.1 Add a `movesFailed?: boolean` prop to `src/pages/TaskCard.tsx` and render the move `Select.Root` only when `movesFailed || moves.length > 0`, with `disabled={movesFailed || moves.length === 0}`; verify `TaskCard.test.tsx`: the existing "disables the arrow when no moves are legal" test now asserts the arrow is absent, a new test asserts a disabled arrow renders when `movesFailed` is true, and the enabled-dropdown tests are unchanged

## 2. Board page failure tracking

- [x] 2.1 Change `loadTaskMoves` in `src/pages/BoardDetailPage.tsx` to return `{ moves, failed }` (a `Map<taskId, LifecycleState[]>` plus a `Set<taskId>` of failed lookups), store both in state, and pass `movesFailed={failedTaskMoves.has(task.id)}` to each `TaskCard`; verify `BoardDetailPage.test.tsx` still treats frozen/empty-move cases as **no arrow** while a stubbed failing actions request shows a **disabled arrow** (add a stub option to make `GET .../tasks/:taskId/actions` return non-ok)

## 3. Test suite and sweep

- [x] 3.1 Run `npx vitest run` in `kanban-front-end` and verify all tests pass
- [x] 3.2 Run `npm run lint` and `npm run build` in `kanban-front-end` and verify they pass with no new warnings