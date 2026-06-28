## Context

基座提供了 Issue DSL 解析与命令路由占位。本 change 把 Issue Parser 的「生成 Spec」一侧实现为真实 `/spec` 命令。关键未知项：LLM 提供方、提示策略、稳定性与可重放性、Issue 中回复格式。

## Goals / Non-Goals

**Goals:**
- `/spec` 在 Issue 评论后回复结构化 Spec（含全部 DSL 字段）。
- Spec 通过 `Repository` 持久化并带 provenance，可被 `/plan` 消费。
- LLM 失败时降级为可执行补充提示，不破坏 Issue 体验。

**Non-Goals:**
- 不做 Plan/Task/Review。
- 不自定义训练模型；用通用 LLM。
- 不保证 100% 字段稳定（接受 LLM 抖动，靠后置校验+降级兜底）。

## Decisions

- **D1 LLM 提供方**：定义 `LlmClient` 接口，默认实现一个 provider（倾向 Anthropic Claude，与 CLAUDE.md 一致），design 中定稿；通过 env 切换。
- **D2 提示策略**：单轮结构化抽取提示 + 输出 schema 约束（要求 JSON/分块 Markdown，便于解析）。提供 few-shot 示例。
- **D3 输出格式化**：Issue 回复采用固定 Markdown 模板（含 `<details>` 折叠原始字段、provenance 引用 Issue 链接）。
- **D4 降级路径**：LLM 超时/解析失败 → 以 `parseIssue(lenient)` 的字段提示回写 Issue，邀请用户补充关键字段后再次 `/spec`。
- **D5 不变性**：对同一 Spec 幂等——重复 `/spec` 生成新 `version`/`superseded` 关系而非覆盖。
- **D6 为 `/plan` 留接口**：暴露 `generateSpec(issue): Promise<Spec>`，供后续命令与测试复用。

## Risks / Trade-offs

- [LLM 输出不稳定导致字段缺失] → schema 约束 + 后置校验 + 降级提示。
- [提示随模型升级漂移] → 提示与示例版本化在 `prompts/` 目录。
- [API 成本/密钥泄露] → 密钥仅从 env 读；日志不记录完整 prompt 中的私内容。
- [Issue 评论权限] → 仅在 App 安装的仓库回复；沿用基座鉴权。

## Open Questions

- 默认 provider（Anthropic vs OpenAI）——design 定稿。
- 是否持久化原始 LLM 原文用于重放——MVP 可仅存最终 Spec。
- Spec 版本化粒度（每次 `/spec` 一版）。

## Migration Plan

- 新功能，无迁移。失败时基座占位 handler 仍可兜底（保留「未实现」回退由 error path 接管）。回滚=禁用 handler 注册。