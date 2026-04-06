import type { AIActionDefinition } from '@ea-workbench/tool-api';

/**
 * AI action manifest entries for the JSON Forms tool. The runtime route file
 * imports the prompt builders from this package separately; these definitions
 * just register the actions in the tool manifest so they're discoverable.
 */
export const jsonFormsAIActions: AIActionDefinition[] = [
  {
    id: 'json-forms.generate_schema',
    name: 'Generate from description',
    description:
      'Create a new form schema from a natural-language description of the fields you want.',
    inputSchema: { type: 'object', properties: { description: { type: 'string' } } },
    outputSchema: {
      type: 'object',
      properties: {
        jsonSchema: { type: 'object' },
        uiSchema: { type: 'object' },
      },
    },
    contextSources: [],
    promptTemplate: 'See @ea-workbench/json-forms-ai/src/prompts.ts',
  },
  {
    id: 'json-forms.refine_schema',
    name: 'Refine schema',
    description:
      'Apply natural-language refinements to the active form schema (add fields, rename, restructure).',
    inputSchema: { type: 'object', properties: { instruction: { type: 'string' } } },
    outputSchema: {
      type: 'object',
      properties: {
        jsonSchema: { type: 'object' },
        uiSchema: { type: 'object' },
      },
    },
    contextSources: ['active-schema'],
    promptTemplate: 'See @ea-workbench/json-forms-ai/src/prompts.ts',
  },
  {
    id: 'json-forms.suggest_validations',
    name: 'Suggest validations',
    description:
      'Inspect each field and propose minLength/maxLength/pattern/format/enum constraints.',
    inputSchema: { type: 'object' },
    outputSchema: {
      type: 'object',
      properties: {
        suggestions: { type: 'array' },
      },
    },
    contextSources: ['active-schema'],
    promptTemplate: 'See @ea-workbench/json-forms-ai/src/prompts.ts',
  },
  {
    id: 'json-forms.add_descriptions',
    name: 'Fill missing descriptions',
    description: 'Write a one-sentence description for every field that lacks one.',
    inputSchema: { type: 'object' },
    outputSchema: {
      type: 'object',
      properties: {
        descriptions: { type: 'array' },
      },
    },
    contextSources: ['active-schema'],
    promptTemplate: 'See @ea-workbench/json-forms-ai/src/prompts.ts',
  },
  {
    id: 'json-forms.improve_layout',
    name: 'Improve layout',
    description:
      'Reorganise the UI schema into logical Groups (or Categorization for large forms).',
    inputSchema: { type: 'object' },
    outputSchema: {
      type: 'object',
      properties: {
        uiSchema: { type: 'object' },
      },
    },
    contextSources: ['active-schema'],
    promptTemplate: 'See @ea-workbench/json-forms-ai/src/prompts.ts',
  },
];
