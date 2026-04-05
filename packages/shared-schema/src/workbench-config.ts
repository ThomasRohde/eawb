import { z } from 'zod';

export const ToolEntrySchema = z.object({
  id: z.string(),
  enabled: z.boolean().default(true),
});

export const WorkbenchConfigSchema = z.object({
  version: z.literal('1.0'),
  name: z.string().min(1),
  tools: z.array(ToolEntrySchema).default([]),
  createdAt: z.string().datetime(),
});

export type ToolEntry = z.infer<typeof ToolEntrySchema>;
export type WorkbenchConfig = z.infer<typeof WorkbenchConfigSchema>;
