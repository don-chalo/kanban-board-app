## Purpose

The web app's boards page: it shows the boards a user belongs to, lets them create new boards, and requires an identified session to reach anything board-related.

## ADDED Requirements

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

### Requirement: Blank board detail route
The web app SHALL provide a route for a single board, rendered blank until a later change builds it out.

#### Scenario: Navigating to a board shows the blank route
- **WHEN** the user opens a board
- **THEN** the blank board detail route is shown