## ADDED Requirements

### Requirement: Boards list filtering and sorting
The web app SHALL let the user filter the boards list by lifecycle state (multi-select across all states), by owner, and by creator, and SHALL let the user sort the list by title or by canonical lifecycle-state order with an explicit direction. Filtering and sorting SHALL apply client-side to the fetched boards without additional API requests beyond member autocomplete. The page SHALL show a `SHOWING X OF Y` counter and a `CLEAR` action whenever any filter or non-default sort is active, and SHALL show a distinct empty state when filters match nothing. Filter and sort state SHALL persist in the URL query so it survives reloads and is shareable.

#### Scenario: Filter by state
- **WHEN** the user deactivates one or more state chips
- **THEN** only boards in the remaining states are displayed

#### Scenario: Filter by owner via autocomplete
- **WHEN** the user types in the owner field, picks a suggested identity
- **THEN** only boards owned by that user are displayed

#### Scenario: Filter by creator via autocomplete
- **WHEN** the user types in the creator field, picks a suggested identity
- **THEN** only boards created by that user are displayed

#### Scenario: Filters combine
- **WHEN** state, owner, and creator filters are all active
- **THEN** only boards matching all of them are displayed

#### Scenario: Sort by title with explicit direction
- **WHEN** the user selects title sort with ascending or descending direction
- **THEN** boards order case-insensitively by title in that direction

#### Scenario: Sort by state follows canonical order
- **WHEN** the user selects state sort with a direction
- **THEN** boards order by the canonical lifecycle-state order (or its reverse)

#### Scenario: Counter and clear
- **WHEN** any filter or non-default sort is active
- **THEN** the page shows `SHOWING X OF Y` and a `CLEAR` action that resets all filters and the sort

#### Scenario: Filtered empty state
- **WHEN** the user has boards but none match the active filters
- **THEN** the page shows a no-matches message distinct from the no-boards message

#### Scenario: Filters persist in the URL
- **WHEN** the user sets filters or sorting and reloads or shares the URL
- **THEN** the same filtered and sorted view is restored
