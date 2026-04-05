import { GitService } from '@ea-workbench/git-abstraction';
import type { WsEvent } from '@ea-workbench/shared-schema';

const DEBOUNCE_MS = 3_000;

export class AutoCheckpointService {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pendingArtifacts = new Set<string>();
  private busy = false;

  constructor(
    private workspacePath: string,
    private broadcastFn: (event: WsEvent) => void,
  ) {}

  notifyArtifactSaved(artifactLabel: string): void {
    this.pendingArtifacts.add(artifactLabel);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), DEBOUNCE_MS);
  }

  dispose(): void {
    if (this.timer) clearTimeout(this.timer);
    this.pendingArtifacts.clear();
  }

  private async flush(): Promise<void> {
    if (this.busy || this.pendingArtifacts.size === 0) return;
    this.busy = true;

    const artifacts = [...this.pendingArtifacts];
    this.pendingArtifacts.clear();

    try {
      const git = new GitService();
      await git.init(this.workspacePath);

      const status = await git.getDraftStatus();
      if (!status.hasChanges) return;

      const message =
        artifacts.length === 1
          ? `Auto-save: ${artifacts[0]}`
          : `Auto-save: ${artifacts.length} artifacts`;

      const checkpoint = await git.createCheckpoint(message);
      this.broadcastFn({
        type: 'checkpoint:auto',
        id: checkpoint.id,
        message: checkpoint.message,
      });
    } catch {
      // Silently skip — will retry on next save
    } finally {
      this.busy = false;
      // If more saves arrived while we were committing, flush again
      if (this.pendingArtifacts.size > 0) {
        this.timer = setTimeout(() => this.flush(), DEBOUNCE_MS);
      }
    }
  }
}
