## ADDED Requirements

### Requirement: Frozen task creation is rejected
The API SHALL reject task creation on a frozen board (`Blocked`, `Cancelled`, `Done`) via `POST /boards/:boardId/tasks` with `409` and `read_only`.

#### Scenario: Task creation rejected on Blocked board
- **WHEN** a board member sends `POST /boards/:boardId/tasks` on a board in `Blocked`
- **THEN** the API responds with `409` and `read_only` and no task is created

#### Scenario: Task creation rejected on terminal boards
- **WHEN** a board member sends `POST /boards/:boardId/tasks` on a board in `Done` or `Cancelled`
- **THEN** the API responds with `409` and `read_only` and no task is created

### Requirement: Blank board title is rejected
The API SHALL reject a blank or whitespace-only board title via `POST /boards` and `PATCH /boards/:boardId` with `400` and `validation`. A rejected rename SHALL leave the board unchanged.

#### Scenario: Board creation with blank title is rejected
- **WHEN** a client sends `POST /boards` with a blank or whitespace-only title
- **THEN** the API responds with `400` and `validation` and no board is created

#### Scenario: Board rename with blank title is rejected
- **WHEN** a Board Creator or Owner sends `PATCH /boards/:boardId` with a blank or whitespace-only `title`
- **THEN** the API responds with `400` and `validation` and the title is unchanged
