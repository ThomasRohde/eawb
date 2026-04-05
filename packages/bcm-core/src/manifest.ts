import type { ToolManifest } from '@ea-workbench/tool-api';
import { BcmHeaderSchema } from './schemas/header.js';

export const bcmManifest: ToolManifest = {
  id: 'bcm-studio',
  name: 'BCM Studio',
  version: '0.1.0',
  description: 'Business Capability Modeling and hierarchical taxonomy tool',
  artifactTypes: [
    {
      id: 'bcm-model',
      name: 'BCM Model',
      filePattern: '*.bcm.jsonl',
      schema: BcmHeaderSchema,
      directory: 'architecture/bcm-studio/models',
    },
  ],
  commands: [
    { id: 'bcm.create-model', name: 'Create Model', category: 'BCM Studio', handler: 'bcm:createModel' },
    { id: 'bcm.add-node', name: 'Add Node', category: 'BCM Studio', handler: 'bcm:addNode' },
    { id: 'bcm.delete-node', name: 'Delete Node', category: 'BCM Studio', handler: 'bcm:deleteNode' },
    { id: 'bcm.move-node', name: 'Move Node', category: 'BCM Studio', handler: 'bcm:moveNode' },
  ],
  validators: [],
  uiContributions: [
    { type: 'panel', id: 'bcm-tree', component: 'BcmTreeView', title: 'Tree', defaultPosition: 'left' },
    { type: 'panel', id: 'bcm-hierarchy', component: 'BcmHierarchyView', title: 'Hierarchy', defaultPosition: 'center' },
    { type: 'panel', id: 'bcm-inspector', component: 'BcmInspector', title: 'Inspector', defaultPosition: 'right' },
  ],
  directoryContract: [
    { path: 'architecture/bcm-studio/models', description: 'BCM model files (*.bcm.jsonl)' },
  ],
};
