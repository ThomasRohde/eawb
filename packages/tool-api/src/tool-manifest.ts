import type { ArtifactType } from './artifact.js';
import type { CommandDefinition } from './commands.js';
import type { UIContribution } from './ui-contributions.js';
import type { ValidatorDefinition } from './validators.js';

export interface ToolManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  artifactTypes: ArtifactType[];
  commands: CommandDefinition[];
  validators: ValidatorDefinition[];
  uiContributions: UIContribution[];
  aiActions?: AIActionDefinition[];
  directoryContract: DirectoryEntry[];
}

export interface DirectoryEntry {
  path: string;
  description: string;
}

export interface AIActionDefinition {
  id: string;
  name: string;
  description: string;
  inputSchema: unknown;
  outputSchema: unknown;
  contextSources: string[];
  promptTemplate: string;
}
