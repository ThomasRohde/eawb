export interface StreamChunk {
  type: 'progress' | 'partial' | 'complete' | 'error';
  data: unknown;
}
