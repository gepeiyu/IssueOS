# IssueOS

IssueOS 用 Issue DSL 驱动 spec-to-task 工作流，沉淀团队 AI 协作记忆。

## 工作区结构

- `packages/domain` — 核心对象模型（Project / Issue / Spec / Plan / Task / Agent / Review / Knowledge）的 TypeScript 类型与辅助函数
- `packages/issue-dsl` — Issue DSL 解析器（strict / lenient 双模式）
- `packages/storage` — 存储层抽象（Repository 接口、InMemory / SQLite 实现）
- `packages/github-app` — GitHub App（Probot）命令路由与鉴权
- `packages/app` — 应用入口，组装各包并启动 Probot

## 前置要求

- Node.js `>= 22`（参见 `.nvmrc`）
- npm（本仓库使用 npm workspaces 管理 monorepo）

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 构建所有包
npm run build

# 3. 运行测试
$env:NODE_OPTIONS="--experimental-sqlite"; npm test   # Windows
# NODE_OPTIONS=--experimental-sqlite npm test          # macOS / Linux
```

## 本地运行

IssueOS 作为 GitHub App 运行，需要注册一个 App 并通过 Smee.io 接收 webhook。

### 1. 注册 GitHub App

参见 [AGENTS.md](./AGENTS.md) 中的详细步骤。

### 2. 配置环境变量

```bash
cp .env.example .env
```

填入以下必填变量：

| 变量 | 说明 |
|---|---|
| `APP_ID` | GitHub App 的 App ID |
| `PRIVATE_KEY` | GitHub App 的私钥（PEM 格式） |
| `WEBHOOK_SECRET` | 创建 App 时设置的 Webhook Secret |

### 3. 启动 Webhook 隧道

```bash
npx smee --url https://smee.io/<your-channel> --path /api/github/webhooks --port 3000
```

### 4. 启动应用

```bash
npm run dev
```

启动后 Probot 会监听 `http://localhost:3000`，通过 Smee 接收 GitHub 事件。

## 命令

在 Issue 或 Issue Comment 中以 `/` 开头的命令将被识别：

- `/spec` — 使用 LLM 生成 Spec（需配置 `ANTHROPIC_API_KEY`）
- `/plan` — 生成 Plan（尚未实现）
- `/task` — 生成 Task（尚未实现）
- `/review` — 生成 Review（尚未实现）

未知命令将回复支持的命令列表。

## 配置

所有配置通过环境变量传递：

| 变量 | 必填 | 默认值 | 说明 |
|---|---|---|---|
| `APP_ID` | 是 | — | GitHub App 的 App ID |
| `PRIVATE_KEY` | 是 | — | GitHub App 的私钥（PEM 格式） |
| `WEBHOOK_SECRET` | 是 | — | GitHub App 的 Webhook Secret |
| `ALLOW_REPOS` | 否 | — | 允许的仓库列表（逗号分隔 `owner/repo`），`*` 表示所有 |
| `PORT` | 否 | `3000` | 监听端口 |
| `HOST` | 否 | `localhost` | 监听地址 |
| `CLIENT_SECRET` | 否 | — | GitHub App 的 Client Secret（OAuth 用） |
| `ANTHROPIC_API_KEY` | 是 | — | Anthropic API key（`/spec` 命令用） |
| `LLM_PROVIDER` | 否 | `anthropic` | LLM 提供方 |
| `LLM_MODEL` | 否 | `claude-sonnet-4-20250514` | Claude 模型名 |

## 常用脚本

```bash
npm install         # 安装依赖并链接工作区
npm run typecheck   # 对所有包执行类型检查
npm test            # 运行 Vitest 测试
npm run build       # 构建所有包
npm run lint        # 运行 ESLint
```

> 说明：暂未采用 pnpm；如未来切换，请同步更新 `pnpm-workspace.yaml` 与锁文件。
> Windows 上运行测试：`$env:NODE_OPTIONS="--experimental-sqlite"; npm test`

## 设计与计划

- 设计文档：`docs/superpowers/specs/2026-06-28-issueos-foundation-design.md`
- 实施计划：`docs/superpowers/plans/2026-06-28-issueos-foundation.md`
- OpenSpec 变更：`openspec/changes/issueos-foundation/`
