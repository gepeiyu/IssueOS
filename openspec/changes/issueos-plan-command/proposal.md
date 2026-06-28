## Why

`/spec` 已能生成结构化 Spec。本 change 实现 `IssueOS Overview` Module 2（Planner）：把 Spec 转为可执行的实施计划 Plan（任务序列，如「设计数据库→实现接口→实现前端→测试」），用户在 Issue 评论 `/plan` 即得。这是 Spec→Task 之间的桥梁，验证从「需求」到「可执行步骤」的自动化。

## What Changes

- 实现 `/plan` 命令处理器：注册到基座命令路由。
- 从 `Repository` 读取指定 Spec（按 Issue 链路或显式 spec id），生成 `Plan` 对象（含有序任务列表与每条任务的概述）。
- 复用 `LlmClient` 抽象（来自 spec-command，作为共享依赖）。
- 在 Issue 中以 Markdown 回复 Plan（任务编号 + 概述 + 与 Spec 的追溯）。
- 持久化 Plan，供 `/task` 拆解为 DAG。
- 失败降级：Spec 不存在或字段不足时给出可执行提示。
- 不做 Task DAG 拆解、长期调度、Agent 执行。

## Capabilities

### New Capabilities
- `plan-generation`: 从 Spec 生成有序实施计划 Plan 的能力，含 LLM 调用、输出格式化与降级

### Modified Capabilities
<!-- github-app 占位 /plan handler 由本 change 取代；集成在 design/tasks 描述，不作 spec 级 MODIFIED -->

## Impact

- 新增代码：`src/commands/plan/`、plan 格式化器、降级路径。
- 依赖 `issueos-foundation`（路由/存储/对象模型）与 `issueos-spec-command` 的 `LlmClient` 与 `generateSpec` 产物。
- 对外部：调用 LLM API，在 GitHub Issue 中回复。