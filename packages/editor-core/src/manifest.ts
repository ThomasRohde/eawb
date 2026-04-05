import type { ToolManifest } from '@ea-workbench/tool-api';
import { PATHS } from '@ea-workbench/shared-schema';
import { MarkdownDocSchema } from './schemas.js';

export const editorManifest: ToolManifest = {
  id: 'markdown-editor',
  name: 'Markdown Editor',
  version: '0.1.0',
  description: 'Create and edit markdown documents with a WYSIWYG editor',
  artifactTypes: [
    {
      id: 'markdown-doc',
      name: 'Markdown Document',
      filePattern: '*.md',
      schema: MarkdownDocSchema,
      directory: PATHS.MARKDOWN_DIR,
    },
  ],
  commands: [
    {
      id: 'md.create-doc',
      name: 'Create Document',
      category: 'Markdown Editor',
      handler: 'md:createDoc',
    },
    {
      id: 'md.delete-doc',
      name: 'Delete Document',
      category: 'Markdown Editor',
      handler: 'md:deleteDoc',
    },
  ],
  validators: [],
  uiContributions: [
    {
      type: 'panel',
      id: 'md-editor',
      component: 'MarkdownEditorPanel',
      title: 'Editor',
      defaultPosition: 'center',
    },
  ],
  directoryContract: [{ path: PATHS.MARKDOWN_DIR, description: 'Markdown documents (*.md)' }],
};
