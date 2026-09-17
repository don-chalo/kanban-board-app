## 1. Search field and filtering

- [x] 1.1 Add the right-aligned `Search tasks...` input with conditional clear action to the `+ NEW TASK` row in `BoardDetailPage.tsx` and verify rendering matches the agreed layout sketch
- [x] 1.2 Filter cards by query across title, description, state label, and owner email/id (case-insensitive substring; empty matches all) while leaving column counts and the effort summary on totals, and verify `BoardDetailPage.test.tsx` covers title, description, state, owner, case-insensitivity, and clear-restore cases

## 2. Verification

- [x] 2.1 Run `npm test`, `npm run lint`, `npm run build` in `kanban-front-end` and verify all pass
