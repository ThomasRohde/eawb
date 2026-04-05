import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bcmApi } from './client.js';

export function useModels() {
  return useQuery({
    queryKey: ['bcm', 'models'],
    queryFn: bcmApi.listModels,
  });
}

export function useModel(id: string | null) {
  return useQuery({
    queryKey: ['bcm', 'model', id],
    queryFn: () => bcmApi.getModel(id!),
    enabled: !!id,
  });
}

export function useCreateModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: bcmApi.createModel,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bcm', 'models'] }),
  });
}

export function useDeleteModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bcmApi.deleteModel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bcm', 'models'] }),
  });
}

export function useAddNode(modelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; parent?: string | null; order?: number; description?: string }) =>
      bcmApi.addNode(modelId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bcm', 'model', modelId] });
      qc.invalidateQueries({ queryKey: ['bcm', 'models'] });
    },
  });
}

export function useUpdateNode(modelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ nodeId, ...body }: { nodeId: string; name?: string; description?: string }) =>
      bcmApi.updateNode(modelId, nodeId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bcm', 'model', modelId] }),
  });
}

export function useDeleteNode(modelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nodeId: string) => bcmApi.deleteNode(modelId, nodeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bcm', 'model', modelId] });
      qc.invalidateQueries({ queryKey: ['bcm', 'models'] });
    },
  });
}

export function useMoveNode(modelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ nodeId, parent, order }: { nodeId: string; parent: string | null; order: number }) =>
      bcmApi.moveNode(modelId, nodeId, { parent, order }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bcm', 'model', modelId] }),
  });
}

export function useValidateModel(modelId: string | null) {
  return useQuery({
    queryKey: ['bcm', 'validate', modelId],
    queryFn: () => bcmApi.validate(modelId!),
    enabled: !!modelId,
  });
}
