export interface ACPSession {
  id: string;
  createdAt: string;
  status: 'active' | 'idle' | 'closed';
}

export interface SessionOptions {
  workingDirectory?: string;
  toolId?: string;
  actionId?: string;
}
