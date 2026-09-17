# Frontend Boards Specification

## Purpose

The web app's boards page: it shows the boards a user belongs to, lets them create new boards, and requires an identified session to reach anything board-related.

## Requirements

### Requirement: Boards list
The web app SHALL fetch, via the API, the boards the identified user is a member of and display them, each showing its title and lifecycle state. SHALL show a loading state while the list is being fetched and an empty state when the user has no boards.

#### Scenario: Member boards are listed
- **WHEN** the user opens the boards page
- **THEN** only the boards they are a member of are fetched and displayed, showing each board's title and state

#### Scenario: Loading state is shown
- **WHEN** the boards are being fetched
- **THEN** the page shows a loading indicator

#### Scenario: Empty list is shown
- **WHEN** the user has no boards
- **THEN** the page shows an empty-state message

### Requirement: Boards list filtering and sorting
The web app SHALL let the user filter the boards list by lifecycle state (multi-select across all states), by owner, and by creator, and SHALL let the user sort the list by title or by canonical lifecycle-state order with an explicit direction. Filtering and sorting SHALL apply client-side to the fetched boards without additional API requests beyond member autocomplete. The page SHALL show a `SHOWING X OF Y` counter and a `CLEAR` action whenever any filter or non-default sort is active, and SHALL show a distinct empty state when filters match nothing. Filter and sort state SHALL persist in the URL query so it survives reloads and is shareable.

#### Scenario: Filter by state
- **WHEN** the user deactivates one or more state chips
- **THEN** only boards in the remaining states are displayed

#### Scenario: Filter by owner via autocomplete
- **WHEN** the user types in the owner field, picks a suggested identity
- **THEN** only boards owned by that user are displayed

#### Scenario: Filter by creator via autocomplete
- **WHEN** the user types in the creator field, picks a suggested identity
- **THEN** only boards created by that user are displayed

#### Scenario: Filters combine
- **WHEN** state, owner, and creator filters are all active
- **THEN** only boards matching all of them are displayed

#### Scenario: Sort by title with explicit direction
- **WHEN** the user selects title sort with ascending or descending direction
- **THEN** boards order case-insensitively by title in that direction

#### Scenario: Sort by state follows canonical order
- **WHEN** the user selects state sort with a direction
- **THEN** boards order by the canonical lifecycle-state order (or its reverse)

#### Scenario: Counter and clear
- **WHEN** any filter or non-default sort is active
- **THEN** the page shows `SHOWING X OF Y` and a `CLEAR` action that resets all filters and the sort

#### Scenario: Filtered empty state
- **WHEN** the user has boards but none match the active filters
- **THEN** the page shows a no-matches message distinct from the no-boards message

#### Scenario: Filters persist in the URL
- **WHEN** the user sets filters or sorting and reloads or shares the URL
- **THEN** the same filtered and sorted view is restored

### Requirement: Board creation
The web app SHALL provide a way to create a board with a title, submitting it to the API, and SHALL add the created board to the displayed list.

#### Scenario: Board is created from the list
- **WHEN** the user enters a title and confirms the action
- **THEN** a board is created via the API and appears in the list

#### Scenario: Blank title is rejected
- **WHEN** the user submits a blank title
- **THEN** an error is shown and no request is sent

### Requirement: Authenticated access
The boards routes SHALL require an identified user. When no identity is stored, or the API rejects the stored identity with a `401`, the web app SHALL clear the session and redirect to the login page.

#### Scenario: Missing identity redirects to login
- **WHEN** a user opens a boards route without a stored identity
- **THEN** the web app redirects to the login page

#### Scenario: Stale identity redirects to login
- **WHEN** the API rejects the stored identity with a `401`
- **THEN** the session is cleared and the web app redirects to the login page

### Requirement: Switch user
The web app SHALL let the user clear their stored session and return to the login page to identify as a different user.

#### Scenario: User switches identity
- **WHEN** the user chooses to switch user
- **THEN** the stored session is cleared and the login page is shown

### Requirement: Board detail display
The web app SHALL display a board detail page that shows the board's title in a large heading, its description directly below it (with a placeholder when empty), and an always-visible identity panel listing the board creator, the board owner, and the associated members.

#### Scenario: Board title and description are shown
- **WHEN** a member opens a board
- **THEN** a large title and a description line render in the page head

#### Scenario: Empty description shows a placeholder
- **WHEN** the board has no description
- **THEN** a "(no description)" hint is shown instead of blank space

#### Scenario: Identity panel lists the members
- **WHEN** a member opens a board
- **THEN** the identity panel shows the creator, the owner, and the associated members

### Requirement: Board state control
The identity panel SHALL show the board's current lifecycle state in a select whose selectable options are exactly the legal target states, and SHALL NOT allow invalid moves. On a terminal board the select SHALL be disabled while still displaying the current state. Choosing a legal target SHALL submit the move and refresh the board.

#### Scenario: Current state is shown with legal moves only
- **WHEN** a member opens a board in a non-terminal state
- **THEN** the select displays the current state and offers only the legal target states

#### Scenario: Terminal board locks the select
- **WHEN** a board is `Done` or `Cancelled`
- **THEN** the select is disabled but still shows the current state

#### Scenario: State change is applied and reflected
- **WHEN** the user selects a legal target state
- **THEN** the state change is submitted to the API and the board is refreshed to show the new state

### Requirement: Task columns
The web app SHALL render one column per lifecycle state (To Do, In Progress, Done, Blocked, Cancelled) and SHALL place each task card in the column matching that task's current state. Each column header SHALL display the state label followed by the task count in the form `LABEL (n)`, where `n` is the number of tasks currently in that state; the `(n)` suffix SHALL always be visible, including `(0)` for empty columns, and SHALL be rendered in an attenuated style. The column accessible name SHALL remain the bare state label (unchanged). Within each column, cards SHALL be ordered by priority `urgent` first, then `high`, then `medium`, then `low`, preserving the original relative order for equal priorities; column order SHALL NOT change.

#### Scenario: Tasks are grouped by their state
- **WHEN** the board is loaded
- **THEN** each task card appears in the column that matches its state

#### Scenario: Column headers show task counts
- **WHEN** the board is loaded
- **THEN** each column header shows `LABEL (n)` with `n` equal to the number of tasks in that state

#### Scenario: Empty columns show zero
- **WHEN** no task is in a given state
- **THEN** that column header shows `LABEL (0)`

#### Scenario: Counts stay in sync with the board
- **WHEN** the board refreshes after a task move, creation, or edit
- **THEN** each column header count reflects the refreshed task list

#### Scenario: Cards are ordered by priority within a column
- **WHEN** a column contains tasks with priorities `low`, `urgent`, and `medium`
- **THEN** they render top-to-bottom as `urgent`, `medium`, `low`

#### Scenario: Equal priorities keep stable order
- **WHEN** two tasks share the same priority in one column
- **THEN** they render in their original relative order

### Requirement: Task card
A task card SHALL show the task's title (truncated when long) and its lifecycle state, an owner avatar showing the first letter of the owner's email with a tooltip revealing the full email, a right-side arrow that appears when the pointer hovers the card, and an always-visible priority badge showing only the initial letter (`L` for `low`, `M` for `medium`, `H` for `high`, `U` for `urgent`). The badge SHALL expose the full priority word via its accessible name and tooltip. A task without a priority SHALL render as `M`. The card SHALL show the start date as `YYYY-MM-DD` (the first 10 characters of `startedAt`) to the left of the owner avatar when `startedAt` is set; when `startedAt` is `null` or missing it SHALL show no date. The date SHALL expose the full ISO value via its accessible name and tooltip. The card SHALL show a story-points badge in the top-right corner with the estimate value when `storyPoints` is set; when `storyPoints` is `null` or missing it SHALL show no badge. The badge SHALL expose its value via its accessible name and tooltip. The title SHALL leave room so it does not run under the corner badge.

#### Scenario: Card shows title, state, and owner avatar
- **WHEN** a task card renders
- **THEN** the title, the state, and the owner's avatar are visible, and hovering the avatar shows the owner's email

#### Scenario: Long titles are truncated
- **WHEN** a task title exceeds the column width
- **THEN** the title is clipped with an ellipsis instead of wrapping

#### Scenario: Priority badge shows only the initial
- **WHEN** a task with priority `urgent` renders
- **THEN** the card shows a `U` badge that reveals `urgent` via tooltip and accessible name

#### Scenario: Missing priority renders as medium
- **WHEN** a task without a priority renders
- **THEN** the card shows an `M` badge

#### Scenario: Start date shows left of the avatar
- **WHEN** a task with `startedAt` `2026-09-16T10:00:00.000Z` renders
- **THEN** the card shows `2026-09-16` to the left of the avatar with the full ISO in its tooltip and accessible name

#### Scenario: Missing start date shows nothing
- **WHEN** a task with `startedAt null` renders
- **THEN** the card shows no date

#### Scenario: Estimate badge shows in the corner
- **WHEN** a task with `5` story points renders
- **THEN** the card shows a `5` badge in the top-right corner with its value in the tooltip and accessible name

#### Scenario: Missing estimate shows no badge
- **WHEN** a task with `storyPoints null` renders
- **THEN** the card shows no points badge

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

### Requirement: Board effort summary
The web app SHALL show an effort-summary line under the board description in the form `TOTAL: X PTS - IN PROGRESS: N TASKS (Y PTS)`, where `X` is the sum of story points over all tasks, `N` is the number of tasks in `In Progress`, and `Y` is the sum of story points over tasks in `In Progress`. Tasks with `null` or missing story points SHALL count as `0`. The line SHALL refresh with the board data (creation, edit, move) like the column counts.

#### Scenario: Summary shows totals
- **WHEN** the board has tasks with `3`, `5`, and `null` points, two of them in `In Progress` with `5` and `null`
- **THEN** the line shows `TOTAL: 8 PTS - IN PROGRESS: 2 TASKS (5 PTS)`

#### Scenario: Empty board shows zeros
- **WHEN** the board has no tasks
- **THEN** the line shows `TOTAL: 0 PTS - IN PROGRESS: 0 TASKS (0 PTS)`

#### Scenario: Summary stays in sync
- **WHEN** the board refreshes after a task move, creation, or edit
- **THEN** the summary reflects the refreshed task list

### Requirement: Task creation and editing
The web app SHALL provide a `TaskModal` for creating and editing tasks with TITLE and DESCRIPTION fields, a PRIORITY selector offering `low`, `medium`, `high`, and `urgent`, a STORY PTS selector offering `--` (unestimated) plus `1`, `2`, `3`, `5`, `8`, and `13`, and an OWNER selector for managers. PRIORITY and STORY PTS SHALL sit side by side in one row. On create both selectors SHALL default to `medium` and `--` respectively; on edit they SHALL prefill from the task (missing reads as `medium` / `null`) and SHALL submit only when changed or on create. A blank title SHALL be rejected inline with no request. The owner field SHALL be shown only to the board creator or owner; for other members the task owner is the member themselves. The owner list SHALL include the board Creator, the Owner, and all Associated members, including the acting user selecting themself; the unselected option SHALL be labeled `(me)`. The modal SHALL be prefilled with the task's title, description, and current owner on edit; confirming SHALL save via the API and refetch the board so the updated attributes render. The owner field SHALL be editable only by the board creator or owner; a non-manager who owns the task edits the title, description, priority, and estimate only. On a frozen board (`Blocked`, `Cancelled`, `Done`) or on a terminal task the edit action SHALL NOT be offered.

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
- **WHEN** a member who is neither the task owner nor the board creator or owner views the task
- **THEN** no edit action is offered on the task

#### Scenario: Frozen boards hide task editing
- **WHEN** a board is `Blocked`, `Cancelled`, or `Done`, or the task is terminal
- **THEN** no edit action is offered on the task

### Requirement: Read-only board rendering
The web app SHALL render a board in `Blocked`, `Cancelled`, or `Done` as read-only: the new-task action and task move arrows SHALL be disabled, and on terminal boards the state select SHALL also be disabled.

#### Scenario: Frozen board renders read-only
- **WHEN** a board is `Blocked`, `Cancelled`, or `Done`
- **THEN** the new-task action and all task move arrows are disabled

#### Scenario: Terminal board additionally locks the state select
- **WHEN** a board is `Done` or `Cancelled`
- **THEN** the state select is disabled while still showing the state

### Requirement: Member addition
The web app SHALL let the Board Creator or Owner add an Associated member from the MEMBERS panel. The panel SHALL show a "+" action visible only to the Creator/Owner and only when the board is not frozen (`Blocked`, `Cancelled`, `Done`); activating it SHALL reveal an inline email entry with autocomplete suggestions. Committing an email SHALL resolve its identity (a chosen suggestion, or a newly created identity via the API for a fresh email) and add the member via the API, after which the board SHALL refetch so the new member appears in the MEMBERS list and in task owner options. Non-managers SHALL NOT see the "+" action and no add affordance SHALL be shown on a frozen board. Errors (duplicate member, creator/owner email, unknown email, request failure, or `409 read_only` on frozen) SHALL be shown without losing the entered email.

#### Scenario: Manager sees the add action
- **WHEN** the Board Creator or Owner opens a board in `To Do` or `In Progress`
- **THEN** the MEMBERS panel shows a "+" add action

#### Scenario: Frozen board hides the add action
- **WHEN** the Board Creator or Owner opens a board in `Blocked`, `Cancelled`, or `Done`
- **THEN** no "+" add action is shown

#### Scenario: Non-manager sees no add action
- **WHEN** an Associated member opens a board
- **THEN** no "+" add action is shown

#### Scenario: Autocomplete suggests matching identities
- **WHEN** the manager types an email prefix in the entry
- **THEN** matching identities are offered as suggestions

#### Scenario: A member is added by email
- **WHEN** the manager picks a suggestion or commits a fresh email and confirms on a non-frozen board
- **THEN** the member is added to the board and appears in the MEMBERS list after the board refetches

#### Scenario: Duplicate member is rejected
- **WHEN** the manager enters an email that is already on the board
- **THEN** an error is shown and no add request is sent

#### Scenario: Add failure is surfaced
- **WHEN** the add request fails
- **THEN** an error message is shown and the board is unchanged

### Requirement: Board title and description editing
The web app SHALL let the Board Creator or Owner edit the board title and description in place on the board detail page. Activating an editable field SHALL replace it with an input pre-filled with the current value; pressing Enter SHALL save the value via the API and apply the result locally without refetching; pressing Escape or leaving the input SHALL discard the edit. Non-managers SHALL NOT be offered editing. Editing the board title on a frozen board (`Blocked`, `Cancelled`, `Done`) SHALL NOT be offered; editing the board description on a frozen board SHALL remain offered to the Creator/Owner. A blank title SHALL be rejected with an inline error and no request; a blank description SHALL be accepted. A failed save (including `409 read_only` for title on frozen) SHALL surface an inline error and leave the displayed value unchanged.

#### Scenario: Manager edits the title
- **WHEN** the Board Creator or Owner activates the title field on a non-frozen board, types a new title, and presses Enter
- **THEN** the title is saved via the API and the heading reflects the new title

#### Scenario: Manager edits the description
- **WHEN** the Board Creator or Owner activates the description field, types a new description, and presses Enter
- **THEN** the description is saved via the API and shown in place of any previous text or the "(no description)" placeholder

#### Scenario: Description remains editable on a frozen board
- **WHEN** the Board Creator or Owner opens a board in `Blocked`, `Cancelled`, or `Done`
- **THEN** the description field remains editable while the title field renders as plain text

#### Scenario: Non-manager sees plain text only
- **WHEN** an Associated member opens a board
- **THEN** the title and description render as plain text with no editing affordance

#### Scenario: Escape cancels the edit
- **WHEN** a manager edits a field and presses Escape
- **THEN** the edit is discarded and the previous value is shown

#### Scenario: Defocus cancels the edit
- **WHEN** a manager edits a field and moves focus away without pressing Enter
- **THEN** the edit is discarded and the previous value is shown

#### Scenario: Frozen board is not editable
- **WHEN** a manager opens a board in `Blocked`, `Cancelled`, or `Done`
- **THEN** the title renders as plain text with no editing affordance while the description remains editable

#### Scenario: Frozen board title is not editable
- **WHEN** a manager opens a board in `Blocked`, `Cancelled`, or `Done`
- **THEN** the title renders as plain text with no editing affordance

#### Scenario: Blank title is rejected
- **WHEN** a manager clears the title and confirms the edit
- **THEN** an inline error is shown and no save request is sent

#### Scenario: Blank description is accepted
- **WHEN** a manager clears the description and presses Enter
- **THEN** the description is saved as empty and the "(no description)" placeholder is shown

#### Scenario: Save failure is surfaced
- **WHEN** the save request fails
- **THEN** an inline error is shown and the displayed value is unchanged

### Requirement: Member removal
The web app SHALL let the Board Creator or Owner remove an Associated member from the MEMBERS panel. Each associated member row SHALL reveal an "X" action on hover; activating it SHALL remove the member via the API and update the board without refetching. When the member owns tasks on the board, a confirmation SHALL be requested before removal and the member SHALL be removed only when the manager confirms. Non-managers SHALL NOT see the "X" action. On a frozen board (`Blocked`, `Cancelled`, `Done`) the action SHALL NOT be offered.

#### Scenario: Manager sees the remove action on hover
- **WHEN** the Board Creator or Owner hovers over an Associated member row
- **THEN** an "X" action is revealed on that row

#### Scenario: Non-manager sees no remove action
- **WHEN** an Associated member hovers over any member row
- **THEN** no "X" action is revealed

#### Scenario: Frozen board hides the remove action
- **WHEN** a manager hovers over an Associated member row on a board in `Blocked`, `Cancelled`, or `Done`
- **THEN** no "X" action is revealed

#### Scenario: Member without tasks is removed immediately
- **WHEN** the manager activates the "X" action on an Associated member who owns no tasks
- **THEN** the member is removed via the API and disappears from the MEMBERS list

#### Scenario: Confirmation is requested when the member owns tasks
- **WHEN** the manager activates the "X" action on an Associated member who owns tasks
- **THEN** a confirmation dialog is shown naming the member, and choosing Yes removes the member via the API while Cancel discards the removal

### Requirement: Board owner reassignment
The web app SHALL let the Board Creator/Owner reassign the board owner by activating the OWNER row in the identity panel, which SHALL open a dropdown listing the board's current members (the Creator, the current Owner, and all Associated members), with the current owner preselected. Choosing a different member SHALL submit the reassignment via the API and SHALL update the panel so the new owner appears in the OWNER row. The option SHALL be offered only to the Board Creator/Owner and only on a board that is not frozen (`Blocked`, `Cancelled`, `Done`); other members SHALL see the OWNER value as plain text, and a frozen board SHALL NOT offer the dropdown.

#### Scenario: Manager reassigns the owner
- **WHEN** the Board Creator/Owner picks a different member in the owner dropdown
- **THEN** ownership is reassigned via the API and the OWNER row shows the new member

#### Scenario: Owner dropdown lists only board members
- **WHEN** the Board Creator/Owner opens the owner dropdown
- **THEN** the dropdown lists the board Creator, the current Owner, and all Associated members, with the current owner preselected

#### Scenario: Non-manager sees the owner as plain text
- **WHEN** an Associated member opens a board
- **THEN** the OWNER value renders as plain text with no dropdown

#### Scenario: Frozen board hides the owner dropdown
- **WHEN** the Board Creator/Owner opens a board in `Blocked`, `Cancelled`, or `Done`
- **THEN** no owner dropdown is offered