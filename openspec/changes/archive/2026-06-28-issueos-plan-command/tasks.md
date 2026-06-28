## 1. Plan 生成

- [x] 1.1 在 `src/commands/plan/` 实现 handler，注册到命令路由
- [x] 1.2 从 `Repository` 解析最近未 superseded 的 Spec；支持 `/plan <spec-id>` 显式选择
- [x] 1.3 编写 Spec→Plan 提示与 few-shot（`prompts/plan/*.md`），约束 3-8 任务
- [x] 1.4 实现 Plan 解析与后置校验（每项 id/title/summary）
- [x] 1.5 输出 Markdown 回复（编号任务 + 与 Spec 的追溯）

## 2. 持久化与幂等

- [x] 2.1 通过 `Repository` 持久化 Plan，带 `id/provenance.sourceCommand=/plan/specId`
- [x] 2.2 重复 `/plan` 新版本，旧 Plan `superseded` 指向新 id
- [x] 2.3 当 Spec 处于 superseded 时提示重新 `/plan`

## 3. 降级与校验

- [x] 3.1 Spec 不存在→提示先 `/spec`；字段不足→列出缺失字段
- [x] 3.2 单测覆盖缺失 Spec、字段不足、重复调用场景

## 4. 集成与校验

- [x] 4.1 集成测试：伪造 webhook + fake LLM 验证 `/plan` 端到端
- [x] 4.2 通过 `openspec validate issueos-plan-command`
- [x] 4.3 README 增补 `/plan` 用法与降级行为