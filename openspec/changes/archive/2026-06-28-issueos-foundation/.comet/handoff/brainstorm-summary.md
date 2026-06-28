# Brainstorm Summary

- Change: issueos-foundation
- Date: 2026-06-28

## 确认的技术方案

- pnpm 工作区多包：`packages/{domain,issue-dsl,storage,github-app,app}`；后续命令 change 新增 `packages/commands/<cmd>` 通过基座 `registerCommand(handler)` 接入。
- 运行时：Node 22 LTS；ESM；TypeScript（project references）。
- GitHub App：Probot（封装 auth-app/webhooks/Express）。
- Storage：同步 `Repository<T>` 接口；`InMemoryRepository` 默认；`SqliteRepository` 基于 `node:sqlite`（Node 22 `--experimental-sqlite`）。
- Issue DSL：zod schema；解析两种文本形态——YAML frontmatter 与 `key: value` 行；`parseIssue(text, mode)`/`validateIssue(issue)`，strict/lenient 双模式。
- 命令路由：解析 Issue 评论首词；命中已注册 handler 分发，未注册回占位「未实现」。
- 测试：Vitest 单测 + 伪造 webhook 集成测试；CI Node 22 `pnpm typecheck && pnpm test`。

## 关键取舍与风险

- node:sqlite 仍 experimental，需 `--experimental-sqlite` 且 Node 22+ → CI 锁定 Node 22，文档明示启动标志；规避 native 编译（better-sqlite3）。
- Probot 封装较重 → 用 handler 接口隔离命令逻辑，避免耦合 Probot 内部。
- Issue DSL 形式先以 frontmatter/键值两形态兼容，深度收敛留给后续 `/spec` change。
- 仅内存实现即可联调，SQLite 适配位保证接口可编译与基础往返。

## 测试策略

domain 枚举/类型、issue-dsl 全字段/缺字段/坏格式 × strict/lenient、storage 内存+SQLite 往返、github-app 路由/鉴权/未知命令/占位、伪造签名 webhook 端到端集成。

## Spec Patch

回写 `openspec/changes/issueos-foundation/specs/issue-dsl/spec.md`，新增 Requirement「DSL textual format」明确 YAML frontmatter 与 `key: value` 行两种解析形态及对应 Scenario。其余 specs 不变。