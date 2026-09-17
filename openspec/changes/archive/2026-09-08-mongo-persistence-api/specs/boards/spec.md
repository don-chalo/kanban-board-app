## MODIFIED Requirements

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

## ADDED Requirements

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