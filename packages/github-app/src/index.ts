import type { Probot } from 'probot';
import { registerSpecCommand } from '@issueos/commands-spec';
import { registerPlanCommand } from '@issueos/commands-plan';
import { registerTaskCommand } from '@issueos/commands-task';

export type Command = '/spec' | '/plan' | '/task' | '/review';

export interface CommandContext {
  octokit: any;
  issue: { owner: string; repo: string; issue_number: number; body: string };
  parseIssue: typeof import('@issueos/issue-dsl').parseIssue;
  repository: import('@issueos/storage').Repository<any>;
  issueId: string;
  projectId: string;
  logger: any;
}

export type HandlerResult = { reply: string; persist?: any };

export interface CommandHandler {
  command: Command;
  run(ctx: CommandContext): Promise<HandlerResult>;
}

const handlers = new Map<Command, CommandHandler>();

export function registerCommand(handler: CommandHandler): void {
  handlers.set(handler.command, handler);
}

export function getRegisteredCommands(): Map<Command, CommandHandler> {
  return handlers;
}

const COMMAND_SET = new Set<Command>(['/spec', '/plan', '/task', '/review']);

export function parseCommand(body: string): Command | null {
  const trimmed = body.trim();
  if (!trimmed) return null;
  const firstToken = trimmed.split(/\s+/)[0];
  if (COMMAND_SET.has(firstToken as Command)) {
    return firstToken as Command;
  }
  return null;
}

export function isAllowedRepo(owner: string, repo: string): boolean {
  const allowRepos = process.env.ALLOW_REPOS;
  if (!allowRepos) return false;
  const entries = allowRepos.split(',').map(s => s.trim()).filter(Boolean);
  if (entries.includes('*')) return true;
  return entries.includes(`${owner}/${repo}`);
}

export function requireEnv(): void {
  const required = ['APP_ID', 'PRIVATE_KEY', 'WEBHOOK_SECRET'] as const;
  const missing: string[] = [];
  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }
}

export interface AppConfig {
  appId: string;
  privateKey: string;
  webhookSecret: string;
}

export function loadConfig(): AppConfig {
  requireEnv();
  return {
    appId: process.env.APP_ID!,
    privateKey: process.env.PRIVATE_KEY!,
    webhookSecret: process.env.WEBHOOK_SECRET!,
  };
}

export const ENV_DOCS = `
环境变量:
  APP_ID (必填)         GitHub App 的 App ID
  PRIVATE_KEY (必填)     GitHub App 的私钥（PEM 格式）
  WEBHOOK_SECRET (必填)  GitHub App 的 Webhook Secret
  ALLOW_REPOS (可选)     允许的仓库列表 (owner/repo,owner/repo)，设为 * 允许所有仓库
  PORT (可选)            监听端口，默认 3000
  HOST (可选)            监听地址，默认 localhost
  CLIENT_SECRET (可选)   GitHub App 的 Client Secret
`;

const ALL_COMMANDS: Command[] = ['/spec', '/plan', '/task', '/review'];

export default function (app: Probot) {
  // Register real command handlers before placeholder fallback
  registerSpecCommand();
  registerPlanCommand();
  registerTaskCommand();

  for (const cmd of ALL_COMMANDS) {
    if (!handlers.has(cmd)) {
      registerCommand({
        command: cmd,
        async run(ctx: CommandContext): Promise<HandlerResult> {
          ctx.logger.info({ command: cmd }, 'Placeholder handler invoked');
          return { reply: `> ${cmd} 尚未实现` };
        },
      });
    }
  }

  app.on('issues.opened', handleWebhook);
  app.on('issues.edited', handleWebhook);
  app.on('issue_comment.created', handleWebhook);

  async function handleWebhook(context: any) {
    const { octokit, payload, log } = context;
    const owner = payload.repository.owner.login;
    const repoName = payload.repository.name;

    if (!isAllowedRepo(owner, repoName)) {
      log.warn({ owner, repo: repoName }, 'Repository not allowed');
      return;
    }

    const issue = payload.issue;
    const body = (issue.body || '').trim();
    const command = parseCommand(body);

    if (!command) {
      const help = `支持的命令: ${ALL_COMMANDS.join(', ')}`;
      await octokit.rest.issues.createComment({
        owner,
        repo: repoName,
        issue_number: issue.number,
        body: help,
      });
      return;
    }

    const handler = handlers.get(command);
    if (!handler) {
      log.warn({ command }, 'No handler registered for command');
      return;
    }

    const issueId = `${issue.id}`;
    const projectId = `${payload.repository.id}`;

    const ctx: CommandContext = {
      octokit,
      issue: { owner, repo: repoName, issue_number: issue.number, body },
      parseIssue: (await import('@issueos/issue-dsl')).parseIssue,
      repository: { get() { return undefined; }, put() {}, query() { return []; } },
      issueId,
      projectId,
      logger: log,
    };

    try {
      const result = await handler.run(ctx);
      await octokit.rest.issues.createComment({
        owner,
        repo: repoName,
        issue_number: issue.number,
        body: result.reply,
      });
    } catch (err: any) {
      log.error({ err, command }, 'Handler error');
    }
  }
}
