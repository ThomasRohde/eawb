import { z } from 'zod';

const CachedModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
});

const CachedModeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
});

const CachedConfigOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  type: z.enum(['select', 'boolean']),
  currentValue: z.union([z.string(), z.boolean()]),
  options: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
});

const CachedOptionsSchema = z.object({
  models: z.array(CachedModelSchema).default([]),
  modes: z.array(CachedModeSchema).default([]),
  configOptions: z.array(CachedConfigOptionSchema).default([]),
  updatedAt: z.string().datetime().nullable().default(null),
});

export const AIPreferencesSchema = z.object({
  preferredModelId: z.string().nullable().default(null),
  preferredModeId: z.string().nullable().default(null),
  configOverrides: z.record(z.string(), z.unknown()).default({}),
  cachedOptions: CachedOptionsSchema.default({}),
});

export type AIPreferences = z.infer<typeof AIPreferencesSchema>;
export type CachedOptions = z.infer<typeof CachedOptionsSchema>;
