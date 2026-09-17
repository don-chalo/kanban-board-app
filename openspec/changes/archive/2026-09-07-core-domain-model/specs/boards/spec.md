## Purpose

Boards are the top-level organizational unit in the product, grouping tasks under a single owner and creator and governing how the whole group behaves through its lifecycle.

## ADDED Requirements

### Requirement: Board entity
A Board SHALL have exactly one Creator and exactly one Owner (each a User), zero or more Associated members (Users), and zero or more Tasks. A Task SHALL belong to exactly one Board and SHALL NOT be moved between Boards.

#### Scenario: Board has a creator and an owner
- **WHEN** a user creates a board
- **THEN** the board has that user as its Creator and its Owner

#### Scenario: Board contains tasks
- **WHEN** tasks are created on a board
- **THEN** the board contains those tasks (zero or more)

#### Scenario: A task cannot change boards
- **WHEN** a user attempts to move a task to another board
- **THEN** the system rejects the move and the task remains on its original board

### Requirement: Board lifecycle
A Board SHALL follow the same lifecycle as a Task: `To Do` -> `In Progress` -> `Done`; from `To Do` or `In Progress` the board MAY transition to `Blocked` or `Cancelled`. A `Blocked` board SHALL transition only to the state it was in before it was blocked. `Done` and `Cancelled` SHALL be terminal states. Board lifecycle state SHALL be an attribute of the board.

#### Scenario: Board progresses to done
- **WHEN** a board in `To Do` moves to `In Progress` and then to `Done`
- **THEN** the board is in the terminal state `Done`

#### Scenario: Board returns to its previous state after blocking
- **WHEN** a board in `In Progress` is set to `Blocked` and then unblocked
- **THEN** the board returns to `In Progress`

#### Scenario: Board is cancelled
- **WHEN** a board in `To Do` or `In Progress` is set to `Cancelled`
- **THEN** the board is in the terminal state `Cancelled`

#### Scenario: Board cannot skip to done
- **WHEN** a user attempts to move a board from `To Do` directly to `Done`
- **THEN** the transition is rejected

### Requirement: Board Done gate
A Board SHALL transition to `Done` only when every task on the board is in `Done` or `Cancelled`. If any task is `To Do`, `In Progress`, or `Blocked`, the board SHALL NOT transition to `Done`.

#### Scenario: Live tasks prevent completion
- **WHEN** a board has a task in `In Progress` and a member attempts to move the board to `Done`
- **THEN** the transition is rejected

#### Scenario: Board with finished tasks completes
- **WHEN** every task on the board is `Done` or `Cancelled`
- **THEN** the board may transition to `Done`

### Requirement: Board cascade
When a Board enters `Blocked`, `Cancelled`, or `Done`, all its tasks SHALL keep their current state but SHALL become read-only (SHALL NOT be edited or moved) for as long as the board is in that state, or permanently for terminal states.

#### Scenario: Blocked board freezes tasks
- **WHEN** a board enters `Blocked`
- **THEN** every task on the board keeps its state and cannot be edited or moved

#### Scenario: Unblocking the board restores editability
- **WHEN** a board returns from `Blocked` to `In Progress`
- **THEN** its tasks can be edited and moved again

#### Scenario: Cancelled board freezes tasks permanently
- **WHEN** a board enters `Cancelled`
- **THEN** every task keeps its state, cannot be edited or moved, and the board cannot be reactivated

#### Scenario: Done board freezes tasks
- **WHEN** a board enters `Done`
- **THEN** every task keeps its state and cannot be edited or moved

### Requirement: Cancelled board remains visible but read-only
A `Cancelled` board SHALL remain visible to its members but read-only. There SHALL be no grace period and no recovery path.

#### Scenario: Cancelled board is visible but read-only
- **WHEN** a member views a cancelled board
- **THEN** they can see the board and its tasks but cannot modify anything