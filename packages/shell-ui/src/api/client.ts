import type { ApiEnvelope } from '@ea-workbench/shared-schema';

const BASE_URL = '';

export class ApiError extends Error {
  code?: string;
  details?: unknown;
  constructor(message: string, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  const envelope: ApiEnvelope<T> = await res.json();

  if (!envelope.ok) {
    throw new ApiError(envelope.error ?? 'Unknown error', envelope.code, envelope.details);
  }

  return envelope.data as T;
}
