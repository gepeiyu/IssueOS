## Why

`/plan` 已能产出有序 Plan。本 change 实现 `IssueOS Overview` Module 3 的简化版（Task 拆解）：把 Plan 拆为带依赖关系的 Task DAG，用户评论 `/task` 即得。MVP 不做长期调度/重试引擎（Airflow/Temporal 级留待 V1.0），仅做即时一次性 DAG 生成，验证从「计划」到「可执行单元」的自动化。

## What Changes

- 实现 `/task` 命令处理器：注册到基座命令路由。
- 从 `Repository` 读取指定 Plan，生成 `Task` 列表与依赖关系（DAG）。
- 复用 `LlmClient`。
- 在 Issue 中以 Markdown 回复 Task DAG（任务编号、依赖箭头、概述）。
- 持久化 Task，供 `/review` 与未来执行消费。
- 降级：Plan 不存在或颗粒过粗时提示。

## Capabilities

### New Capabilities
- `task-decomposition`: 从 Plan 生成带依赖关系的 Task DAG 的能力，含 LLM 调用、输出格式化与降级

### Modified Capabilities
<!-- github-app 占位 /task handler 由本 change 取代；集成在 design/tasks 描述 -->

## Impact

- 新增代码：`src/commands/task/`、DAG 校验（无环检测）、格式化、降级。
- 依赖 `issueos-foundation`、`issueos-plan-command` 的 Plan 产物与 `LlmClient`。
- 对外部：调用 LLM，在 Issue 中回复。