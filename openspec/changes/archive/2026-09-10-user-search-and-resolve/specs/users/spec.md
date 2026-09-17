## MODIFIED Requirements

### Requirement: Unique user identity
The system SHALL maintain each user as a unique identity with a stable identifier keyed by email, and SHALL reference the same identity for a user consistently across boards and tasks. The same email SHALL always map to exactly one identity: an identity is created the first time that email is used, whether via login or via resolve-by-email, and is reused on every subsequent use. Two different identities SHALL never be created for the same email.

#### Scenario: Same user referenced consistently
- **WHEN** a user is the creator of a board and the owner of a task
- **THEN** the same unique identity is referenced in both places

#### Scenario: Users are distinct
- **WHEN** two different users exist
- **THEN** they have distinct identities and are never conflated

#### Scenario: Email maps to one identity
- **WHEN** a user logs in with the same email across multiple sessions
- **THEN** every login returns the same identity for that email

#### Scenario: Existing email never gets a new identity
- **WHEN** a login is attempted with an email that already has an identity
- **THEN** no new identity is created and the existing identity is returned

#### Scenario: Resolve creates a missing identity
- **WHEN** an email that has no identity yet is resolved through the API
- **THEN** an identity is created for that email and returned

#### Scenario: Resolve returns the existing identity
- **WHEN** an email that already has an identity is resolved through the API
- **THEN** the existing identity is returned, not a new one

## ADDED Requirements

### Requirement: User search
The system SHALL find identities by email prefix, matching normalized emails case-insensitively, returning at most 8 identities and preferring exact matches over partial ones.

#### Scenario: Prefix search finds identities
- **WHEN** a user searches for an email prefix that matches one or more identities
- **THEN** the matching identities are returned, exact matches first

#### Scenario: Prefix search returns nothing for no matches
- **WHEN** a user searches for an email prefix that matches no identity
- **THEN** an empty result is returned