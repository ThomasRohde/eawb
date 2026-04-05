import fs from 'node:fs';
import path from 'node:path';
import { PATHS, generateId, timestamp } from '@ea-workbench/shared-schema';
import type { MarkdownDoc } from './schemas.js';

const INDEX_FILE = '_index.json';

export class DocumentStore {
  private readonly baseDir: string;

  constructor(workspacePath: string) {
    this.baseDir = path.join(workspacePath, PATHS.MARKDOWN_DIR);
  }

  private ensureDir(): void {
    fs.mkdirSync(this.baseDir, { recursive: true });
  }

  private indexPath(): string {
    return path.join(this.baseDir, INDEX_FILE);
  }

  private readIndex(): MarkdownDoc[] {
    this.ensureDir();
    const p = this.indexPath();
    if (!fs.existsSync(p)) return [];
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  }

  private writeIndex(docs: MarkdownDoc[]): void {
    this.ensureDir();
    fs.writeFileSync(this.indexPath(), JSON.stringify(docs, null, 2), 'utf-8');
  }

  private docPath(id: string): string {
    return path.join(this.baseDir, `${id}.md`);
  }

  listDocuments(): MarkdownDoc[] {
    return this.readIndex();
  }

  getDocument(id: string): { meta: MarkdownDoc; content: string } {
    const index = this.readIndex();
    const meta = index.find((d) => d.id === id);
    if (!meta) throw new Error(`Document not found: ${id}`);
    const content = fs.readFileSync(this.docPath(id), 'utf-8');
    return { meta, content };
  }

  createDocument(title: string, content?: string): MarkdownDoc {
    const id = generateId();
    const now = timestamp();
    const meta: MarkdownDoc = { id, title, createdAt: now, updatedAt: now };
    this.ensureDir();
    fs.writeFileSync(this.docPath(id), content ?? '', 'utf-8');
    const index = this.readIndex();
    index.push(meta);
    this.writeIndex(index);
    return meta;
  }

  updateDocument(id: string, content: string, title?: string): MarkdownDoc {
    const index = this.readIndex();
    const meta = index.find((d) => d.id === id);
    if (!meta) throw new Error(`Document not found: ${id}`);
    meta.updatedAt = timestamp();
    if (title !== undefined) meta.title = title;
    fs.writeFileSync(this.docPath(id), content, 'utf-8');
    this.writeIndex(index);
    return meta;
  }

  deleteDocument(id: string): void {
    const index = this.readIndex();
    const filtered = index.filter((d) => d.id !== id);
    this.writeIndex(filtered);
    const p = this.docPath(id);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}
