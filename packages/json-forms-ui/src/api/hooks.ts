import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { jsonFormsApi } from './client';

const KEY = ['json-forms'] as const;

export function useSchemaList() {
  return useQuery({
    queryKey: [...KEY, 'schemas'],
    queryFn: () => jsonFormsApi.listSchemas(),
  });
}

export function useSchema(id: string | null) {
  return useQuery({
    queryKey: [...KEY, 'schema', id],
    queryFn: () => jsonFormsApi.getSchema(id as string),
    enabled: !!id,
  });
}

export function useCreateSchema() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof jsonFormsApi.createSchema>[0]) =>
      jsonFormsApi.createSchema(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...KEY, 'schemas'] });
    },
  });
}

export function useUpdateSchema() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; body: Parameters<typeof jsonFormsApi.updateSchema>[1] }) =>
      jsonFormsApi.updateSchema(args.id, args.body),
    onSuccess: (_data, args) => {
      qc.invalidateQueries({ queryKey: [...KEY, 'schemas'] });
      qc.invalidateQueries({ queryKey: [...KEY, 'schema', args.id] });
    },
  });
}

export function useDeleteSchema() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => jsonFormsApi.deleteSchema(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...KEY, 'schemas'] });
    },
  });
}

export function useRecentSubmissions(id: string | null, limit = 20) {
  return useQuery({
    queryKey: [...KEY, 'submissions', id, limit],
    queryFn: () => jsonFormsApi.listSubmissions(id as string, limit),
    enabled: !!id,
  });
}

export function useSubmitForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; data: unknown }) =>
      jsonFormsApi.submitForm(args.id, args.data),
    onSuccess: (_data, args) => {
      qc.invalidateQueries({ queryKey: [...KEY, 'submissions', args.id] });
    },
  });
}
