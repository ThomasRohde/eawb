export interface Diagnostic {
  level: 'error' | 'warning' | 'info';
  message: string;
  path?: string;
  nodeId?: string;
}

export interface ValidatorDefinition {
  id: string;
  name: string;
  artifactTypeId: string;
  validate: (data: unknown) => Diagnostic[];
}
