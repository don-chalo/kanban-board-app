## ADDED Requirements

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
