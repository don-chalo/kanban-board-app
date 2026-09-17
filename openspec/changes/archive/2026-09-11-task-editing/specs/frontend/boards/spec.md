## MODIFIED Requirements

### Requirement: Task creation
The web app SHALL provide a new-task action that opens a modal with a required title and optional description and owner; a created task SHALL appear in the To Do column. The owner field SHALL be shown only to the board creator or owner; for other members the task owner is the member themselves. The owner list SHALL include the board Creator, the Owner, and all Associated members, including the acting user selecting themself; the unselected option SHALL be labeled `(me)`.

#### Scenario: A task is created into To Do
- **WHEN** the user enters a title (and optionally a description and owner) and confirms
- **THEN** a task is created via the API and appears in the To Do column

#### Scenario: Blank title is rejected
- **WHEN** the user confirms the modal with a blank title
- **THEN** an error is shown and no request is sent

#### Scenario: Owner is only settable by the board creator or owner
- **WHEN** a member who is not the board creator or owner opens the modal
- **THEN** the owner field is hidden and any created task is owned by that member

#### Scenario: Owner list includes the creator and owner
- **WHEN** the board creator or owner opens the modal
- **THEN** the owner list shows the board Creator, the Owner, and all Associated members, including themselves as `(me)`

## ADDED Requirements

### Requirement: Task editing
The web app SHALL let the Task Owner or the Board Creator/Owner edit a task's title, description, and owner from a modal opened by activating the task card. The modal SHALL be prefilled with the task's title, description, and current owner; confirming SHALL save via the API and refetch the board so the updated attributes render. The owner field SHALL be editable only by the board creator or owner; a non-manager who owns the task edits the title and description only. Blank titles SHALL be rejected with an inline error and no request. On a frozen board (`Blocked`, `Cancelled`, `Done`) or on a terminal task the edit action SHALL NOT be offered.

#### Scenario: A task's title and description are edited
- **WHEN** the Task Owner or Board Creator/Owner activates the task, changes the title and/or description, and confirms
- **THEN** the changes are saved via the API and the board refetches so the card reflects them

#### Scenario: A task's owner is edited by a manager
- **WHEN** the Board Creator/Owner changes the owner in the edit modal and confirms
- **THEN** the task's owner is reassigned via the API and the card's owner avatar shows the new owner

#### Scenario: A non-manager task owner edits without an owner field
- **WHEN** a member who owns the task but is not the board creator or owner edits it
- **THEN** the owner field is hidden and the member can edit only the title and description

#### Scenario: Blank title is rejected in the edit modal
- **WHEN** the user clears the title and confirms the edit
- **THEN** an inline error is shown and no request is sent

#### Scenario: Task editing is hidden for other members
- **WHEN** a member who is neither the task owner nor the board creator or owner views the task
- **THEN** no edit action is offered on the task

#### Scenario: Frozen boards hide task editing
- **WHEN** a board is `Blocked`, `Cancelled`, or `Done`, or the task is terminal
- **THEN** no edit action is offered on the task