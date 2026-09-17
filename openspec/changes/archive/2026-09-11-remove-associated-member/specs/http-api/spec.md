## MODIFIED Requirements

### Requirement: Board lifecycle and membership endpoints
The API SHALL transition the board lifecycle via `POST /boards/:boardId/state`, enforcing the lifecycle rules and the Done gate, and SHALL add and remove Associated members via `POST /boards/:boardId/members` and `DELETE /boards/:boardId/members/:userId`. Both SHALL be restricted to the Board Creator/Owner. Removing an Associated member on a frozen board (`Blocked`, `Cancelled`, `Done`) SHALL be rejected.

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

#### Scenario: Member removal is rejected on a frozen board
- **WHEN** a Board Creator or Owner sends `DELETE /boards/:boardId/members/:userId` on a board in `Blocked`, `Cancelled`, or `Done`
- **THEN** the removal is rejected