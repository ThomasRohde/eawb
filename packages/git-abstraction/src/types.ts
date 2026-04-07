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

export interface RemoteInfo {
  name: string;
  url: string;
}

export interface RemoteStatus {
  hasRemote: boolean;
  remote: string | null;
  remoteUrl: string | null;
  branch: string | null;
  upstream: string | null;
  hasUpstream: boolean;
  ahead: number;
  behind: number;
  diverged: boolean;
  lastFetchedAt: string | null;
}

export interface PullOptions {
  rebase?: boolean;
  autostash?: boolean;
}

export interface PullResult {
  pulled: boolean;
  remote: string;
  branch: string;
  filesChanged: number;
  summary: string;
}

export interface FetchResult {
  fetched: boolean;
  remote: string;
}

export interface CloneOptions {
  depth?: number;
}

export interface IGitService {
  init(repoPath: string): Promise<void>;
  isRepo(path: string): Promise<boolean>;
  getDraftStatus(): Promise<DraftStatus>;
  createCheckpoint(message: string, paths?: string[]): Promise<Checkpoint>;
  /**
   * Commit modifications to already-tracked files only. Untracked files are
   * left in the working tree. Returns null if there is nothing tracked-modified
   * to commit.
   */
  createTrackedCheckpoint(message: string): Promise<Checkpoint | null>;
  listCheckpoints(limit?: number): Promise<Checkpoint[]>;
  compare(fromRef: string, toRef: string): Promise<CompareResult>;
  restore(checkpointId: string, paths?: string[], options?: RestoreOptions): Promise<void>;
  getFileAtCheckpoint(checkpointId: string, filePath: string): Promise<string>;
  push(remote?: string, branch?: string): Promise<PushResult>;
  hasRemote(): Promise<boolean>;

  // Remote management
  addRemote(name: string, url: string): Promise<void>;
  setRemoteUrl(name: string, url: string): Promise<void>;
  removeRemote(name: string): Promise<void>;
  getRemotes(): Promise<RemoteInfo[]>;
  getRemoteUrl(name?: string): Promise<string | null>;

  // Sync operations
  fetch(remote?: string): Promise<FetchResult>;
  pull(remote?: string, branch?: string, options?: PullOptions): Promise<PullResult>;
  getRemoteStatus(options?: { fetch?: boolean }): Promise<RemoteStatus>;

  // Clone (does not require prior init)
  clone(url: string, dest: string, options?: CloneOptions): Promise<void>;

  // Rebase state
  abortRebase(): Promise<void>;
  isRebasing(): Promise<boolean>;
  isMerging(): Promise<boolean>;
  getConflictedFiles(): Promise<string[]>;

  // Branch existence (for first-publish detection)
  remoteBranchExists(remote: string, branch: string): Promise<boolean>;
}
