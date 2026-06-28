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

- `/spec` — 使用 LLM 从 Issue 生成结构化 Spec（goal、scope、acceptance_criteria 等）
- `/plan` — 从 Spec 生成有序实施计划（3-8 个 Plan Items，含 dependsOn 依赖关系）
- `/task` — 从 Plan 拆解为 Task DAG（带拓扑排序 + 无环检测，自动去除环依赖）
- `/review` — 对 PR diff 或产物做 5 维审查（测试/代码规范/安全/性能/架构），输出 Risk Score

未知命令将回复支持的命令列表。各命令详情见下方 [命令详解](#命令详解) 章节。

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

- 设计文档：`docs/superpowers/specs/`
- 实施计划：`docs/superpowers/plans/`
- OpenSpec 变更记录：`openspec/changes/archive/`

## 命令详解

### `/spec`

从 Issue 描述生成结构化 Spec。自动解析 Issue DSL 字段作为降级回退。

**用法：**
- `/spec` — 自动关联当前 Issue，生成或重新生成 Spec
- 第一次运行在当前 Issue 上创建 Spec；重复运行产生新版本并标记旧版 superseded

**输出：**
- Background / Goal / Scope / Out of Scope / Acceptance Criteria / Risk / Rollback
- Provenance 元数据（Spec ID / Issue ID / 命令 / 时间戳）

**降级：** LLM 失败时回退到 Issue 中预解析的 DSL 字段，标注缺失项。

---

### `/plan`

从 Spec 生成有序实施计划（3-8 个 Plan Items），每个 Item 包含 title、summary、dependsOn。

**用法：**
- `/plan` — 自动关联当前 Issue 的最新未 superseded Spec
- `/plan <spec-id>` — 显式指定 Spec ID

**输出：**
- 表格形式列出 # / Task / Description / Dependencies
- Provenance 元数据

**降级：** 无 Spec → 提示 `/spec`；Spec 缺少 goal/scope/acceptance_criteria → 提示补充；LLM 失败 → 提示重试。

---

### `/task`

从 Plan 拆解为 Task DAG。每个 Plan Item 拆为 1-3 个 Task（总计 ≤ 20），Task 间带 `dependsOn` 依赖关系。

**用法：**
- `/task` — 自动关联当前 Issue 的最新未 superseded Plan
- `/task <plan-id>` — 显式指定 Plan ID

**输出：**
- Markdown 列表（`- [ ] T1: title — summary (depends: T2)`）
- 环检测告警：如检测到环形依赖，自动去除成环边并记录告警
- Provenance 元数据

**降级：** 无 Plan → 提示 `/plan`；Plan Items < 2 → 告警；LLM 失败 → 提示重试。

---

### `/review`

对 PR diff 或产物做 5 维度自动审查，输出 Risk Score。

**用法：**
- `/review <pr-number>` — 审查指定 PR 的 diff
- `/review spec-<id>` 或 `plan-<id>` 或 `task-<id>` — 审查产物完整性
- `/review` — 尝试自动关联 Issue 中引用的 PR

**审查维度与权重：**

| 维度 | 权重 | 评估内容 |
|------|------|----------|
| Security | 30% | 密钥泄露？注入？鉴权？输入校验？ |
| Architecture | 25% | 关注分离？耦合度？设计模式？ |
| Tests | 20% | 测试覆盖率？有意义的断言？边界情况？ |
| Code Quality | 15% | 可读性？命名？重复代码？错误处理？ |
| Performance | 10% | N+1 查询？内存泄露？Payload 大小？ |

**Risk Score：**
- Low (0-30) — 代码质量较好
- Medium (31-60) — 部分维度需要改进
- High (61-100) — 需要重点关注

**输出：**
- Risk Score + 分档
- 各维度评分表
- 各维度详细发现与改进建议
- 大 diff 自动分文件分块摘要，超 100K 字符标注「未完整评估」
- **免责声明：** AI 辅助审查，不替代人工 Code Review

**降级：** 无目标 → 提示用法；PR 不存在 → 提示检查 PR 号；LLM 超时 → 部分维度标注「未评估」。

---

### 幂等性

所有 4 条命令支持重复调用：
- 新结果生成新 ID
- 同目标的上次结果标记 `superseded`，`supersededBy` 指向新 ID
- 链路过时（如 Plan superseded 后运行 `/task`）提示更新上游
