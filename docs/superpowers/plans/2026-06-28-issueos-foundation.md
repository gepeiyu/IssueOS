---
change: issueos-foundation
design-doc: docs/superpowers/specs/2026-06-28-issueos-foundation-design.md
base-ref: 59becbd9d359272aa0f4646bac4272436966d671
---

# Implementation Plan — issueos-foundation

> 关联 Design Doc：`docs/superpowers/specs/2026-06-28-issueos-foundation-design.md`
> Canonical spec：`openspec/changes/issueos-foundation/specs/*/spec.md`
> 任务边界：`openspec/changes/issueos-foundation/tasks.md`（23 项）

## 执行约定

- 技术栈：pnpm 工作区、Node 22 LTS、ESM、TypeScript（project references）、Vitest。
- 提交：每个任务一次提交，commit message 体现设计意图并关联任务编号（如 `feat(domain): 2.1 核心对象类型`）。
- 每完成一个任务：勾选 `openspec/changes/issueos-foundation/tasks.md` 对应项并提交，再进入下一任务。
- 构建/测试通过才算完成：`pnpm typecheck && pnpm test`（SQLite 测试用 `NODE_OPTIONS=--experimental-sqlite`）。

## 阶段 A. 仓库与工作区骨架

## 任务 1. 项目顶层骨架
- 新建 `pnpm-workspace.yaml`（`packages: ['packages/*']`）、根 `package.json`（脚本 `dev/build/test/typecheck/lint`，private:true，type:module）、根 `tsconfig.base.json`。
- 接入 Vitest 根配置 `vitest.config.ts`（projects 读 `packages/*`）。
- ESLint + Prettier 根配置。
- `.nvmrc`/engines 锁 Node `>=22`；`NODE_OPTIONS=--experimental-sqlite` 文档化。
- 勾选 tasks 1.1、1.2、1.3 占位（CI 任务见阶段 F）。

## 阶段 B. domain 包（核心对象模型）

## 任务 2. domain 包
- `packages/domain`：`package.json`、`tsconfig`（被根 references）、`src/index.ts`。
- 定义 `Project/Issue/Spec/Plan/Task/Agent/Review/Knowledge` 类型、各 status 枚举、`id/projectId/createdAt/updatedAt/provenance`、关系指针（`Plan.specId`、`Task.planId`、`Review.targetType/targetId`）。
- 单测：枚举与关系类型约束（编译期 + 运行期快照）。
- 勾选 tasks 2.1/2.2/2.3。

## 阶段 C. issue-dsl 包

## 任务 3. issue-dsl 包
- `packages/issue-dsl`：依赖 `zod`、`@issueos/domain`（workspace `*`）。
- `IssueSchema`（zod）；`parseIssue(text, mode)`：探测 `---` frontmatter 或 `key: value` 行；strict/lenient 返回类型化结果；`validateIssue(issue)`。
- 单测：全字段、缺字段、坏格式 × strict/lenient × frontmatter/键值。
- 勾选 tasks 3.1/3.2/3.3。

## 阶段 D. storage 包

## 任务 4. storage 包
- `packages/storage`：`Repository<T>` 接口（`get/put/query(byProject)`，同步）。
- `InMemoryRepository<T>`（Map）。
- `SqliteRepository<T>`（`node:sqlite`，构造接 DB 路径，自动建表/列；基础 `get/put/query`）。
- 单测：内存往返；SQLite 跨实例往返（`NODE_OPTIONS=--experimental-sqlite`）。
- 勾选 tasks 4.1/4.2/4.3/4.4。

## 阶段 E. github-app 与 app 包

## 任务 5. github-app 包
- `packages/github-app`：依赖 `probot`、`@octokit/webhooks`。
- `createApp(app)` factory；监听 `issue_comment.created`/`issues.opened`、`issues.edited`；签名校验（Probot 内置）失败 401。
- `parseCommand(body)`：取评论首 token；命令集 `/spec`/`/plan`/`/task`/`/review`。
- `CommandHandler`/`CommandContext`/`registerCommand` 接口；`ctx` 含 `octokit/issue/parseIssue/repo工厂/issueId/projectId/logger`。
- 鉴权 `ALLOW_REPOS` allow-list（`*` 放行），越权 403。
- 占位 handler 默认注册四个命令，回复「尚未实现」并记日志不写 domain。
- `requireEnv`/fail-fast：缺 `APP_ID/PRIVATE_KEY/WEBHOOK_SECRET` 非零退出。
- 单测：路由/未知命令/占位/鉴权/fail-fast。
- 勾选 tasks 5.1–5.6。

## 任务 6. app 部署壳
- `packages/app`：依赖 `@issueos/github-app`、`probot`、`@issueos/storage`。
- 读取 env、创建 Probot、注册 foundation 占位 handler、启动 HTTP（PORT 默认 3000）。
- 集成测试：伪造签名 `issue_comment` payload → Probot → 占位回复断言（使用 `probot`/nock 或内存 webhook）。
- 勾选 tasks 5.7（集成测试并入此处）。

## 阶段 F. CI 与文档

## 任务 7. CI + 运行/文档
- `.github/workflows/ci.yml`：node 22，`pnpm install --frozen-lockfile`、`pnpm typecheck`、`pnpm test`（含 `--experimental-sqlite`）。
- `npm run dev` 起本地 Probot + Smee.io 转发说明（README/AGENTS.md）。
- README/AGENTS.md：GitHub App 注册步骤、env 变量表、本地 webhook tunnel、`/spec` 等 命令占位说明。
- `openspec validate issueos-foundation` 通过。
- 勾选 tasks 6.1/6.2/6.3。

## 退出前

- `pnpm typecheck && pnpm test` 全绿。
- tasks.md 全部勾选、已提交。
- 由 `/comet-build` 退出条件触发 `comet-guard build --apply`（需先经 plan-ready + 工作方式选择 + 执行完成 + review gate）。

## 风险与注意

- `node:sqlite` experimental：CI 必须用 Node 22 且 `--experimental-sqlite`；若 API 变动，回退用 `better-sqlite3`（仅 storage 包内替换）。
- Probot 版本与 ESM 兼容：优先选支持 ESM 的 Probot（>=13）；若冲突则动态 import 调整。
- `base-ref` 之上统计改动：本计划所有改动均为新增。