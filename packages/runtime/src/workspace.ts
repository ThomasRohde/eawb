import fs from 'node:fs';
import path from 'node:path';
import {
  PATHS,
  WORKBENCH_DIRS,
  ARCHITECTURE_DIRS,
  GITHUB_DIRS,
  type WorkbenchConfig,
} from '@ea-workbench/shared-schema';
import { GitService } from '@ea-workbench/git-abstraction';
import { generateCopilotAssets } from './copilot-assets.js';

export interface WorkspaceStatus {
  path: string;
  initialized: boolean;
  config: WorkbenchConfig | null;
  isGitRepo: boolean;
}

export function isWorkbenchInitialized(dirPath: string): boolean {
  const configPath = path.join(dirPath, PATHS.CONFIG_FILE);
  return fs.existsSync(configPath);
}

export function loadWorkbenchConfig(dirPath: string): WorkbenchConfig | null {
  const configPath = path.join(dirPath, PATHS.CONFIG_FILE);
  if (!fs.existsSync(configPath)) return null;
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(raw) as WorkbenchConfig;
  } catch {
    return null;
  }
}

export async function getWorkspaceStatus(dirPath: string): Promise<WorkspaceStatus> {
  const gitService = new GitService();
  const isGitRepo = await gitService.isRepo(dirPath);
  const config = loadWorkbenchConfig(dirPath);
  return {
    path: dirPath,
    initialized: config !== null,
    config,
    isGitRepo,
  };
}

export async function initializeWorkbench(
  dirPath: string,
  name?: string,
): Promise<WorkbenchConfig> {
  // Initialize git if needed
  const gitService = new GitService();
  const isGitRepo = await gitService.isRepo(dirPath);
  if (!isGitRepo) {
    await gitService.init(dirPath);
  }

  // Create directory structure
  const allDirs = [...WORKBENCH_DIRS, ...ARCHITECTURE_DIRS, ...GITHUB_DIRS];
  for (const dir of allDirs) {
    const fullPath = path.join(dirPath, dir);
    fs.mkdirSync(fullPath, { recursive: true });
  }

  // Create .gitignore entry for .ea-workbench/
  const gitignorePath = path.join(dirPath, '.gitignore');
  const gitignoreEntry = '.ea-workbench/';
  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    if (!content.includes(gitignoreEntry)) {
      fs.appendFileSync(gitignorePath, `\n${gitignoreEntry}\n`);
    }
  } else {
    fs.writeFileSync(gitignorePath, `${gitignoreEntry}\n`);
  }

  // Create config
  const config: WorkbenchConfig = {
    version: '1.0',
    name: name ?? path.basename(dirPath),
    tools: [{ id: 'bcm-studio', enabled: true }],
    createdAt: new Date().toISOString(),
  };
  const configPath = path.join(dirPath, PATHS.CONFIG_FILE);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');

  // Generate Copilot assets
  generateCopilotAssets(dirPath);

  // Create initial checkpoint — only commit files we just created, not the entire repo
  await gitService.init(dirPath);
  const createdFiles = [
    PATHS.CONFIG_FILE,
    '.gitignore',
    `${PATHS.GITHUB_DIR}/copilot-instructions.md`,
    `${PATHS.GITHUB_AGENTS_DIR}/bcm-modeler.md`,
    `${PATHS.GITHUB_AGENTS_DIR}/bcm-reviewer.md`,
    `${PATHS.GITHUB_AGENTS_DIR}/ea-brief-writer.md`,
  ].filter((f) => fs.existsSync(path.join(dirPath, f)));
  try {
    await gitService.createCheckpoint('Initialize EA Workbench', createdFiles);
  } catch {
    // May fail if nothing to commit (already committed)
  }

  return config;
}
