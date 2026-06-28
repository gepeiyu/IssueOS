---
comet_change: issueos-foundation
role: technical-design
canonical_spec: openspec
archived-with: 2026-06-28-issueos-foundation
status: final
---

# Design Doc — IssueOS 基座（issueos-foundation）

> 深度技术设计对应 OpenSpec change `issueos-foundation`。能力规格以 `openspec/changes/issueos-foundation/specs/*/spec.md` 为 canonical；本文为实施侧技术决策，不重复需求。

## 1. 目标与非目标

- 目标：为 IssueOS MVP 四个命令 change 提供共享工程基座——项目骨架、Issue DSL、核心对象模型、GitHub App/Webhook 接入、存储抽象与测试/CI。
- 非目标：不实现 `/spec` `/plan` `/task` `/review` 任一命令的生成核心逻辑；不接 LLM；不做长期调度、Agent 执行、Knowledge Layer；不部署生产，仅本地可跑 + CI 绿。

## 2. 架构（pnpm 工作区多包）

```
packages/
  domain/        核心对象类型与状态枚举、provenance（纯类型，零运行时依赖）
  issue-dsl/     zod schema + parseIssue/validateIssue，strict/lenient
  storage/       同步 Repository<T> 接口 + InMemoryRepository + SqliteRepository(node:sqlite)
  github-app/    Probot app factory + 命令路由 + 占位 handler + allow-list 鉴权 + env fail-fast
  app/           部署壳：读 env、起 Probot、注册 foundation 占位 handler、起 HTTP
```

后续命令 change 各自新增 `packages/commands/<cmd>`，通过 `packages/github-app` 暴露的 `registerCommand(handler)` 接入路由。

顶层：`pnpm-workspace.yaml`、根 `tsconfig`（project references 指向各包 `tsconfig`）、ESLint/Prettier、Vitest、`AGENTS.md`、`.github/workflows/ci.yml`（Node 22）。

## 3. 关键技术决策

| 决策 | 选择 | 理由 / 替代 |
|------|------|------|
| 语言/运行时 | Node 22 LTS, ESM, TS | 与 OpenSpec 同生态；Node 22 因内置 `node:sqlite`。替代：Python/Go 否决。 |
| 包管理 | pnpm workspace | 边界清晰、跨包测试、命令包独立演进。替代：扁平 src/ 边界靠约定，否决。 |
| GitHub App 框架 | Probot | 封装 auth-app/webhooks/Express，鉴权+签名+路由样板省事。替代：纯 `@octokit/webhooks` 手搓样板多。 |
| SQLite 驱动 | `node:sqlite`（内置，`--experimental-sqlite`） | 无 native 编译，与同步 `Repository` 接口匹配。替代 `better-sqlite3` 需 native 编译+prebuild，CI 复杂。 |
| DSL schema | zod | 类型推导+校验一体。 |
| DSL 文本形态 | YAML frontmatter 或 `key: value` 行 | 兼容两种易于人写；自然语言→Spec 留给 `/spec`。 |
| 测试 | Vitest | ESM 友好、watch/coverage 已备。 |

## 4. 数据流（命令接入边界）

```
GitHub Webhook → Probot(签名+鉴权) → github-app 路由(解析评论首词)
   ├─ 命中已注册 handler → 调 handler.run(ctx)
   └─ 未注册 → 占位回复「尚未实现」
```

`ctx` 提供：`octokit`、`issue`、`parseIssue` 结果、`repository` 工厂、`issueId`、`projectId`、`logger`。

Handler 接口：
```ts
type CommandHandler = {
  command: '/spec' | '/plan' | '/task' | '/review';
  run(ctx: CommandContext): Promise<HandlerResult>;
};
registerCommand(handler: CommandHandler): void;
```

基座在 `packages/app` 启动时为四个命令各注册一个占位 handler，回复「尚未实现」。

## 5. Issue DSL 设计

- `IssuesSchema = z.object({ title, background?, goal, scope, out_of_scope?, acceptance, risk?, rollback? })`。
- `parseIssue(text, mode)`：
  - 形态探测：若以 `---` 开头按 frontmatter 解析；否则按 `key: value` 行解析。
  - strict：缺 `goal/scope/acceptance` 返回 `{ ok:false, errors: [...] }`。
  - lenient：返回 `{ ok:true, issue: <partial>, prompts: [...] }`。
- `validateIssue(issue)`：zod 校验，返回 `{ ok, errors?, issue? }`。

## 6. 存储设计

```ts
interface Repository<T extends { id: string; projectId: string }> {
  get(id: string): T | undefined;
  put(item: T): void;
  query(byProject: string): T[];
}
```
- `InMemoryRepository<T>`：`Map`，进程内持久。
- `SqliteRepository<T>`：`node:sqlite`，每类型一张表（或单表 JSON 列），同步 API；构造接收 DB 路径；表自动建。MVP 仅要求 `get/put/query` 可跑跨实例往返。

## 7. GitHub App 设计

- env：`APP_ID`、`PRIVATE_KEY`、`WEBHOOK_SECRET`、`CLIENT_SECRET?`、`ALLOW_REPOS`（`owner/repo` 逗号分隔或 `*`）、`LLM_*`（基座不读，留位）、`PORT`。
- 启动校验：缺 `APP_ID/PRIVATE_KEY/WEBHOOK_SECRET` → 非零退出并指明变量名。
- Webhook：监听 `issue_comment.created`、`issues.opened/edited`；验签失败 401；`ALLOW_REPOS` 不匹配 403 静默。
- 路由：`parseCommand(body)` 取评论首 token；`/spec`/`/plan`/`/task`/`/review` 命中分发；其他回帮助（列出四命令）。
- 占位 handler：回复 `> /<cmd> 尚未实现`，并在日志记录，不写 domain 对象。
- 本地：`pnpm dev` 起 Probot + Smee.io 转发；文档在 README/AGENTS.md。

## 8. 错误与降级

- 签名失败/越权：401/403，不分发。
- 缺 env：启动 fail-fast。
- 未知命令：帮助回复。
- DSL 非法（非两种形态）：`parseIssue` 返回错误，由 handler 决定降级（基座仅提供工具）。
- Probot 内部异常：捕获、记录、500，不崩溃进程。

## 9. 测试策略

- `packages/domain`：枚举/类型编译期约束单测。
- `packages/issue-dsl`：全字段、缺字段、坏格式 × strict/lenient × frontmatter/键值。
- `packages/storage`：InMemory 与 SQLite 基础往返（跨实例 get）。
- `packages/github-app`：路由分发、鉴权拒绝、未知命令、占位 handler、fail-fast（缺 env 退出）。
- 集成：伪造签名 `issue_comment` payload → Probot → 占位回复断言。
- CI：Node 22，`pnpm install && pnpm typecheck && pnpm test`；SQLite 测试用 `NODE_OPTIONS=--experimental-sqlite`。

## 10. 迁移与回滚

全新仓库无迁移。回滚=不部署基座；后续命令 change 在基座上接入，基座独立可测。

## 11. Spec Patch

已回写 `openspec/changes/issueos-foundation/specs/issue-dsl/spec.md`：新增 Requirement「DSL textual format」及 frontmatter / key-value 两个 Scenario。其余 capability spec 不变。

## 12. 开放问题（留待后续 change 或 build 阶段）

- LLM 提供方与密钥：留给 `issueos-spec-command` 深度设计。
- Probot 部署形态（云函数/VPS/容器）：MVP 不强求，仅本地可跑。
- pnpm 版本锁定策略：build 阶段在 CI 锁定。
