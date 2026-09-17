## ADDED Requirements

### Requirement: Users batch lookup
The system SHALL resolve a batch of user identities by id, returning the stable email-keyed `{ id, email }` identity for each id found and omitting unknown ids without creating identities.

#### Scenario: Batch returns stable identities
- **WHEN** a batch lookup includes ids that already have identities
- **THEN** each returns its existing `{ id, email }` identity, never a new one

#### Scenario: Unknown ids resolve to nothing
- **WHEN** a batch lookup includes an id with no identity
- **THEN** that id is omitted from the result
