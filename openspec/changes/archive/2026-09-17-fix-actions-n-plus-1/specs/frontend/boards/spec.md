## MODIFIED Requirements

### Requirement: Task state move
When the user clicks a card's arrow, the web app SHALL show a dropdown of that task's legal target states derived from the cached transitions table plus the loaded board (`board.state` frozen check, task terminal check); choosing one SHALL submit the move and refresh the board so the card relocates to the new column. When no moves are legal the arrow SHALL NOT be shown; when the lookup of the transitions table fails the arrow SHALL be shown but disabled. Board `Done` MAY be offered optimistically; a `409 board_not_done` rejection SHALL surface a distinct "tasks remain" message rather than the generic move error.

#### Scenario: Legal moves are offered
- **WHEN** the user clicks a card's arrow on an editable task
- **THEN** a dropdown lists the task's legal target states

#### Scenario: A move relocates the task
- **WHEN** the user picks a legal target
- **THEN** the move is submitted to the API and the board refreshes so the card appears in the new column

#### Scenario: No moves disable the arrow
- **WHEN** the task or the board is frozen (`Blocked`, `Cancelled`, `Done`) or the task is terminal
- **THEN** the card presents no arrow

#### Scenario: Failed moves lookup keeps a disabled arrow
- **WHEN** the request for the transitions table fails
- **THEN** the card shows a disabled arrow

#### Scenario: Premature board Done explains the gate
- **WHEN** the user moves a board to `Done` while tasks remain live and the API rejects with `board_not_done`
- **THEN** the app shows a message identifying unfinished tasks as the cause
