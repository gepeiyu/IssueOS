## 1. LLM 抽象层

- [ ] 1.1 在 `src/llm/` 定义 `LlmClient` 接口（`generate(messages, schema?)`）
- [ ] 1.2 实现默认 provider（design 定稿，env `LLM_PROVIDER`/`*_API_KEY` 切换）
- [ ] 1.3 密钥仅从 env 读；单测用 fake provider

## 2. Spec 生成

- [ ] 2.1 在 `src/commands/spec/` 实现 handler，注册到基座命令路由
- [ ] 2.2 编写结构化抽取提示与 few-shot 示例（`prompts/spec/*.md`）
- [ ] 2.3 实现 Issue→LLM→Spec schema 的解析与后置校验
- [ ] 2.4 输出 Markdown 回复模板（DSL 字段 + `<details>` 原文 + provenance）
- [ ] 2.5 通过 `Repository` 持久化 Spec；带 `id/provenance`

## 3. 降级与幂等

- [ ] 3.1 超时/解析失败降级：用 `parseIssue(lenient)` 缺字段提示回写 Issue
- [ ] 3.2 重复 `/spec` 生成新版本，旧 Spec 标 `superseded` 并指向新 id
- [ ] 3.3 单测覆盖超时、解析失败、重复调用场景

## 4. 集成与校验

- [ ] 4.1 集成测试：伪造 Issue webhook + fake LLM 验证 `/spec` 端到端
- [ ] 4.2 通过 `openspec validate issueos-spec-command`
- [ ] 4.3 README 增补：`/spec` 用法、LLM 密钥配置、降级行为