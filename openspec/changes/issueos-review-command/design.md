## Context

前三命令产出 Spec/Plan/Task。本 change 实现 Review 侧：对 PR/diff 做自动审查。关键未知：审查维度顺序、Risk Score 计算口径、是否关联上游产物。

## Goals / Non-Goals

**Goals:**
- `/review` 采集 PR diff（或显式目标），分 5 维度检查，输出 Markdown 报告 + Risk Score。
- 持久化 Review（`targetType/targetId`、`riskScore`、维度项）。
- 上游产物可关联（spec/plan/task），但作为可选增强，不强制。

**Non-Goals:**
- 不自动 Merge、不形成闭环。
- 不接 Agent 执行。
- 不替代人工安全审计；MVP 仅做 LLM 维度提示。

## Decisions

- **D1 目标来源**：默认当前 Issue 关联的最新 PR；`/review <pr-number>` 显式；无 PR 时可选 `/review <spec|plan|task>-<id>` 审查产物完整性。
- **D2 维度**：固定 5 维——测试、代码规范、安全、性能、架构；每维 0-100 子分。
- **D3 Risk Score**：加权平均（安全权重最高，design 定稿）；输出 0-100，分档（低/中/高）。
- **D4 提示策略**：按维度分块提示，diff 分块注入有长度上限，超长做文件级摘要。
- **D5 降级**：无 diff→提示；超时→部分维度「未评估」并标注。
- **D6 持久化**：Review 记录 `targetType/targetId`、`dimensions[]`、`riskScore`、`provenance.sourceCommand=/review`。

## Risks / Trade-offs

- [LLM 安全审查不可靠] → 明确标注为辅助、非替代人工；MVP 不阻断合并。
- [大 diff 超长] → 分文件/分块摘要；超阈值标注「未完整评估」。
- [Risk Score 口径主观] → design 固化权重与分档；版本化。
- [关联 upstream 产物复杂] → MVP 仅在可用时附带，不强依赖。

## Open Questions

- 维度权重确切取值（design 定稿）。
- 是否支持对 Plan/Task 做「完整性 review」（倾向 yes，作为可选）。
- 是否在 PR 状态上置 check（倾向 MVP 只评论，不打 check）。

## Migration Plan

新功能，无迁移。回滚=禁用 handler。