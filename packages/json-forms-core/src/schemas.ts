import { z } from 'zod';

export const FormSchemaMetaSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type FormSchemaMeta = z.infer<typeof FormSchemaMetaSchema>;

/**
 * Body of a form schema definition. We require objects (not `unknown`) so the
 * envelope is sane; deep validity is the JSON Schema validator's job.
 */
export const FormSchemaBodySchema = z.object({
  jsonSchema: z.record(z.unknown()),
  uiSchema: z.record(z.unknown()),
});
export type FormSchemaBody = z.infer<typeof FormSchemaBodySchema>;

export const FormSchemaDefinitionSchema = z.object({
  meta: FormSchemaMetaSchema,
  jsonSchema: z.record(z.unknown()),
  uiSchema: z.record(z.unknown()),
});
export type FormSchemaDefinition = z.infer<typeof FormSchemaDefinitionSchema>;

export const FormSubmissionSchema = z.object({
  id: z.string(),
  schemaId: z.string(),
  data: z.unknown(),
  submittedAt: z.string(),
});
export type FormSubmission = z.infer<typeof FormSubmissionSchema>;

export const CreateSchemaBodySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  jsonSchema: z.record(z.unknown()).optional(),
  uiSchema: z.record(z.unknown()).optional(),
});
export type CreateSchemaBody = z.infer<typeof CreateSchemaBodySchema>;

export const UpdateSchemaBodySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  jsonSchema: z.record(z.unknown()),
  uiSchema: z.record(z.unknown()),
});
export type UpdateSchemaBody = z.infer<typeof UpdateSchemaBodySchema>;

export const SubmissionBodySchema = z.object({
  data: z.unknown(),
});
export type SubmissionBody = z.infer<typeof SubmissionBodySchema>;

export const ListSubmissionsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  before: z.string().optional(),
});
export type ListSubmissionsQuery = z.infer<typeof ListSubmissionsQuerySchema>;
