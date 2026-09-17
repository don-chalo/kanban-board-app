## ADDED Requirements

### Requirement: Transitions table endpoint
The API SHALL expose the lifecycle transitions table via `GET /transitions`, returning the legal target states per state plus the frozen board states, using canonical `LifecycleState` values (`ToDo`, `InProgress`, `Done`, `Blocked`, `Cancelled`). The table SHALL be `ToDo -> [InProgress, Cancelled]`, `InProgress -> [Done, Blocked, Cancelled]`, `Done -> []`, `Cancelled -> []`, `Blocked -> [InProgress]`, with `frozenStates` of `Blocked`, `Cancelled`, `Done`. The endpoint SHALL require a known actor via `X-User-Id` (unknown actor -> 401) and SHOULD be cacheable.

#### Scenario: Authenticated client reads the table
- **WHEN** a known actor sends `GET /transitions`
- **THEN** the API returns the transitions table and frozen states with the exact content above

#### Scenario: Unknown actor is rejected
- **WHEN** a client sends `GET /transitions` without a known `X-User-Id`
- **THEN** the API responds with `401` and performs no operation

### Requirement: Users batch endpoint
The API SHALL resolve up to 100 identities by id via `POST /users/batch` with body `{ ids: string[] }`, returning `200` with an array of `{ id, email }` for the identities found (unknown ids are omitted, duplicates collapsed). It SHALL require a known actor via `X-User-Id` (unknown actor -> 401); a missing or non-array `ids` body SHALL be 400; more than 100 ids SHALL be 400 with `validation`.

#### Scenario: Batch resolves known identities
- **WHEN** an authenticated client sends `POST /users/batch` with known ids
- **THEN** the API returns the matching `{ id, email }` identities

#### Scenario: Unknown ids are omitted
- **WHEN** a batch includes ids with no identity
- **THEN** those ids are omitted from the response without error

#### Scenario: Batch without ids is rejected
- **WHEN** an authenticated client sends `POST /users/batch` without an `ids` array
- **THEN** the API responds with `400`

#### Scenario: Batch requires an actor
- **WHEN** a client sends `POST /users/batch` without a known `X-User-Id`
- **THEN** the API responds with `401` and performs no operation

### Requirement: Optimistic Done with identifiable gate error
Clients MAY offer board `Done` from the transitions table even while the Done gate state is unknown; the server remains the validator. A `POST /boards/:boardId/state` targeting `Done` while any task is not `Done` or `Cancelled` SHALL be rejected with `409` and code `board_not_done`, distinct from `invalid_transition` and `read_only`.

#### Scenario: Premature board Done is identified
- **WHEN** a member moves a board to `Done` while a task is live
- **THEN** the API responds with `409` and `{ error: { code: "board_not_done" } }`
