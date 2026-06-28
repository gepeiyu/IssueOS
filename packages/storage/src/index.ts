import { createRequire } from 'node:module';

const _require = createRequire(import.meta.url);

function tryGetDatabaseSync(): (new (...args: any[]) => any) | null {
  try {
    return _require('node:sqlite').DatabaseSync;
  } catch {
    return null;
  }
}

const DatabaseSync = tryGetDatabaseSync();

export interface Repository<T extends { id: string; projectId: string }> {
  get(id: string): T | undefined;
  put(item: T): void;
  query(byProject: string): T[];
}

export class InMemoryRepository<T extends { id: string; projectId: string }>
  implements Repository<T>
{
  private store = new Map<string, T>();

  get(id: string): T | undefined {
    return this.store.get(id);
  }

  put(item: T): void {
    this.store.set(item.id, item);
  }

  query(byProject: string): T[] {
    const results: T[] = [];
    for (const item of this.store.values()) {
      if (item.projectId === byProject) {
        results.push(item);
      }
    }
    return results;
  }
}

interface SqliteRow {
  id: string;
  project_id: string;
  kind: string;
  data: string;
  created_at: string | null;
  updated_at: string | null;
}

function deriveKind<T>(item: T): string {
  const ctor = (item as any)?.constructor;
  if (ctor?.name && ctor.name !== 'Object') {
    return ctor.name;
  }
  return 'unknown';
}

const UNAVAILABLE_MSG =
  'SqliteRepository 需要 Node 22+，并带上 --experimental-sqlite 标志运行。';

export class SqliteRepository<T extends { id: string; projectId: string }> {
  private db: any;
  private kind: string;

  constructor(dbPath: string, kind?: string) {
    if (!DatabaseSync) {
      throw new Error(UNAVAILABLE_MSG);
    }
    this.db = new DatabaseSync(dbPath);
    this.kind = kind ?? '';
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS objects (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT,
        updated_at TEXT
      )
    `);
  }

  get(id: string): T | undefined {
    if (!DatabaseSync) throw new Error(UNAVAILABLE_MSG);
    const stmt = this.db.prepare('SELECT * FROM objects WHERE id = ?');
    const row = stmt.get(id) as SqliteRow | undefined;
    if (!row) return undefined;
    return JSON.parse(row.data) as T;
  }

  put(item: T): void {
    if (!DatabaseSync) throw new Error(UNAVAILABLE_MSG);
    const kindLabel = this.kind || deriveKind(item);
    const data = JSON.stringify(item);
    const itemAny = item as any;
    const createdAt = itemAny.createdAt ?? null;
    const updatedAt = itemAny.updatedAt ?? null;

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO objects (id, project_id, kind, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(item.id, item.projectId, kindLabel, data, createdAt, updatedAt);
  }

  query(byProject: string): T[] {
    if (!DatabaseSync) throw new Error(UNAVAILABLE_MSG);
    const stmt = this.db.prepare(
      'SELECT * FROM objects WHERE project_id = ?',
    );
    const rows = stmt.all(byProject) as SqliteRow[];
    return rows.map((r) => JSON.parse(r.data) as T);
  }

  close(): void {
    if (!this.db) return;
    this.db.close();
  }
}
