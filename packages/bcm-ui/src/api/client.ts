const BASE = '/api/tools/bcm-studio';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { ...(init?.headers as Record<string, string>) };
  if (init?.body) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
  });
  const envelope = await res.json();
  if (!envelope.ok) throw new Error(envelope.error ?? 'Unknown error');
  return envelope.data as T;
}

export const bcmApi = {
  listModels: () =>
    request<Array<{ id: string; title: string; kind: string; nodeCount: number }>>('/models'),

  createModel: (body: { title: string; kind?: string; description?: string }) =>
    request<{ id: string; title: string }>('/models', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getModel: (id: string) => request<{ header: any; nodes: any[] }>(`/models/${id}`),

  updateModel: (id: string, body: { title?: string; description?: string }) =>
    request<any>(`/models/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  deleteModel: (id: string) => request<any>(`/models/${id}`, { method: 'DELETE' }),

  addNode: (
    modelId: string,
    body: { name: string; parent?: string | null; order?: number; description?: string },
  ) =>
    request<{ nodeId: string }>(`/models/${modelId}/nodes`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateNode: (modelId: string, nodeId: string, body: { name?: string; description?: string }) =>
    request<any>(`/models/${modelId}/nodes/${nodeId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  batchMutate: (
    modelId: string,
    operations: Array<
      | { op: 'add'; name: string; parent?: string | null; order?: number; description?: string }
      | { op: 'update'; nodeId: string; name?: string; description?: string }
    >,
  ) =>
    request<{ applied: number; addedNodeIds: string[] }>(`/models/${modelId}/batch`, {
      method: 'POST',
      body: JSON.stringify({ operations }),
    }),

  deleteNode: (modelId: string, nodeId: string) =>
    request<any>(`/models/${modelId}/nodes/${nodeId}`, { method: 'DELETE' }),

  moveNode: (modelId: string, nodeId: string, body: { parent: string | null; order: number }) =>
    request<any>(`/models/${modelId}/nodes/${nodeId}/move`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  validate: (modelId: string) =>
    request<{ valid: boolean; diagnostics: any[] }>(`/models/${modelId}/validate`),
};
