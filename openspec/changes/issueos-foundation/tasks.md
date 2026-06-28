## 1. 项目骨架

- [x] 1.1 初始化项目配置：`package.json`(scripts/type:module)、`tsconfig.json`、ESLint、Prettier、`.gitignore`、`.env.example`
- [x] 1.2 接入 Vitest 并跑通样板单测；配置 `dev`/`build`/`test`/`typecheck` 脚本
- [ ] 1.3 新增 GitHub Actions CI（typecheck + test on push/PR）

## 2. 核心对象模型

- [x] 2.1 在 `src/domain/` 定义 `Project/Issue/Spec/Plan/Task/Agent/Review/Knowledge` 类型与状态枚举
- [x] 2.2 为每类对象定义 `id/projectId/createdAt/updatedAt/provenance` 及关系指针（`Plan.specId`、`Task.planId`、`Review.target*`）
- [x] 2.3 单测覆盖对象关系与状态枚举的类型约束

## 3. Issue DSL

- [x] 3.1 在 `src/dsl/` 定义 Issue schema 与 `parseIssue(text, mode)` / `validateIssue(issue)`
- [x] 3.2 实现 strict（缺字段报错）与 lenient（缺字段给补充提示）双模式
- [x] 3.3 单测覆盖全字段、缺字段、坏格式场景

## 4. 存储层

- [x] 4.1 定义同步 `Repository<T>` 接口（`get/put/query(byProject)`）
- [x] 4.2 实现 `InMemoryRepository`
- [x] 4.3 提供 `SqliteRepository` 适配位（接口齐全、基础 get/put/query 可跑）
- [x] 4.4 单测覆盖内存实现与 SQLite 基础往返

## 5. GitHub App 与命令路由

- [x] 5.1 接入 Probot，配置 `issue_comment`/`issues` 监听与签名校验
- [x] 5.2 实现 Webhook 签名校验，失败返回 401 且不派发
- [x] 5.3 实现命令路由：识别 `/spec` `/plan` `/task` `/review` 首词；未知命令回复帮助
- [x] 5.4 实现占位 handler：识别到的命令回「尚未实现」并记录为 markdown 占位回复
- [x] 5.5 实现鉴权：仓库 allow-list 校验，越权 403
- [x] 5.6 配置 fail-fast 启动校验（`APP_ID`/`PRIVATE_KEY` 缺失即退出并提示变量名）
- [x] 5.7 集成测试：使用伪造 webhook payload 覆盖签名、鉴权、路由分发

## 6. 本地运行与文档

- [ ] 6.1 提供 `npm run dev` 启动 Probot + Smee.io 转发说明
- [ ] 6.2 README 增补：GitHub App 注册步骤、环境变量、本地 webhoo tunnel 配置
- [ ] 6.3 通过 `openspec validate issueos-foundation` 校验 change 完整