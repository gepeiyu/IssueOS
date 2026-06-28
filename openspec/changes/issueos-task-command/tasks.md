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
- [ ] 4.3 README 增补 `/task` 用法