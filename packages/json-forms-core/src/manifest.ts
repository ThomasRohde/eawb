import type { ToolManifest } from '@ea-workbench/tool-api';
import { PATHS } from '@ea-workbench/shared-schema';
import { jsonFormsAIActions } from '@ea-workbench/json-forms-ai';
import { FormSchemaMetaSchema } from './schemas.js';

export const jsonFormsManifest: ToolManifest = {
  id: 'json-forms',
  name: 'JSON Forms',
  version: '0.1.0',
  description: 'Author JSON Schema-driven forms and capture submissions against them',
  artifactTypes: [
    {
      id: 'form-schema',
      name: 'Form Schema',
      filePattern: '*.form.json',
      schema: FormSchemaMetaSchema,
      directory: PATHS.JSON_FORMS_DIR,
    },
  ],
  commands: [
    {
      id: 'json-forms.create-schema',
      name: 'Create Form Schema',
      category: 'JSON Forms',
      handler: 'json-forms:createSchema',
    },
    {
      id: 'json-forms.delete-schema',
      name: 'Delete Form Schema',
      category: 'JSON Forms',
      handler: 'json-forms:deleteSchema',
    },
  ],
  validators: [],
  aiActions: jsonFormsAIActions,
  uiContributions: [
    {
      type: 'panel',
      id: 'json-forms-designer',
      component: 'json-forms-designer',
      title: 'Form Designer',
      defaultPosition: 'center',
    },
    {
      type: 'panel',
      id: 'json-forms-filler',
      component: 'json-forms-filler',
      title: 'Form Filler',
      defaultPosition: 'center',
    },
  ],
  directoryContract: [
    { path: PATHS.JSON_FORMS_DIR, description: 'JSON Forms schemas and submissions' },
  ],
};
