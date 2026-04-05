import { generateId, timestamp } from '@ea-workbench/shared-schema';
import type { Conversation, ChatMessage } from './types.js';

// In-memory conversation store (persists for server lifetime)
const conversations = new Map<string, Conversation>();

export function createConversation(title?: string): Conversation {
  const id = generateId();
  const now = timestamp();
  const conversation: Conversation = {
    id,
    title: title ?? `Chat ${new Date().toLocaleString()}`,
    messages: [],
    createdAt: now,
    updatedAt: now,
    acpSessionId: null,
  };
  conversations.set(id, conversation);
  return conversation;
}

export function getConversation(id: string): Conversation | undefined {
  return conversations.get(id);
}

export function listConversations(): Conversation[] {
  return Array.from(conversations.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function addMessage(
  conversationId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
): ChatMessage {
  const conversation = conversations.get(conversationId);
  if (!conversation) throw new Error(`Conversation ${conversationId} not found`);

  const message: ChatMessage = {
    id: generateId(),
    role,
    content,
    timestamp: timestamp(),
  };
  conversation.messages.push(message);
  conversation.updatedAt = message.timestamp;

  // Auto-title from first user message
  if (!conversation.title.startsWith('Chat ') || conversation.messages.length > 1) {
    // keep existing title
  } else if (role === 'user') {
    conversation.title = content.slice(0, 60) + (content.length > 60 ? '...' : '');
  }

  return message;
}

export function setAcpSessionId(conversationId: string, acpSessionId: string): void {
  const conversation = conversations.get(conversationId);
  if (conversation) {
    conversation.acpSessionId = acpSessionId;
  }
}

export function deleteConversation(id: string): void {
  conversations.delete(id);
}
