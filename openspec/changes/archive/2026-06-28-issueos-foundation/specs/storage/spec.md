## ADDED Requirements

### Requirement: Repository abstraction
The system SHALL define a `Repository<T>` interface with `get`, `put`, `query(byProject)` operations for each core object type.

#### Scenario: Save and retrieve
- **WHEN** a producer calls `put(spec)` then `get(spec.id)`
- **THEN** the repository returns the same object with identical field values

#### Scenario: Query by project
- **WHEN** a producer queries all objects of a type for a given projectId
- **THEN** the repository returns only objects whose `projectId` matches

### Requirement: In-memory default implementation
The system SHALL provide an `InMemoryRepository` implementing the `Repository` interface, usable for local development and tests.

#### Scenario: In-memory persistence within process
- **WHEN** objects are `put` into an `InMemoryRepository` and the process is alive
- **THEN** subsequent `get`/`query` calls return them; on process exit the data is lost (acceptable for MVP local)

### Requirement: SQLite adapter scaffold
The system SHALL provide a `SqliteRepository` adapter implementing the same interface; MVP only requires interface conformance and basic `get`/`put`/`query` behavior, advanced querying may be stubbed.

#### Scenario: SQLite basic round-trip
- **WHEN** a producer `put`s an object into a `SqliteRepository` over a file DB
- **THEN** a subsequent `get` returns the persisted object across a new repository instance pointed at the same DB file