## Context

See proposal.md for motivation. `BoardDetailPage.tsx` renders five state columns from `board.tasks` with a per-column state filter plus priority sort feeding `TaskCard`. Owner emails are already resolved in the `members` map (loaded once via `POST /users/batch`). `STATE_LABELS` in `lib/states.ts` maps states to display labels. No backend changes.

## Goals / Non-Goals

**Goals:**
- Instant text search over visible cards, zero requests.

**Non-Goals:**
- Match highlighting, URL persistence, counters tied to the search, server-side search, filtering by anything not in the match corpus.

## Decisions

### D1: Single `useState` query, no debounce, no memo needed
The corpus is the loaded `board.tasks` (small N); filtering inline on each render is cheaper than the ceremony of debouncing or memoizing. Typing filters synchronously per keystroke. Alternative (debounced query state) rejected: only pays off for network calls; here it would add perceived lag.

### D2: Match corpus is title + description + state label + owner email/id
`STATE_LABELS[task.state]` covers the state dimension and `members.get(task.owner) ?? task.owner` covers the owner dimension with data already in memory — both cost zero requests (owner resolution was paid once at board load). Case-insensitive via `toLowerCase` on both sides, substring via `includes`; empty/blank query matches everything. Alternative (title + description only) rejected: user explicitly added state and owner at zero marginal cost.

### D3: Layout follows the agreed sketch
`+ NEW TASK` row becomes `justify-between`: button left, search input right at fixed width (`w-64`) with `aria-label="Search tasks"`, placeholder `Search tasks...`, and a clear `x` shown only with text. `panelError` position unchanged. Column `(n)` counts and the effort summary keep reading `board.tasks` directly, never the filtered list.

## Risks / Trade-offs

- [Query matching a state label surprises] → Accepted: e.g. `done` matches the DONE column; visible placement explains the match.
- [New task invisible under active query] → Accepted: same treatment as the boards list filters; clearing restores it.

## Migration Plan

Single-release frontend change; no backend, no data migration. Rollback is revert.

## Open Questions

None. Corpus, layout, and counting rules were decided in exploration.
