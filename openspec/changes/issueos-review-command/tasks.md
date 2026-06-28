## 1. Review 采集

- [ ] 1.1 在 `src/commands/review/` 实现 handler，注册到命令路由
- [ ] 1.2 经 Octokit 取 PR diff；支持 `/review <pr-number>` 显式与默认关联 PR 回退
- [ ] 1.3 大 diff 分文件/分块摘要，超阈值标注「未完整评估」
- [ ] 1.4 可选关联上游 spec/plan/task 产物（不强制）

## 2. 分维度审查与 Risk Score

- [ ] 2.1 编写 5 维度分块提示（`prompts/review/*.md`：测试/规范/安全/性能/架构）
- [ ] 2.2 实现每维 0-100 子分；加权算 Risk Score（安全权重最高，design 定稿权重与分档）
- [ ] 2.3 输出 Markdown 报告（分维度项 + Risk Score + 分档 + provenance）
- [ ] 2.4 持久化 Review（`targetType/targetId/riskScore/dimensions/provenance`）

## 3. 降级与幂等

- [ ] 3.1 无 PR→提示；LLM 超时→已评估维度保留，剩余标「未评估」
- [ ] 3.2 重复 `/review` 同目标，新版本 Review，旧标 superseded
- [ ] 3.3 单测覆盖无 PR、超大 diff、超时、重复调用

## 4. 集成与校验

- [ ] 4.1 集成测试：伪造 PR diff + fake LLM 验证 `/review` 端到端
- [ ] 4.2 通过 `openspec validate issueos-review-command`
- [ ] 4.3 README 增补 `/review` 用法、Risk Score 口径、免责声明