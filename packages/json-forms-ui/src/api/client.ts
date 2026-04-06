import type {
  FormSchemaDefinition,
  FormSchemaMeta,
  FormSubmission,
} from '@ea-workbench/json-forms-core';

const BASE = '/api/tools/json-forms';

export interface ApiError extends Error {
  code?: string;
  details?: unknown;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const json = (await res.json()) as {
    ok: boolean;
    data?: T;
    error?: string;
    code?: string;
    details?: unknown;
  };
  if (!json.ok) {
    const err = new Error(json.error ?? `Request failed (${res.status})`) as ApiError;
    err.code = json.code;
    err.details = json.details;
    throw err;
  }
  return json.data as T;
}

export const jsonFormsApi = {
  listSchemas: () => request<FormSchemaMeta[]>('/schemas'),

  getSchema: (id: string) => request<FormSchemaDefinition>(`/schemas/${id}`),

  createSchema: (body: {
    title: string;
    description?: string;
    jsonSchema?: Record<string, unknown>;
    uiSchema?: Record<string, unknown>;
  }) =>
    request<FormSchemaMeta>('/schemas', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateSchema: (
    id: string,
    body: {
      title?: string;
      description?: string;
      jsonSchema: Record<string, unknown>;
      uiSchema: Record<string, unknown>;
    },
  ) =>
    request<FormSchemaMeta>(`/schemas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  deleteSchema: (id: string) =>
    request<{ deleted: boolean }>(`/schemas/${id}`, { method: 'DELETE' }),

  listSubmissions: (id: string, limit = 20) =>
    request<FormSubmission[]>(`/schemas/${id}/submissions?limit=${limit}`),

  submitForm: (id: string, data: unknown) =>
    request<FormSubmission>(`/schemas/${id}/submissions`, {
      method: 'POST',
      body: JSON.stringify({ data }),
    }),
};
