import { z } from 'zod';

export const WsEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('heartbeat'), timestamp: z.string().datetime() }),
  z.object({ type: z.literal('tool:registered'), toolId: z.string() }),
  z.object({ type: z.literal('checkpoint:created'), id: z.string(), message: z.string() }),
  z.object({ type: z.literal('model:changed'), toolId: z.string(), artifactId: z.string() }),
  z.object({ type: z.literal('ai:progress'), sessionId: z.string(), data: z.unknown() }),
  z.object({ type: z.literal('ai:complete'), sessionId: z.string(), data: z.unknown() }),
  z.object({ type: z.literal('export:complete'), format: z.string(), filename: z.string() }),
  z.object({
    type: z.literal('notification'),
    level: z.enum(['info', 'warn', 'error']),
    message: z.string(),
  }),
  z.object({ type: z.literal('chat:chunk'), conversationId: z.string(), text: z.string() }),
  z.object({ type: z.literal('chat:done'), conversationId: z.string() }),
  z.object({ type: z.literal('checkpoint:auto'), id: z.string(), message: z.string() }),
  z.object({
    type: z.literal('push:complete'),
    remote: z.string(),
    branch: z.string(),
  }),
  // --- ACP-enriched events ---
  z.object({
    type: z.literal('ai:commands'),
    sessionId: z.string(),
    commands: z.array(
      z.object({
        name: z.string(),
        description: z.string(),
        inputHint: z.string().nullish(),
      }),
    ),
  }),
  z.object({
    type: z.literal('ai:mode'),
    sessionId: z.string(),
    currentModeId: z.string(),
  }),
  z.object({
    type: z.literal('ai:usage'),
    sessionId: z.string(),
    used: z.number(),
    size: z.number(),
    cost: z.object({ amount: z.number(), currency: z.string() }).nullish(),
  }),
  z.object({
    type: z.literal('ai:plan'),
    sessionId: z.string(),
    entries: z.array(
      z.object({
        content: z.string(),
        status: z.enum(['pending', 'in_progress', 'completed']),
        priority: z.enum(['high', 'medium', 'low']),
      }),
    ),
  }),
  z.object({
    type: z.literal('ai:tool_call'),
    sessionId: z.string(),
    toolCallId: z.string(),
    title: z.string(),
    status: z.enum(['pending', 'in_progress', 'completed', 'failed']).nullish(),
    kind: z.string().nullish(),
  }),
  z.object({
    type: z.literal('ai:config'),
    sessionId: z.string(),
  }),
  z.object({
    type: z.literal('ai:permission'),
    sessionId: z.string(),
    requestId: z.string(),
    title: z.string(),
    description: z.string().nullish(),
    options: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
      }),
    ),
  }),
]);

export type WsEvent = z.infer<typeof WsEventSchema>;
