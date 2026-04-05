export type ExportFormat = 'markdown' | 'html' | 'svg';

export interface ExportOptions {
  format: ExportFormat;
  artifactId: string;
  toolId: string;
  outputDir?: string;
}

export interface ExportResult {
  format: ExportFormat;
  content: string;
  filename: string;
  metadata: {
    exportedAt: string;
    toolId: string;
    artifactId: string;
  };
}

export interface IExporter {
  format: ExportFormat;
  name: string;
  export(data: unknown, options: ExportOptions): Promise<ExportResult>;
}
