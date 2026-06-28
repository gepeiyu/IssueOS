# issueos-review-command — Verification Report

**Change:** issueos-review-command (final change in MVP)
**Phase:** verify
**Date:** 2026-06-28
**Result:** PASS

## Checks

- [x] `npm run build` passes (typecheck clean)
- [x] `npm run typecheck` passes (all 10 packages)
- [x] `npx vitest run`: 102/102 tests pass, 16 test files
- [x] `npx eslint packages/commands/review/`: 0 errors
- [x] tasks.md all marked complete
- [x] All 4 command handlers registered (/spec, /plan, /task, /review)

## Package: @issueos/commands-review

Files:
- `packages/commands/review/src/review-handler.ts` — handler
- `packages/commands/review/src/diff.ts` — PR diff retrieval + chunking
- `packages/commands/review/src/risk.ts` — weighted Risk Score calculation
- `packages/commands/review/src/prompts/build-review-prompt.ts` — 5-dimension prompt
- `packages/commands/review/src/format/format-review-reply.ts` — Markdown report
- `packages/commands/review/src/index.ts` — registration
- `packages/commands/review/src/risk.test.ts` — 5 risk score tests
- `packages/commands/review/src/diff.test.ts` — 3 chunking tests
- `packages/commands/review/src/index.test.ts` — 6 handler tests

Integration:
- `packages/github-app/src/review-integration.test.ts`
- `packages/github-app/src/index.ts` — registerReviewCommand() added

## Risk Score Formula

- Security (30%), Architecture (25%), Tests (20%), Code Quality (15%), Performance (10%)
- Weighted average → `100 - avg = riskScore`
- Low ≤30, Medium ≤60, High >60

## Scale

- New source files: 6 + 3 test = 9 files
- New tests: 15 (5 risk + 3 diff + 6 handler + 1 integration)
- Total test suite: 102 tests (0 regressions)

## Summary

All tasks completed. All 4 command handlers fully implemented:
- `/spec` — structured spec generation
- `/plan` — ordered implementation plan
- `/task` — task DAG with cycle detection
- `/review` — 5-dimension code review with Risk Score

MVP complete. Ready to archive.
