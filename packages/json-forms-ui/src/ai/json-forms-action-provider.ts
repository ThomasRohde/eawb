import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AIActionProvider, AIActionUIDefinition } from '@ea-workbench/tool-api';
import { jsonFormsApi } from '../api/client';
import { useFormsStore } from '../store/forms-store';
import { FormSchemaResultRenderer } from './FormSchemaResultRenderer';

const JSON_FORMS_ACTIONS: AIActionUIDefinition[] = [
  {
    id: 'json-forms.generate_schema',
    name: 'Generate from description',
    description:
      'Create a new form schema from a natural-language description of the fields you want.',
    needsSelection: false,
    needsInput: true,
    inputLabel: 'Describe the form',
    inputPlaceholder:
      'e.g. Risk register entry with category, likelihood, impact, owner, and mitigation steps',
  },
  {
    id: 'json-forms.refine_schema',
    name: 'Refine schema',
    description: 'Apply natural-language refinements to the active form schema.',
    needsSelection: true,
    needsInput: true,
    inputLabel: 'What to change',
    inputPlaceholder:
      "e.g. Add a 'submittedBy' email field and split impact into financial and reputational severity",
  },
  {
    id: 'json-forms.suggest_validations',
    name: 'Suggest validations',
    description: 'Inspect each field and propose validation constraints.',
    needsSelection: true,
    needsInput: false,
  },
  {
    id: 'json-forms.add_descriptions',
    name: 'Fill missing descriptions',
    description: 'Write a one-sentence description for every field that lacks one.',
    needsSelection: true,
    needsInput: false,
  },
  {
    id: 'json-forms.improve_layout',
    name: 'Improve layout',
    description:
      'Reorganise the UI schema into logical Groups (or Categorization for large forms).',
    needsSelection: true,
    needsInput: false,
  },
];

const BULK_ACCEPT_ACTIONS = ['json-forms.suggest_validations', 'json-forms.add_descriptions'];

/** Walk a JSON-pointer path inside a schema object and return the leaf object reference. */
function resolvePointer(
  schema: Record<string, unknown>,
  pointer: string,
): Record<string, unknown> | null {
  if (!pointer || pointer === '/') return schema;
  const segments = pointer
    .split('/')
    .filter(Boolean)
    .map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~'));
  let cursor: unknown = schema;
  for (const segment of segments) {
    if (cursor && typeof cursor === 'object') {
      cursor = (cursor as Record<string, unknown>)[segment];
    } else {
      return null;
    }
  }
  return cursor && typeof cursor === 'object' ? (cursor as Record<string, unknown>) : null;
}

/**
 * Deep-clone via JSON round-trip. Schemas only contain JSON-safe values, so
 * this is fine and avoids pulling in a dependency.
 */
function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Hook returning an AIActionProvider for the JSON Forms tool. Plugged into
 * shell-ui's AIActionsPanel alongside the BCM and Editor providers.
 */
export function useJsonFormsActionProvider(): AIActionProvider {
  const selectedSchemaId = useFormsStore((s) => s.selectedSchemaId);
  const setSelectedSchemaId = useFormsStore((s) => s.setSelectedSchemaId);
  const qc = useQueryClient();

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['json-forms'] });
  }, [qc]);

  const getContext = useCallback(
    () => ({
      schemaId: selectedSchemaId,
    }),
    [selectedSchemaId],
  );

  // Always true so the Generate action is reachable even with no schema selected.
  // Refinement actions are gated server-side (route returns JSON_FORMS_NO_SELECTION
  // when schemaId is missing).
  const hasActiveArtifact = useCallback(() => true, []);

  const applyItem = useCallback(
    async (actionId: string, item: unknown, _index: number) => {
      switch (actionId) {
        case 'json-forms.generate_schema': {
          const payload = item as {
            jsonSchema: Record<string, unknown>;
            uiSchema: Record<string, unknown>;
            title?: string;
          };
          const title =
            (typeof payload.title === 'string' && payload.title.trim()) ||
            (typeof payload.jsonSchema?.title === 'string'
              ? (payload.jsonSchema.title as string)
              : 'AI-generated form');
          const meta = await jsonFormsApi.createSchema({
            title,
            jsonSchema: payload.jsonSchema,
            uiSchema: payload.uiSchema,
          });
          setSelectedSchemaId(meta.id);
          refresh();
          return;
        }

        case 'json-forms.refine_schema': {
          if (!selectedSchemaId) throw new Error('No schema selected');
          const payload = item as {
            jsonSchema: Record<string, unknown>;
            uiSchema: Record<string, unknown>;
          };
          await jsonFormsApi.updateSchema(selectedSchemaId, {
            jsonSchema: payload.jsonSchema,
            uiSchema: payload.uiSchema,
          });
          refresh();
          return;
        }

        case 'json-forms.improve_layout': {
          if (!selectedSchemaId) throw new Error('No schema selected');
          const payload = item as { uiSchema: Record<string, unknown> };
          const current = await jsonFormsApi.getSchema(selectedSchemaId);
          await jsonFormsApi.updateSchema(selectedSchemaId, {
            jsonSchema: current.jsonSchema as Record<string, unknown>,
            uiSchema: payload.uiSchema,
          });
          refresh();
          return;
        }

        case 'json-forms.suggest_validations': {
          if (!selectedSchemaId) throw new Error('No schema selected');
          const suggestion = item as {
            pointer: string;
            proposed: Record<string, unknown>;
          };
          const current = await jsonFormsApi.getSchema(selectedSchemaId);
          const nextJsonSchema = deepClone(current.jsonSchema as Record<string, unknown>);
          const target = resolvePointer(nextJsonSchema, suggestion.pointer);
          if (!target) throw new Error(`Field not found: ${suggestion.pointer}`);
          Object.assign(target, suggestion.proposed);
          await jsonFormsApi.updateSchema(selectedSchemaId, {
            jsonSchema: nextJsonSchema,
            uiSchema: current.uiSchema as Record<string, unknown>,
          });
          refresh();
          return;
        }

        case 'json-forms.add_descriptions': {
          if (!selectedSchemaId) throw new Error('No schema selected');
          const suggestion = item as { pointer: string; description: string };
          const current = await jsonFormsApi.getSchema(selectedSchemaId);
          const nextJsonSchema = deepClone(current.jsonSchema as Record<string, unknown>);
          const target = resolvePointer(nextJsonSchema, suggestion.pointer);
          if (!target) throw new Error(`Field not found: ${suggestion.pointer}`);
          target.description = suggestion.description;
          await jsonFormsApi.updateSchema(selectedSchemaId, {
            jsonSchema: nextJsonSchema,
            uiSchema: current.uiSchema as Record<string, unknown>,
          });
          refresh();
          return;
        }

        default:
          return;
      }
    },
    [selectedSchemaId, setSelectedSchemaId, refresh],
  );

  const applyAll = useCallback(
    async (actionId: string, items: unknown[], _ctx: Record<string, unknown>) => {
      // Bulk apply for the suggestion-list actions: accumulate every change
      // into a single revised jsonSchema and PUT once at the end.
      if (
        actionId !== 'json-forms.suggest_validations' &&
        actionId !== 'json-forms.add_descriptions'
      ) {
        return;
      }
      if (!selectedSchemaId) throw new Error('No schema selected');

      // The shell-ui AIActionsPanel wraps non-array structured payloads as
      // `[structured]` before calling applyAll. Our structured response for
      // these actions is an envelope object (`{ suggestions: [...] }` /
      // `{ descriptions: [...] }`), so we have to unwrap it back into the
      // individual items the loop expects. This handles both shapes:
      //   1. items === [{ suggestions: [...] }]   (panel-wrapped envelope)
      //   2. items === [...individual items...]   (direct call)
      const flattened: unknown[] = [];
      for (const raw of items) {
        if (raw && typeof raw === 'object') {
          const obj = raw as Record<string, unknown>;
          if (Array.isArray(obj.suggestions)) {
            flattened.push(...obj.suggestions);
            continue;
          }
          if (Array.isArray(obj.descriptions)) {
            flattened.push(...obj.descriptions);
            continue;
          }
        }
        flattened.push(raw);
      }
      if (flattened.length === 0) {
        throw new Error('No suggestions to apply');
      }

      const current = await jsonFormsApi.getSchema(selectedSchemaId);
      const nextJsonSchema = deepClone(current.jsonSchema as Record<string, unknown>);

      let appliedCount = 0;
      for (const raw of flattened) {
        if (actionId === 'json-forms.suggest_validations') {
          const s = raw as { pointer: string; proposed: Record<string, unknown> };
          if (!s?.pointer || !s.proposed) continue;
          const target = resolvePointer(nextJsonSchema, s.pointer);
          if (target) {
            Object.assign(target, s.proposed);
            appliedCount++;
          }
        } else {
          const s = raw as { pointer: string; description: string };
          if (!s?.pointer || !s.description) continue;
          const target = resolvePointer(nextJsonSchema, s.pointer);
          if (target) {
            target.description = s.description;
            appliedCount++;
          }
        }
      }
      if (appliedCount === 0) {
        throw new Error('None of the proposed pointers resolved against the current schema');
      }

      await jsonFormsApi.updateSchema(selectedSchemaId, {
        jsonSchema: nextJsonSchema,
        uiSchema: current.uiSchema as Record<string, unknown>,
      });
      refresh();
    },
    [selectedSchemaId, refresh],
  );

  return useMemo(
    () => ({
      toolId: 'json-forms',
      toolName: 'JSON Forms',
      actions: JSON_FORMS_ACTIONS,
      getContext,
      hasActiveArtifact,
      ResultRenderer: FormSchemaResultRenderer,
      applyItem,
      applyAll,
      bulkAcceptActions: BULK_ACCEPT_ACTIONS,
    }),
    [getContext, hasActiveArtifact, applyItem, applyAll],
  );
}
