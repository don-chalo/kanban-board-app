## ADDED Requirements

### Requirement: Board comments
A Board SHALL carry an embedded thread of zero or more comments, each with a stable id, an author (User), text, and a creation timestamp. Any board member SHALL be able to add a comment, including on a frozen board (`Blocked`, `Cancelled`, `Done`). A comment SHALL be editable and removable by its author or by the Board Creator/Owner, including on a frozen board. Comment text SHALL never be blank and SHALL NOT exceed 2000 characters.

#### Scenario: Member adds a comment
- **WHEN** a board member submits non-blank text within the limit
- **THEN** the comment is appended to the board's thread with that member as author

#### Scenario: Blank comment is rejected
- **WHEN** a user submits blank or whitespace-only text
- **THEN** the comment is rejected and the thread is unchanged

#### Scenario: Overlong comment is rejected
- **WHEN** a user submits text over 2000 characters
- **THEN** the comment is rejected and the thread is unchanged

#### Scenario: Author edits their comment
- **WHEN** the comment author submits new valid text
- **THEN** the comment's text is updated

#### Scenario: Manager edits any comment
- **WHEN** the Board Creator or Owner submits new valid text on another member's comment
- **THEN** the comment's text is updated

#### Scenario: Non-author non-manager cannot edit
- **WHEN** a member who is neither the author nor the Board Creator/Owner attempts to edit a comment
- **THEN** the edit is rejected and the comment is unchanged

#### Scenario: Author removes their comment
- **WHEN** the comment author removes it
- **THEN** the comment is permanently removed from the thread

#### Scenario: Manager removes any comment
- **WHEN** the Board Creator or Owner removes another member's comment
- **THEN** the comment is permanently removed from the thread

#### Scenario: Commenting works on a frozen board
- **WHEN** the board is `Blocked`, `Cancelled`, or `Done`
- **THEN** members can still add, edit, and remove comments per the rules above
