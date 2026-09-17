## Context

See proposal.md — Why. `BoardDetailPage.tsx:445-450` renders the five columns from `COLUMN_ORDER` with a bare-label `h2` (`STATE_LABELS[state]`, `opacity-80`) and a `section[aria-label]` keyed to the same label. `board.tasks` (already fetched by `loadBoard`) is the single source of truth; the per-column `<ul>` already filters it by state. Tests (`BoardDetailPage.test.tsx:260`) locate columns via `section[aria-label]`, so keeping that attribute stable avoids churn.

## Goals / Non-Goals

**Goals:**
- Show `LABEL (n)` in every column header, always including `(0)`, with `(n)` attenuated (`opacity-60`).
- Derive counts locally from `board.tasks`; no API or state-shape change.

**Non-Goals:**
- No `BoardsPage` change, no new endpoints, no shared column component, no i18n of the `(n)` format.

## Decisions

- **Inline `filter().length` per column over a memoized counts map.** The grid maps 5 states over `board.tasks` (typically tens of items); a second `filter` per column is O(5*N) and reads obviously next to the `<ul>` filter. Alternative (single `useMemo` counts map) saves one pass but adds indirection for no measurable gain.
- **`<span className="opacity-60">({count})</span>` nested in the existing `h2`.** Keeps the label styling untouched and scopes attenuation to the suffix only. Alternative (split `h2` opacity into label `opacity-100` + suffix `opacity-60`) would hit an exact 60% but changes the label's current look; nested span preserves it with one line. Note the effective opacity multiplies with the parent `opacity-80` (~0.48); accepted as "atenuado" per the request.
- **Leave `section aria-label={STATE_LABELS[state]}` unchanged.** Keeps the existing test helper and avoids diverging the accessible name from the established column identity; the visible `h2` carries the count. Alternative (append `(n)` to the label) would force every `section(...)` helper call to change for no a11y gain.
- **Counts follow `loadBoard(false)` refetches.** Move/create/edit already refetch, so headers re-render in sync with no extra subscription or optimistic update.

## Risks / Trade-offs

- [Text-match tests] New `(n)` text inside `h2` could break exact-match header assertions → Mitigation: existing suite uses `section[aria-label]` + `toContain`, which keep passing; only add new `toContain('(n)')` / `(0)` assertions.
- [Opacity stacking] Nested `opacity-60` inside `opacity-80` renders dimmer than a flat 60% → Mitigation: accepted per scope; revisit only if visual review finds it too faint.
