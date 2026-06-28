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

新功能，无迁移。回滚=禁用 handler。