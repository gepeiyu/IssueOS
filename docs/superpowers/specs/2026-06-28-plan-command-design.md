---
comet_change: issueos-plan-command
role: technical-design
canonical_spec: openspec
status: draft
archived-with: 2026-06-28-issueos-plan-command
status: final
---

# Plan Command — Design Doc

> 深度技术设计对应 OpenSpec change `issueos-plan-command`。能力规格以 `openspec/changes/issueos-plan-command/specs/*/spec.md` 为 canonical；本文为实施侧技术决策，不重复需求。

## Overview

Module 2（Planner）的命令面：用户通过 `/plan` 将 Spec 转化为有序实施计划 Plan，持久化供 `/task` 消费。

## Architecture

```
GitHub Issue Comment `/plan` or `/plan <spec-id>`
  → github-app 命令路由 (commands/plan/index.ts)
  → 解析输入（按 Issue 或显式 id 找 Spec）
  → LlmClient.generate(prompt, PlanSchema)  // 复用 @issueos/llm-client
  → Repository.put(plan)
  → Issue 回复 Markdown（任务列表 + provenance）
```

## Package

### 新建：`packages/commands/plan/` (`@issueos/commands-plan`)

- `registerPlanCommand()`：注册 `/plan` 到命令路由
- Handler 逻辑：
  1. 解析 `/plan` 参数——若带 spec id 则显式查找，否则按 Issue 链路找最新非 superseded Spec
  2. Spec 不存在 → 回复 "请先运行 `/spec`"
  3. Spec 字段不足（缺 goal/scope/accepance） → 提示补充
  4. 构造 prompt → 调用 `llmClient.generate()`
  5. 校验返回 JSON 符合 `PlanItem[]` schema
  6. Supersede 旧 Plan → 持久化新 Plan
  7. 回复 Issue 评论（任务表格 + provenance）
- 依赖：`@issueos/llm-client`、`@issueos/storage`、`@issueos/domain`、`@issueos/github-app`

## Plan Schema（JSON tool use）

```json
{
  "name": "generate_plan",
  "description": "Generate an ordered implementation plan from a Spec",
  "input_schema": {
    "type": "object",
    "properties": {
      "tasks": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "title": { "type": "string" },
            "summary": { "type": "string" },
            "dependsOn": { "type": "array", "items": { "type": "number" } }
          },
          "required": ["title", "summary"]
        },
        "minItems": 3,
        "maxItems": 8
      }
    },
    "required": ["tasks"]
  }
}
```

## 提示模板

- System prompt：Spec 全字段注入（background/goal/scope/accepance/risk/rollback）
- 约束：3-8 个任务，每项有 title（动宾结构）+ summary（1-2 句）
- dependsOn 选填：Plan 阶段仅做依赖预判，不作为 Schema 强校验

## 降级

| 场景 | 行为 |
|------|------|
| Spec 不存在 | 回复 "请先运行 `/spec` 生成 Spec" |
| Spec 字段不足 | 列出缺失字段，邀请补充后重试 `/plan` |
| LLM 超时/解析失败 | 回复错误信息，不持久化 |
| Plan 无变化 | 幂等——同 Spec 多次 `/plan` 生成新版本，旧 superseded |

## 输出 Markdown 格式

```
> ✅ Plan generated (plan id: <id>)

| # | Task | Description | Dependencies |
|---|------|-------------|--------------|
| 1 | <title> | <summary> | — |
| 2 | <title> | <summary> | 1 |

<details><summary>Provenance</summary>
Spec ID: <specId>
Plan ID: <planId>
Command: `/plan`
</details>
```

## 测试策略

- 注入 FakeLlmClient 验证 handler 正常路径
- 测试 Spec 不存在 / 字段不足降级路径
- 测试幂等 supersession
- 不依赖真实 LLM API

## 非目标

- Task DAG 编排（`/task` 命令负责）
- Plan 执行/调度
- 多 Plan 合并/拆分
