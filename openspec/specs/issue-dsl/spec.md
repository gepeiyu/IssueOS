# issue-dsl Specification

## Purpose
TBD - created by archiving change issueos-foundation. Update Purpose after archive.
## Requirements
### Requirement: Issue DSL schema
The system SHALL define a structured Issue schema with fields: `title`, `background`, `goal`, `scope`, `out_of_scope`, `acceptance`, `risk`, `rollback`.

#### Scenario: All fields present
- **WHEN** an Issue text contains all required DSL fields
- **THEN** the parser produces a typed Issue object passing strict validation

#### Scenario: Missing optional context
- **WHEN** an Issue text omits `background` or `risk`
- **THEN** the parser fills reasonable defaults and warns, but still produces a valid Issue object

### Requirement: DSL textual format
The parser SHALL accept two textual forms of an Issue: YAML frontmatter (a `---`-delimited block at the top of the Issue body) and line-oriented `key: value` form. In both forms, keys map to the DSL fields.

#### Scenario: YAML frontmatter form
- **WHEN** an Issue body starts with a `---`-delimited frontmatter block containing DSL keys
- **THEN** the parser extracts the fields from the frontmatter and treats the remaining body as `background` context when `background` is absent

#### Scenario: Key-value line form
- **WHEN** an Issue body consists of `key: value` lines (e.g. `goal: 支持微信授权登录`)
- **THEN** the parser maps each recognized key to the corresponding DSL field and reports any unrecognized keys in lenient mode

### Requirement: Dual-mode parsing
The system SHALL support two parsing modes: `strict` (reject missing required fields) and `lenient` (produce best-effort object with actionable prompts).

#### Scenario: Strict mode rejects incomplete Issue
- **WHEN** strict mode is active and a required field is missing
- **THEN** the parser returns a validation error listing the missing fields

#### Scenario: Lenient mode guides completion
- **WHEN** lenient mode is active and fields are missing
- **THEN** the parser returns a partial Issue plus actionable prompts telling the user how to complete it

### Requirement: DSL verifier utility
The system SHALL expose a programmatic `parseIssue(text, mode)` and `validateIssue(issue)` API for downstream commands.

#### Scenario: Programmatic parse
- **WHEN** a caller invokes `parseIssue("<issue text>", "strict")`
- **THEN** it returns either a typed `Issue` object or a structured validation error, without throwing on user input

