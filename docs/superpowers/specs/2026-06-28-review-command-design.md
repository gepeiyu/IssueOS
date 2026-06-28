---
comet_change: issueos-review-command
role: technical-design
canonical_spec: openspec
status: draft
archived-with: 2026-06-28-issueos-review-command
status: final
---

# Review Command — Design Doc

> 深度技术设计对应 OpenSpec change `issueos-review-command`。

## Architecture

```
GitHub Comment `/review <pr-number>`
  → github-app 命令路由
  → Resolve target (PR diff via octokit, or spec/plan/task from Repository)
  → Build 5-dimension prompt
  → LlmClient.generate(prompt, ReviewSchema)
  → Compute Risk Score (weighted average)
  → Persist Review object
  → Issue/PR Markdown reply
```

## Package: `packages/commands/review/`

- `review-handler.ts` — main handler
- `prompts/build-review-prompt.ts` — LLM prompt
- `format/format-review-reply.ts` — Markdown report
- `diff.ts` — diff retrieval and chunking
- `risk.ts` — Risk Score math
- `index.ts` — registerReviewCommand()

## Diff Retrieval (`diff.ts`)

| Target | Source | Method |
|--------|--------|--------|
| PR number | Octokit | `octokit.rest.pulls.get({owner, repo, pull_number})` → diff string |
| Spec | Repository | `repository.get(id)` → spec.content |
| Plan | Repository | `repository.get(id)` → plan.content |
| Task | Repository | `repository.get(id)` → task.content |

No explicit PR → walk Issue comments for PR reference, or degrade.

**Chunking**: If diff > 20000 chars, split into file-level chunks; if > 100000 chars, mark "not fully evaluated".

## Review Schema

```json
{
  "name": "generate_review",
  "description": "Review a PR diff across 5 dimensions",
  "input_schema": {
    "type": "object",
    "properties": {
      "dimensions": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": { "type": "string", "enum": ["tests", "code_quality", "security", "performance", "architecture"] },
            "score": { "type": "number", "minimum": 0, "maximum": 100 },
            "findings": { "type": "array", "items": { "type": "string" } },
            "suggestions": { "type": "array", "items": { "type": "string" } },
            "unassessed": { "type": "boolean" }
          },
          "required": ["name", "score"]
        }
      }
    },
    "required": ["dimensions"]
  }
}
```

## Risk Score (`risk.ts`)

**Weights:**
| Dimension | Weight |
|-----------|--------|
| security | 30% |
| architecture | 25% |
| tests | 20% |
| code_quality | 15% |
| performance | 10% |

**Formula**: `riskScore = Σ(score_i × weight_i) / Σ(weight_i)`

If a dimension is `unassessed: true`, its weight is excluded from denominator.

**Thresholds:**
| Range | Label |
|-------|-------|
| 0-30 | Low |
| 31-60 | Medium |
| 61-100 | High |

Risk Score = 100 - weighted average (higher raw score = better, but risk label inverts).

**Adjusted**: `riskDisplay = 100 - riskScore`. So:
- If weighted avg = 80 → riskDisplay = 20 → Low Risk
- If weighted avg = 40 → riskDisplay = 60 → Medium Risk
- If weighted avg = 15 → riskDisplay = 85 → High Risk

## Prompt Strategy

Single LLM call with all 5 dimensions in one system prompt. Each dimension gets:
- Its evaluation criteria
- The diff content (or chunk summary)

For large diffs: send file-by-file in user message with annotation.

## Output Format

```
> ✅ Review complete (target: PR #42)

## Risk Score: 25/100 (Low)

| Dimension | Score | Status |
|-----------|-------|--------|
| Tests | 80/100 | ✅ |
| Code Quality | 75/100 | ✅ |
| Security | 85/100 | ✅ |
| Performance | 90/100 | ✅ |
| Architecture | 70/100 | ⚠️ |

### Details

**Security** (85/100)
- ✅ No exposed secrets found
- ✅ Input validation present

**Architecture** (70/100)
- ⚠️ Large service class handles too many responsibilities

archived-with: 2026-06-28-issueos-review-command
status: final
---

> **Disclaimer**: This review is AI-assisted and may miss issues. Does not replace human code review.

<details><summary>Provenance</summary>
Target: PR #42 (sha: abc123)
Command: `/review`
Generated at: ...
</details>
```

## Testing

- Fake LlmClient for handler
- Unit tests for risk score calculation
- Unit tests for diff chunking
- Test: PR found / PR not found / LLM timeout / large diff
- Degradation: no diff → reply hint; supersession on re-review
