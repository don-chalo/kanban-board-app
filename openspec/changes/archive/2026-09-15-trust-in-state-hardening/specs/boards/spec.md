## ADDED Requirements

### Requirement: Frozen board rejects task creation
A Board in a frozen state (`Blocked`, `Cancelled`, or `Done`) SHALL NOT accept new tasks. Attempting to create a task on a frozen board SHALL be rejected.

#### Scenario: Task creation rejected on Blocked board
- **WHEN** any board member attempts to create a task while the board is `Blocked`
- **THEN** the creation is rejected

#### Scenario: Task creation rejected on terminal boards
- **WHEN** any board member attempts to create a task while the board is `Done` or `Cancelled`
- **THEN** the creation is rejected

#### Scenario: Task creation allowed on live board
- **WHEN** a board member creates a task while the board is `To Do` or `In Progress`
- **THEN** the task is created in state `To Do`

### Requirement: Board title is never blank
A Board title SHALL never be blank. Creating or renaming a board with a blank or whitespace-only title SHALL be rejected and SHALL leave the board unchanged.

#### Scenario: Blank title rejected on rename
- **WHEN** a Board Creator or Owner attempts to set the board title to a blank or whitespace-only value
- **THEN** the rename is rejected and the title is unchanged
