## MODIFIED Requirements

### Requirement: Task creation, reading, editing, and deletion
Board members SHALL create tasks via `POST /boards/:boardId/tasks` and read them via `GET /boards/:boardId/tasks` and `GET /boards/:boardId/tasks/:taskId`. The Task Owner, and the Board Creator/Owner, SHALL edit a task via `PATCH /boards/:boardId/tasks/:taskId`. Only the Board Creator/Owner SHALL delete a task via `DELETE /boards/:boardId/tasks/:taskId`. A task title SHALL never be blank: a blank title on create or edit SHALL be rejected with `400`. Both `POST` and `PATCH` SHALL accept an optional `priority` of `low | medium | high | urgent`; an omitted priority on create SHALL default to `medium`, and an invalid priority SHALL be rejected with `400` and `validation`. Tasks persisted without a priority SHALL be returned as `medium`. Tasks SHALL be returned with `startedAt` (ISO string or `null`); tasks persisted without it SHALL be returned as `null`. `PATCH` SHALL ignore a `startedAt` body field without error and SHALL NOT change the stored value. Both `POST` and `PATCH` SHALL accept optional `storyPoints` of `1 | 2 | 3 | 5 | 8 | 13` or `null`; an omitted value on create SHALL default to `null`, and any other value SHALL be rejected with `400` and `validation`. Tasks persisted without `storyPoints` SHALL be returned as `null`.

#### Scenario: Member creates a task
- **WHEN** a board member sends `POST /boards/:boardId/tasks` with a title
- **THEN** a task is created, owned by that member, in state `To Do`

#### Scenario: Task is created with default priority
- **WHEN** a board member sends `POST /boards/:boardId/tasks` with a title and no priority
- **THEN** the API responds `201` and the task priority is `medium`

#### Scenario: Task is created with explicit priority
- **WHEN** a board member sends `POST /boards/:boardId/tasks` with a title and priority `urgent`
- **THEN** the API responds `201` and the task priority is `urgent`

#### Scenario: Invalid priority on create is rejected
- **WHEN** a board member sends `POST /boards/:boardId/tasks` with priority `critical`
- **THEN** the API responds `400` with `validation` and no task is created

#### Scenario: New task has null start date
- **WHEN** a board member sends `POST /boards/:boardId/tasks` with a title
- **THEN** the API responds `201` and the task `startedAt` is `null`

#### Scenario: Task is created with an estimate
- **WHEN** a board member sends `POST /boards/:boardId/tasks` with a title and story points `5`
- **THEN** the API responds `201` and the task `storyPoints` is `5`

#### Scenario: New task defaults to null estimate
- **WHEN** a board member sends `POST /boards/:boardId/tasks` with a title and no story points
- **THEN** the API responds `201` and the task `storyPoints` is `null`

#### Scenario: Invalid estimate on create is rejected
- **WHEN** a board member sends `POST /boards/:boardId/tasks` with story points `4`
- **THEN** the API responds `400` with `validation` and no task is created

#### Scenario: Task owner edits the task
- **WHEN** the Task Owner sends `PATCH /boards/:boardId/tasks/:taskId` with a title and/or description
- **THEN** the task's title and/or description are updated

#### Scenario: Task priority is edited
- **WHEN** the Task Owner sends `PATCH /boards/:boardId/tasks/:taskId` with priority `high`
- **THEN** the task priority becomes `high`

#### Scenario: Invalid priority on edit is rejected
- **WHEN** a user sends `PATCH /boards/:boardId/tasks/:taskId` with priority ` ASAP `
- **THEN** the API responds `400` with `validation` and the task is unchanged

#### Scenario: Patch ignores start date
- **WHEN** a user sends `PATCH /boards/:boardId/tasks/:taskId` with `startedAt`
- **THEN** the API applies the other valid fields, leaves stored `startedAt` unchanged, and does not error on `startedAt`

#### Scenario: Task estimate is edited
- **WHEN** the Task Owner sends `PATCH /boards/:boardId/tasks/:taskId` with story points `8`
- **THEN** the task `storyPoints` becomes `8`

#### Scenario: Estimate is cleared
- **WHEN** the Task Owner sends `PATCH /boards/:boardId/tasks/:taskId` with story points `null`
- **THEN** the task `storyPoints` becomes `null`

#### Scenario: Invalid estimate on edit is rejected
- **WHEN** a user sends `PATCH /boards/:boardId/tasks/:taskId` with story points `0`
- **THEN** the API responds `400` with `validation` and the task is unchanged

### Requirement: Task lifecycle and ownership endpoints
The API SHALL transition a task's lifecycle via `POST /boards/:boardId/tasks/:taskId/state` and reassign a task's Owner via `POST /boards/:boardId/tasks/:taskId/owner`, enforcing the same authorization and state rules as the domain model. The first `To Do -> In Progress` transition with `startedAt null` SHALL stamp `startedAt` with the current ISO time; later transitions SHALL NOT overwrite it.

#### Scenario: Task state is changed
- **WHEN** a user entitled to move the task sends `POST /boards/:boardId/tasks/:taskId/state` with a legal target
- **THEN** the task transitions, recording its previous state while `Blocked` and clearing it on unblock

#### Scenario: First start stamps the date
- **WHEN** a user moves a task `To Do -> In Progress` with `startedAt null`
- **THEN** the response task carries a current ISO `startedAt`

#### Scenario: Return from Blocked keeps the date
- **WHEN** a task with a set `startedAt` moves `In Progress -> Blocked -> In Progress`
- **THEN** the returned `startedAt` is unchanged

#### Scenario: Task owner is reassigned
- **WHEN** a Board Creator or Owner sends `POST /boards/:boardId/tasks/:taskId/owner` naming a board member
- **THEN** the task's owner becomes that member

#### Scenario: Reassignment to a non-member is rejected
- **WHEN** a Board Creator or Owner names a user who is not a board member
- **THEN** the reassignment is rejected
