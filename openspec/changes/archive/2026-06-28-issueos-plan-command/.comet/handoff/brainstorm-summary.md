# Brainstorm Summary

- Change: issueos-plan-command
- Date: 2026-06-28

## 确认的技术方案

- LLM 复用：直接使用 `@issueos/llm-client`（LlmClient），无需新 LLM 包
- 输入：按 Issue 链路自动解析最新 Spec，或 `/plan <spec-id>` 显式指定
- Plan 结构：`PlanItem[]`（id/title/summary/dependsOn），后续 `/task` 建完整 DAG
- Schema 约束：3-8 任务数，确保 LLM 输出一致粒度
- 输出格式：Markdown 表格（任务编号 + 标题 + 概述），末尾 provenance
- 降级：Spec 不存在 / 字段不足 → 可执行提示
- 幂等：重复 `/plan` → supersede 旧 Plan

## 关键取舍与风险

- 依赖 `@issueos/llm-client` → spec-command 必须归档后 plan-command 才能稳定 npm install
- PlanItem.dependsOn 仅占位 → /task 才建实依赖，保持本 change 聚焦
- 任务数约束（3-8）→ 模板级别的 soft 约束，LLM 可能有偏差但可接受
