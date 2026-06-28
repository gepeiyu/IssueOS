## ADDED Requirements

### Requirement: Review a PR or target
The `/review` command SHALL review a PR diff (or an explicit target) across five dimensions—tests, code style, security, performance, architecture—and post a Markdown report with a Risk Score.

#### Scenario: Happy path on a PR
- **WHEN** a user comments `/review` and the Issue has an associated PR
- **THEN** the App fetches the diff, evaluates the five dimensions, posts a Markdown report and persists the Review

#### Scenario: No PR associated
- **WHEN** no PR is associated with the Issue
- **THEN** the App prompts the user to run `/review <pr-number>` and does not fabricate a review

### Requirement: Explicit target selection
The `/review` command SHALL accept an explicit PR number (`/review <pr-number>`) and SHALL fall back to the latest associated PR when omitted.

#### Scenario: Explicit PR
- **WHEN** the user runs `/review 42`
- **THEN** the App reviews PR #42, or replies it was not found

### Requirement: Risk Score
The Review SHALL output a 0-100 Risk Score bucketed as low/medium/high, computed from per-dimension sub-scores with security weighted highest.

#### Scenario: Score bucketing
- **WHEN** a Review's computed score is 78
- **THEN** the report labels the risk bucket as "中" (medium) per the design thresholds

### Requirement: Provenance and linkage
Every persisted Review SHALL record `targetType`, `targetId`, and `provenance.sourceCommand = "/review"`.

#### Scenario: Review is traceable
- **WHEN** `/review` completes for PR #42
- **THEN** the persisted Review has `targetType=pr`, `targetId=42` and optionallinks to upstream spec/plan/task when available

### Requirement: Graceful degradation
The `/review` command SHALL degrade when the diff is empty/too large or the LLM times out, evaluating available dimensions and marking others "未评估" rather than failing.

#### Scenario: Diff too large
- **WHEN** the PR diff exceeds the evaluation length budget
- **THEN** the App reviews per-file summaries and marks the Review as "未完整评估"

#### Scenario: LLM timeout
- **WHEN** the LLM call times out mid-review
- **THEN** the App posts a partial report marking remaining dimensions "未评估"