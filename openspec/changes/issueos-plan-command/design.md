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

新功能，无迁移。回滚=禁用 handler，基座占位兜底。