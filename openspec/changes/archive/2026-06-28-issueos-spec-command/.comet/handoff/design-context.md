# Comet Design Handoff

- Change: issueos-spec-command
- Phase: design
- Mode: compact
- Context hash: 0eb1a7329fcd7f61a30efe5e34fe4bb9b1bea899ea10d786d37fd3977c6f4705

Generated-by: comet-handoff.sh

OpenSpec remains the canonical capability spec. This handoff is a deterministic, source-traceable context pack, not an agent-authored summary.

## openspec/changes/issueos-spec-command/proposal.md

- Source: openspec/changes/issueos-spec-command/proposal.md
- Lines: 1-26
- SHA256: 5e53a7ccd567d2d59b7afc697eae57441c0a83e697fb201aa2cb6e1aa18620d0

```md
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
- 依赖 `issueos-foundation` 的命令路由、`Repository`、对象模型与 Issue DSL。```

## openspec/changes/issueos-spec-command/design.md

- Source: openspec/changes/issueos-spec-command/design.md
- Lines: 1-40
- SHA256: f50a3c7a78e6ff3643a42da153a5b4c7cf9b7db8c38d68399efe84bb638722c1

```md
## Context

基座提供了 Issue DSL 解析与命令路由占位。本 change 把 Issue Parser 的「生成 Spec」一侧实现为真实 `/spec` 命令。关键未知项：LLM 提供方、提示策略、稳定性与可重放性、Issue 中回复格式。

## Goals / Non-Goals

**Goals:**
- `/spec` 在 Issue 评论后回复结构化 Spec（含全部 DSL 字段）。
- Spec 通过 `Repository` 持久化并带 provenance，可被 `/plan` 消费。
- LLM 失败时降级为可执行补充提示，不破坏 Issue 体验。

**Non-Goals:**
- 不做 Plan/Task/Review。
- 不自定义训练模型；用通用 LLM。
- 不保证 100% 字段稳定（接受 LLM 抖动，靠后置校验+降级兜底）。

## Decisions

- **D1 LLM 提供方**：定义 `LlmClient` 接口，默认实现一个 provider（倾向 Anthropic Claude，与 CLAUDE.md 一致），design 中定稿；通过 env 切换。
- **D2 提示策略**：单轮结构化抽取提示 + 输出 schema 约束（要求 JSON/分块 Markdown，便于解析）。提供 few-shot 示例。
- **D3 输出格式化**：Issue 回复采用固定 Markdown 模板（含 `<details>` 折叠原始字段、provenance 引用 Issue 链接）。
- **D4 降级路径**：LLM 超时/解析失败 → 以 `parseIssue(lenient)` 的字段提示回写 Issue，邀请用户补充关键字段后再次 `/spec`。
- **D5 不变性**：对同一 Spec 幂等——重复 `/spec` 生成新 `version`/`superseded` 关系而非覆盖。
- **D6 为 `/plan` 留接口**：暴露 `generateSpec(issue): Promise<Spec>`，供后续命令与测试复用。

## Risks / Trade-offs

- [LLM 输出不稳定导致字段缺失] → schema 约束 + 后置校验 + 降级提示。
- [提示随模型升级漂移] → 提示与示例版本化在 `prompts/` 目录。
- [API 成本/密钥泄露] → 密钥仅从 env 读；日志不记录完整 prompt 中的私内容。
- [Issue 评论权限] → 仅在 App 安装的仓库回复；沿用基座鉴权。

## Open Questions

- 默认 provider（Anthropic vs OpenAI）——design 定稿。
- 是否持久化原始 LLM 原文用于重放——MVP 可仅存最终 Spec。
- Spec 版本化粒度（每次 `/spec` 一版）。

## Migration Plan

- 新功能，无迁移。失败时基座占位 handler 仍可兜底（保留「未实现」回退由 error path 接管）。回滚=禁用 handler 注册。```

## openspec/changes/issueos-spec-command/tasks.md

- Source: openspec/changes/issueos-spec-command/tasks.md
- Lines: 1-24
- SHA256: 0662e5bba08597a913b36a01315e27f5ecae1ffcf577b7ef216bf782bbe181ce

```md
## 1. LLM 抽象层

- [ ] 1.1 在 `src/llm/` 定义 `LlmClient` 接口（`generate(messages, schema?)`）
- [ ] 1.2 实现默认 provider（design 定稿，env `LLM_PROVIDER`/`*_API_KEY` 切换）
- [ ] 1.3 密钥仅从 env 读；单测用 fake provider

## 2. Spec 生成

- [ ] 2.1 在 `src/commands/spec/` 实现 handler，注册到基座命令路由
- [ ] 2.2 编写结构化抽取提示与 few-shot 示例（`prompts/spec/*.md`）
- [ ] 2.3 实现 Issue→LLM→Spec schema 的解析与后置校验
- [ ] 2.4 输出 Markdown 回复模板（DSL 字段 + `<details>` 原文 + provenance）
- [ ] 2.5 通过 `Repository` 持久化 Spec；带 `id/provenance`

## 3. 降级与幂等

- [ ] 3.1 超时/解析失败降级：用 `parseIssue(lenient)` 缺字段提示回写 Issue
- [ ] 3.2 重复 `/spec` 生成新版本，旧 Spec 标 `superseded` 并指向新 id
- [ ] 3.3 单测覆盖超时、解析失败、重复调用场景

## 4. 集成与校验

- [ ] 4.1 集成测试：伪造 Issue webhook + fake LLM 验证 `/spec` 端到端
- [ ] 4.2 通过 `openspec validate issueos-spec-command`
- [ ] 4.3 README 增补：`/spec` 用法、LLM 密钥配置、降级行为```

## openspec/changes/issueos-spec-command/specs/spec-generation/spec.md

- Source: openspec/changes/issueos-spec-command/specs/spec-generation/spec.md
- Lines: 1-43
- SHA256: 4d54d2f2c620051451b53e3de22dc9576a5349f58303b46057acb494da0657d4

```md
## ADDED Requirements

### Requirement: Generate Spec from Issue
The `/spec` command SHALL produce a structured `Spec` object covering all DSL fields (`title/background/goal/scope/out_of_scope/acceptance/risk/rollback`) from a natural-language Issue.

#### Scenario: Happy path generation
- **WHEN** a user comments `/spec` on a sufficiently complete Issue
- **THEN** the App replies with a Markdown Spec containing every DSL field and persists the Spec to the repository

#### Scenario: Persisted Spec is consumable by /plan
- **WHEN** `/spec` completes
- **THEN** the persisted Spec carries an `id`, `provenance.sourceCommand = "/spec"`, and the originating Issue link, so a subsequent `/plan` can resolve it

### Requirement: LLM abstraction
The system SHALL expose an `LlmClient` interface with a default provider implementation, switchable via environment, so generation logic does not hardcode a vendor.

#### Scenario: Provider swap
- **WHEN** the `LLM_PROVIDER` environment variable changes
- **THEN** the `/spec` flow uses the configured provider without changes to generation logic

### Requirement: Output formatting
The Spec reply SHALL use a fixed Markdown template that presents each DSL field, folds raw Issue text under `<details>`, and includes provenance.

#### Scenario: Reply is parseable by humans and downstream
- **WHEN** the App posts the Spec reply
- **THEN** the reply renders all DSL fields in stable section order and includes a machine-readable provenance line

### Requirement: Graceful degradation
The `/spec` command SHALL degrade gracefully on LLM timeout, parse failure, or missing fields, replying with actionable prompts instead of crashing.

#### Scenario: Timeout
- **WHEN** the LLM call times out
- **THEN** the App replies listing the lenient-parse missing fields and invites the user to complete them before retrying `/spec`

#### Scenario: Parse failure
- **WHEN** the LLM output cannot be parsed into the Spec schema
- **THEN** the App replies with a degradation message and does not persist an invalid Spec

### Requirement: Idempotent re-generation
Repeated `/spec` on the same Issue SHALL create a new Spec version and mark the previous as superseded, not overwrite.

#### Scenario: Re-run supersession
- **WHEN** `/spec` is invoked twice on the same Issue
- **THEN** the later Spec has `status=generated` and the earlier one is `superseded` with a pointer to the new Spec id```

