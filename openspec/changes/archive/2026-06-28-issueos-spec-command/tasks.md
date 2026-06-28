## 1. LLM 抽象层

- [x] 1.1 在 `packages/llm-client/` 定义 `LlmClient` 接口（`generate(messages, schema)`）
- [x] 1.2 实现默认 provider（Anthropic Claude，env `LLM_PROVIDER`/`ANTHROPIC_API_KEY` 切换）
- [x] 1.3 密钥仅从 env 读；单测用 fake provider

## 2. Spec 生成

- [x] 2.1 在 `packages/commands/spec/` 实现 handler，注册到基座命令路由
- [x] 2.2 编写结构化抽取提示（`prompts/spec/build-spec-prompt.ts`）
- [x] 2.3 实现 Issue→LLM→Spec schema 的解析与后置校验（JSON schema tool use）
- [x] 2.4 输出 Markdown 回复模板（DSL 字段 + `<details>` provenance）
- [x] 2.5 通过 `Repository` 持久化 Spec；带 `id/provenance`

## 3. 降级与幂等

- [x] 3.1 超时/解析失败降级：用 `parseIssue(lenient)` 缺字段提示回写 Issue
- [x] 3.2 重复 `/spec` 生成新版本，旧 Spec 标 `superseded` 并指向新 id
- [x] 3.3 单测覆盖超时、解析失败、重复调用场景

## 4. 集成与校验

- [x] 4.1 集成测试：伪造 Issue webhook + fake LLM 验证 `/spec` 端到端
- [x] 4.2 通过 `openspec validate issueos-spec-command`
- [x] 4.3 README 增补：`/spec` 用法、LLM 密钥配置、降级行为