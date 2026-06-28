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
- 为后续 4 个命令 change 提供依赖地基，无对外可见的业务行为。