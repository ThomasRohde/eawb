import type { FastifyInstance } from 'fastify';
import { success, failure, generateId, timestamp } from '@ea-workbench/shared-schema';
import { ModelStore } from './storage/model-store.js';
import { validateModel } from './validation/validator.js';
import { addNode, updateNode, deleteNode, moveNode } from './operations/tree-ops.js';
import type { BcmModel } from './schemas/model.js';
import type { BcmHeader } from './schemas/header.js';

export async function bcmRoutes(app: FastifyInstance): Promise<void> {
  const getStore = () => {
    const workspacePath = (app as any).workspacePath as string;
    return new ModelStore(workspacePath);
  };

  const notifyAutoCheckpoint = (modelId: string) => {
    (app as any).autoCheckpoint?.notifyArtifactSaved?.(modelId);
  };

  // List models
  app.get('/models', async () => {
    const store = getStore();
    const models = store.listModels();
    const summaries = models.map((m) => {
      try {
        const model = store.loadModel(m.id);
        return {
          id: model.header.id,
          title: model.header.title,
          kind: model.header.kind,
          nodeCount: model.nodes.length,
        };
      } catch {
        return { id: m.id, title: m.id, kind: 'unknown', nodeCount: 0 };
      }
    });
    return success(summaries);
  });

  // Create model
  app.post<{
    Body: { title: string; kind?: string; description?: string };
  }>('/models', async (request) => {
    const store = getStore();
    const id = generateId();
    const header: BcmHeader = {
      _t: 'header',
      schema_version: '1.0',
      kind:
        (request.body.kind as 'capability_model' | 'hierarchy' | 'taxonomy') ?? 'capability_model',
      id,
      title: request.body.title,
      description: request.body.description ?? '',
      metadata: {},
    };
    const model: BcmModel = { header, nodes: [] };
    store.saveModel(model);
    notifyAutoCheckpoint(id);
    return success({ id, title: header.title });
  });

  // Get model
  app.get<{ Params: { id: string } }>('/models/:id', async (request, reply) => {
    const store = getStore();
    try {
      const model = store.loadModel(request.params.id);
      return success(model);
    } catch {
      return reply.code(404).send(failure('Model not found', 'NOT_FOUND'));
    }
  });

  // Update model header
  app.put<{
    Params: { id: string };
    Body: { title?: string; description?: string; metadata?: Record<string, unknown> };
  }>('/models/:id', async (request, reply) => {
    const store = getStore();
    try {
      const model = store.loadModel(request.params.id);
      const updated: BcmModel = {
        ...model,
        header: {
          ...model.header,
          ...(request.body.title && { title: request.body.title }),
          ...(request.body.description !== undefined && { description: request.body.description }),
          ...(request.body.metadata && {
            metadata: { ...model.header.metadata, ...request.body.metadata },
          }),
        },
      };
      store.saveModel(updated);
      notifyAutoCheckpoint(request.params.id);
      return success(updated.header);
    } catch {
      return reply.code(404).send(failure('Model not found', 'NOT_FOUND'));
    }
  });

  // Delete model
  app.delete<{ Params: { id: string } }>('/models/:id', async (request) => {
    const store = getStore();
    store.deleteModel(request.params.id);
    return success({ deleted: true });
  });

  // Add node
  app.post<{
    Params: { id: string };
    Body: {
      name: string;
      parent?: string | null;
      order?: number;
      description?: string;
      metadata?: Record<string, unknown>;
    };
  }>('/models/:id/nodes', async (request, reply) => {
    // Validate required fields before touching the model
    const { name } = request.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return reply
        .code(400)
        .send(failure('Node name is required and must be a non-empty string', 'VALIDATION_ERROR'));
    }
    if (
      request.body.order !== undefined &&
      (typeof request.body.order !== 'number' ||
        !Number.isInteger(request.body.order) ||
        request.body.order < 0)
    ) {
      return reply
        .code(400)
        .send(failure('Order must be a non-negative integer', 'VALIDATION_ERROR'));
    }

    const store = getStore();
    try {
      const model = store.loadModel(request.params.id);
      const { model: updated, nodeId } = addNode(model, {
        name: name.trim(),
        parent: request.body.parent ?? null,
        order: request.body.order ?? 0,
        description: request.body.description ?? '',
        metadata: request.body.metadata ?? {},
      });
      store.saveModel(updated);
      notifyAutoCheckpoint(request.params.id);
      return success({ nodeId });
    } catch {
      return reply.code(404).send(failure('Model not found', 'NOT_FOUND'));
    }
  });

  // Update node
  app.put<{
    Params: { id: string; nid: string };
    Body: { name?: string; description?: string; metadata?: Record<string, unknown> };
  }>('/models/:id/nodes/:nid', async (request, reply) => {
    const store = getStore();
    try {
      const model = store.loadModel(request.params.id);
      const updated = updateNode(model, request.params.nid, request.body);
      store.saveModel(updated);
      notifyAutoCheckpoint(request.params.id);
      return success({ updated: true });
    } catch {
      return reply.code(404).send(failure('Model not found', 'NOT_FOUND'));
    }
  });

  // Delete node
  app.delete<{
    Params: { id: string; nid: string };
    Querystring: { recursive?: string };
  }>('/models/:id/nodes/:nid', async (request, reply) => {
    const store = getStore();
    try {
      const model = store.loadModel(request.params.id);
      const recursive = request.query.recursive !== 'false';
      const updated = deleteNode(model, request.params.nid, recursive);
      store.saveModel(updated);
      notifyAutoCheckpoint(request.params.id);
      return success({ deleted: true });
    } catch {
      return reply.code(404).send(failure('Model not found', 'NOT_FOUND'));
    }
  });

  // Move node
  app.post<{
    Params: { id: string; nid: string };
    Body: { parent: string | null; order: number };
  }>('/models/:id/nodes/:nid/move', async (request, reply) => {
    const store = getStore();
    try {
      const model = store.loadModel(request.params.id);
      const updated = moveNode(model, request.params.nid, request.body.parent, request.body.order);
      store.saveModel(updated);
      notifyAutoCheckpoint(request.params.id);
      return success({ moved: true });
    } catch {
      return reply.code(404).send(failure('Model not found', 'NOT_FOUND'));
    }
  });

  // Batch mutations (atomic add/update in a single save)
  app.post<{
    Params: { id: string };
    Body: {
      operations: Array<
        | { op: 'add'; name: string; parent?: string | null; order?: number; description?: string }
        | { op: 'update'; nodeId: string; name?: string; description?: string }
      >;
    };
  }>('/models/:id/batch', async (request, reply) => {
    const { operations } = request.body;
    if (!Array.isArray(operations) || operations.length === 0) {
      return reply
        .code(400)
        .send(failure('operations must be a non-empty array', 'VALIDATION_ERROR'));
    }

    const store = getStore();
    try {
      let model = store.loadModel(request.params.id);
      const addedNodeIds: string[] = [];

      for (const mutation of operations) {
        if (mutation.op === 'add') {
          if (
            !mutation.name ||
            typeof mutation.name !== 'string' ||
            mutation.name.trim().length === 0
          ) {
            return reply
              .code(400)
              .send(failure('Each add operation requires a non-empty name', 'VALIDATION_ERROR'));
          }
          const { model: updated, nodeId } = addNode(model, {
            name: mutation.name.trim(),
            parent: mutation.parent ?? null,
            order: mutation.order ?? 0,
            description: mutation.description ?? '',
            metadata: {},
          });
          model = updated;
          addedNodeIds.push(nodeId);
        } else if (mutation.op === 'update') {
          if (!mutation.nodeId) {
            return reply
              .code(400)
              .send(failure('Each update operation requires a nodeId', 'VALIDATION_ERROR'));
          }
          model = updateNode(model, mutation.nodeId, {
            ...(mutation.name !== undefined && { name: mutation.name }),
            ...(mutation.description !== undefined && { description: mutation.description }),
          });
        } else {
          return reply
            .code(400)
            .send(failure(`Unknown operation: ${(mutation as any).op}`, 'VALIDATION_ERROR'));
        }
      }

      store.saveModel(model);
      notifyAutoCheckpoint(request.params.id);
      return success({ applied: operations.length, addedNodeIds });
    } catch {
      return reply.code(404).send(failure('Model not found', 'NOT_FOUND'));
    }
  });

  // Validate model
  app.get<{ Params: { id: string } }>('/models/:id/validate', async (request, reply) => {
    const store = getStore();
    try {
      const model = store.loadModel(request.params.id);
      const diagnostics = validateModel(model);
      return success({
        valid: diagnostics.filter((d) => d.level === 'error').length === 0,
        diagnostics,
      });
    } catch {
      return reply.code(404).send(failure('Model not found', 'NOT_FOUND'));
    }
  });
}
