import type { ToolManifest } from '@ea-workbench/tool-api';

export const helpManifest: ToolManifest = {
  id: 'help',
  name: 'Help',
  version: '0.1.0',
  description: 'Comprehensive help and documentation for EA Workbench',
  artifactTypes: [],
  commands: [],
  validators: [],
  uiContributions: [
    {
      type: 'panel',
      id: 'help-panel',
      component: 'HelpPanel',
      title: 'Help',
      defaultPosition: 'center',
    },
  ],
  directoryContract: [],
};
