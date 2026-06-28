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
- 对外部：调用 LLM 与 GitHub API（取 diff），在 Issue/PR 中回复。