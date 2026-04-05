import type { ToolManifest } from '@ea-workbench/tool-api';

export const chatManifest: ToolManifest = {
  id: 'acp-chat',
  name: 'AI Chat',
  version: '0.1.0',
  description: 'Conversational AI assistant powered by ACP/Copilot',
  artifactTypes: [],
  commands: [
    { id: 'chat.new', name: 'New Conversation', category: 'AI Chat', handler: 'chat:new' },
  ],
  validators: [],
  uiContributions: [
    { type: 'panel', id: 'chat-panel', component: 'ChatPanel', title: 'AI Chat', defaultPosition: 'center' },
  ],
  directoryContract: [],
};
