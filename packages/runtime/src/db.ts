import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { PATHS } from '@ea-workbench/shared-schema';

let db: DatabaseSync | null = null;

export function getDb(workspacePath: string): DatabaseSync {
  if (db) return db;

  const dbPath = path.join(workspacePath, PATHS.INDEX_DIR, 'workbench.db');
  db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      tool_id TEXT NOT NULL,
      action TEXT NOT NULL,
      artifact_id TEXT,
      detail TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_audit_tool ON audit_log(tool_id);
    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
  `);

  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function auditLog(
  workspacePath: string,
  toolId: string,
  action: string,
  artifactId?: string,
  detail?: string,
): void {
  const database = getDb(workspacePath);
  const stmt = database.prepare(
    'INSERT INTO audit_log (timestamp, tool_id, action, artifact_id, detail) VALUES (?, ?, ?, ?, ?)',
  );
  stmt.run(new Date().toISOString(), toolId, action, artifactId ?? null, detail ?? null);
}

export function getAuditLog(
  workspacePath: string,
  limit: number = 50,
): Array<{
  id: number;
  timestamp: string;
  tool_id: string;
  action: string;
  artifact_id: string | null;
  detail: string | null;
}> {
  const database = getDb(workspacePath);
  const stmt = database.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT ?');
  return stmt.all(limit) as Array<{
    id: number;
    timestamp: string;
    tool_id: string;
    action: string;
    artifact_id: string | null;
    detail: string | null;
  }>;
}
