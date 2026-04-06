import fs from 'node:fs';
import path from 'node:path';
import { PATHS, generateId, timestamp } from '@ea-workbench/shared-schema';
import type { FormSchemaDefinition, FormSchemaMeta, FormSubmission } from '../schemas.js';

const INDEX_FILE = '_index.json';
const FORM_SUFFIX = '.form.json';
const SUBMISSIONS_SUFFIX = '.submissions.jsonl';

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

interface ListSubmissionsOptions {
  limit?: number;
  before?: string;
}

interface CreateOptions {
  description?: string;
  jsonSchema?: Record<string, unknown>;
  uiSchema?: Record<string, unknown>;
}

interface UpdateOptions {
  title?: string;
  description?: string;
  jsonSchema: Record<string, unknown>;
  uiSchema: Record<string, unknown>;
}

const DEFAULT_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {},
};

const DEFAULT_UI_SCHEMA: Record<string, unknown> = {
  type: 'VerticalLayout',
  elements: [],
};

/**
 * File-backed store for JSON Forms schemas and their submissions.
 *
 * Layout under `{workspace}/architecture/json-forms/`:
 *   _index.json                 — array of FormSchemaMeta
 *   {id}.form.json              — { jsonSchema, uiSchema }
 *   {id}.submissions.jsonl      — append-only FormSubmission lines
 *
 * Hardening over the editor-core pattern:
 *   - All index/sidecar writes go through writeFileAtomic (temp + rename).
 *   - Constructor reconciles the index against on-disk sidecar files so
 *     partial-failure orphans don't turn into silent data loss.
 */
export class FormStore {
  private readonly baseDir: string;
  private reconciled = false;

  constructor(workspacePath: string) {
    this.baseDir = path.join(workspacePath, PATHS.JSON_FORMS_DIR);
    this.ensureDir();
    this.reconcile();
  }

  // ---------- paths ----------

  private ensureDir(): void {
    fs.mkdirSync(this.baseDir, { recursive: true });
  }

  private indexPath(): string {
    return path.join(this.baseDir, INDEX_FILE);
  }

  private formPath(id: string): string {
    return path.join(this.baseDir, `${id}${FORM_SUFFIX}`);
  }

  private submissionsPath(id: string): string {
    return path.join(this.baseDir, `${id}${SUBMISSIONS_SUFFIX}`);
  }

  // ---------- atomic writes ----------

  private writeFileAtomic(target: string, contents: string): void {
    const tmp = `${target}.tmp-${process.pid}-${Math.random().toString(36).slice(2)}`;
    const fd = fs.openSync(tmp, 'w');
    try {
      fs.writeFileSync(fd, contents, 'utf-8');
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(tmp, target);
  }

  // ---------- index I/O ----------

  private readIndexRaw(): FormSchemaMeta[] {
    const p = this.indexPath();
    if (!fs.existsSync(p)) return [];
    try {
      const parsed = JSON.parse(fs.readFileSync(p, 'utf-8'));
      return Array.isArray(parsed) ? (parsed as FormSchemaMeta[]) : [];
    } catch {
      // Corrupt index — treat as empty; reconcile() will rebuild from sidecars.
      return [];
    }
  }

  private writeIndex(metas: FormSchemaMeta[]): void {
    this.writeFileAtomic(this.indexPath(), JSON.stringify(metas, null, 2));
  }

  // ---------- reconciliation ----------

  private reconcile(): void {
    if (this.reconciled) return;

    const onDisk = fs
      .readdirSync(this.baseDir)
      .filter((f) => f.endsWith(FORM_SUFFIX))
      .map((f) => f.slice(0, -FORM_SUFFIX.length));
    const onDiskSet = new Set(onDisk);

    const index = this.readIndexRaw();
    const indexById = new Map(index.map((m) => [m.id, m] as const));

    let changed = false;
    const repaired: FormSchemaMeta[] = [];

    // Drop dangling index entries (no sidecar on disk).
    for (const meta of index) {
      if (onDiskSet.has(meta.id)) {
        repaired.push(meta);
      } else {
        changed = true;
        // eslint-disable-next-line no-console
        console.warn(`[json-forms] dropping index entry "${meta.id}" — sidecar file missing`);
      }
    }

    // Re-attach orphan sidecars (file on disk, no index entry).
    for (const id of onDisk) {
      if (!indexById.has(id)) {
        const stat = fs.statSync(this.formPath(id));
        const iso = new Date(stat.mtimeMs).toISOString();
        repaired.push({
          id,
          title: id,
          createdAt: iso,
          updatedAt: iso,
        });
        changed = true;
        // eslint-disable-next-line no-console
        console.warn(`[json-forms] re-attaching orphan sidecar "${id}" to index`);
      }
    }

    // Log orphan submission logs (no matching form). Never auto-delete.
    for (const f of fs.readdirSync(this.baseDir)) {
      if (!f.endsWith(SUBMISSIONS_SUFFIX)) continue;
      const id = f.slice(0, -SUBMISSIONS_SUFFIX.length);
      if (!onDiskSet.has(id)) {
        // eslint-disable-next-line no-console
        console.warn(
          `[json-forms] orphan submissions log "${f}" has no matching schema (left in place)`,
        );
      }
    }

    if (changed) {
      this.writeIndex(repaired);
    }

    this.reconciled = true;
  }

  // ---------- public API: schemas ----------

  listSchemas(): FormSchemaMeta[] {
    return this.readIndexRaw();
  }

  getSchema(id: string): FormSchemaDefinition {
    const meta = this.readIndexRaw().find((m) => m.id === id);
    if (!meta) throw new NotFoundError(`Form schema not found: ${id}`);
    const formFile = this.formPath(id);
    if (!fs.existsSync(formFile)) {
      throw new NotFoundError(`Form schema body missing on disk: ${id}`);
    }
    const body = JSON.parse(fs.readFileSync(formFile, 'utf-8')) as {
      jsonSchema: Record<string, unknown>;
      uiSchema: Record<string, unknown>;
    };
    return {
      meta,
      jsonSchema: body.jsonSchema,
      uiSchema: body.uiSchema,
    };
  }

  createSchema(title: string, opts: CreateOptions = {}): FormSchemaMeta {
    const id = generateId();
    const now = timestamp();
    const meta: FormSchemaMeta = {
      id,
      title,
      ...(opts.description ? { description: opts.description } : {}),
      createdAt: now,
      updatedAt: now,
    };
    const body = {
      jsonSchema: opts.jsonSchema ?? DEFAULT_JSON_SCHEMA,
      uiSchema: opts.uiSchema ?? DEFAULT_UI_SCHEMA,
    };

    // Sidecar first; if the index update fails, clean up the sidecar so
    // reconcile() doesn't turn it into an orphaned synthetic entry.
    this.writeFileAtomic(this.formPath(id), JSON.stringify(body, null, 2));
    try {
      const index = this.readIndexRaw();
      index.push(meta);
      this.writeIndex(index);
    } catch (err) {
      try {
        fs.unlinkSync(this.formPath(id));
      } catch {
        // best effort
      }
      throw err;
    }
    return meta;
  }

  updateSchema(id: string, opts: UpdateOptions): FormSchemaMeta {
    const index = this.readIndexRaw();
    const meta = index.find((m) => m.id === id);
    if (!meta) throw new NotFoundError(`Form schema not found: ${id}`);

    const body = {
      jsonSchema: opts.jsonSchema,
      uiSchema: opts.uiSchema,
    };
    this.writeFileAtomic(this.formPath(id), JSON.stringify(body, null, 2));

    meta.updatedAt = timestamp();
    if (opts.title !== undefined) meta.title = opts.title;
    if (opts.description !== undefined) meta.description = opts.description;
    this.writeIndex(index);
    return meta;
  }

  deleteSchema(id: string): void {
    // Index first: a partial failure leaves at most an orphan sidecar that
    // reconcile() will pick up on next start as a recoverable entry.
    const index = this.readIndexRaw();
    const next = index.filter((m) => m.id !== id);
    if (next.length !== index.length) {
      this.writeIndex(next);
    }
    for (const p of [this.formPath(id), this.submissionsPath(id)]) {
      if (fs.existsSync(p)) {
        try {
          fs.unlinkSync(p);
        } catch {
          // best effort
        }
      }
    }
  }

  // ---------- public API: submissions ----------

  appendSubmission(schemaId: string, data: unknown): FormSubmission {
    // Confirm the schema still exists.
    const meta = this.readIndexRaw().find((m) => m.id === schemaId);
    if (!meta) throw new NotFoundError(`Form schema not found: ${schemaId}`);

    const submission: FormSubmission = {
      id: generateId(),
      schemaId,
      data,
      submittedAt: timestamp(),
    };
    fs.appendFileSync(this.submissionsPath(schemaId), JSON.stringify(submission) + '\n', 'utf-8');
    return submission;
  }

  /**
   * Bounded read of recent submissions. Walks the JSONL file backward in
   * 64KB chunks and stops as soon as `limit` records have been collected,
   * so the full log is never loaded into memory.
   */
  listSubmissions(
    schemaId: string,
    { limit = 20, before }: ListSubmissionsOptions = {},
  ): FormSubmission[] {
    const filePath = this.submissionsPath(schemaId);
    if (!fs.existsSync(filePath)) return [];

    const cap = Math.max(1, Math.min(100, limit));
    const fd = fs.openSync(filePath, 'r');
    try {
      const stat = fs.fstatSync(fd);
      let pos = stat.size;
      const chunkSize = 64 * 1024;
      let buffer = '';
      const found: FormSubmission[] = [];

      while (pos > 0 && found.length < cap) {
        const readSize = Math.min(chunkSize, pos);
        pos -= readSize;
        const chunk = Buffer.alloc(readSize);
        fs.readSync(fd, chunk, 0, readSize, pos);
        buffer = chunk.toString('utf-8') + buffer;

        // Process complete lines from the end of the buffer; keep the head
        // (which may be a partial line) for the next iteration.
        let newlineIdx = buffer.lastIndexOf('\n');
        while (newlineIdx !== -1 && found.length < cap) {
          const line = buffer.slice(newlineIdx + 1).trim();
          buffer = buffer.slice(0, newlineIdx);
          if (line.length > 0) {
            try {
              const parsed = JSON.parse(line) as FormSubmission;
              if (!before || parsed.submittedAt < before) {
                found.push(parsed);
              }
            } catch {
              // skip malformed line
            }
          }
          newlineIdx = buffer.lastIndexOf('\n');
        }

        // If we've consumed the whole file, the remaining buffer is the
        // first line.
        if (pos === 0 && found.length < cap && buffer.length > 0) {
          const line = buffer.trim();
          if (line.length > 0) {
            try {
              const parsed = JSON.parse(line) as FormSubmission;
              if (!before || parsed.submittedAt < before) {
                found.push(parsed);
              }
            } catch {
              // skip
            }
          }
        }
      }

      return found;
    } finally {
      fs.closeSync(fd);
    }
  }
}
