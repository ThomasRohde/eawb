import { simpleGit, type SimpleGit } from 'simple-git';
import type {
  IGitService,
  Checkpoint,
  DraftStatus,
  CompareResult,
  RestoreOptions,
  PushResult,
} from './types.js';

export class GitService implements IGitService {
  private git: SimpleGit | null = null;
  private repoPath: string | null = null;

  async init(repoPath: string): Promise<void> {
    this.repoPath = repoPath;
    this.git = simpleGit(repoPath);

    const isRepo = await this.isRepo(repoPath);
    if (!isRepo) {
      await this.git.init();
    }
  }

  async isRepo(path: string): Promise<boolean> {
    try {
      const git = simpleGit(path);
      return await git.checkIsRepo();
    } catch {
      return false;
    }
  }

  async getDraftStatus(): Promise<DraftStatus> {
    this.ensureInitialized();
    const status = await this.git!.status();
    return {
      hasChanges: !status.isClean(),
      changedFiles: [...status.modified, ...status.staged],
      untrackedFiles: status.not_added,
    };
  }

  async createCheckpoint(message: string, paths?: string[]): Promise<Checkpoint> {
    this.ensureInitialized();
    const filesToAdd = paths ?? ['.'];
    await this.git!.add(filesToAdd);
    const result = await this.git!.commit(message);
    const log = await this.git!.log({ maxCount: 1 });
    const latest = log.latest!;
    return {
      id: result.commit || latest.hash,
      message: latest.message,
      timestamp: latest.date,
      author: latest.author_name,
    };
  }

  async listCheckpoints(limit: number = 50): Promise<Checkpoint[]> {
    this.ensureInitialized();
    try {
      const log = await this.git!.log({ maxCount: limit });
      return log.all.map((entry) => ({
        id: entry.hash,
        message: entry.message,
        timestamp: entry.date,
        author: entry.author_name,
      }));
    } catch {
      return [];
    }
  }

  async compare(fromRef: string, toRef: string): Promise<CompareResult> {
    this.ensureInitialized();
    const diff = await this.git!.diffSummary([fromRef, toRef]);
    return {
      from: fromRef,
      to: toRef,
      files: diff.files.map((f) => {
        const isBinary = 'binary' in f && f.binary;
        const insertions = 'insertions' in f ? f.insertions : 0;
        const deletions = 'deletions' in f ? f.deletions : 0;
        const status = isBinary
          ? ('modified' as const)
          : insertions > 0 && deletions === 0
            ? ('added' as const)
            : insertions === 0 && deletions > 0
              ? ('deleted' as const)
              : ('modified' as const);
        return {
          path: f.file,
          status,
          additions: insertions,
          deletions,
        };
      }),
    };
  }

  async restore(checkpointId: string, paths?: string[], options?: RestoreOptions): Promise<void> {
    this.ensureInitialized();

    // Guard against restoring over uncommitted work unless explicitly forced
    if (!options?.force) {
      const status = await this.git!.status();
      if (!status.isClean()) {
        throw new Error(
          'Working tree has uncommitted changes. Create a checkpoint first or use force to override.',
        );
      }
    }

    // Stash any remaining changes as a safety net before a forced restore
    if (options?.force) {
      const status = await this.git!.status();
      if (!status.isClean()) {
        await this.git!.stash(['push', '-m', `eawb-restore-backup-${Date.now()}`]);
      }
    }

    if (paths && paths.length > 0) {
      await this.git!.checkout([checkpointId, '--', ...paths]);
    } else {
      await this.git!.checkout([checkpointId, '--', '.']);
    }
  }

  async getFileAtCheckpoint(checkpointId: string, filePath: string): Promise<string> {
    this.ensureInitialized();
    return await this.git!.show([`${checkpointId}:${filePath}`]);
  }

  async push(remote?: string, branch?: string): Promise<PushResult> {
    this.ensureInitialized();
    const targetRemote = remote ?? 'origin';
    const targetBranch = branch ?? (await this.git!.revparse(['--abbrev-ref', 'HEAD']));
    await this.git!.push(targetRemote, targetBranch);
    return { pushed: true, remote: targetRemote, branch: targetBranch };
  }

  async hasRemote(): Promise<boolean> {
    this.ensureInitialized();
    const remotes = await this.git!.getRemotes();
    return remotes.length > 0;
  }

  private ensureInitialized(): void {
    if (!this.git || !this.repoPath) {
      throw new Error('GitService not initialized. Call init() first.');
    }
  }
}
