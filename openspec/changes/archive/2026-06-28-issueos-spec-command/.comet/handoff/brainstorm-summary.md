# Brainstorm Summary

- Change: issueos-spec-command
- Date: 2026-06-28

## 确认的技术方案

- LLM 提供方：Anthropic Claude（`@anthropic-ai/sdk`，env `ANTHROPIC_API_KEY`）
- LLM 输出格式：JSON schema + Claude tool/structured-output 约束
- 新包 `packages/llm-client/`：`LlmClient` 接口 + Anthropic 默认实现；env `LLM_PROVIDER` 切换
- 命令包 `packages/commands/spec/`：替换 foundation 的 `/spec` 占位 handler
- 数据流：Issue 评论 → parseIssue(lenient) 预析 → LLM 调用 → Spec 持久化 → GitHub Issue Markdown 回复
- 降级：LLM 失败时以 parseIssue 片段回复，不崩溃、不持久化不完整 Spec

## 关键取舍与风险

- Claude tool use 结构化输出最稳定，但依赖单一提供方（接口抽象支持切换）
- JSON schema 约束 LLM 输出字段精确度，减少解析漂移
- 降级策略偏保守（宁可不生成也不生成有误的 Spec）