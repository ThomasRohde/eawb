import { z } from 'zod';

export const MarkdownDocSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type MarkdownDoc = z.infer<typeof MarkdownDocSchema>;
