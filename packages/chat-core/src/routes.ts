import type { FastifyInstance } from 'fastify';
import { success, failure } from '@ea-workbench/shared-schema';
import {
  createConversation,
  getConversation,
  listConversations,
  addMessage,
  deleteConversation,
  setAcpSessionId,
} from './conversation-store.js';

export type AIPromptFn = (
  prompt: string,
  workingDir?: string,
  existingSessionId?: string | null,
  onChunk?: (text: string) => void,
) => Promise<{ content: string; sessionId: string }>;

export type AIDestroySessionFn = (sessionId: string) => Promise<void>;

export async function chatRoutes(app: FastifyInstance): Promise<void> {
  app.get('/conversations', async () => {
    const convos = listConversations();
    return success(
      convos.map((c) => ({
        id: c.id,
        title: c.title,
        messageCount: c.messages.length,
        updatedAt: c.updatedAt,
        acpSessionId: c.acpSessionId,
      })),
    );
  });

  app.post<{ Body: { title?: string } }>('/conversations', async (request) => {
    const conversation = createConversation(request.body?.title);
    return success(conversation);
  });

  app.get<{ Params: { id: string } }>('/conversations/:id', async (request, reply) => {
    const conversation = getConversation(request.params.id);
    if (!conversation) {
      return reply.code(404).send(failure('Conversation not found', 'NOT_FOUND'));
    }
    return success(conversation);
  });

  app.post<{
    Params: { id: string };
    Body: { content: string };
  }>('/conversations/:id/messages', async (request, reply) => {
    const conversation = getConversation(request.params.id);
    if (!conversation) {
      return reply.code(404).send(failure('Conversation not found', 'NOT_FOUND'));
    }

    const userMessage = addMessage(request.params.id, 'user', request.body.content);

    // Use injected AI prompt function
    const aiPrompt = (app as any).aiPromptFn as AIPromptFn | undefined;
    const workspacePath = (app as any).workspacePath as string;

    if (!aiPrompt) {
      const assistantMessage = addMessage(
        request.params.id,
        'assistant',
        'AI provider not configured.',
      );
      return success({ userMessage, assistantMessage });
    }

    const broadcastFn = (app as any).broadcastFn as ((event: any) => void) | undefined;
    const conversationId = request.params.id;

    // If we already have a persistent ACP session, send only the new turn.
    // The agent-side session already has prior context.
    // Only build full history for the first turn (no acpSessionId yet).
    let prompt: string;
    if (conversation.acpSessionId) {
      prompt = request.body.content;
    } else {
      const history = conversation.messages
        .slice(0, -1)
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n');
      prompt = history ? `${history}\nuser: ${request.body.content}` : request.body.content;
    }

    try {
      const result = await aiPrompt(prompt, workspacePath, conversation.acpSessionId, (text) => {
        broadcastFn?.({ type: 'chat:chunk', conversationId, text });
      });
      broadcastFn?.({ type: 'chat:done', conversationId });

      // Persist the ACP session ID for future messages
      if (result.sessionId && result.sessionId !== conversation.acpSessionId) {
        setAcpSessionId(conversationId, result.sessionId);
      }

      const assistantMessage = addMessage(request.params.id, 'assistant', result.content);
      return success({ userMessage, assistantMessage, acpSessionId: result.sessionId });
    } catch (err) {
      broadcastFn?.({ type: 'chat:done', conversationId });
      const errMsg = err instanceof Error ? err.message : 'AI request failed';
      const assistantMessage = addMessage(request.params.id, 'assistant', `Error: ${errMsg}`);
      return success({ userMessage, assistantMessage });
    }
  });

  app.put<{ Params: { id: string }; Body: { sessionId: string } }>(
    '/conversations/:id/acp-session',
    async (request, reply) => {
      const conversation = getConversation(request.params.id);
      if (!conversation) {
        return reply.code(404).send(failure('Conversation not found', 'NOT_FOUND'));
      }
      setAcpSessionId(request.params.id, request.body.sessionId);
      return success({ sessionId: request.body.sessionId });
    },
  );

  // Import a message without triggering AI (used for replaying session history)
  app.post<{
    Params: { id: string };
    Body: { role: 'user' | 'assistant'; content: string };
  }>('/conversations/:id/messages/import', async (request, reply) => {
    const conversation = getConversation(request.params.id);
    if (!conversation) {
      return reply.code(404).send(failure('Conversation not found', 'NOT_FOUND'));
    }
    const message = addMessage(request.params.id, request.body.role, request.body.content);
    return success({ message });
  });

  app.delete<{ Params: { id: string } }>('/conversations/:id', async (request) => {
    const conversation = getConversation(request.params.id);
    // Destroy the ACP session if one exists
    if (conversation?.acpSessionId) {
      const destroySession = (app as any).aiDestroySessionFn as AIDestroySessionFn | undefined;
      await destroySession?.(conversation.acpSessionId);
    }
    deleteConversation(request.params.id);
    return success({ deleted: true });
  });
}
