# Comet Design Handoff

- Change: issueos-review-command
- Phase: design
- Mode: compact
- Context hash: f1c8725dca3562aad97785189584b07770af2ebf3e8e79ad940b285dae1e504d

Generated-by: comet-handoff.sh

OpenSpec remains the canonical capability spec. This handoff is a deterministic, source-traceable context pack, not an agent-authored summary.

## openspec/changes/issueos-review-command/proposal.md

- Source: openspec/changes/issueos-review-command/proposal.md
- Lines: 1-25
- SHA256: 04a1c5af594bde5664feadfe3f62c2a18f6fbc86bcf26ba1cb23348f96c857ed

```md
## Why

前三条命令已能产出 Spec/Plan/Task。本 change 实现 `IssueOS Overview` Module 6 的简化版（Review Engine）：对一个 PR 或 diff 自动验收审查（测试、代码规范、安全、性能、架构），输出检查项与 Risk Score。MVP 不做闭环自动 Merge，仅产出可读的 Review 报告，验证从「执行」到「验收」的自动化。

## What Changes

- 实现 `/review` 命令处理器：注册到基座命令路由。
- 采集审查目标：PR diff（经 GitHub API）或 spec/plan/task 产物（可选关联）。
- 复用 `LlmClient`，对 diff 分维度检查（测试/规范/安全/性能/架构）并产出 Risk Score。
- 在 Issue/PR 中以 Markdown 回复 Review 报告（分维度项 + Risk Score + 可追溯引用）。
- 持久化 `Review` 对象（`targetType/targetId`）。
- 降级：无 diff/超时给出提示。

## Capabilities

### New Capabilities
- `review-engine`: 对 PR/diff 做分维度自动审查并产出 Risk Score 的能力，含 LLM 调用、输出格式化与降级

### Modified Capabilities
<!-- github-app 占位 /review handler 由本 change 取代；集成在 design/tasks 描述 -->

## Impact

- 新增代码：`src/commands/review/`、diff 采集（Octokit）、分维度提示、Risk Score 计算、格式化、降级。
- 依赖 `issueos-foundation`、`LlmClient`（来自 spec-command）；可选关联 spec/plan/task 产物。
- 对外部：调用 LLM 与 GitHub API（取 diff），在 Issue/PR 中回复。```

## openspec/changes/issueos-review-command/design.md

- Source: openspec/changes/issueos-review-command/design.md
- Lines: 1-40
- SHA256: 8c94115c26f50d3fc3b0e4e6cebfd39b9eca3db8edbfedbd3c90935a39ae3b75

```md
## Context

前三命令产出 Spec/Plan/Task。本 change 实现 Review 侧：对 PR/diff 做自动审查。关键未知：审查维度顺序、Risk Score 计算口径、是否关联上游产物。

## Goals / Non-Goals

**Goals:**
- `/review` 采集 PR diff（或显式目标），分 5 维度检查，输出 Markdown 报告 + Risk Score。
- 持久化 Review（`targetType/targetId`、`riskScore`、维度项）。
- 上游产物可关联（spec/plan/task），但作为可选增强，不强制。

**Non-Goals:**
- 不自动 Merge、不形成闭环。
- 不接 Agent 执行。
- 不替代人工安全审计；MVP 仅做 LLM 维度提示。

## Decisions

- **D1 目标来源**：默认当前 Issue 关联的最新 PR；`/review <pr-number>` 显式；无 PR 时可选 `/review <spec|plan|task>-<id>` 审查产物完整性。
- **D2 维度**：固定 5 维——测试、代码规范、安全、性能、架构；每维 0-100 子分。
- **D3 Risk Score**：加权平均（安全权重最高，design 定稿）；输出 0-100，分档（低/中/高）。
- **D4 提示策略**：按维度分块提示，diff 分块注入有长度上限，超长做文件级摘要。
- **D5 降级**：无 diff→提示；超时→部分维度「未评估」并标注。
- **D6 持久化**：Review 记录 `targetType/targetId`、`dimensions[]`、`riskScore`、`provenance.sourceCommand=/review`。

## Risks / Trade-offs

- [LLM 安全审查不可靠] → 明确标注为辅助、非替代人工；MVP 不阻断合并。
- [大 diff 超长] → 分文件/分块摘要；超阈值标注「未完整评估」。
- [Risk Score 口径主观] → design 固化权重与分档；版本化。
- [关联 upstream 产物复杂] → MVP 仅在可用时附带，不强依赖。

## Open Questions

- 维度权重确切取值（design 定稿）。
- 是否支持对 Plan/Task 做「完整性 review」（倾向 yes，作为可选）。
- 是否在 PR 状态上置 check（倾向 MVP 只评论，不打 check）。

## Migration Plan

新功能，无迁移。回滚=禁用 handler。```

## openspec/changes/issueos-review-command/tasks.md

- Source: openspec/changes/issueos-review-command/tasks.md
- Lines: 1-24
- SHA256: 5ff89b337c620bcdd6a9885d1fc93611f9e69649af63d2957a6f05d922d4001f

```md
## 1. Review 采集

- [ ] 1.1 在 `src/commands/review/` 实现 handler，注册到命令路由
- [ ] 1.2 经 Octokit 取 PR diff；支持 `/review <pr-number>` 显式与默认关联 PR 回退
- [ ] 1.3 大 diff 分文件/分块摘要，超阈值标注「未完整评估」
- [ ] 1.4 可选关联上游 spec/plan/task 产物（不强制）

## 2. 分维度审查与 Risk Score

- [ ] 2.1 编写 5 维度分块提示（`prompts/review/*.md`：测试/规范/安全/性能/架构）
- [ ] 2.2 实现每维 0-100 子分；加权算 Risk Score（安全权重最高，design 定稿权重与分档）
- [ ] 2.3 输出 Markdown 报告（分维度项 + Risk Score + 分档 + provenance）
- [ ] 2.4 持久化 Review（`targetType/targetId/riskScore/dimensions/provenance`）

## 3. 降级与幂等

- [ ] 3.1 无 PR→提示；LLM 超时→已评估维度保留，剩余标「未评估」
- [ ] 3.2 重复 `/review` 同目标，新版本 Review，旧标 superseded
- [ ] 3.3 单测覆盖无 PR、超大 diff、超时、重复调用

## 4. 集成与校验

- [ ] 4.1 集成测试：伪造 PR diff + fake LLM 验证 `/review` 端到端
- [ ] 4.2 通过 `openspec validate issueos-review-command`
- [ ] 4.3 README 增补 `/review` 用法、Risk Score 口径、免责声明```

## openspec/changes/issueos-review-command/specs/review-engine/spec.md

- Source: openspec/changes/issueos-review-command/specs/review-engine/spec.md
- Lines: 1-43
- SHA256: 670ebc41253e964326814fed62d5145851e7efa5163de2464ff55f6f4ace6405

```md
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
- **THEN** the App posts a partial report marking remaining dimensions "未评估"```

