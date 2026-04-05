import fs from 'node:fs';
import path from 'node:path';
import { PATHS } from '@ea-workbench/shared-schema';
import { readModelFile } from './jsonl-reader.js';
import { writeModelFile } from './jsonl-writer.js';
import type { BcmModel } from '../schemas/model.js';

export class ModelStore {
  private basePath: string;

  constructor(workspacePath: string) {
    this.basePath = path.join(workspacePath, PATHS.BCM_DIR);
  }

  listModels(): Array<{ id: string; filePath: string }> {
    if (!fs.existsSync(this.basePath)) return [];

    return fs
      .readdirSync(this.basePath)
      .filter((f) => f.endsWith('.bcm.jsonl'))
      .map((f) => ({
        id: f.replace('.bcm.jsonl', ''),
        filePath: path.join(this.basePath, f),
      }));
  }

  loadModel(id: string): BcmModel {
    const filePath = this.modelPath(id);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Model "${id}" not found`);
    }
    const { model, errors } = readModelFile(filePath);
    if (errors.length > 0) {
      console.warn(`Model "${id}" has ${errors.length} parse errors`);
    }
    return model;
  }

  saveModel(model: BcmModel): void {
    const filePath = this.modelPath(model.header.id);
    writeModelFile(filePath, model);
  }

  deleteModel(id: string): void {
    const filePath = this.modelPath(id);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  modelExists(id: string): boolean {
    return fs.existsSync(this.modelPath(id));
  }

  private modelPath(id: string): string {
    return path.join(this.basePath, `${id}.bcm.jsonl`);
  }
}
