## 1. Task card coherence

- [x] 1.1 Migrate the story-points badge to the Radix `Tooltip` (priority-badge pattern), replace the state line with a conditional plain-text `COMMENTS (N)` count, and remove the native `title` from the started-at date in `TaskCard.tsx`, and verify `TaskCard.test.tsx` covers the Radix tooltip, the count rule (shown only with comments), and the dateless native title, updating any `BoardDetailPage.test.tsx` assertions on the card's state line

## 2. Verification

- [x] 2.1 Run `npm test`, `npm run lint`, `npm run build` in `kanban-front-end` and verify all pass
