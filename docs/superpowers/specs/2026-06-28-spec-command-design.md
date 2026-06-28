---
comet_change: issueos-spec-command
role: technical-design
canonical_spec: openspec
status: draft
archived-with: 2026-06-28-issueos-spec-command
status: final
---

# Spec Command — Design Doc

> 深度技术设计对应 OpenSpec change `issueos-spec-command`。能力规格以 `openspec/changes/issueos-spec-command/specs/*/spec.md` 为 canonical；本文为实施侧技术决策，不重复需求。

## Overview

Module 1（Issue Parser）的命令面：用户通过 GitHub Issue 评论 `/spec` 触发，将 Issue 正文转化为结构化 `Spec` 对象（background/goal/scope/out_of_scope/acceptance/risk/rollback），持久化到 Repository，供后续 `/plan` 链路消费。

## Architecture

```
GitHub Issue Comment `/spec`
  → github-app 命令路由 (commands/spec/index.ts)
  → parseIssue(text, 'lenient')   // 预提取已有字段
  → llm-client.generate(messages, SpecSchema)  // Claude tool use
  → Repository.put(spec)
  → Issue 回复 Markdown（Spec 各字段 + provenance）
```

## Packages

### 新建：`packages/llm-client/` (`@issueos/llm-client`)

- `LlmClient` 接口：
  - `generate(messages: LlmMessage[], schema?: z.ZodType): Promise<Record<string, unknown>>`
  - `generateStream(...)`（预留，暂不实现）
- 默认实现：`AnthropicLlmClient`（`@anthropic-ai/sdk`）
  - env `ANTHROPIC_API_KEY`（必填）
  - env `LLM_PROVIDER` → 切换实现（默认 `anthropic`；`"openai"` 等预留）
  - Claude 模型：`claude-sonnet-4-20250514`（默认；env `LLM_MODEL` 覆盖）
- 测试：mock Anthropic SDK，验证请求构建与响应解析

### 新建：`packages/commands/spec/` (`@issueos/commands-spec`)

- `register(app: Probot)`：注册 `/spec` 到命令路由
- Handler 逻辑：
  1. 调用 `parseIssue(context.payload.issue.body, 'lenient')` 获取预解析片段
  2. 构造 prompt → 调用 `llmClient.generate()`
  3. 校验返回 JSON 符合 `Spec` schema
  4. `repository.put(spec)` 持久化
  5. 回复 Issue 评论（格式见具体规范）
- 降级（LLM 调用失败）：
  - 不持久化不完整 Spec
  - Issue 回复预解析字段 + 错误信息 + 邀请用户补全后重试 `/spec`
  - 不抛出未捕获异常
- 测试：
  - 注入 FakeLlmClient 验证 handler 逻辑
  - 验证降级路径
  - 验证 Repository.save 被调用

## 配置与环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `ANTHROPIC_API_KEY` | 是 | Anthropic API key |
| `LLM_PROVIDER` | 否 | LLM 提供方（默认 `anthropic`） |
| `LLM_MODEL` | 否 | 模型名称（默认 `claude-sonnet-4-20250514`） |

## Spec JSON Schema（Claude tool use）

字段与 `Spec` 类型对齐：

```json
{
  "name": "generate_spec",
  "description": "Generate a structured Spec from an Issue body",
  "input_schema": {
    "type": "object",
    "properties": {
      "background": {},
      "goal": {},
      "scope": {},
      "out_of_scope": {},
      "acceptance_criteria": {},
      "risk": {},
      "rollback": {}
    }
  }
}
```

## 测试策略

- `LlmClient`: 单元测试（mock HTTP, verify request/response）
- `Spec handler`: 注入 FakeLlmClient，测试正常路径 + 降级路径
- 整体：不依赖真实 LLM API（mock/clients），测试环境仅执行单元测试

## 依赖关系

- `commands/spec` → `issue-dsl`（parseIssue）
- `commands/spec` → `llm-client`（generate）
- `commands/spec` → `storage`（Repository.put）
- `github-app` → `commands/spec`（register）

## 非目标

- `/plan`、`/task`、`/review` 命令（后续 change）
- LLM streaming（将来扩展）
- 多轮对话 refine Spec
