import fs from 'node:fs';
import path from 'node:path';
import { select, confirm, input } from '@inquirer/prompts';
import { initializeWorkbench, isWorkbenchInitialized } from '@ea-workbench/runtime';
import { isLikelyGitRemoteUrl } from '@ea-workbench/shared-schema';
import { GitService } from '@ea-workbench/git-abstraction';

export async function startupFlow(cwd: string): Promise<boolean> {
  console.log('\n  EA Workbench is not initialized in this directory.\n');

  const action = await select({
    message: 'What would you like to do?',
    choices: [
      {
        name: 'Initialize here — set up this directory as a new EA Workbench',
        value: 'init',
      },
      {
        name: 'Clone from GitHub — clone an existing workbench into this directory',
        value: 'clone',
      },
      {
        name: 'Cancel',
        value: 'cancel',
      },
    ],
  });

  switch (action) {
    case 'init': {
      console.log('\n  Initializing EA Workbench...\n');
      let remoteUrl: string | undefined;
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
        remoteUrl = undefined;
      }
      const config = await initializeWorkbench(cwd, undefined, { remoteUrl });
      console.log(`  Workbench "${config.name}" initialized.`);
      if (remoteUrl) console.log(`  Remote: ${remoteUrl}`);
      console.log('');
      return true;
    }
    case 'clone': {
      try {
        const url = await input({
          message: 'Paste the repository URL (HTTPS or SSH):',
          validate: (value) =>
            isLikelyGitRemoteUrl(value) || 'Must be a valid HTTPS or SSH git URL',
        });
        const targetName = await input({
          message: 'Folder name to clone into (relative to current directory):',
          default: deriveFolderName(url),
          validate: (value) => value.trim().length > 0 || 'Folder name is required',
        });
        const dest = path.resolve(cwd, targetName.trim());

        if (fs.existsSync(dest)) {
          const stats = fs.statSync(dest);
          if (stats.isDirectory()) {
            const entries = fs.readdirSync(dest);
            if (entries.length > 0) {
              console.error(`\n  Target directory "${dest}" exists and is not empty.\n`);
              return false;
            }
          } else {
            console.error(`\n  Target path "${dest}" exists and is not a directory.\n`);
            return false;
          }
        }

        console.log(`\n  Cloning into ${dest}...`);
        const git = new GitService();
        await git.clone(url, dest);
        console.log('  Clone complete.');

        // If the cloned repo isn't already a workbench, initialize on top
        if (!isWorkbenchInitialized(dest)) {
          console.log('  Initializing workbench files in cloned repo...');
          await initializeWorkbench(dest, path.basename(dest));
        }

        console.log(`\n  Run 'cd ${targetName.trim()} && eawb open' to start the workbench.\n`);
        return false; // user must cd into the new directory
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error(`\n  Clone failed: ${message}\n`);
        return false;
      }
    }
    default:
      return false;
  }
}

function deriveFolderName(url: string): string {
  // Strip .git suffix and trailing slashes, take last path segment
  const cleaned = url
    .trim()
    .replace(/\.git\/?$/, '')
    .replace(/\/$/, '');
  const segments = cleaned.split(/[/:]/);
  return segments[segments.length - 1] || 'workbench';
}
