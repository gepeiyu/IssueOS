# IssueOS — Agent Guide

## 本地开发环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `APP_ID` | 是 | GitHub App 的 App ID |
| `PRIVATE_KEY` | 是 | GitHub App 的私钥（PEM 格式），换行符用 `\n` 或 Base64 编码 |
| `WEBHOOK_SECRET` | 是 | GitHub App 的 Webhook Secret |
| `ALLOW_REPOS` | 否 | 允许的仓库列表（逗号分隔 `owner/repo`），`*` 表示所有仓库 |
| `PORT` | 否 | 监听端口，默认 `3000` |
| `HOST` | 否 | 监听地址，默认 `localhost` |
| `CLIENT_SECRET` | 否 | GitHub App 的 Client Secret（OAuth 用） |

## GitHub App 注册步骤

1. 访问 GitHub Settings → Developer settings → GitHub Apps → **New GitHub App**
2. 填写以下字段：
   - **GitHub App name**: 任意唯一名称，如 `issueos-local`
   - **Homepage URL**: `http://localhost:3000`
   - **Webhook URL**: 本地开发时使用 Smee.io 生成的 URL（见下文）
   - **Webhook secret**: 自定义一个随机字符串，后续填入 `.env` 的 `WEBHOOK_SECRET`
   - **Permissions**:
     - Issues: **Read & write**
     - Repository contents: **Read**
   - **Subscribe to events**:
     - Issues
     - Issue comment
3. 点击 **Create GitHub App**
4. 在 App 设置页：
   - 记下 **App ID** → 填入 `.env` 的 `APP_ID`
   - 点击 **Generate a private key** → 下载 `.pem` 文件 → 将其内容填入 `.env` 的 `PRIVATE_KEY`
5. 安装 App 到目标仓库：App 设置页 → **Install App** → 选择仓库

## 本地 Webhook 隧道（Smee.io）

Probot 使用 Smee.io 将 GitHub Webhook 转发到本地：

```bash
npx smee --url https://smee.io/<your-channel> --path /api/github/webhooks --port 3000
```

- 将 Smee URL 填入 GitHub App 设置的 **Webhook URL**
- Webhook 会经过 Smee 转发到 `http://localhost:3000/api/github/webhooks`
- 运行 `npm run dev` 启动 Probot

## 常用命令

```bash
npm install           # 安装依赖
npm run dev           # 启动 Probot（生产模式需先 build）
npm test              # 运行测试
npm run build         # 构建所有包
npm run typecheck     # TypeScript 类型检查
npm run lint          # ESLint
```

> Windows 上运行测试：`$env:NODE_OPTIONS="--experimental-sqlite"; npm test`
