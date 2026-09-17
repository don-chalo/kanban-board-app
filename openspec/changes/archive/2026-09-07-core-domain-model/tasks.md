## 1. Setup

- [x] 1.1 Add `tsconfig.json` to `kanban-api` (strict mode, CommonJS) and verify `npx tsc --noEmit` runs clean on the empty project
- [x] 1.2 Add `vitest` as a devDependency and a `test` script (`vitest run`) to `kanban-api/package.json`, install it, and verify `npm test` passes a placeholder test
- [x] 1.3 Create the `src/domain/` module skeleton with barrel exports and verify the domain module imports cleanly in a test

## 2. Entities and roles

- [x] 2.1 Define `User`, `Board`, `Task` types, board roles (`Creator`, `Owner`, `Associated`), and `LifecycleState` enum in `src/domain/entities.ts` and verify TS compiles and entity construction tests pass
- [x] 2.2 Implement `resolveRole(board, user)` -> `creator` | `owner` | `associated` | `none` in `src/domain/roles.ts` and verify tests cover creator, owner, associated, and non-member resolution, and that the Associated set never contains the Creator/Owner

## 3. Lifecycle engine (shared by Board and Task)

- [x] 3.1 Implement `canTransition(state, target, previousState)` with the exact transition table for both Board and Task (`To Do -> In Progress -> Done`, `To Do`/`In Progress` -> `Blocked` -> previous state only, `To Do`/`In Progress` -> `Cancelled`) in `src/domain/lifecycle.ts` and verify unit tests cover every legal and illegal transition from the boards and tasks specs (including backtracks and `Blocked -> Done/Cancelled` rejects)
- [x] 3.2 Implement the Board `Done` gate (`boardCanBeDone`): board transitions to `Done` only when every task is `Done` or `Cancelled`, and verify tests confirm a `To Do`/`In Progress`/`Blocked` task blocks the gate while an all-Done/Cancelled board passes it
- [x] 3.3 Implement the `isEditable(board, task)` guard (cascade + terminal states) in `src/domain/guards.ts` and verify tests cover board `Blocked`/`Cancelled`/`Done` freezing tasks, task `Done`/`Cancelled` being terminal read-only, and live boards being editable

## 4. Authorization policy

- [x] 4.1 Implement `authorize(action, board, task, actor)` as a single policy table in `src/domain/authorize.ts` mapped to the access-control spec and verify tests cover visibility (members vs non-member), create-by-any-member, edit/move scoping (Owner own task, Associated own task, Creator/Owner any task), delete restricted to Creator/Owner, reassign restricted to Creator/Owner, and board management restricted to Creator/Owner
- [x] 4.2 Implement board/task visibility checks (`canView`, `canViewTask`) and verify a non-member is denied and every member role is granted

## 5. Domain commands

- [x] 5.1 Implement `createBoard(user)` and `createTask(board, actor, fields)` with default Owner = Creator and initial state `To Do` and verify tests confirm the creator/owner defaults, empty Associated set, and task-board single ownership
- [x] 5.2 Implement `moveTask` and `moveBoard` (authorize + `isEditable` + `canTransition`, writing/clearing `previousState` on Block/unblock) and verify the happy path, block/unblock restoring the exact previous state, and terminal/frozen states rejecting moves
- [x] 5.3 Implement `editTask` (Owner edits own, Creator/Owner edits any task, Associated only own, board-frozen and terminal tasks reject edits) and verify tests cover each scoping and read-only case
- [x] 5.4 Implement `reassignTaskOwner` (only Board Creator/Owner, target must be a board member) and verify denial for Associated/task-owner actors and non-member targets
- [x] 5.5 Implement `deleteTask` (only Board Creator/Owner; Associated and Task Owner denied; permanent removal; frozen boards reject) and verify tests cover all grants, denials, and the frozen-board case
- [x] 5.6 Implement `manageBoard` (add/remove Associated members, edit board attributes, change board state) gated to Creator/Owner and verify Associated and other actors are rejected

## 6. Verification sweep

- [x] 6.1 Mirror every scenario in the four delta specs (`users`, `boards`, `tasks`, `access-control`) as a unit test and verify each scenario has a corresponding passing test
- [x] 6.2 Run the full suite with `npm test` and `npx tsc --noEmit` and verify all tests pass with no type errors