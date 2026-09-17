## ADDED Requirements

### Requirement: User search and resolution endpoints
The API SHALL resolve identities by email via `GET /users?email=<prefix>`, returning up to 8 matching identities, matched case-insensitively against normalized emails with exact matches first; and SHALL find-or-create an identity via `POST /users/resolve` with a single email, creating the identity on first use exactly like `POST /login` and returning the identity. Both SHALL require a known actor via `X-User-Id` (unknown actor -> 401); a missing or malformed `email` query on search SHALL be 400; a missing or malformed `email` body on resolve SHALL be 400.

#### Scenario: Search returns matching identities
- **WHEN** an authenticated client sends `GET /users?email=bob@` and identities exist whose normalized email begins with that prefix
- **THEN** up to 8 matching identities are returned, exact matches first, case-insensitive

#### Scenario: Search without an email term is rejected
- **WHEN** an authenticated client sends `GET /users` without an `email` query parameter
- **THEN** the API responds with `400`

#### Scenario: Resolve finds an existing identity
- **WHEN** an authenticated client sends `POST /users/resolve` with an email that already has an identity
- **THEN** the existing identity is returned

#### Scenario: Resolve creates a new identity
- **WHEN** an authenticated client sends `POST /users/resolve` with an email that has no identity
- **THEN** a new identity for that email is created and returned

#### Scenario: Search and resolve require an actor
- **WHEN** a client sends `GET /users?email=` or `POST /users/resolve` without a known `X-User-Id`
- **THEN** the API responds with `401` and performs no operation