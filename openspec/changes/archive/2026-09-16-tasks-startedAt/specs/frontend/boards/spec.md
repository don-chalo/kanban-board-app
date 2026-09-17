## MODIFIED Requirements

### Requirement: Task card
A task card SHALL show the task's title (truncated when long) and its lifecycle state, an owner avatar showing the first letter of the owner's email with a tooltip revealing the full email, a right-side arrow that appears when the pointer hovers the card, and an always-visible priority badge showing only the initial letter (`L` for `low`, `M` for `medium`, `H` for `high`, `U` for `urgent`). The badge SHALL expose the full priority word via its accessible name and tooltip. A task without a priority SHALL render as `M`. The card SHALL show the start date as `YYYY-MM-DD` (the first 10 characters of `startedAt`) to the left of the owner avatar when `startedAt` is set; when `startedAt` is `null` or missing it SHALL show no date. The date SHALL expose the full ISO value via its accessible name and tooltip.

#### Scenario: Card shows title, state, and owner avatar
- **WHEN** a task card renders
- **THEN** the title, the state, and the owner's avatar are visible, and hovering the avatar shows the owner's email

#### Scenario: Long titles are truncated
- **WHEN** a task title exceeds the column width
- **THEN** the title is clipped with an ellipsis instead of wrapping

#### Scenario: Priority badge shows only the initial
- **WHEN** a task with priority `urgent` renders
- **THEN** the card shows a `U` badge that reveals `urgent` via tooltip and accessible name

#### Scenario: Missing priority renders as medium
- **WHEN** a task without a priority renders
- **THEN** the card shows an `M` badge

#### Scenario: Start date shows left of the avatar
- **WHEN** a task with `startedAt` `2026-09-16T10:00:00.000Z` renders
- **THEN** the card shows `2026-09-16` to the left of the avatar with the full ISO in its tooltip and accessible name

#### Scenario: Missing start date shows nothing
- **WHEN** a task with `startedAt null` renders
- **THEN** the card shows no date
