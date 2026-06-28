import { z } from 'zod';
import { newId as _newId, makeProvenance as _makeProvenance } from '@issueos/domain';

export const IssueSchema = z.object({
  title: z.string().min(1, 'title is required'),
  background: z.string().optional(),
  goal: z.string().min(1, 'goal is required'),
  scope: z.array(z.string()).min(1, 'scope must have at least one item'),
  out_of_scope: z.array(z.string()).optional(),
  acceptance: z.array(z.string()).min(1, 'acceptance must have at least one item'),
  risk: z.string().optional(),
  rollback: z.string().optional(),
});

export type ParsedIssue = z.infer<typeof IssueSchema>;

type StrictOk = { ok: true; issue: ParsedIssue };
type StrictErr = { ok: false; errors: string[] };
type LenientOk = { ok: true; issue: Partial<ParsedIssue>; prompts: string[] };
type LenientErr = { ok: false; errors: string[] };

export function parseIssue(
  text: string,
  mode: 'strict',
): StrictOk | StrictErr;
export function parseIssue(
  text: string,
  mode: 'lenient',
): LenientOk | LenientErr;
export function parseIssue(
  text: string,
  mode: 'strict' | 'lenient',
): StrictOk | StrictErr | LenientOk | LenientErr {
  const form = detectForm(text);

  if (form === 'unknown') {
    return { ok: false, errors: ['无法识别 Issue 格式：请使用 --- 包裹的前置元数据块或 key: value 行格式'] } as StrictErr | LenientErr;
  }

  let rawFields: Record<string, string>;
  let backgroundSuffix = '';

  if (form === 'frontmatter') {
    const lines = text.split('\n');
    const endIndex = lines.findIndex((line, i) => i > 0 && line.trim() === '---');
    if (endIndex === -1) {
      return { ok: false, errors: ['前置元数据块未闭合：缺少结束 ---'] } as StrictErr | LenientErr;
    }
    rawFields = parseKeyValueLines(lines.slice(1, endIndex));
    backgroundSuffix = lines.slice(endIndex + 1).join('\n').trim();
  } else {
    rawFields = parseKeyValueLines(text.split('\n'));
  }

  const parsed: Record<string, unknown> = {};

  if (rawFields['title']) parsed['title'] = rawFields['title'];
  if (rawFields['goal']) parsed['goal'] = rawFields['goal'];
  if (rawFields['risk']) parsed['risk'] = rawFields['risk'];
  if (rawFields['rollback']) parsed['rollback'] = rawFields['rollback'];

  if (rawFields['background']) {
    parsed['background'] = rawFields['background'];
  } else if (backgroundSuffix) {
    parsed['background'] = backgroundSuffix;
  }

  const scopeArr = parseArray(rawFields['scope']);
  if (scopeArr) parsed['scope'] = scopeArr;

  const outOfScopeArr = parseArray(rawFields['out_of_scope']);
  if (outOfScopeArr) parsed['out_of_scope'] = outOfScopeArr;

  const acceptanceArr = parseArray(rawFields['acceptance']);
  if (acceptanceArr) parsed['acceptance'] = acceptanceArr;

  if (mode === 'strict') {
    const result = IssueSchema.safeParse(parsed);
    if (!result.success) {
      const errors = result.error.issues.map(
        issue => `${issue.path.join('.')}: ${issue.message}`,
      );
      return { ok: false, errors };
    }
    return { ok: true, issue: result.data };
  }

  const prompts: string[] = [];
  if (!rawFields['goal']) prompts.push('缺少 goal（目标）');
  if (!rawFields['scope']) prompts.push('缺少 scope（范围）');
  if (!rawFields['acceptance']) prompts.push('缺少 acceptance（验收标准）');

  return { ok: true, issue: parsed as Partial<ParsedIssue>, prompts };
}

export function validateIssue(
  issue: unknown,
): { ok: boolean; errors?: string[]; issue?: ParsedIssue } {
  const result = IssueSchema.safeParse(issue);
  if (result.success) {
    return { ok: true, issue: result.data };
  }
  return {
    ok: false,
    errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
  };
}

export { _newId as newId, _makeProvenance as makeProvenance };

function detectForm(text: string): 'frontmatter' | 'keyvalue' | 'unknown' {
  const trimmed = text.trimStart();
  if (trimmed.startsWith('---')) {
    return 'frontmatter';
  }
  for (const line of text.split('\n')) {
    if (/^\s*[a-zA-Z_\u4e00-\u9fff][a-zA-Z0-9_\-\s\u4e00-\u9fff]*\s*:/.test(line)) {
      return 'keyvalue';
    }
  }
  return 'unknown';
}

function parseKeyValueLines(lines: string[]): Record<string, string> {
  const data: Record<string, string> = {};
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const key = normalizeKey(line.slice(0, colonIndex));
    const value = line.slice(colonIndex + 1).trim();
    if (key && value) {
      data[key] = value;
    }
  }
  return data;
}

function normalizeKey(raw: string): string {
  let key = raw.trim().toLowerCase();
  key = key.replace(/[- ]/g, '_');
  return key;
}

function parseArray(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  return value
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}
