import type { FastifyInstance } from 'fastify';
import { success, failure } from '@ea-workbench/shared-schema';
import { DocumentStore } from './document-store.js';

export async function editorRoutes(app: FastifyInstance): Promise<void> {
  const getStore = () => {
    const workspacePath = (app as any).workspacePath as string;
    return new DocumentStore(workspacePath);
  };

  const notifyAutoCheckpoint = (label: string) => {
    (app as any).autoCheckpoint?.notifyArtifactSaved?.(label);
  };

  // List documents
  app.get('/documents', async () => {
    const store = getStore();
    return success(store.listDocuments());
  });

  // Create document
  app.post<{
    Body: { title: string; content?: string };
  }>('/documents', async (request) => {
    const store = getStore();
    const meta = store.createDocument(request.body.title, request.body.content);
    notifyAutoCheckpoint(meta.id);
    return success(meta);
  });

  // Get document
  app.get<{ Params: { id: string } }>('/documents/:id', async (request, reply) => {
    const store = getStore();
    try {
      const doc = store.getDocument(request.params.id);
      return success(doc);
    } catch {
      return reply.code(404).send(failure('Document not found', 'NOT_FOUND'));
    }
  });

  // Update document
  app.put<{
    Params: { id: string };
    Body: { content: string; title?: string };
  }>('/documents/:id', async (request, reply) => {
    const store = getStore();
    try {
      const meta = store.updateDocument(
        request.params.id,
        request.body.content,
        request.body.title,
      );
      notifyAutoCheckpoint(request.params.id);
      return success(meta);
    } catch {
      return reply.code(404).send(failure('Document not found', 'NOT_FOUND'));
    }
  });

  // Delete document
  app.delete<{ Params: { id: string } }>('/documents/:id', async (request) => {
    const store = getStore();
    store.deleteDocument(request.params.id);
    notifyAutoCheckpoint(request.params.id);
    return success({ deleted: true });
  });
}
