import { confirm, input } from '@inquirer/prompts';
import { initializeWorkbench, isWorkbenchInitialized } from '@ea-workbench/runtime';
import { isLikelyGitRemoteUrl } from '@ea-workbench/shared-schema';

export interface InitOptions {
  name?: string;
  remote?: string;
  /** Commander sets this to `false` when `--no-remote` is passed. */
  remote_?: boolean;
  // commander maps --no-remote to `remote: false`
}

export async function initCommand(opts: {
  name?: string;
  remote?: string | boolean;
}): Promise<void> {
  const cwd = process.cwd();

  if (isWorkbenchInitialized(cwd)) {
    console.log('  EA Workbench is already initialized in this directory.');
    return;
  }

  console.log('  Initializing EA Workbench...\n');

  // Resolve remote URL
  let remoteUrl: string | undefined;
  if (typeof opts.remote === 'string' && opts.remote.length > 0) {
    if (!isLikelyGitRemoteUrl(opts.remote)) {
      console.error('  --remote must be a valid HTTPS or SSH git URL.');
      process.exit(1);
    }
    remoteUrl = opts.remote;
  } else if (opts.remote === false) {
    // --no-remote — explicit opt-out, do not prompt
    remoteUrl = undefined;
  } else {
    // Interactive prompt only when stdin is a TTY
    if (process.stdin.isTTY) {
      try {
        const wantRemote = await confirm({
          message: 'Connect this workspace to a GitHub repository now?',
          default: false,
        });
        if (wantRemote) {
          remoteUrl = await input({
            message: 'Paste the repository URL (HTTPS or SSH):',
            validate: (value) =>
              isLikelyGitRemoteUrl(value) || 'Must be a valid HTTPS or SSH git URL',
          });
        }
      } catch {
        // user cancelled prompts — proceed without a remote
        remoteUrl = undefined;
      }
    }
  }

  try {
    const config = await initializeWorkbench(cwd, opts.name, { remoteUrl });
    console.log(`  Workbench "${config.name}" initialized successfully.`);
    if (remoteUrl) {
      console.log(`  Remote: ${remoteUrl}`);
    }
    console.log(`  Run 'eawb open' to start the workbench.\n`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`  Failed to initialize: ${message}`);
    process.exit(1);
  }
}
