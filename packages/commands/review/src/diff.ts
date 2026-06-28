export type ReviewTargetType = 'pr' | 'spec' | 'plan' | 'task';

export interface ReviewTarget {
  type: ReviewTargetType;
  id: string;
  content: string;
}

export interface OctokitPull {
  number: number;
  head: { sha: string };
}

const MAX_DIFF_CHARS = 100_000;
const CHUNK_WARN_THRESHOLD = 20_000;

export function chunkDiff(content: string): { body: string; truncated: boolean } {
  if (content.length <= CHUNK_WARN_THRESHOLD) {
    return { body: content, truncated: false };
  }
  if (content.length > MAX_DIFF_CHARS) {
    const truncated = content.slice(0, MAX_DIFF_CHARS);
    return { body: truncated + '\n\n... [diff truncated at 100,000 chars]', truncated: true };
  }
  return { body: content, truncated: false };
}

export async function resolveTarget(
  body: string,
  octokit: any,
  repository: any,
  owner: string,
  repo: string,
): Promise<{ target: ReviewTarget | null; error?: string }> {
  const parts = body.split(/\s+/);
  const hint = parts.length > 1 ? parts[1].trim() : null;

  if (!hint) {
    // Walk issue for PR references
    try {
      const { data: issue } = await octokit.rest.issues.get({ owner, repo, issue_number: 1 });
      const prMatch = issue.body?.match(/#(\d+)/);
      if (prMatch) {
        return resolvePr(octokit, owner, repo, parseInt(prMatch[1]));
      }
    } catch {}
    return { target: null, error: '> No target specified. Use `/review <pr-number>` or `/review <spec|plan|task>-<id>`.' };
  }

  const prNum = parseInt(hint);
  if (!isNaN(prNum)) {
    return resolvePr(octokit, owner, repo, prNum);
  }

  // spec-xxx, plan-xxx, task-xxx
  const parts2 = hint.split('-');
  if (parts2.length >= 2) {
    const type = parts2[0] as ReviewTargetType;
    const id = parts2.slice(1).join('-');
    if (['spec', 'plan', 'task'].includes(type)) {
      const obj = repository.get(id);
      if (!obj) {
        return { target: null, error: `> ${type} with id '${id}' not found.` };
      }
      return {
        target: { type, id, content: obj.content ?? '{}' },
      };
    }
  }

  return { target: null, error: `> Unknown target '${hint}'. Use a PR number or <spec|plan|task>-<id>.` };
}

async function resolvePr(
  octokit: any,
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<{ target: ReviewTarget | null; error?: string }> {
  try {
    const { data: pr } = await octokit.rest.pulls.get({ owner, repo, pull_number: pullNumber });
    const { data: files } = await octokit.rest.pulls.listFiles({ owner, repo, pull_number: pullNumber });
    const diffBody = files
      .map((f: any) => {
        const header = `--- ${f.filename} (${f.status})`;
        const patch = f.patch ?? '(binary file)';
        return `${header}\n${patch}`;
      })
      .join('\n\n');
    return {
      target: {
        type: 'pr',
        id: `${pullNumber}`,
        content: diffBody || '(empty diff)',
      },
    };
  } catch (err: any) {
    return { target: null, error: `> Could not fetch PR #${pullNumber}. Ensure it exists and is accessible.` };
  }
}
