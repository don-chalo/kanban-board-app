# HTTP API Specification

## Purpose

Exposes the kanban domain through a REST API over durable storage, identifying the acting user by header and returning uniform, machine-readable errors.

## Requirements

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
The API SHALL accept an email via `POST /login` and respond `200` with the user identity for that email, creating the identity on first use so the same email always maps to the same identity, and SHALL return a known user's identity via `GET /users/:userId`. Emails SHALL be treated case-insensitively and stripped of surrounding whitespace.

#### Scenario: User identity is created
- **WHEN** a client sends `POST /login` with an email that does not yet have an identity
- **THEN** a new user identity is created and returned with its email

#### Scenario: User identity is retrieved
- **WHEN** a client sends `GET /users/:userId` for a known user
- **THEN** the identity is returned with its email

#### Scenario: Repeat login returns the same identity
- **WHEN** a client sends `POST /login` with an email that already has an identity
- **THEN** the same existing identity is returned, not a new one

#### Scenario: Login email is case-insensitive
- **WHEN** a client logs in with an email that differs from an existing identity's email only by case or surrounding whitespace
- **THEN** the existing identity is returned

### Requirement: Board creation and listing
The API SHALL create a board via `POST /boards`, making the acting user its Creator and Owner with an empty Associated set and an initial `To Do` state, and SHALL return via `GET /boards` only the boards the acting user is a member of.

#### Scenario: Board is created
- **WHEN** a known actor sends `POST /boards` with a title
- **THEN** a board is created with the actor as Creator and Owner, no members, state `To Do`, and the board is returned

#### Scenario: Board list is membership-scoped
- **WHEN** a member sends `GET /boards`
- **THEN** only the boards that user is a member of are returned, without task payloads

### Requirement: Board detail and attributes
The API SHALL return a board together with its tasks via `GET /boards/:boardId` to board members only, and SHALL update the board's title, description, or owner via `PATCH /boards/:boardId`. Users who are not members SHALL be denied access. Editing the board title on a frozen board (`Blocked`, `Cancelled`, `Done`) SHALL be rejected with `409` and `read_only`; editing only the description on a frozen board SHALL remain allowed.

#### Scenario: Member views the board
- **WHEN** a board member sends `GET /boards/:boardId`
- **THEN** the board is returned including its tasks, state, and members

#### Scenario: Non-member has no access
- **WHEN** a user who is not a member of the board sends `GET /boards/:boardId`
- **THEN** the API denies access

#### Scenario: Board attributes are updated
- **WHEN** a Board Creator or Owner sends `PATCH /boards/:boardId` with a new title and/or description on a board in `To Do` or `In Progress`
- **THEN** the board's title and/or description are updated

#### Scenario: Title update is rejected on a frozen board
- **WHEN** a Board Creator or Owner sends `PATCH /boards/:boardId` with a `title` on a board in `Blocked`, `Cancelled`, or `Done`
- **THEN** the update is rejected with `409` and `read_only`

#### Scenario: Description update is allowed on a frozen board
- **WHEN** a Board Creator or Owner sends `PATCH /boards/:boardId` with only a `description` on a board in `Blocked`, `Cancelled`, or `Done`
- **THEN** the board's description is updated

#### Scenario: Board ownership is reassigned
- **WHEN** a Board Creator or Owner sends `PATCH /boards/:boardId` with a new owner who is a board member
- **THEN** the board's owner becomes that member

### Requirement: Board lifecycle and membership endpoints
The API SHALL transition the board lifecycle via `POST /boards/:boardId/state`, enforcing the lifecycle rules and the Done gate, and SHALL add and remove Associated members via `POST /boards/:boardId/members` and `DELETE /boards/:boardId/members/:userId`. Both SHALL be restricted to the Board Creator/Owner. Adding or removing an Associated member on a frozen board (`Blocked`, `Cancelled`, `Done`) SHALL be rejected with `409` and `read_only`. The API SHALL update the board's title and description via `PATCH /boards/:boardId` for the Board Creator/Owner; editing the title on a frozen board SHALL be rejected with `409` and `read_only`, while editing only the description on a frozen board SHALL remain allowed.

#### Scenario: Board state is changed
- **WHEN** a Board Creator or Owner sends `POST /boards/:boardId/state` with a legal target state
- **THEN** the board transitions to that state

#### Scenario: Done gate is enforced
- **WHEN** `POST /boards/:boardId/state` targets `Done` while any task is not `Done` or `Cancelled`
- **THEN** the transition is rejected

#### Scenario: Member is added
- **WHEN** a Board Creator or Owner adds another user via `POST /boards/:boardId/members` on a board in `To Do` or `In Progress`
- **THEN** the user becomes an Associated member

#### Scenario: Member addition is rejected on a frozen board
- **WHEN** a Board Creator or Owner sends `POST /boards/:boardId/members` on a board in `Blocked`, `Cancelled`, or `Done`
- **THEN** the addition is rejected with `409` and `read_only`

#### Scenario: Member is removed
- **WHEN** a Board Creator or Owner removes an Associated member via `DELETE /boards/:boardId/members/:userId`
- **THEN** the user is no longer an Associated member

#### Scenario: Member removal is rejected on a frozen board
- **WHEN** a Board Creator or Owner sends `DELETE /boards/:boardId/members/:userId` on a board in `Blocked`, `Cancelled`, or `Done`
- **THEN** the removal is rejected

### Requirement: Task creation, reading, editing, and deletion
Board members SHALL create tasks via `POST /boards/:boardId/tasks` and read them via `GET /boards/:boardId/tasks` and `GET /boards/:boardId/tasks/:taskId`. The Task Owner, and the Board Creator/Owner, SHALL edit a task via `PATCH /boards/:boardId/tasks/:taskId`. Only the Board Creator/Owner SHALL delete a task via `DELETE /boards/:boardId/tasks/:taskId`. A task title SHALL never be blank: a blank title on create or edit SHALL be rejected with `400`. Both `POST` and `PATCH` SHALL accept an optional `priority` of `low | medium | high | urgent`; an omitted priority on create SHALL default to `medium`, and an invalid priority SHALL be rejected with `400` and `validation`. Tasks persisted without a priority SHALL be returned as `medium`. Tasks SHALL be returned with `startedAt` (ISO string or `null`); tasks persisted without it SHALL be returned as `null`. `PATCH` SHALL ignore a `startedAt` body field without error and SHALL NOT change the stored value. Both `POST` and `PATCH` SHALL accept optional `storyPoints` of `1 | 2 | 3 | 5 | 8 | 13` or `null`; an omitted value on create SHALL default to `null`, and any other value SHALL be rejected with `400` and `validation`. Tasks persisted without `storyPoints` SHALL be returned as `null`.

#### Scenario: Member creates a task
- **WHEN** a board member sends `POST /boards/:boardId/tasks` with a title
- **THEN** a task is created, owned by that member, in state `To Do`

#### Scenario: Task is created with default priority
- **WHEN** a board member sends `POST /boards/:boardId/tasks` with a title and no priority
- **THEN** the API responds `201` and the task priority is `medium`

#### Scenario: Task is created with explicit priority
- **WHEN** a board member sends `POST /boards/:boardId/tasks` with a title and priority `urgent`
- **THEN** the API responds `201` and the task priority is `urgent`

#### Scenario: Invalid priority on create is rejected
- **WHEN** a board member sends `POST /boards/:boardId/tasks` with priority `critical`
- **THEN** the API responds `400` with `validation` and no task is created

#### Scenario: New task has null start date
- **WHEN** a board member sends `POST /boards/:boardId/tasks` with a title
- **THEN** the API responds `201` and the task `startedAt` is `null`

#### Scenario: Task is created with an estimate
- **WHEN** a board member sends `POST /boards/:boardId/tasks` with a title and story points `5`
- **THEN** the API responds `201` and the task `storyPoints` is `5`

#### Scenario: New task defaults to null estimate
- **WHEN** a board member sends `POST /boards/:boardId/tasks` with a title and no story points
- **THEN** the API responds `201` and the task `storyPoints` is `null`

#### Scenario: Invalid estimate on create is rejected
- **WHEN** a board member sends `POST /boards/:boardId/tasks` with story points `4`
- **THEN** the API responds `400` with `validation` and no task is created

#### Scenario: Task owner edits the task
- **WHEN** the Task Owner sends `PATCH /boards/:boardId/tasks/:taskId` with a title and/or description
- **THEN** the task's title and/or description are updated

#### Scenario: Task priority is edited
- **WHEN** the Task Owner sends `PATCH /boards/:boardId/tasks/:taskId` with priority `high`
- **THEN** the task priority becomes `high`

#### Scenario: Invalid priority on edit is rejected
- **WHEN** a user sends `PATCH /boards/:boardId/tasks/:taskId` with priority ` ASAP `
- **THEN** the API responds `400` with `validation` and the task is unchanged

#### Scenario: Patch ignores start date
- **WHEN** a user sends `PATCH /boards/:boardId/tasks/:taskId` with `startedAt`
- **THEN** the API applies the other valid fields, leaves stored `startedAt` unchanged, and does not error on `startedAt`

#### Scenario: Task estimate is edited
- **WHEN** the Task Owner sends `PATCH /boards/:boardId/tasks/:taskId` with story points `8`
- **THEN** the task `storyPoints` becomes `8`

#### Scenario: Estimate is cleared
- **WHEN** the Task Owner sends `PATCH /boards/:boardId/tasks/:taskId` with story points `null`
- **THEN** the task `storyPoints` becomes `null`

#### Scenario: Invalid estimate on edit is rejected
- **WHEN** a user sends `PATCH /boards/:boardId/tasks/:taskId` with story points `0`
- **THEN** the API responds `400` with `validation` and the task is unchanged

#### Scenario: Board creator deletes a task
- **WHEN** a Board Creator or Owner sends `DELETE /boards/:boardId/tasks/:taskId`
- **THEN** the task is permanently removed

#### Scenario: Associated member cannot delete
- **WHEN** an Associated member sends `DELETE /boards/:boardId/tasks/:taskId`
- **THEN** the deletion is rejected

#### Scenario: Blank task title is rejected on edit
- **WHEN** a user sends `PATCH /boards/:boardId/tasks/:taskId` with a blank title
- **THEN** the API responds with `400` and does not update the task

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

### Requirement: User search and resolution endpoints
The API SHALL resolve identities by email via `GET /users?email=<prefix>`, returning up to 8 matching identities, matched case-insensitively against normalized emails with exact matches first; and SHALL find-or-create an identity via `POST /users/resolve` with a single email, creating the identity on first use exactly like `POST /login` and returning the identity. Both SHALL require a known actor via `X-User-Id` (unknown actor -> 401); a missing or malformed `email` query on search SHALL be 400; a missing or malformed `email` body on resolve SHALL be 400.

#### Scenario: Search returns matching identities
- **WHEN** an authenticated client sends `GET /users?email=bob@` and identities exist whose normalized email begins with that prefix
- **THEN** up to 8 matching identities are returned, exact matches first, case-insensitive

#### Scenario: Search without an email term is rejected
- **WHEN** an authenticated client sends `GET /users` without an `email` query parameter
- **THEN** the API responds with `400`

#### Scenario: Resolve finds an existing identity
- **WHEN** an authenticated client sends `POST /users/resolve` with an email that already has an identity
- **THEN** the existing identity is returned

#### Scenario: Resolve creates a new identity
- **WHEN** an authenticated client sends `POST /users/resolve` with an email that has no identity
- **THEN** a new identity for that email is created and returned

#### Scenario: Search and resolve require an actor
- **WHEN** a client sends `GET /users?email=` or `POST /users/resolve` without a known `X-User-Id`
- **THEN** the API responds with `401` and performs no operation

### Requirement: Frozen task creation is rejected
The API SHALL reject task creation on a frozen board (`Blocked`, `Cancelled`, `Done`) via `POST /boards/:boardId/tasks` with `409` and `read_only`.

#### Scenario: Task creation rejected on Blocked board
- **WHEN** a board member sends `POST /boards/:boardId/tasks` on a board in `Blocked`
- **THEN** the API responds with `409` and `read_only` and no task is created

#### Scenario: Task creation rejected on terminal boards
- **WHEN** a board member sends `POST /boards/:boardId/tasks` on a board in `Done` or `Cancelled`
- **THEN** the API responds with `409` and `read_only` and no task is created

### Requirement: Blank board title is rejected
The API SHALL reject a blank or whitespace-only board title via `POST /boards` and `PATCH /boards/:boardId` with `400` and `validation`. A rejected rename SHALL leave the board unchanged.

#### Scenario: Board creation with blank title is rejected
- **WHEN** a client sends `POST /boards` with a blank or whitespace-only title
- **THEN** the API responds with `400` and `validation` and no board is created

#### Scenario: Board rename with blank title is rejected
- **WHEN** a Board Creator or Owner sends `PATCH /boards/:boardId` with a blank or whitespace-only `title`
- **THEN** the API responds with `400` and `validation` and the title is unchanged

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

### Requirement: Board comment endpoints
The API SHALL create a board comment via `POST /boards/:boardId/comments` with body `{ text }`, responding `201` with `{ id, author, text, createdAt }`; SHALL edit a comment via `PATCH /boards/:boardId/comments/:commentId` with body `{ text }`; and SHALL remove a comment via `DELETE /boards/:boardId/comments/:commentId`. The API SHALL return the board's comments embedded in `GET /boards/:boardId`. All three mutation endpoints SHALL require board membership (`403` for non-members, `401` for unknown actor); a missing board or comment SHALL be `404`; blank text or text over 2000 characters SHALL be `400` with `validation`; edits and removals by anyone other than the author or the Board Creator/Owner SHALL be `403`.

#### Scenario: Member creates a comment
- **WHEN** a board member sends `POST /boards/:boardId/comments` with valid text
- **THEN** the API responds `201` with the comment including author and timestamp

#### Scenario: Blank or overlong text is rejected
- **WHEN** a client sends blank text or text over 2000 characters
- **THEN** the API responds `400` with `validation` and the thread is unchanged

#### Scenario: Comment is edited
- **WHEN** the author or the Board Creator/Owner sends `PATCH` with valid text
- **THEN** the comment's text is updated

#### Scenario: Unauthorized edit is rejected
- **WHEN** any other member sends `PATCH` for the comment
- **THEN** the API responds `403` and the comment is unchanged

#### Scenario: Comment is removed
- **WHEN** the author or the Board Creator/Owner sends `DELETE`
- **THEN** the comment is removed

#### Scenario: Board detail embeds comments
- **WHEN** a member sends `GET /boards/:boardId` on a board with comments
- **THEN** the response includes the board's comment thread

#### Scenario: Non-member has no access
- **WHEN** a user who is not a board member uses a comment endpoint
- **THEN** the API denies access

### Requirement: Task comment endpoints
The API SHALL create a task comment via `POST /boards/:boardId/tasks/:taskId/comments` with body `{ text }`, responding `201` with `{ id, author, text, createdAt }`; SHALL edit a comment via `PATCH /boards/:boardId/tasks/:taskId/comments/:commentId` with body `{ text }`; and SHALL remove a comment via `DELETE /boards/:boardId/tasks/:taskId/comments/:commentId`. The API SHALL return the task's comments embedded in task payloads. All three mutation endpoints SHALL require board membership (`403` for non-members, `401` for unknown actor) and a known task (`404` for a missing board, task, or comment); blank text or text over 2000 characters SHALL be `400` with `validation`; edits and removals by anyone other than the author, the Board Creator/Owner, or the task owner SHALL be `403`.

#### Scenario: Member creates a comment
- **WHEN** a board member sends `POST` with valid text on a task
- **THEN** the API responds `201` with the comment including author and timestamp

#### Scenario: Blank or overlong text is rejected
- **WHEN** a client sends blank text or text over 2000 characters
- **THEN** the API responds `400` with `validation` and the thread is unchanged

#### Scenario: Comment is edited
- **WHEN** the author, the Board Creator/Owner, or the task owner sends `PATCH` with valid text
- **THEN** the comment's text is updated

#### Scenario: Unauthorized edit is rejected
- **WHEN** any other member sends `PATCH` for the comment
- **THEN** the API responds `403` and the comment is unchanged

#### Scenario: Comment is removed
- **WHEN** the author, the Board Creator/Owner, or the task owner sends `DELETE`
- **THEN** the comment is removed

#### Scenario: Task payloads embed comments
- **WHEN** a member reads a task with comments
- **THEN** the response includes the task's comment thread

#### Scenario: Non-member has no access
- **WHEN** a user who is not a board member uses a task comment endpoint
- **THEN** the API denies access
