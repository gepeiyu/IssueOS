# Comet Design Handoff

- Change: issueos-plan-command
- Phase: design
- Mode: compact
- Context hash: fbb7d6877db3d472193ed14a633847f3097b188009aadad1299ca4acab7f504d

Generated-by: comet-handoff.sh

OpenSpec remains the canonical capability spec. This handoff is a deterministic, source-traceable context pack, not an agent-authored summary.

## openspec/changes/issueos-plan-command/proposal.md

- Source: openspec/changes/issueos-plan-command/proposal.md
- Lines: 1-26
- SHA256: 06630b109e517420618ddc24369765dec9d5f9932b3bc5e25b4192e184b91cb0

```md
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
- 对外部：调用 LLM API，在 GitHub Issue 中回复。```

## openspec/changes/issueos-plan-command/design.md

- Source: openspec/changes/issueos-plan-command/design.md
- Lines: 1-38
- SHA256: 7d2a8b092aa8153bbf830731a827383a1c77033043e2e78109983132f5289ff8

```md
## Context

`/spec` 已能产出 Spec。本 change 实现 Planner 侧：Spec→Plan。关键未知：Plan 的粒度、与 Spec 字段的映射规则、是否约束任务数。

## Goals / Non-Goals

**Goals:**
- `/plan` 从已有 Spec 生成有序 Plan（任务列表，每条含标题与概述）。
- Plan 持久化并带 provenance（`sourceCommand=/plan`、`specId`），供 `/task` 消费。
- Spec 缺失/不足字段时降级提示。

**Non-Goals:**
- 不做 DAG 依赖编排（`/task` 负责）。
- 不分配资源/Agent、不做调度。
- 不保证任务唯一最优——LLM 抖动可接受。

## Decisions

- **D1 输入来源**：优先按 Issue 链路解析最近未 superseded 的 Spec；显式 `/plan <spec-id>` 指定。
- **D2 Plan 结构**：`Plan.items: PlanItem[]`，每项 `id/title/summary/dependsOn?(占位)`；`/task` 再细化依赖。
- **D3 提示策略**：单轮 + Spec 全字段注入 + few-shot；任务数 3-8，可由 schema 约束。
- **D4 复用 LlmClient**：直接复用 `issueos-spec-command` 的 `LlmClient`，不重复定义。
- **D5 降级**：Spec 不存在→提示先 `/spec`；字段不足→提示补充字段。
- **D6 幂等**：重复 `/plan` 生成新版本，旧 Plan 标 superseded。

## Risks / Trade-offs

- [Plan 粒度不一致] → 模板约束任务数与字段；提供示例。
- [依赖循环（若事后建依赖）] → `/task` 阶段才正式建 DAG，本 change 仅占位 `dependsOn`。
- [Spec 被重新 `/spec` 后旧 Plan 失效] → 记录 `plan.specId`；Spec superseded 时提醒重 `/plan`。

## Open Questions

- 是否允许 `/plan` 覆盖式重建同一 Spec 的 Plan（倾向新版本）。
- PlanItem 是否预置 Agent 路由提示（倾向留 `/task`）。

## Migration Plan

新功能，无迁移。回滚=禁用 handler，基座占位兜底。```

## openspec/changes/issueos-plan-command/tasks.md

- Source: openspec/changes/issueos-plan-command/tasks.md
- Lines: 1-23
- SHA256: 0b1c083654e1ef15e6eb459d2c7b40d6335033c85536ab802ec43e30c9e377d5

```md
## 1. Plan 生成

- [ ] 1.1 在 `src/commands/plan/` 实现 handler，注册到命令路由
- [ ] 1.2 从 `Repository` 解析最近未 superseded 的 Spec；支持 `/plan <spec-id>` 显式选择
- [ ] 1.3 编写 Spec→Plan 提示与 few-shot（`prompts/plan/*.md`），约束 3-8 任务
- [ ] 1.4 实现 Plan 解析与后置校验（每项 id/title/summary）
- [ ] 1.5 输出 Markdown 回复（编号任务 + 与 Spec 的追溯）

## 2. 持久化与幂等

- [ ] 2.1 通过 `Repository` 持久化 Plan，带 `id/provenance.sourceCommand=/plan/specId`
- [ ] 2.2 重复 `/plan` 新版本，旧 Plan `superseded` 指向新 id
- [ ] 2.3 当 Spec 处于 superseded 时提示重新 `/plan`

## 3. 降级与校验

- [ ] 3.1 Spec 不存在→提示先 `/spec`；字段不足→列出缺失字段
- [ ] 3.2 单测覆盖缺失 Spec、字段不足、重复调用场景

## 4. 集成与校验

- [ ] 4.1 集成测试：伪造 webhook + fake LLM 验证 `/plan` 端到端
- [ ] 4.2 通过 `openspec validate issueos-plan-command`
- [ ] 4.3 README 增补 `/plan` 用法与降级行为```

## openspec/changes/issueos-plan-command/specs/plan-generation/spec.md

- Source: openspec/changes/issueos-plan-command/specs/plan-generation/spec.md
- Lines: 1-39
- SHA256: a86291214b1eedb4861061a313764f3eb3ece4cd171198e27eb740cb0f58e797

```md
## ADDED Requirements

### Requirement: Generate Plan from Spec
The `/plan` command SHALL generate an ordered `Plan` from a persisted `Spec`, where each item has an id, title and summary.

#### Scenario: Happy path
- **WHEN** a user comments `/plan` and a non-superseded Spec exists for the Issue
- **THEN** the App replies with a Markdown Plan listing 3-8 ordered items and persists the Plan

#### Scenario: Spec not found
- **WHEN** no Spec exists for the Issue
- **THEN** the App replies prompting the user to run `/spec` first and does not fabricate a Plan

### Requirement: Plan provenance and linkage
Every persisted Plan SHALL record `provenance.sourceCommand = "/plan"` and `specId` of the source Spec.

#### Scenario: /task can resolve the Plan's Spec
- **WHEN** `/plan` completes
- **THEN** a subsequent `/task` can resolve the Plan and its originating Spec via the stored `specId`

### Requirement: Explicit spec selection
The `/plan` command SHALL accept an optional explicit Spec id (`/plan <spec-id>`) and SHALL fall back to the latest non-superseded Spec for the Issue when omitted.

#### Scenario: Explicit selection
- **WHEN** the user runs `/plan 123e4567`
- **THEN** the App uses the Spec with that id, or replies that it was not found

### Requirement: Graceful degradation
The `/plan` command SHALL degrade gracefully: missing Spec prompts `/spec`; insufficient Spec fields prompt completion rather than generating an empty Plan.

#### Scenario: Insufficient Spec fields
- **WHEN** the source Spec is missing `scope` or `acceptance`
- **THEN** the App replies listing the missing fields and does not persist a Plan

### Requirement: Idempotent re-generation
Repeated `/plan` on the same Spec SHALL create a new Plan version and supersede the previous one.

#### Scenario: Re-run supersession
- **WHEN** `/plan` is invoked twice for the same Spec
- **THEN** the later Plan has `status=generated` and the earlier is `superseded` pointing to the new Plan id```

