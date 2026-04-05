import type { ExportFormat, IExporter } from './types.js';

export class ExportRegistry {
  private exporters = new Map<ExportFormat, IExporter>();

  register(exporter: IExporter): void {
    this.exporters.set(exporter.format, exporter);
  }

  get(format: ExportFormat): IExporter | undefined {
    return this.exporters.get(format);
  }

  list(): IExporter[] {
    return Array.from(this.exporters.values());
  }

  formats(): ExportFormat[] {
    return Array.from(this.exporters.keys());
  }
}
