## MODIFIED Requirements

### Requirement: User identity endpoints
The API SHALL accept an email via `POST /login` and respond `200` with the user identity for that email, creating the identity on first use so the same email always maps to the same identity, and SHALL return a known user's identity via `GET /users/:userId`. Emails SHALL be treated case-insensitively and stripped of surrounding whitespace.

#### Scenario: User identity is created
- **WHEN** a client sends `POST /login` with an email that does not yet have an identity
- **THEN** a new user identity is created and returned with its email

#### Scenario: User identity is retrieved
- **WHEN** a client sends `GET /users/:userId` for a known user
- **THEN** the identity is returned with its email

#### Scenario: Repeat login returns the same identity
- **WHEN** a client sends `POST /login` with an email that already has an identity
- **THEN** the same existing identity is returned, not a new one

#### Scenario: Login email is case-insensitive
- **WHEN** a client logs in with an email that differs from an existing identity's email only by case or surrounding whitespace
- **THEN** the existing identity is returned