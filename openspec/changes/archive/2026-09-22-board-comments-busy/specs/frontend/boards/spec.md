## MODIFIED Requirements

### Requirement: Board comments section
The web app SHALL render a `COMMENTS (n)` section below the task columns on the board detail page, with a minimum height on the columns grid so the header stays visible. The section SHALL show an entry input on top with an add action, followed by the comment list newest-first, each item showing the author email, timestamp, and text with edit and remove actions visible only to the comment author or the Board Creator/Owner. Creating, editing, and removing SHALL work on frozen boards. Blank submissions SHALL be rejected inline with no request; removing SHALL ask for confirmation first. Every comment mutation (create, edit, remove) SHALL show a busy state disabling re-entry while the request is in flight.

#### Scenario: Comments are listed newest-first
- **WHEN** a board has comments
- **THEN** they render below the columns, newest first, with author, timestamp, and text

#### Scenario: Member adds a comment
- **WHEN** a member enters text and confirms
- **THEN** the comment is created via the API and appears first in the list

#### Scenario: Blank comment is rejected inline
- **WHEN** the user confirms with blank text
- **THEN** an error is shown and no request is sent

#### Scenario: Author edits their comment
- **WHEN** the author activates edit, changes the text, and saves
- **THEN** the updated text renders via the API result

#### Scenario: Edit is hidden from other non-manager members
- **WHEN** a member who is neither the author nor the Board Creator/Owner views a comment
- **THEN** no edit or remove actions are offered on it

#### Scenario: Removal asks for confirmation
- **WHEN** the author or a manager activates remove and confirms
- **THEN** the comment is removed via the API and disappears from the list

#### Scenario: Comments work on a frozen board
- **WHEN** the board is `Blocked`, `Cancelled`, or `Done`
- **THEN** the section still offers create, edit, and remove per the rules above

#### Scenario: Mutations show busy state
- **WHEN** a board comment create, edit, or remove request is in flight
- **THEN** the entry or row shows busy, re-entry is disabled, and no duplicate request is sent
