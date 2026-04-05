import { z } from 'zod';

export const BcmHeaderSchema = z.object({
  _t: z.literal('header'),
  schema_version: z.literal('1.0'),
  kind: z.enum(['capability_model', 'hierarchy', 'taxonomy']),
  id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().default(''),
  metadata: z.record(z.unknown()).default({}),
});

export type BcmHeader = z.infer<typeof BcmHeaderSchema>;
