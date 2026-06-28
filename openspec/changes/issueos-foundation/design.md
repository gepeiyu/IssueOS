## Context

IssueOS 仓库目前几乎为空，仅有 `@fission-ai/openspec` 依赖与 skill 配置。本 change 建立 MVP 所需的工程基座。MVP 是一个 GitHub App，接收 Issue 评论中的 `/spec` `/plan` `/task` `/review` 命令并产出对应产物。基座不实现命令的生成核心，但必须让后续 4 个命令 change 可以独立接入。

## Goals / Non-Goals

**Goals:**
- 提供可构建、可测试、可本地运行的 TypeScript 项目骨架。
- 给出 Issue DSL schema 与解析/校验器，可用示例 Issue 验证。
- 定义核心对象模型的 TypeScript 类型与边界。
- 提供能接收 GitHub Webhook、识别命令、鉴权并分发占位响应的 GitHub App 框架。
- 提供存储层抽象与一个可运行的基础实现。

**Non-Goals:**
- 不实现 Issue Parser / Planner / Task 拆解 / Review 的核心生成逻辑。
- 不接 LLM 提供方（留给后续 change）。
- 不做长期任务调度、Agent 执行、Replay、Knowledge Layer。
- 不部署到生产，仅本地可跑 + CI 通过。

## Decisions

- **D1 技术栈**：Node.js + TypeScript（用户确认）。ESM 模块。运行时 Node 20 LTS。
  - 替代：Python/Go，否决——与 OpenSpec 同生态、LLM 工具链友好。
- **D2 GitHub App 框架**：用 **Probot**（封装 Octokit auth-app + webhooks + Express）。替代：纯 `@octokit/webhooks` 手搓，否决——Probot 处理了鉴权/签名/路由样板，更省事。
- **D3 命令路由**：解析 Issue 评论首行命令词（`/spec` 等），路由到命令处理函数（基座提供 handler 接口，注册占位 handler 返回「未实现」）。后续 change 各自注册真实 handler。
- **D4 Issue DSL 形式**：先定义 **TSR（TypeScript-typed）schema** + 轻量 YAML/键值解析；严格模式校验缺失字段、宽松模式给出补充提示。最终形式在后续 `/spec` change 的深度设计中再收敛。
- **D5 存储**：定义同步 Repository 接口，提供 `InMemoryRepository`（默认）与 `SqliteRepository` 适配位（接口齐全、实现可后补）。MVP 默认内存即可联调。
- **D6 测试**：Vitest。对 DSL 校验、命令路由、鉴权拒绝、存储接口写单测。
- **D7 部署/本地运行**：`pnpm dev`（或 `npm run dev`）启动 Probot + Smee.io 代理用于本地 Webhook 转发；CI（GitHub Actions）跑 typecheck + test。

## Risks / Trade-offs

- [Probot 重度封装可能限制后续自定义] → 通过 handler 接口隔离，命令逻辑不耦合 Probot 内部。
- [Issue DSL 形式未定型即固化] → 本 change 只定 schema 与解析器，留 `strict/lenient` 双模式，深度设计阶段再收敛。
- [Webhook 密钥管理复杂] → 通过 `.env` + 文档说明，不在代码中硬编码。
- [SQLite 适配位仅占位] → 仅保证接口可编译、内存实现可用；SQLite 真实实现允许后续 change 补齐。

## Open Questions

- LLM 提供方与调用策略（留待 `issueos-spec-command` 等深度设计）。
- GitHub App 部署形态（云函数 / VPS / 容器）——MVP 不强求，仅保证可本地运行。
- 是否引入 pnpm（倾向是，最终在 build 阶段定）。

## Migration Plan

- 全新仓库，无迁移。CI 绿即可。回滚=不部署该 change，对后续命令无影响（基座独立）。