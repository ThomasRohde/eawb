export const PATHS = {
  CONFIG_FILE: 'ea-workbench.json',
  WORKBENCH_DIR: '.ea-workbench',
  CACHE_DIR: '.ea-workbench/cache',
  SESSIONS_DIR: '.ea-workbench/sessions',
  INDEX_DIR: '.ea-workbench/index',
  LOGS_DIR: '.ea-workbench/logs',
  ARCH_DIR: 'architecture',
  BCM_DIR: 'architecture/bcm-studio/models',
  DECISIONS_DIR: 'architecture/decisions',
  REVIEWS_DIR: 'architecture/reviews',
  EXPORTS_DIR: 'architecture/exports',
  MARKDOWN_DIR: 'architecture/markdown-editor/docs',
  GITHUB_DIR: '.github',
  GITHUB_INSTRUCTIONS_DIR: '.github/instructions',
  GITHUB_AGENTS_DIR: '.github/agents',
  PREFERENCES_FILE: '.ea-workbench/preferences.json',
} as const;

export const WORKBENCH_DIRS = [
  PATHS.CACHE_DIR,
  PATHS.SESSIONS_DIR,
  PATHS.INDEX_DIR,
  PATHS.LOGS_DIR,
] as const;

export const ARCHITECTURE_DIRS = [
  PATHS.BCM_DIR,
  PATHS.DECISIONS_DIR,
  PATHS.REVIEWS_DIR,
  PATHS.EXPORTS_DIR,
  PATHS.MARKDOWN_DIR,
] as const;

export const GITHUB_DIRS = [
  PATHS.GITHUB_DIR,
  PATHS.GITHUB_INSTRUCTIONS_DIR,
  PATHS.GITHUB_AGENTS_DIR,
] as const;
