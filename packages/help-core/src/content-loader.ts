import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface HelpTopic {
  id: string;
  title: string;
  category: string;
  order: number;
  content: string;
}

interface FrontMatter {
  title: string;
  category: string;
  order: number;
}

function parseFrontMatter(raw: string): { meta: FrontMatter; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return {
      meta: { title: 'Untitled', category: 'General', order: 999 },
      body: raw,
    };
  }
  const meta: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
  }
  return {
    meta: {
      title: meta['title'] ?? 'Untitled',
      category: meta['category'] ?? 'General',
      order: parseInt(meta['order'] ?? '999', 10),
    },
    body: match[2],
  };
}

let _cache: HelpTopic[] | null = null;

function contentDir(): string {
  const thisFile = fileURLToPath(import.meta.url);
  // In dist/index.js → dist/content/  OR  src/ → ../content/
  const dir = join(thisFile, '..', 'content');
  return dir;
}

export function loadTopics(): HelpTopic[] {
  if (_cache) return _cache;

  const dir = contentDir();
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort();
  const topics: HelpTopic[] = [];

  for (const file of files) {
    const raw = readFileSync(join(dir, file), 'utf-8');
    const { meta, body } = parseFrontMatter(raw);
    topics.push({
      id: file.replace(/\.md$/, ''),
      title: meta.title,
      category: meta.category,
      order: meta.order,
      content: body,
    });
  }

  topics.sort((a, b) => a.order - b.order);
  _cache = topics;
  return topics;
}

export function getTopic(id: string): HelpTopic | undefined {
  return loadTopics().find((t) => t.id === id);
}
