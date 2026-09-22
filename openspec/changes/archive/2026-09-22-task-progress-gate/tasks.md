## 1. Domain gate

- [x] 1.1 Enforce `board.state === 'InProgress'` in `moveTask` (after auth and editable checks, so frozen/terminal keep `read_only`) throwing `board_not_in_progress`, return `[]` from `allowedTaskTransitions` off `In Progress`, and register the code in `DomainErrorCode` plus `HTTP_STATUS_BY_CODE` as 409, and verify domain tests cover the gate on `To Do` boards, the preserved frozen/terminal behavior, and the error mapping

## 2. Test migration and coverage

- [x] 2.1 Migrate existing `moveTask` flows on `To Do` boards (domain, router, e2e suites: move the board to `In Progress` first or assert the 409) and add gate coverage (domain grants/denials, router 409 code, e2e seed flows, actions endpoints empty off `In Progress`), and verify `kanban-api` suites pass

## 3. Frontend arrows and message

- [x] 3.1 Hide task move arrows unless the board is `In Progress` in `BoardDetailPage.tsx` and map `board_not_in_progress` to a distinct message on optimistic submits, and verify `BoardDetailPage.test.tsx` covers hidden arrows on `To Do` boards, visible arrows on `In Progress`, and the gate message

## 4. Verification

- [x] 4.1 Run `npm test` in `kanban-api` plus `npm test`, `npm run lint`, `npm run build` in `kanban-front-end` and verify all pass
