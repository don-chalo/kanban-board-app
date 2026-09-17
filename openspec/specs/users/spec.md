# Users Specification

## Purpose

Users are the identities that create, own, and collaborate on boards and tasks; every board and every task references a user.

## Requirements

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

### Requirement: User search
The system SHALL find identities by email prefix, matching normalized emails case-insensitively, returning at most 8 identities and preferring exact matches over partial ones.

#### Scenario: Prefix search finds identities
- **WHEN** a user searches for an email prefix that matches one or more identities
- **THEN** the matching identities are returned, exact matches first

#### Scenario: Prefix search returns nothing for no matches
- **WHEN** a user searches for an email prefix that matches no identity
- **THEN** an empty result is returned

### Requirement: Board membership roles
A user participating on a board SHALL do so as the Creator, the Owner, or an Associated member. The Creator and Owner SHALL each be a single user; the Associated set SHALL contain the other members. A user SHALL NOT be both an Associated member and the Creator/Owner of the same board.

#### Scenario: New board has creator and owner
- **WHEN** a user creates a board
- **THEN** that user is the board's Creator and Owner, and the Associated set is empty

#### Scenario: Associated membership does not duplicate the owner
- **WHEN** a non-owner is added as an Associated member
- **THEN** the Associated set contains that member and never the board's Owner or Creator

### Requirement: Users may participate in multiple boards
A user SHALL be able to be the Creator, Owner, or Associated member of any number of boards (0..N) and the owner of any number of tasks.

#### Scenario: User belongs to several boards
- **WHEN** a user is a member of more than one board
- **THEN** the user's memberships coexist independently

#### Scenario: User owns tasks across boards
- **WHEN** a user is the owner of tasks on different boards
- **THEN** the user's ownerships coexist independently

### Requirement: Users batch lookup
The system SHALL resolve a batch of user identities by id, returning the stable email-keyed `{ id, email }` identity for each id found and omitting unknown ids without creating identities.

#### Scenario: Batch returns stable identities
- **WHEN** a batch lookup includes ids that already have identities
- **THEN** each returns its existing `{ id, email }` identity, never a new one

#### Scenario: Unknown ids resolve to nothing
- **WHEN** a batch lookup includes an id with no identity
- **THEN** that id is omitted from the result