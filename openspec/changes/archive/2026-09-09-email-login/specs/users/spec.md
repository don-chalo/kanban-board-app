## MODIFIED Requirements

### Requirement: Unique user identity
The system SHALL maintain each user as a unique identity with a stable identifier keyed by email, and SHALL reference the same identity for a user consistently across boards and tasks. The same email SHALL always map to exactly one identity: an identity is created on the first login with that email and reused on every subsequent login. Two different identities SHALL never be created for the same email.

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