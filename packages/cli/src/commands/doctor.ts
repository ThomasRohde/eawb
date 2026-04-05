import { execSync } from 'node:child_process';
import { discoverCopilot } from '@ea-workbench/acp-copilot';
import { isWorkbenchInitialized } from '@ea-workbench/runtime';

interface Check {
  name: string;
  status: 'ok' | 'warn' | 'fail';
  detail: string;
}

export async function doctorCommand(): Promise<void> {
  const cwd = process.cwd();
  const checks: Check[] = [];

  // Node.js version
  const nodeVersion = process.version;
  const nodeMajor = parseInt(nodeVersion.slice(1), 10);
  checks.push({
    name: 'Node.js',
    status: nodeMajor >= 20 ? 'ok' : 'fail',
    detail: `${nodeVersion}${nodeMajor < 20 ? ' (requires >= 20)' : ''}`,
  });

  // Git availability
  try {
    const gitVersion = execSync('git --version', { encoding: 'utf-8' }).trim();
    checks.push({ name: 'Git', status: 'ok', detail: gitVersion });
  } catch {
    checks.push({ name: 'Git', status: 'fail', detail: 'Not found in PATH' });
  }

  // Git repo check
  try {
    execSync('git rev-parse --is-inside-work-tree', { cwd, encoding: 'utf-8', stdio: 'pipe' });
    checks.push({ name: 'Git repository', status: 'ok', detail: cwd });
  } catch {
    checks.push({
      name: 'Git repository',
      status: 'warn',
      detail: 'Not a git repository (will be initialized on init)',
    });
  }

  // Copilot discovery (same logic as runtime startup)
  const copilot = discoverCopilot();
  if (copilot.available) {
    const methodDetail = copilot.method === 'npx' ? 'Available (via npx)' : 'Available (CLI)';
    checks.push({ name: 'GitHub Copilot', status: 'ok', detail: methodDetail });
  } else {
    checks.push({
      name: 'GitHub Copilot',
      status: 'warn',
      detail: 'Not found — AI features will be unavailable',
    });
  }

  // Workbench initialized
  const initialized = isWorkbenchInitialized(cwd);
  checks.push({
    name: 'EA Workbench',
    status: initialized ? 'ok' : 'warn',
    detail: initialized ? 'Initialized' : 'Not initialized — run "eawb init"',
  });

  // Output
  console.log('\n  EA Workbench Doctor\n');

  const icons = { ok: '✓', warn: '!', fail: '✗' };
  for (const check of checks) {
    const icon = icons[check.status];
    const color =
      check.status === 'ok' ? '\x1b[32m' : check.status === 'warn' ? '\x1b[33m' : '\x1b[31m';
    console.log(`  ${color}${icon}\x1b[0m ${check.name}: ${check.detail}`);
  }

  const hasFailure = checks.some((c) => c.status === 'fail');
  console.log('');

  if (hasFailure) {
    console.log('  Some checks failed. Please fix the issues above.\n');
    process.exit(1);
  }
}
