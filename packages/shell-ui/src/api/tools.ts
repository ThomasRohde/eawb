import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client.js';

export interface ToolInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  uiContributions: Array<{
    type: string;
    id: string;
    component: string;
    title: string;
    defaultPosition?: string;
  }>;
}

export function useTools() {
  return useQuery({
    queryKey: ['tools'],
    queryFn: () => apiFetch<ToolInfo[]>('/api/tools'),
  });
}

export function useTool(id: string) {
  return useQuery({
    queryKey: ['tools', id],
    queryFn: () => apiFetch<ToolInfo>(`/api/tools/${id}`),
    enabled: !!id,
  });
}
