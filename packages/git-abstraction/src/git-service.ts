import fs from 'node:fs';
import path from 'node:path';
import { simpleGit, type SimpleGit } from 'simple-git';
import type {
  IGitService,
  Checkpoint,
  DraftStatus,
  CompareResult,
  RestoreOptions,
  PushResult,
  RemoteInfo,
  RemoteStatus,
  PullOptions,
  PullResult,
  FetchResult,
  CloneOptions,
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

  /**
   * Commit only modifications to already-tracked files. `git add -u` stages
   * updates and deletes for tracked files but never adds new (untracked) ones,
   * so the user's scratch files and uncommitted secrets are never silently
   * published by the auto-checkpoint flow.
   */
  async createTrackedCheckpoint(message: string): Promise<Checkpoint | null> {
    this.ensureInitialized();
    await this.git!.add(['-u']);
    const status = await this.git!.status();
    if (status.staged.length === 0) return null;
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
    // -u sets upstream on first push so future status is meaningful
    await this.git!.push(targetRemote, targetBranch, ['-u']);
    return { pushed: true, remote: targetRemote, branch: targetBranch };
  }

  async hasRemote(): Promise<boolean> {
    this.ensureInitialized();
    const remotes = await this.git!.getRemotes();
    return remotes.length > 0;
  }

  // ---------------------------------------------------------------------
  // Remote management
  // ---------------------------------------------------------------------

  async addRemote(name: string, url: string): Promise<void> {
    this.ensureInitialized();
    const existing = await this.git!.getRemotes(true);
    const match = existing.find((r) => r.name === name);
    if (match) {
      await this.git!.remote(['set-url', name, url]);
    } else {
      await this.git!.addRemote(name, url);
    }
  }

  async setRemoteUrl(name: string, url: string): Promise<void> {
    this.ensureInitialized();
    await this.git!.remote(['set-url', name, url]);
  }

  async removeRemote(name: string): Promise<void> {
    this.ensureInitialized();
    await this.git!.removeRemote(name);
  }

  async getRemotes(): Promise<RemoteInfo[]> {
    this.ensureInitialized();
    const remotes = await this.git!.getRemotes(true);
    return remotes.filter((r) => r.refs?.fetch).map((r) => ({ name: r.name, url: r.refs.fetch }));
  }

  async getRemoteUrl(name: string = 'origin'): Promise<string | null> {
    const remotes = await this.getRemotes();
    return remotes.find((r) => r.name === name)?.url ?? null;
  }

  // ---------------------------------------------------------------------
  // Sync operations
  // ---------------------------------------------------------------------

  async fetch(remote: string = 'origin'): Promise<FetchResult> {
    this.ensureInitialized();
    await this.git!.fetch(remote);
    return { fetched: true, remote };
  }

  async pull(
    remote: string = 'origin',
    branch?: string,
    options?: PullOptions,
  ): Promise<PullResult> {
    this.ensureInitialized();
    const targetBranch = branch ?? (await this.git!.revparse(['--abbrev-ref', 'HEAD']));
    const rebase = options?.rebase ?? true;
    const autostash = options?.autostash ?? true;

    const flags: Record<string, string | null> = {};
    if (rebase) flags['--rebase'] = 'true';
    if (autostash) flags['--autostash'] = null;

    const result = await this.git!.pull(remote, targetBranch, flags);
    const filesChanged = result.files?.length ?? 0;
    const summary =
      result.summary && typeof result.summary === 'object'
        ? `${result.summary.changes ?? 0} changes, +${result.summary.insertions ?? 0} -${result.summary.deletions ?? 0}`
        : '';
    return {
      pulled: true,
      remote,
      branch: targetBranch,
      filesChanged,
      summary,
    };
  }

  async getRemoteStatus(options?: { fetch?: boolean }): Promise<RemoteStatus> {
    this.ensureInitialized();

    const remotes = await this.getRemotes();
    if (remotes.length === 0) {
      return {
        hasRemote: false,
        remote: null,
        remoteUrl: null,
        branch: null,
        upstream: null,
        hasUpstream: false,
        ahead: 0,
        behind: 0,
        diverged: false,
        lastFetchedAt: null,
      };
    }

    const origin = remotes.find((r) => r.name === 'origin') ?? remotes[0];

    let branch: string | null = null;
    try {
      branch = (await this.git!.revparse(['--abbrev-ref', 'HEAD'])).trim();
      if (branch === 'HEAD') branch = null; // detached
    } catch {
      branch = null;
    }

    let upstream: string | null = null;
    try {
      upstream = (
        await this.git!.revparse(['--abbrev-ref', '--symbolic-full-name', '@{u}'])
      ).trim();
    } catch {
      upstream = null;
    }

    if (options?.fetch) {
      try {
        await this.fetch(origin.name);
      } catch {
        // surface ahead/behind from cached refs even if fetch fails
      }
    }

    let ahead = 0;
    let behind = 0;
    if (upstream) {
      try {
        const out = await this.git!.raw([
          'rev-list',
          '--left-right',
          '--count',
          `${upstream}...HEAD`,
        ]);
        // git outputs "<behind>\t<ahead>"
        const parts = out.trim().split(/\s+/);
        behind = parseInt(parts[0] ?? '0', 10) || 0;
        ahead = parseInt(parts[1] ?? '0', 10) || 0;
      } catch {
        // ignore
      }
    }

    let lastFetchedAt: string | null = null;
    try {
      const fetchHead = path.join(this.repoPath!, '.git', 'FETCH_HEAD');
      if (fs.existsSync(fetchHead)) {
        lastFetchedAt = fs.statSync(fetchHead).mtime.toISOString();
      }
    } catch {
      // ignore
    }

    return {
      hasRemote: true,
      remote: origin.name,
      remoteUrl: origin.url,
      branch,
      upstream,
      hasUpstream: upstream !== null,
      ahead,
      behind,
      diverged: ahead > 0 && behind > 0,
      lastFetchedAt,
    };
  }

  // ---------------------------------------------------------------------
  // Clone (no prior init required — uses a fresh simpleGit instance)
  // ---------------------------------------------------------------------

  async clone(url: string, dest: string, options?: CloneOptions): Promise<void> {
    const args: string[] = [];
    if (options?.depth && options.depth > 0) {
      args.push('--depth', String(options.depth));
    }
    await simpleGit().clone(url, dest, args);
  }

  // ---------------------------------------------------------------------
  // Rebase / merge state
  // ---------------------------------------------------------------------

  async abortRebase(): Promise<void> {
    this.ensureInitialized();
    try {
      await this.git!.raw(['rebase', '--abort']);
    } catch {
      // already aborted or not in rebase
    }
  }

  async isRebasing(): Promise<boolean> {
    this.ensureInitialized();
    try {
      const gitDir = path.join(this.repoPath!, '.git');
      return (
        fs.existsSync(path.join(gitDir, 'rebase-merge')) ||
        fs.existsSync(path.join(gitDir, 'rebase-apply'))
      );
    } catch {
      return false;
    }
  }

  async isMerging(): Promise<boolean> {
    this.ensureInitialized();
    try {
      return fs.existsSync(path.join(this.repoPath!, '.git', 'MERGE_HEAD'));
    } catch {
      return false;
    }
  }

  async getConflictedFiles(): Promise<string[]> {
    this.ensureInitialized();
    try {
      const status = await this.git!.status();
      return status.conflicted ?? [];
    } catch {
      return [];
    }
  }

  async remoteBranchExists(remote: string, branch: string): Promise<boolean> {
    this.ensureInitialized();
    // Note: simple-git's `raw()` does NOT throw on git's silent exit-1 from
    // `rev-parse --verify --quiet`; it returns an empty string. We therefore
    // check both: a thrown error AND an empty result mean "not found".
    try {
      const out = await this.git!.raw([
        'rev-parse',
        '--verify',
        '--quiet',
        `refs/remotes/${remote}/${branch}`,
      ]);
      return out.trim().length > 0;
    } catch {
      return false;
    }
  }

  private ensureInitialized(): void {
    if (!this.git || !this.repoPath) {
      throw new Error('GitService not initialized. Call init() first.');
    }
  }
}
