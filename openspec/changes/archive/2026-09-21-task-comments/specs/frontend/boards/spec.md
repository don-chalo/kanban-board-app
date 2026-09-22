## MODIFIED Requirements

### Requirement: Task creation and editing
The web app SHALL provide a `TaskModal` for creating and editing tasks with TITLE and DESCRIPTION fields, a PRIORITY selector offering `low`, `medium`, `high`, and `urgent`, a STORY PTS selector offering `--` (unestimated) plus `1`, `2`, `3`, `5`, `8`, and `13`, and an OWNER selector for managers. PRIORITY and STORY PTS SHALL sit side by side in one row. On create both selectors SHALL default to `medium` and `--` respectively; on edit they SHALL prefill from the task (missing reads as `medium` / `null`) and SHALL submit only when changed or on create. A blank title SHALL be rejected inline with no request. The owner field SHALL be shown only to the board creator or owner; for other members the task owner is the member themselves. The owner list SHALL include the board Creator, the Owner, and all Associated members, including the acting user selecting themself; the unselected option SHALL be labeled `(me)`. The modal SHALL be prefilled with the task's title, description, and current owner on edit; confirming SHALL save via the API and refetch the board so the updated attributes render. The owner field SHALL be editable only by the board creator or owner; a non-manager who owns the task edits the title, description, priority, and estimate only. The task title SHALL always open the task modal; on a frozen board (`Blocked`, `Cancelled`, `Done`) or on a terminal task the edit form SHALL be shown disabled with no SAVE, and the modal SHALL close via a top-right X instead of a CLOSE button.

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

#### Scenario: New task defaults to medium priority
- **WHEN** a member opens the new-task modal
- **THEN** the PRIORITY selector shows `medium`

#### Scenario: New task defaults to unestimated
- **WHEN** a member opens the new-task modal
- **THEN** the STORY PTS selector shows `--`

#### Scenario: A task's title and description are edited
- **WHEN** the Task Owner or Board Creator/Owner activates the task, changes the title and/or description, and confirms
- **THEN** the changes are saved via the API and the board refetches so the card reflects them

#### Scenario: A task's owner is edited by a manager
- **WHEN** the Board Creator/Owner changes the owner in the edit modal and confirms
- **THEN** the task's owner is reassigned via the API and the card's owner avatar shows the new owner

#### Scenario: Edit modal prefills priority
- **WHEN** a manager opens a task with priority `high` for editing
- **THEN** the PRIORITY selector shows `high`

#### Scenario: Edit modal prefills estimate
- **WHEN** a manager opens a task with `8` story points for editing
- **THEN** the STORY PTS selector shows `8`

#### Scenario: Priority change is saved
- **WHEN** the owner changes priority to `urgent` and saves
- **THEN** the update request includes `urgent` and the board refreshes

#### Scenario: Estimate change is saved
- **WHEN** the owner changes story points to `5` and saves
- **THEN** the update request includes `5` and the board refreshes

#### Scenario: Estimate is cleared
- **WHEN** the owner changes story points to `--` and saves
- **THEN** the update request includes `null` and the board refreshes

#### Scenario: A non-manager task owner edits without an owner field
- **WHEN** a member who owns the task but is not the board creator or owner edits it
- **THEN** the owner field is hidden and the member can edit only the title, description, priority, and estimate

#### Scenario: Blank title is rejected in the edit modal
- **WHEN** the user clears the title and confirms the edit
- **THEN** an inline error is shown and no request is sent

#### Scenario: Task editing is hidden for other members
- **WHEN** a member who is neither the task owner nor the board creator or owner activates the task
- **THEN** the edit form is shown disabled with no SAVE, but the task modal opens with its comments

#### Scenario: Frozen boards hide task editing
- **WHEN** a board is `Blocked`, `Cancelled`, or `Done`, or the task is terminal
- **THEN** the edit form is shown disabled with no SAVE; the task modal opens with the comments thread only

#### Scenario: Modal closes via the top-right X
- **WHEN** the user activates the X in the task modal
- **THEN** the modal closes; no CLOSE button is offered

## ADDED Requirements

### Requirement: Task modal comments section
The web app SHALL render an expandable `COMMENTS (N)` section below the SAVE row of the task modal in edit mode (never in the "New task" modal). Expanding SHALL collapse the edit form and show an entry input on top with the comment list newest-first; each item SHALL show the author email, timestamp, and text with edit and remove actions visible only to the comment author, the Board Creator/Owner, or the task owner. The edit form SHALL additionally be independently collapsible, and the modal SHALL NOT exceed the viewport height with scrolling confined to the comment list. No SAVE button SHALL be shown while comments are visible; comments SHALL be created with Enter. Every comment mutation (create, edit, remove) SHALL show a busy state disabling re-entry while the request is in flight. Blank submissions SHALL be rejected inline with no request; removing SHALL ask for confirmation first. The section SHALL work on frozen boards and terminal tasks.

#### Scenario: Comments section expands over the form
- **WHEN** the user activates `COMMENTS (N)` in the task modal
- **THEN** the edit form collapses and the comment thread is shown

#### Scenario: Edit form collapses independently
- **WHEN** the user collapses the edit form without expanding comments
- **THEN** the form hides while the modal stays open with its toggles

#### Scenario: Scroll stays inside the comment list
- **WHEN** the thread overflows the bounded modal
- **THEN** only the comment list scrolls; the entry input and toggles stay fixed

#### Scenario: Mutations show busy state
- **WHEN** a comment create, edit, or remove request is in flight
- **THEN** the entry or row shows busy, re-entry is disabled, and no duplicate request is sent

#### Scenario: Member adds a comment with Enter
- **WHEN** a member types text and presses Enter
- **THEN** the comment is created via the API and appears first in the list

#### Scenario: No SAVE while comments are visible
- **WHEN** the comments section is expanded
- **THEN** no SAVE button is shown

#### Scenario: Author edits their comment
- **WHEN** the author activates edit, changes the text, and saves
- **THEN** the updated text renders via the API result

#### Scenario: Task owner edits a comment on their task
- **WHEN** the task owner submits new valid text on another member's comment
- **THEN** the comment's text is updated

#### Scenario: Edit is hidden from unrelated members
- **WHEN** a member who is neither the author, the Board Creator/Owner, nor the task owner views a comment
- **THEN** no edit or remove actions are offered on it

#### Scenario: Removal asks for confirmation
- **WHEN** the author, a manager, or the task owner activates remove and confirms
- **THEN** the comment is removed via the API and disappears from the list

#### Scenario: Comments work on frozen boards and terminal tasks
- **WHEN** the task cannot be edited due to a frozen board or terminal state
- **THEN** the modal still offers the comments thread with create, edit, and remove per the rules above
