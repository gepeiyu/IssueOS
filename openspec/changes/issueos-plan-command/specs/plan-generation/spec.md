## ADDED Requirements

### Requirement: Generate Plan from Spec
The `/plan` command SHALL generate an ordered `Plan` from a persisted `Spec`, where each item has an id, title and summary.

#### Scenario: Happy path
- **WHEN** a user comments `/plan` and a non-superseded Spec exists for the Issue
- **THEN** the App replies with a Markdown Plan listing 3-8 ordered items and persists the Plan

#### Scenario: Spec not found
- **WHEN** no Spec exists for the Issue
- **THEN** the App replies prompting the user to run `/spec` first and does not fabricate a Plan

### Requirement: Plan provenance and linkage
Every persisted Plan SHALL record `provenance.sourceCommand = "/plan"` and `specId` of the source Spec.

#### Scenario: /task can resolve the Plan's Spec
- **WHEN** `/plan` completes
- **THEN** a subsequent `/task` can resolve the Plan and its originating Spec via the stored `specId`

### Requirement: Explicit spec selection
The `/plan` command SHALL accept an optional explicit Spec id (`/plan <spec-id>`) and SHALL fall back to the latest non-superseded Spec for the Issue when omitted.

#### Scenario: Explicit selection
- **WHEN** the user runs `/plan 123e4567`
- **THEN** the App uses the Spec with that id, or replies that it was not found

### Requirement: Graceful degradation
The `/plan` command SHALL degrade gracefully: missing Spec prompts `/spec`; insufficient Spec fields prompt completion rather than generating an empty Plan.

#### Scenario: Insufficient Spec fields
- **WHEN** the source Spec is missing `scope` or `acceptance`
- **THEN** the App replies listing the missing fields and does not persist a Plan

### Requirement: Idempotent re-generation
Repeated `/plan` on the same Spec SHALL create a new Plan version and supersede the previous one.

#### Scenario: Re-run supersession
- **WHEN** `/plan` is invoked twice for the same Spec
- **THEN** the later Plan has `status=generated` and the earlier is `superseded` pointing to the new Plan id