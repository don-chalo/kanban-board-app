## MODIFIED Requirements

### Requirement: Task lifecycle and ownership endpoints
The API SHALL transition a task's lifecycle via `POST /boards/:boardId/tasks/:taskId/state` and reassign a task's Owner via `POST /boards/:boardId/tasks/:taskId/owner`, enforcing the same authorization and state rules as the domain model, including the rule that tasks move only while their board is `In Progress`. A move on any other board state SHALL be rejected with `409` and code `board_not_in_progress`. The first `To Do -> In Progress` transition with `startedAt null` SHALL stamp `startedAt` with the current ISO time; later transitions SHALL NOT overwrite it.

#### Scenario: Task state is changed
- **WHEN** a user entitled to move the task sends `POST /boards/:boardId/tasks/:taskId/state` with a legal target on a board in `In Progress`
- **THEN** the task transitions, recording its previous state while `Blocked` and clearing it on unblock

#### Scenario: Task move is rejected while the board is not In Progress
- **WHEN** a user sends `POST /boards/:boardId/tasks/:taskId/state` on a board in `To Do`
- **THEN** the API responds with `409` and `{ error: { code: "board_not_in_progress" } }` and the task is unchanged

#### Scenario: First start stamps the date
- **WHEN** a user moves a task `To Do -> In Progress` with `startedAt null`
- **THEN** the response task carries a current ISO `startedAt`

#### Scenario: Return from Blocked keeps the date
- **WHEN** a task with a set `startedAt` moves `In Progress -> Blocked -> In Progress`
- **THEN** the returned `startedAt` is unchanged

#### Scenario: Task owner is reassigned
- **WHEN** a Board Creator or Owner sends `POST /boards/:boardId/tasks/:taskId/owner` naming a board member
- **THEN** the task's owner becomes that member

#### Scenario: Reassignment to a non-member is rejected
- **WHEN** a Board Creator or Owner names a user who is not a board member
- **THEN** the reassignment is rejected

### Requirement: Next-actions
The API SHALL return, via `GET /boards/:boardId/actions` and `GET /boards/:boardId/tasks/:taskId/actions`, the lifecycle states the entity may legally transition to next: an empty list for terminal or frozen entities, and for a board, excluding `Done` while its Done gate fails. A task on a board that is not `In Progress` SHALL report an empty list.

#### Scenario: Live task lists its next states
- **WHEN** a member requests the actions of a live task on a board in `In Progress`
- **THEN** the API returns the legal target states

#### Scenario: Task on a non-started board lists nothing
- **WHEN** a member requests the actions of a task on a board in `To Do`
- **THEN** the API returns an empty list

#### Scenario: Terminal task has no next states
- **WHEN** a member requests the actions of a terminal task
- **THEN** the API returns an empty list

### Requirement: Error contract
Every error response SHALL carry an HTTP status and a JSON body of the form `{ "error": { "code", "message" } }`. Unknown actor SHALL be 401; insufficient role or permission SHALL be 403; a missing resource SHALL be 404; illegal transitions, violations of read-only or terminal state, the board Done gate, and task moves on a non-`In Progress` board SHALL be 409; invalid membership targets SHALL be 400.

#### Scenario: Unauthorized action returns 403 with a code
- **WHEN** an action is not permitted for the acting user's role
- **THEN** the API responds with 403 and an error body whose code identifies the reason

#### Scenario: Conflict returns 409 with a code
- **WHEN** an operation violates the lifecycle, a read-only state, the Done gate, or the board-progress gate
- **THEN** the API responds with 409 and an error body whose code identifies the reason
