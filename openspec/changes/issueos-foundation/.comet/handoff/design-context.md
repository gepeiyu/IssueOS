# Comet Design Handoff

- Change: issueos-foundation
- Phase: design
- Mode: compact
- Context hash: b5abfe3100b3b9cd730f1f0b11aa2e7db4e651d62d4cfcf536b4df70f12bf70d

Generated-by: comet-handoff.sh

OpenSpec remains the canonical capability spec. This handoff is a deterministic, source-traceable context pack, not an agent-authored summary.

## openspec/changes/issueos-foundation/proposal.md

- Source: openspec/changes/issueos-foundation/proposal.md
- Lines: 1-29
- SHA256: f421dddbfd263a6676cf0a69ffe3d5e1f9b1abdb0ea20b0bbd9c67bc891c3dc7

```md
## Why

IssueOS 计划把 GitHub Issue 升级为「可执行规范」。MVP 是一个 GitHub App，通过 `/spec`、`/plan`、`/task`、`/review` 四个斜杠命令把 Issue 逐步转化为 Spec / Plan / Task / Review。在实现任一命令之前，需要一个共享的工程基座：项目骨架、Issue DSL、核心对象模型、GitHub App/Webhook 接入、存储抽象与测试/CI。没有基座，四个命令无法独立设计、构建与归档。

## What Changes

- 新建 TypeScript 项目骨架：`src/`、配置（`tsconfig.json`、`package.json` 脚本）、构建、ESLint/Prettier、Vitest 单测、CI 工作流。
- 定义 **Issue DSL**：结构化 Issue 的 schema（`title/background/goal/scope/out_of_scope/acceptance/risk/rollback`）及其校验器，支持从自然语言 Issue 解析与容错。
- 定义核心对象模型：`Project / Issue / Spec / Plan / Task / Agent / Review / Knowledge` 的 TypeScript 类型与领域边界。
- 接入 **GitHub App**：注册与密钥配置、Webhook 接收 Issue 事件、命令路由（识别 Issue 评论中的 `/spec` `/plan` `/task` `/review`）、鉴权与未授权仓库拒绝。
- 提供存储层抽象（`Storage` 接口）与基础实现（内存 + SQLite 适配位），供后续命令持久化产物。
- 不实现任一命令的生成核心逻辑（Issue Parser / Planner / Task 拆解 / Review 由后续 change 承担）。

## Capabilities

### New Capabilities
- `issue-dsl`: Issue 标准结构与校验，把 Issue 文本解析为可被后续管线消费的结构化输入
- `object-model`: 项目/Issue/Spec/Plan/Task/Agent/Review/Knowledge 等核心对象的类型与领域边界
- `github-app`: GitHub App 注册、Webhook 接收、命令路由与鉴权（识别 `/spec` `/plan` `/task` `/review` 并分发占位响应）
- `storage`: 产物存储层抽象与基础实现，供各命令持久化 Spec/Plan/Task/Review

### Modified Capabilities
<!-- 无现有 spec，全部为新建 -->

## Impact

- 新增代码：项目根配置、`src/` 全部、测试与 CI。
- 依赖：新增 `@octokit/webhooks`/`@octokit/auth-app`/`probot` 候选、Web 服务框架、SQLite（如选择）等，最终栈在 `design.md` 确定。
- 对外部系统：需注册一个 GitHub App 并配置 Webhook 密钥；MVP 阶段不真实执行 Agent。
- 为后续 4 个命令 change 提供依赖地基，无对外可见的业务行为。```

## openspec/changes/issueos-foundation/design.md

- Source: openspec/changes/issueos-foundation/design.md
- Lines: 1-45
- SHA256: a1e5b14b27c66598acb411da007d401bf89c16b4154e8605d156efbcbc8625d3

```md
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

- 全新仓库，无迁移。CI 绿即可。回滚=不部署该 change，对后续命令无影响（基座独立）。```

## openspec/changes/issueos-foundation/tasks.md

- Source: openspec/changes/issueos-foundation/tasks.md
- Lines: 1-39
- SHA256: 12f31efd933f2f8df0f997561282798b13d69220a116924f02d09cd7f328478c

```md
## 1. 项目骨架

- [ ] 1.1 初始化项目配置：`package.json`(scripts/type:module)、`tsconfig.json`、ESLint、Prettier、`.gitignore`、`.env.example`
- [ ] 1.2 接入 Vitest 并跑通样板单测；配置 `dev`/`build`/`test`/`typecheck` 脚本
- [ ] 1.3 新增 GitHub Actions CI（typecheck + test on push/PR）

## 2. 核心对象模型

- [ ] 2.1 在 `src/domain/` 定义 `Project/Issue/Spec/Plan/Task/Agent/Review/Knowledge` 类型与状态枚举
- [ ] 2.2 为每类对象定义 `id/projectId/createdAt/updatedAt/provenance` 及关系指针（`Plan.specId`、`Task.planId`、`Review.target*`）
- [ ] 2.3 单测覆盖对象关系与状态枚举的类型约束

## 3. Issue DSL

- [ ] 3.1 在 `src/dsl/` 定义 Issue schema 与 `parseIssue(text, mode)` / `validateIssue(issue)`
- [ ] 3.2 实现 strict（缺字段报错）与 lenient（缺字段给补充提示）双模式
- [ ] 3.3 单测覆盖全字段、缺字段、坏格式场景

## 4. 存储层

- [ ] 4.1 定义同步 `Repository<T>` 接口（`get/put/query(byProject)`）
- [ ] 4.2 实现 `InMemoryRepository`
- [ ] 4.3 提供 `SqliteRepository` 适配位（接口齐全、基础 get/put/query 可跑）
- [ ] 4.4 单测覆盖内存实现与 SQLite 基础往返

## 5. GitHub App 与命令路由

- [ ] 5.1 接入 Probot，配置 `issue_comment`/`issues` 监听与签名校验
- [ ] 5.2 实现 Webhook 签名校验，失败返回 401 且不派发
- [ ] 5.3 实现命令路由：识别 `/spec` `/plan` `/task` `/review` 首词；未知命令回复帮助
- [ ] 5.4 实现占位 handler：识别到的命令回「尚未实现」并记录为 markdown 占位回复
- [ ] 5.5 实现鉴权：仓库 allow-list 校验，越权 403
- [ ] 5.6 配置 fail-fast 启动校验（`APP_ID`/`PRIVATE_KEY` 缺失即退出并提示变量名）
- [ ] 5.7 集成测试：使用伪造 webhook payload 覆盖签名、鉴权、路由分发

## 6. 本地运行与文档

- [ ] 6.1 提供 `npm run dev` 启动 Probot + Smee.io 转发说明
- [ ] 6.2 README 增补：GitHub App 注册步骤、环境变量、本地 webhoo tunnel 配置
- [ ] 6.3 通过 `openspec validate issueos-foundation` 校验 change 完整```

## openspec/changes/issueos-foundation/specs/github-app/spec.md

- Source: openspec/changes/issueos-foundation/specs/github-app/spec.md
- Lines: 1-36
- SHA256: 0def9cfe7669f7d45453b7ebd3c8231ebc7c9a2768267b53f4cb9f7a7c6a5a21

```md
## ADDED Requirements

### Requirement: Webhook ingestion
The GitHub App SHALL receive `issue_comment`, `issues` Webhook events from GitHub, verify the signature, and forward recognized commands to the command router.

#### Scenario: Valid signed webhook
- **WHEN** GitHub sends a signed `issue_comment` event for a `/spec` comment
- **THEN** the App verifies the signature and dispatches a parse command event to the router

#### Scenario: Unsigned or bad signature
- **WHEN** a webhook request has an invalid signature
- **THEN** the App rejects it with 401 and does not dispatch

### Requirement: Command routing
The router SHALL recognize the command words `/spec`, `/plan`, `/task`, `/review` as the first token of an Issue/Issue-comment body and dispatch to the registered handler.

#### Scenario: Unknown command
- **WHEN** the first token is not one of the four commands
- **THEN** the router replies with a help message listing supported commands and takes no further action

#### Scenario: Placeholder handler
- **WHEN** a recognized command has no real handler registered yet (foundation state)
- **THEN** the router invokes the placeholder handler, which replies "尚未实现" with the command name, and records no domain object

### Requirement: Authorization
The App SHALL only act on repositories it is installed on, configurable via an allow-list; uninstalled or disallowed repos SHALL be refused silently (or with a minimal 403).

#### Scenario: Disallowed repository
- **WHEN** a webhook targets a repository not in the allow-list
- **THEN** the App refuses processing and returns an explicit unauthorized response

### Requirement: Configuration surface
The App SHALL read configuration (App ID, private key, client secret, webhook secret, allow-list) from environment variables with documented defaults and fail-fast on missing required config.

#### Scenario: Missing required config
- **WHEN** `APP_ID` or `PRIVATE_KEY` is unset at startup
- **THEN** the App exits with a non-zero code and a message naming the missing variable```

## openspec/changes/issueos-foundation/specs/issue-dsl/spec.md

- Source: openspec/changes/issueos-foundation/specs/issue-dsl/spec.md
- Lines: 1-40
- SHA256: 47477816032acea75150f7e93db5d05f0110b044f33c8c215a54671030156623

```md
## ADDED Requirements

### Requirement: Issue DSL schema
The system SHALL define a structured Issue schema with fields: `title`, `background`, `goal`, `scope`, `out_of_scope`, `acceptance`, `risk`, `rollback`.

#### Scenario: All fields present
- **WHEN** an Issue text contains all required DSL fields
- **THEN** the parser produces a typed Issue object passing strict validation

#### Scenario: Missing optional context
- **WHEN** an Issue text omits `background` or `risk`
- **THEN** the parser fills reasonable defaults and warns, but still produces a valid Issue object

### Requirement: DSL textual format
The parser SHALL accept two textual forms of an Issue: YAML frontmatter (a `---`-delimited block at the top of the Issue body) and line-oriented `key: value` form. In both forms, keys map to the DSL fields.

#### Scenario: YAML frontmatter form
- **WHEN** an Issue body starts with a `---`-delimited frontmatter block containing DSL keys
- **THEN** the parser extracts the fields from the frontmatter and treats the remaining body as `background` context when `background` is absent

#### Scenario: Key-value line form
- **WHEN** an Issue body consists of `key: value` lines (e.g. `goal: 支持微信授权登录`)
- **THEN** the parser maps each recognized key to the corresponding DSL field and reports any unrecognized keys in lenient mode

### Requirement: Dual-mode parsing
The system SHALL support two parsing modes: `strict` (reject missing required fields) and `lenient` (produce best-effort object with actionable prompts).

#### Scenario: Strict mode rejects incomplete Issue
- **WHEN** strict mode is active and a required field is missing
- **THEN** the parser returns a validation error listing the missing fields

#### Scenario: Lenient mode guides completion
- **WHEN** lenient mode is active and fields are missing
- **THEN** the parser returns a partial Issue plus actionable prompts telling the user how to complete it

### Requirement: DSL verifier utility
The system SHALL expose a programmatic `parseIssue(text, mode)` and `validateIssue(issue)` API for downstream commands.

#### Scenario: Programmatic parse
- **WHEN** a caller invokes `parseIssue("<issue text>", "strict")`
- **THEN** it returns either a typed `Issue` object or a structured validation error, without throwing on user input```

## openspec/changes/issueos-foundation/specs/object-model/spec.md

- Source: openspec/changes/issueos-foundation/specs/object-model/spec.md
- Lines: 1-21
- SHA256: 665f3091e883b3e460631a60e63d34aea2ec87d5cd3b36a7953df1baf52c41a2

```md
## ADDED Requirements

### Requirement: Core domain objects
The system SHALL define TypeScript types for `Project`, `Issue`, `Spec`, `Plan`, `Task`, `Agent`, `Review`, `Knowledge`, with explicit field boundaries.

#### Scenario: Object identity and relations
- **WHEN** the type module is imported
- **THEN** every core object exposes stable identifiers (`id`, `projectId`) and relation pointers (e.g. `Plan.specId`, `Task.planId`, `Review.targetType/targetId`) sufficient for cross-command linkage

### Requirement: Object lifecycle statuses
The system SHALL define status enums for `Spec`, `Plan`, `Task`, `Review` (e.g. `draft|generated|reviewed|superseded`).

#### Scenario: Status transitions are type-safe
- **WHEN** a producer sets an object status
- **THEN** only values declared in the enum compile at design time and are persisted verbatim

### Requirement: Time and provenance fields
Every core object SHALL carry `createdAt`, `updatedAt`, and a provenance field recording the source command (`/spec` / `/plan` / `/task` / `/review`) and upstream object id.

#### Scenario: Provenance traceability
- **WHEN** a `/plan` command generates a Plan from a Spec
- **THEN** the Plan records `provenance.sourceCommand = "/plan"` and `provenance.specId` of the originating Spec```

## openspec/changes/issueos-foundation/specs/storage/spec.md

- Source: openspec/changes/issueos-foundation/specs/storage/spec.md
- Lines: 1-25
- SHA256: a50a63bb65c9ae7159a419886de6446dbed5020b992e94fd92e14f5ea89b49af

```md
## ADDED Requirements

### Requirement: Repository abstraction
The system SHALL define a `Repository<T>` interface with `get`, `put`, `query(byProject)` operations for each core object type.

#### Scenario: Save and retrieve
- **WHEN** a producer calls `put(spec)` then `get(spec.id)`
- **THEN** the repository returns the same object with identical field values

#### Scenario: Query by project
- **WHEN** a producer queries all objects of a type for a given projectId
- **THEN** the repository returns only objects whose `projectId` matches

### Requirement: In-memory default implementation
The system SHALL provide an `InMemoryRepository` implementing the `Repository` interface, usable for local development and tests.

#### Scenario: In-memory persistence within process
- **WHEN** objects are `put` into an `InMemoryRepository` and the process is alive
- **THEN** subsequent `get`/`query` calls return them; on process exit the data is lost (acceptable for MVP local)

### Requirement: SQLite adapter scaffold
The system SHALL provide a `SqliteRepository` adapter implementing the same interface; MVP only requires interface conformance and basic `get`/`put`/`query` behavior, advanced querying may be stubbed.

#### Scenario: SQLite basic round-trip
- **WHEN** a producer `put`s an object into a `SqliteRepository` over a file DB
- **THEN** a subsequent `get` returns the persisted object across a new repository instance pointed at the same DB file```

