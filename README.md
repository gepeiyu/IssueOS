# IssueOS

IssueOS 用 Issue DSL 驱动 spec-to-task 工作流，沉淀团队 AI 协作记忆。

## 工作区结构

- `packages/domain` — 核心对象模型（Project / Issue / Spec / Plan / Task / Agent / Review / Knowledge）的 TypeScript 类型与辅助函数。

## 前置要求

- Node.js `>= 22`（参见 `.nvmrc`）
- npm（本仓库使用 npm workspaces 管理 monorepo）

## 常用脚本

```bash
npm install         # 安装依赖并链接工作区
npm run typecheck   # 对所有包执行类型检查
npm test            # 运行 Vitest 测试
npm run build       # 构建所有包
npm run lint        # 运行 ESLint
```

> 说明：暂未采用 pnpm；如未来切换，请同步更新 `pnpm-workspace.yaml` 与锁文件。

## 设计与计划

- 设计文档：`docs/superpowers/specs/2026-06-28-issueos-foundation-design.md`
- 实施计划：`docs/superpowers/plans/2026-06-28-issueos-foundation.md`
- OpenSpec 变更：`openspec/changes/issueos-foundation/`