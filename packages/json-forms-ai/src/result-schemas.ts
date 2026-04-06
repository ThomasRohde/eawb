import { z } from 'zod';

const JsonObject = z.record(z.unknown());

/** Generate / Refine return a full body. */
export const FullSchemaResultSchema = z.object({
  jsonSchema: JsonObject,
  uiSchema: JsonObject,
});
export type FullSchemaResult = z.infer<typeof FullSchemaResultSchema>;

/** Improve Layout returns only the uiSchema (jsonSchema is preserved). */
export const LayoutResultSchema = z.object({
  uiSchema: JsonObject,
});
export type LayoutResult = z.infer<typeof LayoutResultSchema>;

/** Suggest Validations — per-field constraint proposals. */
export const ValidationSuggestionSchema = z.object({
  pointer: z.string(),
  field: z.string(),
  current: JsonObject.optional(),
  proposed: JsonObject,
  rationale: z.string().optional(),
});
export type ValidationSuggestion = z.infer<typeof ValidationSuggestionSchema>;

export const SuggestionsResultSchema = z.object({
  suggestions: z.array(ValidationSuggestionSchema),
});
export type SuggestionsResult = z.infer<typeof SuggestionsResultSchema>;

/** Add Descriptions — per-field description proposals. */
export const DescriptionSuggestionSchema = z.object({
  pointer: z.string(),
  field: z.string(),
  description: z.string(),
});
export type DescriptionSuggestion = z.infer<typeof DescriptionSuggestionSchema>;

export const DescriptionsResultSchema = z.object({
  descriptions: z.array(DescriptionSuggestionSchema),
});
export type DescriptionsResult = z.infer<typeof DescriptionsResultSchema>;

/**
 * Parse the structured AI response for a given action id, returning either
 * the validated payload or a structured error envelope.
 */
export function parseActionResult(
  actionId: string,
  structured: unknown,
): { ok: true; data: unknown } | { ok: false; error: string; issues: z.ZodIssue[] } {
  if (structured == null) {
    return { ok: false, error: 'AI returned no structured output', issues: [] };
  }
  let schema: z.ZodTypeAny;
  switch (actionId) {
    case 'json-forms.generate_schema':
    case 'json-forms.refine_schema':
      schema = FullSchemaResultSchema;
      break;
    case 'json-forms.improve_layout':
      schema = LayoutResultSchema;
      break;
    case 'json-forms.suggest_validations':
      schema = SuggestionsResultSchema;
      break;
    case 'json-forms.add_descriptions':
      schema = DescriptionsResultSchema;
      break;
    default:
      return { ok: false, error: `Unknown action: ${actionId}`, issues: [] };
  }
  const parsed = schema.safeParse(structured);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'AI output did not match expected shape',
      issues: parsed.error.issues,
    };
  }
  return { ok: true, data: parsed.data };
}
