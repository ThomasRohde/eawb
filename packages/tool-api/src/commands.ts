import type { z } from 'zod';

export interface CommandDefinition {
  id: string;
  name: string;
  category: string;
  icon?: string;
  handler: string;
  input?: z.ZodType;
}
