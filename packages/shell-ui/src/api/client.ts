import type { ApiEnvelope } from '@ea-workbench/shared-schema';

const BASE_URL = '';

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
    throw new Error(envelope.error ?? 'Unknown error');
  }

  return envelope.data as T;
}
