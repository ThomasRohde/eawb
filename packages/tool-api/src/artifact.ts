import type { z } from 'zod';

export interface ArtifactType {
  id: string;
  name: string;
  filePattern: string;
  schema: z.ZodType;
  directory: string;
}
