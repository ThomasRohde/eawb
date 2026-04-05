import { randomUUID } from 'node:crypto';

export function generateId(): string {
  return randomUUID();
}

export function timestamp(): string {
  return new Date().toISOString();
}
