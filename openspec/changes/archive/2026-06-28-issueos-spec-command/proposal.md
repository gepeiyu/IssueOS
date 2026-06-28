## Why

基座已完成 Issue 解析与对象模型。本 change 实现 `IssueOS Overview` 中的 Module 1（Issue Parser）产物侧：把自然语言 Issue 转化为符合 DSL 的标准 `Spec`（含 background/goal/scope/out_of_scope/acceptance/risk/rollback）。用户在 GitHub Issue 评论 `/spec` 即可获得结构化 Spec，无需人工编写。这是 MVP 价值验证链的第一环。

## What Changes

- 实现 `/spec` 命令处理器：注册到基座命令路由，消费 `parseIssue` 结果并生成 `Spec` 对象。
- 引入 LLM 调用层（提供方在 design 中选定），把自然语言 Issue 段落映射为 Spec 字段。
- 提供 Spec 输出格式化（在 Issue 中以 Markdown 回复，含各 DSL 字段与可追溯 provenance）。
- 把生成的 Spec 通过 `Repository` 持久化，供后续 `/plan` 链路消费。
- 失败/超时降级：返回可执行的补充提示而非崩溃。
- 不实现 Plan/Task/Review 的生成逻辑。

## Capabilities

### New Capabilities
- `spec-generation`: 自然语言 Issue → 标准 Spec 的生成能力，含 LLM 调用、输出格式化与降级

### Modified Capabilities
<!-- github-app 的占位 /spec handler 将被本 change 的真实 handler 取代；因 github-app spec 尚未归档入 main specs，集成在 design/tasks 中描述，不作为 spec 级 MODIFIED -->

## Impact

- 新增代码：`src/commands/spec/`、`src/llm/` 抽象、Spec 格式化器与降级路径。
- 新依赖：LLM 客户端库（@anthropic-ai/sdk 或 openai 等，design 中定）。
- 对外部：调用 LLM API（需密钥），在 GitHub Issue 中回复。
- 依赖 `issueos-foundation` 的命令路由、`Repository`、对象模型与 Issue DSL。