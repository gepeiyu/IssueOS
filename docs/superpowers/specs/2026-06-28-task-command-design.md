---
comet_change: issueos-task-command
role: technical-design
canonical_spec: openspec
status: draft
archived-with: 2026-06-28-issueos-task-command
status: final
---

# Task Command — Design Doc

> 深度技术设计对应 OpenSpec change `issueos-task-command`。

## Architecture

```
GitHub Issue Comment `/task` or `/task <plan-id>`
  → github-app 命令路由
  → 解析输入找 Plan
  → LlmClient.generate(prompt, TaskSchema)
  → 拓扑排序 + 无环校验 (packages/task/cycle.ts)
  → Repository.put(task)
  → Issue 回复 Markdown DAG
```

## Package: `packages/commands/task/`

- `task-handler.ts` — main handler
- `prompts/build-task-prompt.ts` — LLM prompt
- `format/format-task-reply.ts` — Markdown visualization
- `cycle.ts` — Kahn topological sort + cycle detection
- `index.ts` — `registerTaskCommand()`

## Task Schema

```json
{
  "name": "generate_tasks",
  "description": "Decompose Plan items into tasks with dependencies",
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
        "maxItems": 20
      }
    },
    "required": ["tasks"]
  }
}
```

## DAG Cycle Detection (`cycle.ts`)

- Input: `{ id: number; dependsOn: number[] }[]`
- Kahn's algorithm: in-degree → queue → remove → repeat
- If remaining nodes after processing → cycle exists
- On cycle: remove the cyclic edges (greedy: for each remaining node, clear dependsOn for nodes that form the cycle)
- Return: `{ tasks, cycles: [removed edges], isAcyclic: boolean }`

## Degradation

| Scenario | Behavior |
|----------|----------|
| Plan不存在 | "请先运行 `/plan`" |
| Plan items < 2 | "Plan 任务过少，无法有效拆解" |
| LLM 超时/失败 | Error reply, no persist |
| 检测到环 | Remove cyclic edges, warn in reply, persist acyclic subset |

## Output Format

```
> ✅ Tasks generated (plan id: <id>)

- [ ] T1: <title> (<summary>)
- [ ] T2: <title> (depends: T1)
  - [ ] T2a: <subtask> (depends: T1)
- [ ] T3: <title> (depends: T2)

> ⚠️ 检测到并移除了 1 个环依赖

<details><summary>Provenance</summary>
Plan ID: <planId>
Command: `/task`
</details>
```

## Testing

- Fake LlmClient for handler
- Unit tests for cycle detection (Kahn's algorithm)
- Test: acyclic graph passes, cyclic graph gets edge removal
- Test: Plan not found / too few items / LLM failure degradation
