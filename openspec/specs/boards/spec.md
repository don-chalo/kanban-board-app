# Boards Specification

## Purpose

Boards are the top-level organizational unit in the product, grouping tasks under a single owner and creator and governing how the whole group behaves through its lifecycle.

## Requirements

### Requirement: Board entity
A Board SHALL have exactly one Creator and exactly one Owner (each a User), zero or more Associated members (Users), a title and a description, and zero or more Tasks. A Task SHALL belong to exactly one Board and SHALL NOT be moved between Boards.

#### Scenario: Board has a creator and an owner
- **WHEN** a user creates a board
- **THEN** the board has that user as its Creator and its Owner

#### Scenario: Board contains tasks
- **WHEN** tasks are created on a board
- **THEN** the board contains those tasks (zero or more)

#### Scenario: A task cannot change boards
- **WHEN** a user attempts to move a task to another board
- **THEN** the system rejects the move and the task remains on its original board

#### Scenario: Board has a title and a description
- **WHEN** a board exists
- **THEN** it carries a title and a description (initially empty)

### Requirement: Board ownership may be reassigned
The Board Creator or Board Owner SHALL be able to reassign the Board Owner to another board member. The target SHALL become the new Board Owner; if the target is an Associated member, the target SHALL leave the Associated set. Reassignment SHALL NOT change the Board Creator. A Board in `Blocked`, `Cancelled`, or `Done` SHALL NOT have its ownership reassigned.

#### Scenario: Board owner transfers ownership
- **WHEN** a Board Owner assigns the board to another board member
- **THEN** that member becomes the Board Owner

#### Scenario: Ownership transfer leaves the Associated set
- **WHEN** the new Board Owner was an Associated member
- **THEN** the user is removed from the Associated set

#### Scenario: Non-member target is rejected
- **WHEN** a user attempts to transfer ownership to a user who is not a board member
- **THEN** the transfer is rejected

#### Scenario: Frozen board rejects transfer
- **WHEN** a board is `Blocked`, `Cancelled`, or `Done` and a transfer is attempted
- **THEN** the transfer is rejected

### Requirement: Board lifecycle
A Board SHALL follow the same lifecycle as a Task: `To Do` -> `In Progress` -> `Done`; from `To Do` the board MAY transition to `Cancelled`; from `In Progress` the board MAY transition to `Blocked` or `Cancelled`. A `Blocked` board SHALL transition only to `In Progress`. `Done` and `Cancelled` SHALL be terminal states. Board lifecycle state SHALL be an attribute of the board.

#### Scenario: Board progresses to done
- **WHEN** a board in `To Do` moves to `In Progress` and then to `Done`
- **THEN** the board is in the terminal state `Done`

#### Scenario: Board returns to its previous state after blocking
- **WHEN** a board in `In Progress` is set to `Blocked` and then unblocked
- **THEN** the board returns to `In Progress`; a board in `To Do` SHALL NOT enter `Blocked`

#### Scenario: Board is cancelled
- **WHEN** a board in `To Do` or `In Progress` is set to `Cancelled`
- **THEN** the board is in the terminal state `Cancelled`

#### Scenario: Board cannot skip to done
- **WHEN** a user attempts to move a board from `To Do` directly to `Done`
- **THEN** the transition is rejected

#### Scenario: Board cannot be blocked from To Do
- **WHEN** a user attempts to move a board from `To Do` directly to `Blocked`
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

### Requirement: Frozen board membership and title immutability
A Board in a frozen state (`Blocked`, `Cancelled`, or `Done`) SHALL NOT gain new Associated members and SHALL NOT have its title mutated. Adding an Associated member on a frozen board SHALL be rejected. Editing the board title on a frozen board SHALL be rejected. Editing the board description on a frozen board SHALL remain allowed for the Board Creator/Owner.

#### Scenario: Add member rejected on frozen board
- **WHEN** a Board Creator or Owner attempts to add an Associated member while the board is `Blocked`, `Cancelled`, or `Done`
- **THEN** the operation is rejected

#### Scenario: Title edit rejected on frozen board
- **WHEN** a Board Creator or Owner attempts to edit the board title while the board is `Blocked`, `Cancelled`, or `Done`
- **THEN** the operation is rejected

#### Scenario: Description edit allowed on frozen board
- **WHEN** a Board Creator or Owner edits the board description while the board is `Blocked`, `Cancelled`, or `Done`
- **THEN** the description is updated

#### Scenario: Add member allowed on live board
- **WHEN** a Board Creator or Owner adds an Associated member while the board is `To Do` or `In Progress`
- **THEN** the user becomes an Associated member

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