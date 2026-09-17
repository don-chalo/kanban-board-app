## MODIFIED Requirements

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
