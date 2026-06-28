# task-decomposition Specification

## Purpose
TBD - created by archiving change issueos-task-command. Update Purpose after archive.
## Requirements
### Requirement: Decompose Plan into Task DAG
The `/task` command SHALL decompose a persisted `Plan` into a `Task` DAG where each Task has an id, title and `dependsOn` list.

#### Scenario: Happy path
- **WHEN** a user comments `/task` and a non-superseded Plan exists for the Issue
- **THEN** the App replies with a Markdown Task DAG and persists the Tasks

#### Scenario: Plan not found
- **WHEN** no Plan exists for the Issue
- **THEN** the App prompts the user to run `/plan` first and does not fabricate Tasks

### Requirement: DAG acyclicity
The generated Tasks SHALL form a directed acyclic graph; the command SHALL detect cycles and degrade instead of persisting an invalid DAG.

#### Scenario: Cycle detected
- **WHEN** the LLM output implies a dependency cycle
- **THEN** the App removes the cycle-forming edges, persists a valid DAG, and warns the user

### Requirement: Task provenance and linkage
Every persisted Task SHALL record `planId` and `provenance.sourceCommand = "/task"`.

#### Scenario: /review can resolve tasks
- **WHEN** `/task` completes
- **THEN** a subsequent `/review` can list the Tasks via their `planId`

### Requirement: Explicit plan selection
The `/task` command SHALL accept an optional Plan id and fall back to the latest non-superseded Plan for the Issue when omitted.

#### Scenario: Explicit selection
- **WHEN** the user runs `/task <plan-id>`
- **THEN** the App uses that Plan, or replies it was not found

### Requirement: Graceful degradation
The `/task` command SHALL degrade: missing Plan prompts `/plan`; an overly coarse Plan prompts the user to refine before decomposition.

#### Scenario: Plan too coarse
- **WHEN** the Plan has fewer than two items
- **THEN** the App warns and does not generate a degenerate single-Task DAG

### Requirement: Idempotent re-generation
Repeated `/task` on the same Plan SHALL create a new Task set and supersede the previous one.

#### Scenario: Re-run supersession
- **WHEN** `/task` is invoked twice for the same Plan
- **THEN** the later Tasks have `status=generated` and the earlier ones are `superseded` pointing to the new set

