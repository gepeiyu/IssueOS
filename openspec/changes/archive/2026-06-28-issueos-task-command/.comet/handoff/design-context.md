# Comet Design Handoff

- Change: issueos-task-command
- Phase: design
- Mode: compact
- Context hash: 7f70e1f32eb607bee2b7e2ce6cc323b9e4a83cc71b951770f88893b268c38185

Generated-by: comet-handoff.sh

OpenSpec remains the canonical capability spec. This handoff is a deterministic, source-traceable context pack, not an agent-authored summary.

## openspec/changes/issueos-task-command/proposal.md

- Source: openspec/changes/issueos-task-command/proposal.md
- Lines: 1-25
- SHA256: 0b729653c40d242924b043a581275b686d47a7db8cc35cc4d0dc32c72de1050e

```md
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
- 对外部：调用 LLM，在 Issue 中回复。```

## openspec/changes/issueos-task-command/design.md

- Source: openspec/changes/issueos-task-command/design.md
- Lines: 1-38
- SHA256: 3d5b79751d5dbff147f898fbdb3e519ca96a8017173caacaea993c8dcfa82647

```md
## Context

`/plan` 已产出有序 Plan（扁平列表）。本 change 把 Plan 细化为带依赖的 Task DAG。关键未知：依赖识别策略、DAG 合法性校验、输出可视化。

## Goals / Non-Goals

**Goals:**
- `/task` 从 Plan 生成 Task DAG（每 Task 含 id、title、dependsOn）。
- DAG 无环校验；持久化 Task 与 `planId`，供 `/review` 与未来执行消费。
- Plan 缺失/过粗时降级提示。

**Non-Goals:**
- 不做长期调度、状态机、重试（V1.0）。
- 不分配 Agent、不执行。
- 不做 Airflow/Temporal 级编排。

## Decisions

- **D1 输入来源**：按 Issue 链路解析最近未 superseded 的 Plan；`/task <plan-id>` 显式选择。
- **D2 Task 结构**：`Task.dependsOn: TaskId[]`；生成后做拓扑排序 + 无环校验，有环则降级提示。
- **D3 拆解粒度**：每个 PlanItem 拆为 1-N Task（由 LLM 决定，约束总数上限，如 ≤ 20）。
- **D4 可视化**：Markdown 中以 `- [ ] T1 (depends: T0)` 列表 + 简单 `\n` 树状缩进表示 DAG。
- **D5 降级**：Plan 不存在→提示 `/plan`；PlanItem 过少→提示补充。
- **D6 幂等**：重复 `/task` 新版本，旧 Task 标 superseded。

## Risks / Trade-offs

- [LLM 给出环依赖] → 后置无环检测，检测到则去除成环边并提示。
- [任务过细/过粗] → 数量约束 + 示例校准。
- [Plan 更新后 Task 失效] → `task.planId` 记录；Plan superseded 时提示重 `/task`。

## Open Questions

- 是否输出 Mermaid DAG 图（倾向 MVP 用纯文本）。
- 是否在 Task 上预置推荐 Agent（倾向留给 V0.5/V1.0）。

## Migration Plan

新功能，无迁移。回滚=禁用 handler。```

## openspec/changes/issueos-task-command/tasks.md

- Source: openspec/changes/issueos-task-command/tasks.md
- Lines: 1-23
- SHA256: b64c3364a53e01793efafd6b4a0a0762615ecefa39388da070f8405ba8e8ea97

```md
## 1. Task 拆解

- [ ] 1.1 在 `src/commands/task/` 实现 handler，注册到命令路由
- [ ] 1.2 从 `Repository` 解析最近未 superseded 的 Plan；支持 `/task <plan-id>`
- [ ] 1.3 编写 Plan→Task DAG 提示与 few-shot（`prompts/task/*.md`），约束任务上限
- [ ] 1.4 实现解析与 `dependsOn` 构建

## 2. DAG 校验与可视化

- [ ] 2.1 实现无环检测（拓扑排序）；检测到环则去除成环边并告警
- [ ] 2.2 输出 Markdown DAG（`- [ ] T1 (depends: T0)` + 缩进）
- [ ] 2.3 通过 `Repository` 持久化 Task，带 `id/provenance.sourceCommand=/task/planId`

## 3. 降级与幂等

- [ ] 3.1 Plan 不存在→提示 `/plan`；Plan 过粗→告警不生成单点 DAG
- [ ] 3.2 重复 `/task` 新版本，旧 Task `superseded` 指向新集合
- [ ] 3.3 单测覆盖缺 Plan、环依赖、重复调用

## 4. 集成与校验

- [ ] 4.1 集成测试：伪造 webhook + fake LLM 验证 `/task` 端到端
- [ ] 4.2 通过 `openspec validate issueos-task-command`
- [ ] 4.3 README 增补 `/task` 用法```

## openspec/changes/issueos-task-command/specs/task-decomposition/spec.md

- Source: openspec/changes/issueos-task-command/specs/task-decomposition/spec.md
- Lines: 1-46
- SHA256: 2a65b4f7512ff8fd0a515978ba3b9d6b617003b388b134035ab0213ac8a02a63

```md
## ADDED Requirements

### Requirement: Decompose Plan into Task DAG
The `/task` command SHALL decompose a persisted `Plan` into a `Task` DAG where each Task has an id, title and `dependsOn` list.

#### Scenario: Happy path
- **WHEN** a user comments `/task` and a non-superseded Plan exists for the Issue
- **THEN** the App replies with a Markdown Task DAG and persists the Tasks

#### Scenario: Plan not found
- **WHEN** no Plan exists for the Issue
- **THEN** the App prompts the user to run `/plan` first and does not fabricate Tasks

### Requirement: DAG acyclicity
The generated Tasks SHALL form a directed acyclic graph; the command SHALL detect cycles and degrade instead of persisting an invalid DAG.

#### Scenario: Cycle detected
- **WHEN** the LLM output implies a dependency cycle
- **THEN** the App removes the cycle-forming edges, persists a valid DAG, and warns the user

### Requirement: Task provenance and linkage
Every persisted Task SHALL record `planId` and `provenance.sourceCommand = "/task"`.

#### Scenario: /review can resolve tasks
- **WHEN** `/task` completes
- **THEN** a subsequent `/review` can list the Tasks via their `planId`

### Requirement: Explicit plan selection
The `/task` command SHALL accept an optional Plan id and fall back to the latest non-superseded Plan for the Issue when omitted.

#### Scenario: Explicit selection
- **WHEN** the user runs `/task <plan-id>`
- **THEN** the App uses that Plan, or replies it was not found

### Requirement: Graceful degradation
The `/task` command SHALL degrade: missing Plan prompts `/plan`; an overly coarse Plan prompts the user to refine before decomposition.

#### Scenario: Plan too coarse
- **WHEN** the Plan has fewer than two items
- **THEN** the App warns and does not generate a degenerate single-Task DAG

### Requirement: Idempotent re-generation
Repeated `/task` on the same Plan SHALL create a new Task set and supersede the previous one.

#### Scenario: Re-run supersession
- **WHEN** `/task` is invoked twice for the same Plan
- **THEN** the later Tasks have `status=generated` and the earlier ones are `superseded` pointing to the new set```

