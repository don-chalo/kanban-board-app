## Purpose

Exposes the kanban domain through a REST API over durable storage, identifying the acting user by header and returning uniform, machine-readable errors.

## ADDED Requirements

### Requirement: Actor identity via header
The API SHALL identify the acting user from an `X-User-Id` request header. A request whose identity does not correspond to a known user SHALL be rejected with HTTP 401; all board and task operations SHALL be authorized against that user's role on the affected board.

#### Scenario: Known actor is accepted
- **WHEN** a request carries an `X-User-Id` that matches a known user
- **THEN** the request is processed and authorized for that user

#### Scenario: Unknown actor is rejected
- **WHEN** a request carries an `X-User-Id` that does not match any known user
- **THEN** the API responds with HTTP 401 and performs no operation

### Requirement: Durable persistence
The API SHALL persist user identities, boards, and tasks durably so they survive server restarts, and SHALL reconstruct each board together with its tasks on every related request. A deleted task SHALL be permanently removed and SHALL NOT reappear after a restart.

#### Scenario: Data survives restart
- **WHEN** a server is stopped and restarted after boards and tasks were created
- **THEN** the boards, tasks, and user identities are still present and unchanged

#### Scenario: Deleted task stays deleted
- **WHEN** a task is deleted and the server is restarted
- **THEN** the task does not reappear anywhere in the product

### Requirement: User identity endpoints
The API SHALL create a user identity from an email via `POST /users` and return that identity with its stable identifier, and SHALL return a known user's identity via `GET /users/:userId`.

#### Scenario: User identity is created
- **WHEN** a client sends `POST /users` with an email
- **THEN** a new user identity with a stable identifier is created and returned with its email

#### Scenario: User identity is retrieved
- **WHEN** a client sends `GET /users/:userId` for a known user
- **THEN** the identity is returned with its email

### Requirement: Board creation and listing
The API SHALL create a board via `POST /boards`, making the acting user its Creator and Owner with an empty Associated set and an initial `To Do` state, and SHALL return via `GET /boards` only the boards the acting user is a member of.

#### Scenario: Board is created
- **WHEN** a known actor sends `POST /boards` with a title
- **THEN** a board is created with the actor as Creator and Owner, no members, state `To Do`, and the board is returned

#### Scenario: Board list is membership-scoped
- **WHEN** a member sends `GET /boards`
- **THEN** only the boards that user is a member of are returned, without task payloads

### Requirement: Board detail and attributes
The API SHALL return a board together with its tasks via `GET /boards/:boardId` to board members only, and SHALL update the board's title, description, or owner via `PATCH /boards/:boardId`. Users who are not members SHALL be denied access.

#### Scenario: Member views the board
- **WHEN** a board member sends `GET /boards/:boardId`
- **THEN** the board is returned including its tasks, state, and members

#### Scenario: Non-member has no access
- **WHEN** a user who is not a member of the board sends `GET /boards/:boardId`
- **THEN** the API denies access

#### Scenario: Board attributes are updated
- **WHEN** a Board Creator or Owner sends `PATCH /boards/:boardId` with a new title and/or description
- **THEN** the board's title and/or description are updated

#### Scenario: Board ownership is reassigned
- **WHEN** a Board Creator or Owner sends `PATCH /boards/:boardId` with a new owner who is a board member
- **THEN** the board's owner becomes that member

### Requirement: Board lifecycle and membership endpoints
The API SHALL transition the board lifecycle via `POST /boards/:boardId/state`, enforcing the lifecycle rules and the Done gate, and SHALL add and remove Associated members via `POST /boards/:boardId/members` and `DELETE /boards/:boardId/members/:userId`. Both SHALL be restricted to the Board Creator/Owner.

#### Scenario: Board state is changed
- **WHEN** a Board Creator or Owner sends `POST /boards/:boardId/state` with a legal target state
- **THEN** the board transitions to that state

#### Scenario: Done gate is enforced
- **WHEN** `POST /boards/:boardId/state` targets `Done` while any task is not `Done` or `Cancelled`
- **THEN** the transition is rejected

#### Scenario: Member is added
- **WHEN** a Board Creator or Owner adds another user via `POST /boards/:boardId/members`
- **THEN** the user becomes an Associated member

#### Scenario: Member is removed
- **WHEN** a Board Creator or Owner removes an Associated member via `DELETE /boards/:boardId/members/:userId`
- **THEN** the user is no longer an Associated member

### Requirement: Task creation, reading, editing, and deletion
Board members SHALL create tasks via `POST /boards/:boardId/tasks` and read them via `GET /boards/:boardId/tasks` and `GET /boards/:boardId/tasks/:taskId`. The Task Owner, and the Board Creator/Owner, SHALL edit a task via `PATCH /boards/:boardId/tasks/:taskId`. Only the Board Creator/Owner SHALL delete a task via `DELETE /boards/:boardId/tasks/:taskId`.

#### Scenario: Member creates a task
- **WHEN** a board member sends `POST /boards/:boardId/tasks` with a title
- **THEN** a task is created, owned by that member, in state `To Do`

#### Scenario: Task owner edits the task
- **WHEN** the Task Owner sends `PATCH /boards/:boardId/tasks/:taskId` with a title and/or description
- **THEN** the task's title and/or description are updated

#### Scenario: Board creator deletes a task
- **WHEN** a Board Creator or Owner sends `DELETE /boards/:boardId/tasks/:taskId`
- **THEN** the task is permanently removed

#### Scenario: Associated member cannot delete
- **WHEN** an Associated member sends `DELETE /boards/:boardId/tasks/:taskId`
- **THEN** the deletion is rejected

### Requirement: Task lifecycle and ownership endpoints
The API SHALL transition a task's lifecycle via `POST /boards/:boardId/tasks/:taskId/state` and reassign a task's Owner via `POST /boards/:boardId/tasks/:taskId/owner`, enforcing the same authorization and state rules as the domain model.

#### Scenario: Task state is changed
- **WHEN** a user entitled to move the task sends `POST /boards/:boardId/tasks/:taskId/state` with a legal target
- **THEN** the task transitions, recording its previous state while `Blocked` and clearing it on unblock

#### Scenario: Task owner is reassigned
- **WHEN** a Board Creator or Owner sends `POST /boards/:boardId/tasks/:taskId/owner` naming a board member
- **THEN** the task's owner becomes that member

#### Scenario: Reassignment to a non-member is rejected
- **WHEN** a Board Creator or Owner names a user who is not a board member
- **THEN** the reassignment is rejected

### Requirement: Next-actions
The API SHALL return, via `GET /boards/:boardId/actions` and `GET /boards/:boardId/tasks/:taskId/actions`, the lifecycle states the entity may legally transition to next: an empty list for terminal or frozen entities, and for a board, excluding `Done` while its Done gate fails.

#### Scenario: Live task lists its next states
- **WHEN** a member requests the actions of a live task
- **THEN** the API returns the legal target states

#### Scenario: Terminal task has no next states
- **WHEN** a member requests the actions of a terminal task
- **THEN** the API returns an empty list

### Requirement: Error contract
Every error response SHALL carry an HTTP status and a JSON body of the form `{ "error": { "code", "message" } }`. Unknown actor SHALL be 401; insufficient role or permission SHALL be 403; a missing resource SHALL be 404; illegal transitions, violations of read-only or terminal state, and the board Done gate SHALL be 409; invalid membership targets SHALL be 400.

#### Scenario: Unauthorized action returns 403 with a code
- **WHEN** an action is not permitted for the acting user's role
- **THEN** the API responds with 403 and an error body whose code identifies the reason

#### Scenario: Conflict returns 409 with a code
- **WHEN** an operation violates the lifecycle, a read-only state, or the Done gate
- **THEN** the API responds with 409 and an error body whose code identifies the reason