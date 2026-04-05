import fs from 'node:fs';
import { BcmHeaderSchema } from '../schemas/header.js';
import { BcmNodeSchema } from '../schemas/node.js';
import type { BcmModel } from '../schemas/model.js';
import type { BcmHeader } from '../schemas/header.js';
import type { BcmNode } from '../schemas/node.js';

export interface ParseResult {
  model: BcmModel;
  errors: Array<{ line: number; message: string }>;
}

export function parseJsonl(content: string): ParseResult {
  const lines = content.split('\n').filter((l) => l.trim().length > 0);
  const errors: Array<{ line: number; message: string }> = [];

  if (lines.length === 0) {
    throw new Error('Empty JSONL file');
  }

  // Parse header (first line)
  let header: BcmHeader;
  try {
    const raw = JSON.parse(lines[0]);
    const result = BcmHeaderSchema.safeParse(raw);
    if (!result.success) {
      throw new Error(`Header validation failed: ${result.error.message}`);
    }
    header = result.data;
  } catch (err) {
    throw new Error(`Invalid header on line 1: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Parse nodes (remaining lines)
  const nodes: BcmNode[] = [];
  for (let i = 1; i < lines.length; i++) {
    try {
      const raw = JSON.parse(lines[i]);
      const result = BcmNodeSchema.safeParse(raw);
      if (!result.success) {
        errors.push({ line: i + 1, message: result.error.message });
        continue;
      }
      nodes.push(result.data);
    } catch (err) {
      errors.push({
        line: i + 1,
        message: `JSON parse error: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  return { model: { header, nodes }, errors };
}

export function readModelFile(filePath: string): ParseResult {
  const content = fs.readFileSync(filePath, 'utf-8');
  return parseJsonl(content);
}
