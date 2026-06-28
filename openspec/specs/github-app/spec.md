# github-app Specification

## Purpose
TBD - created by archiving change issueos-foundation. Update Purpose after archive.
## Requirements
### Requirement: Webhook ingestion
The GitHub App SHALL receive `issue_comment`, `issues` Webhook events from GitHub, verify the signature, and forward recognized commands to the command router.

#### Scenario: Valid signed webhook
- **WHEN** GitHub sends a signed `issue_comment` event for a `/spec` comment
- **THEN** the App verifies the signature and dispatches a parse command event to the router

#### Scenario: Unsigned or bad signature
- **WHEN** a webhook request has an invalid signature
- **THEN** the App rejects it with 401 and does not dispatch

### Requirement: Command routing
The router SHALL recognize the command words `/spec`, `/plan`, `/task`, `/review` as the first token of an Issue/Issue-comment body and dispatch to the registered handler.

#### Scenario: Unknown command
- **WHEN** the first token is not one of the four commands
- **THEN** the router replies with a help message listing supported commands and takes no further action

#### Scenario: Placeholder handler
- **WHEN** a recognized command has no real handler registered yet (foundation state)
- **THEN** the router invokes the placeholder handler, which replies "尚未实现" with the command name, and records no domain object

### Requirement: Authorization
The App SHALL only act on repositories it is installed on, configurable via an allow-list; uninstalled or disallowed repos SHALL be refused silently (or with a minimal 403).

#### Scenario: Disallowed repository
- **WHEN** a webhook targets a repository not in the allow-list
- **THEN** the App refuses processing and returns an explicit unauthorized response

### Requirement: Configuration surface
The App SHALL read configuration (App ID, private key, client secret, webhook secret, allow-list) from environment variables with documented defaults and fail-fast on missing required config.

#### Scenario: Missing required config
- **WHEN** `APP_ID` or `PRIVATE_KEY` is unset at startup
- **THEN** the App exits with a non-zero code and a message naming the missing variable

