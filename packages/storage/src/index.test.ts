import { describe, it, expect, afterAll } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rmSync } from 'node:fs';
import {
  InMemoryRepository,
  SqliteRepository,
  type Repository,
} from './index.js';

// ── test helpers ──────────────────────────────────────────

interface TestItem {
  id: string;
  projectId: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

function makeItem(
  id: string,
  projectId: string,
  name: string,
): TestItem {
  return { id, projectId, name };
}

// ── InMemoryRepository ────────────────────────────────────

describe('InMemoryRepository', () => {
  it('保存与读取：put 后 get 返回相同对象', () => {
    const repo: Repository<TestItem> = new InMemoryRepository();
    const item = makeItem('a1', 'p1', 'alpha');
    repo.put(item);
    expect(repo.get('a1')).toEqual(item);
  });

  it('按项目查询：query 只返回对应 projectId 的对象', () => {
    const repo: Repository<TestItem> = new InMemoryRepository();
    repo.put(makeItem('a1', 'p1', 'alpha'));
    repo.put(makeItem('a2', 'p1', 'beta'));
    repo.put(makeItem('b1', 'p2', 'gamma'));

    const p1Items = repo.query('p1');
    expect(p1Items).toHaveLength(2);
    expect(p1Items.map((i) => i.id).sort()).toEqual(['a1', 'a2']);

    const p2Items = repo.query('p2');
    expect(p2Items).toHaveLength(1);
    expect(p2Items[0].id).toBe('b1');
  });

  it('更新时保留 id', () => {
    const repo: Repository<TestItem> = new InMemoryRepository();
    repo.put(makeItem('x', 'p1', 'original'));
    repo.put({ id: 'x', projectId: 'p1', name: 'updated' });
    expect(repo.get('x')?.name).toBe('updated');
    expect(repo.get('x')?.id).toBe('x');
  });
});

// ── SqliteRepository ──────────────────────────────────────

let sqliteAvailable = false;
try {
  // 尝试预先检测 node:sqlite 可用性
  const { createRequire } = await import('node:module');
  const _r = createRequire(import.meta.url);
  _r('node:sqlite');
  sqliteAvailable = true;
} catch {
  sqliteAvailable = false;
}

const tmpDir = mkdtempSync(join(tmpdir(), 'issueos-storage-test-'));
const dbFiles: string[] = [];

afterAll(() => {
  for (const f of dbFiles) {
    try {
      rmSync(f);
    } catch {
      // 文件可能已被删除
    }
  }
  try {
    rmSync(tmpDir, { recursive: true });
  } catch {
    // 忽略清理失败
  }
});

function tempDbPath(): string {
  const p = join(tmpDir, `test-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);
  dbFiles.push(p);
  return p;
}

const sqliteSuite = describe('SqliteRepository', () => {
  if (!sqliteAvailable) {
    it('跳过 SqliteRepository 测试——无 node:sqlite 支持', () => {
      expect(() => new SqliteRepository(':memory:')).toThrow();
    });
  } else {
    it('基本 round-trip：put 后 get 返回相同字段', () => {
      const repo = new SqliteRepository<TestItem>(tempDbPath());
      const item = makeItem('r1', 'proj-r', 'roundtrip');
      repo.put(item);
      const got = repo.get('r1');
      expect(got).toEqual(item);
      repo.close();
    });

    it('按项目查询过滤', () => {
      const repo = new SqliteRepository<TestItem>(tempDbPath());
      repo.put(makeItem('q1', 'pa', 'apple'));
      repo.put(makeItem('q2', 'pa', 'banana'));
      repo.put(makeItem('q3', 'pb', 'cherry'));

      const paItems = repo.query('pa');
      expect(paItems).toHaveLength(2);
      expect(paItems.map((i) => i.id).sort()).toEqual(['q1', 'q2']);

      const pbItems = repo.query('pb');
      expect(pbItems).toHaveLength(1);
      expect(pbItems[0].id).toBe('q3');

      repo.close();
    });

    it('跨实例持久化：创建数据库、写入、关闭、重新打开、读取', () => {
      const dbPath = tempDbPath();

      // 第一次实例
      const repo1 = new SqliteRepository<TestItem>(dbPath);
      repo1.put(makeItem('c1', 'pc', 'persist'));
      repo1.put(makeItem('c2', 'pc', 'test'));
      repo1.close();

      // 第二次实例，同文件
      const repo2 = new SqliteRepository<TestItem>(dbPath);
      const got1 = repo2.get('c1');
      expect(got1).toEqual(makeItem('c1', 'pc', 'persist'));
      const got2 = repo2.get('c2');
      expect(got2).toEqual(makeItem('c2', 'pc', 'test'));
      repo2.close();
    });

    it('查询不存在的 id 返回 undefined', () => {
      const repo = new SqliteRepository<TestItem>(tempDbPath());
      expect(repo.get('nonexistent')).toBeUndefined();
      repo.close();
    });
  }
});
