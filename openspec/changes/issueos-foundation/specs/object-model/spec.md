## ADDED Requirements

### Requirement: Core domain objects
The system SHALL define TypeScript types for `Project`, `Issue`, `Spec`, `Plan`, `Task`, `Agent`, `Review`, `Knowledge`, with explicit field boundaries.

#### Scenario: Object identity and relations
- **WHEN** the type module is imported
- **THEN** every core object exposes stable identifiers (`id`, `projectId`) and relation pointers (e.g. `Plan.specId`, `Task.planId`, `Review.targetType/targetId`) sufficient for cross-command linkage

### Requirement: Object lifecycle statuses
The system SHALL define status enums for `Spec`, `Plan`, `Task`, `Review` (e.g. `draft|generated|reviewed|superseded`).

#### Scenario: Status transitions are type-safe
- **WHEN** a producer sets an object status
- **THEN** only values declared in the enum compile at design time and are persisted verbatim

### Requirement: Time and provenance fields
Every core object SHALL carry `createdAt`, `updatedAt`, and a provenance field recording the source command (`/spec` / `/plan` / `/task` / `/review`) and upstream object id.

#### Scenario: Provenance traceability
- **WHEN** a `/plan` command generates a Plan from a Spec
- **THEN** the Plan records `provenance.sourceCommand = "/plan"` and `provenance.specId` of the originating Spec