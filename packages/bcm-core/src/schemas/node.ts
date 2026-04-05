import { z } from 'zod';

export const BcmNodeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  parent: z.string().uuid().nullable(),
  order: z.number().int().min(0),
  description: z.string().default(''),
  metadata: z.record(z.unknown()).default({}),
});

export type BcmNode = z.infer<typeof BcmNodeSchema>;
