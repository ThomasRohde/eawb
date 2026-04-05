export interface Checkpoint {
  id: string;
  message: string;
  timestamp: string;
  author: string;
}

export interface DraftStatus {
  hasChanges: boolean;
  changedFiles: string[];
  untrackedFiles: string[];
}

export interface CompareResult {
  from: string;
  to: string;
  files: FileDiff[];
}

export interface FileDiff {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  diff?: string;
}

export interface RestoreOptions {
  /** Skip dirty-worktree check and force the restore */
  force?: boolean;
}

export interface PushResult {
  pushed: boolean;
  remote: string;
  branch: string;
}

export interface IGitService {
  init(repoPath: string): Promise<void>;
  isRepo(path: string): Promise<boolean>;
  getDraftStatus(): Promise<DraftStatus>;
  createCheckpoint(message: string, paths?: string[]): Promise<Checkpoint>;
  listCheckpoints(limit?: number): Promise<Checkpoint[]>;
  compare(fromRef: string, toRef: string): Promise<CompareResult>;
  restore(checkpointId: string, paths?: string[], options?: RestoreOptions): Promise<void>;
  getFileAtCheckpoint(checkpointId: string, filePath: string): Promise<string>;
  push(remote?: string, branch?: string): Promise<PushResult>;
  hasRemote(): Promise<boolean>;
}
