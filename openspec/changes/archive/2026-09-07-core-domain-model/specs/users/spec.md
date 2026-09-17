## Purpose

Users are the identities that create, own, and collaborate on boards and tasks; every board and every task references a user.

## ADDED Requirements

### Requirement: Unique user identity
The system SHALL maintain each user as a unique identity with a stable identifier, and SHALL reference the same identity for a user consistently across boards and tasks.

#### Scenario: Same user referenced consistently
- **WHEN** a user is the creator of a board and the owner of a task
- **THEN** the same unique identity is referenced in both places

#### Scenario: Users are distinct
- **WHEN** two different users exist
- **THEN** they have distinct identities and are never conflated

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