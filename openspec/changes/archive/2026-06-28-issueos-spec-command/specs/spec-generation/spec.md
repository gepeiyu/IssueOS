## ADDED Requirements

### Requirement: Generate Spec from Issue
The `/spec` command SHALL produce a structured `Spec` object covering all DSL fields (`title/background/goal/scope/out_of_scope/acceptance/risk/rollback`) from a natural-language Issue.

#### Scenario: Happy path generation
- **WHEN** a user comments `/spec` on a sufficiently complete Issue
- **THEN** the App replies with a Markdown Spec containing every DSL field and persists the Spec to the repository

#### Scenario: Persisted Spec is consumable by /plan
- **WHEN** `/spec` completes
- **THEN** the persisted Spec carries an `id`, `provenance.sourceCommand = "/spec"`, and the originating Issue link, so a subsequent `/plan` can resolve it

### Requirement: LLM abstraction
The system SHALL expose an `LlmClient` interface with a default provider implementation, switchable via environment, so generation logic does not hardcode a vendor.

#### Scenario: Provider swap
- **WHEN** the `LLM_PROVIDER` environment variable changes
- **THEN** the `/spec` flow uses the configured provider without changes to generation logic

### Requirement: Output formatting
The Spec reply SHALL use a fixed Markdown template that presents each DSL field, folds raw Issue text under `<details>`, and includes provenance.

#### Scenario: Reply is parseable by humans and downstream
- **WHEN** the App posts the Spec reply
- **THEN** the reply renders all DSL fields in stable section order and includes a machine-readable provenance line

### Requirement: Graceful degradation
The `/spec` command SHALL degrade gracefully on LLM timeout, parse failure, or missing fields, replying with actionable prompts instead of crashing.

#### Scenario: Timeout
- **WHEN** the LLM call times out
- **THEN** the App replies listing the lenient-parse missing fields and invites the user to complete them before retrying `/spec`

#### Scenario: Parse failure
- **WHEN** the LLM output cannot be parsed into the Spec schema
- **THEN** the App replies with a degradation message and does not persist an invalid Spec

### Requirement: Idempotent re-generation
Repeated `/spec` on the same Issue SHALL create a new Spec version and mark the previous as superseded, not overwrite.

#### Scenario: Re-run supersession
- **WHEN** `/spec` is invoked twice on the same Issue
- **THEN** the later Spec has `status=generated` and the earlier one is `superseded` with a pointer to the new Spec id