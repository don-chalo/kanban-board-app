## ADDED Requirements

### Requirement: Board comment endpoints
The API SHALL create a board comment via `POST /boards/:boardId/comments` with body `{ text }`, responding `201` with `{ id, author, text, createdAt }`; SHALL edit a comment via `PATCH /boards/:boardId/comments/:commentId` with body `{ text }`; and SHALL remove a comment via `DELETE /boards/:boardId/comments/:commentId`. The API SHALL return the board's comments embedded in `GET /boards/:boardId`. All three mutation endpoints SHALL require board membership (`403` for non-members, `401` for unknown actor); a missing board or comment SHALL be `404`; blank text or text over 2000 characters SHALL be `400` with `validation`; edits and removals by anyone other than the author or the Board Creator/Owner SHALL be `403`.

#### Scenario: Member creates a comment
- **WHEN** a board member sends `POST /boards/:boardId/comments` with valid text
- **THEN** the API responds `201` with the comment including author and timestamp

#### Scenario: Blank or overlong text is rejected
- **WHEN** a client sends blank text or text over 2000 characters
- **THEN** the API responds `400` with `validation` and the thread is unchanged

#### Scenario: Comment is edited
- **WHEN** the author or the Board Creator/Owner sends `PATCH` with valid text
- **THEN** the comment's text is updated

#### Scenario: Unauthorized edit is rejected
- **WHEN** any other member sends `PATCH` for the comment
- **THEN** the API responds `403` and the comment is unchanged

#### Scenario: Comment is removed
- **WHEN** the author or the Board Creator/Owner sends `DELETE`
- **THEN** the comment is removed

#### Scenario: Board detail embeds comments
- **WHEN** a member sends `GET /boards/:boardId` on a board with comments
- **THEN** the response includes the board's comment thread

#### Scenario: Non-member has no access
- **WHEN** a user who is not a board member uses a comment endpoint
- **THEN** the API denies access
