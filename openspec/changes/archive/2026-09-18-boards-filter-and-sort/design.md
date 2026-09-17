## Context

See proposal.md for motivation. `BoardsPage.tsx` fetches `Board[]` once via `listBoards()` and renders in fetch order; each board already carries `state`, `owner`, `creator`, `title`. `searchUsers(prefix)` in `lib/api.ts` plus the debounced autocomplete pattern in `BoardDetailPage.tsx` (~200ms) are reused as-is. `COLUMN_ORDER` in `lib/states.ts` is the canonical state order. No backend changes.

## Goals / Non-Goals

**Goals:**
- Filter (multi-state, owner, creator) + sort (title/state, explicit direction) fully client-side.
- URL-persisted, shareable view state.

**Non-Goals:**
- Member email resolution on this page beyond autocomplete suggestions (owner/creator display stays as-is).
- Server-side filtering, pagination, or text search over titles.

## Decisions

### D1: URL query as source of truth via `useSearchParams`
Params: `states` (comma-separated subset; absent or all five = unfiltered), `owner` / `creator` (user ids; selection writes, typing does not), `sort` (`title` | `state`, default `title`), `dir` (`asc` | `desc`, default `asc`). Writes use history `replace` to avoid spamming entries per keystroke/selection. Invalid values (unknown state, bad sort) are ignored back to defaults. Alternative (plain `useState`, ephemeral) rejected: user explicitly chose URL persistence.

### D2: Owner/creator autocomplete mirrors board detail
Text field + ~200ms debounce + `searchUsers` + suggestion list; selecting stores `{id, email}` and filters `board.owner === id` / `board.creator === id`; selected identity renders as a chip with a clear action. If the page loads with `?owner=<id>` but no cached email, the label resolves via `GET /users/:id` (existing `getUser`). Alternative (free-text match on raw ids) rejected: user chose the autocomplete UX; raw ids are not human-meaningful.

### D3: Single derived `useMemo` pipeline
`boards -> filter(states set AND ownerId AND creatorId) -> sort(field, dir) -> render`. Title compare via `localeCompare` with base sensitivity (render uppercases but data is mixed-case). State compare via `COLUMN_ORDER.indexOf`. A board created while a filter is active flows through the same pipeline (may be hidden; the always-visible counter explains why). Alternative (two chained memos) rejected: no measurable benefit at this list size.

### D4: Layout follows the agreed sketch
State chips row; owner + creator same row at 50/50 full width; sort selects left with `SHOWING X OF Y [CLEAR]` right-aligned on the same row (`justify-between`); `CLEAR` only when non-default; filtered-empty message distinct from no-boards message. Native controls (`select`, checkbox chips) matching existing xenon styling.

## Risks / Trade-offs

- [Autocomplete without selection filters nothing] → Mitigation: filter applies only on suggestion pick (documented in spec scenario); typing alone never empties the list.
- [Stale `owner` id in a shared URL for a deleted/unknown user] → Mitigation: label falls back to raw id; filter simply matches nothing.
- [Newly created board invisible under active filter] → Mitigation: counter stays visible; accepted per exploration.

## Migration Plan

Single-release frontend change; no backend, no data migration. Rollback is revert.

## Open Questions

None. Layout, URL shape, sort order, and direction were decided in exploration.
